"""Recipe chef sub-system: Spoonacular finds real recipes, Gemini picks and explains them,
and the rule-based safety filter checks everything before the user sees it.

If Spoonacular is unavailable (no key, points used up, error), Gemini writes the
recipes itself. CHEF_SOURCE=llm forces that path, for the comparison tests.
"""

import re
import secrets
import time

from ..config import get_settings
from ..errors import ApiError
from ..models import User
from . import llm, safety, spoonacular
from .llm import LLMUnavailable
from .spoonacular import SpoonacularUnavailable

STORE_SECONDS = 2 * 60 * 60
_options: dict[str, dict] = {}
_recipes: dict[str, dict] = {}

# Detector classes that need a clearer name for recipe search, or are drinks to leave out.
SEARCH_NAMES = {"butter_or_spread": "butter", "leafy_greens": "lettuce", "green_chili": "green chili"}
NOT_FOR_COOKING = {"water_bottle", "fizzy_drink", "juice"}
PANTRY = {"salt", "pepper", "black pepper", "water", "oil", "olive oil", "vegetable oil", "cooking oil"}

# Salt is often listed "to taste" with no amount. Savoury dishes then get a suggested
# amount of 1/4 tsp per serving (a common home-cooking guide), shown as a suggestion.
SALT_TSP_PER_SERVING = 0.25
SALT = re.compile(r"\bsalt\b")
NOT_SALT = re.compile(r"low[- ]salt|salt[- ]free|no[- ]salt|reduced[- ]salt")
NO_AMOUNT_UNITS = {"", "serving", "servings", "to taste"}
SWEET_MEAL_TYPES = {"dessert", "drink"}

# Phrases in the user's notes that mean "leave this out", e.g. "no mushrooms next time".
DISLIKE = re.compile(r"\b(?:no|without|don'?t like|do not like|hate|avoid|skip|less|not a fan of)\s+([a-z][a-z' -]{1,40})")
FILLER = re.compile(r"\b(?:please|next time|again|in it|in the recipe|at all|thanks)\b")
# Words that end the food name: "no parsley because my kid hates it" -> "parsley".
STOP_WORDS = {"because", "since", "as", "it", "in", "on", "for", "with", "when", "next", "this", "that", "please",
              "again", "anymore", "thanks", "so", "but", "too", "is", "was", "the", "my"}


def _new_id(prefix: str) -> str:
    return f"{prefix}_{secrets.token_hex(3)}"


def _expire() -> None:
    cutoff = time.time() - STORE_SECONDS
    for store in (_options, _recipes):
        for key in [k for k, v in store.items() if v["created"] < cutoff]:
            del store[key]


def _singular(word: str) -> str:
    word = word.lower().replace("_", " ").strip()
    for ending in ("oes", "ies", "es", "s"):
        if word.endswith(ending) and len(word) > len(ending) + 2:
            return word[: -len(ending)] + ("y" if ending == "ies" else "o" if ending == "oes" else "")
    return word


def have_it(ingredient: str, confirmed: list[str]) -> bool:
    """True if the recipe ingredient is one the user confirmed (or a basic pantry item).

    The confirmed name must be the end of the ingredient name, so "large eggs" matches
    "Eggs" but "low salt chicken stock" does not match "Salt".
    """
    name = _singular(ingredient)
    if name in PANTRY:
        return True
    return any(re.search(rf"\b{re.escape(_singular(c))}$", name) for c in confirmed)


def nice_quantity(value: float) -> float:
    if value >= 10:
        return float(round(value))
    return round(value * 4) / 4 or 0.25


# Foods the user asks for in the chat note, e.g. "I want something with rice" -> "rice".
WANT = re.compile(r"(?=\b(?:with|using|use|want|wants|including|include|craving|add|have)\s+(?:up\s+)?(?:some\s+|a\s+|an\s+|the\s+)?([a-z][a-z'-]*(?:\s+[a-z][a-z'-]*){0,4}))")
NOT_FOODS = {"something", "anything", "food", "dish", "recipe", "recipes", "meal", "it", "to", "me", "more", "less",
             "spicy", "quick", "healthy", "light", "kids", "friends", "family", "time", "leftovers", "some"}


def wanted_terms(note: str | None) -> list[str]:
    """Foods a chat note asks for, to search for and to require in the recipes.

    "I want something with rice" -> ["rice"]; "with chicken and rice" -> ["chicken", "rice"].
    """
    terms = []
    for match in WANT.finditer((note or "").lower()):
        for part in re.split(r"\s+(?:and|or|&)\s+|,", match.group(1)):
            words = []
            for word in part.split():
                if word in STOP_WORDS or word in NOT_FOODS:
                    break
                words.append(word)
            food = " ".join(words[:2]).strip(" -'")
            if len(food) > 2:
                terms.append(food)
            if not words:
                break
    return list(dict.fromkeys(terms))


def note_texts(user: User) -> list[str]:
    return [n["text"] for n in (user.chef_notes or [])][-10:]


def disliked_terms(notes: list[str]) -> list[str]:
    """Foods the user's notes ask to leave out. "less spicy" is passed to Gemini but not blocked."""
    terms = []
    for note in notes:
        text = re.sub(r"\(.*?\)", " ", note.lower())  # drop "(after Easy Tabouleh)"
        for match in DISLIKE.finditer(text):
            if text[match.start():].startswith("less"):
                continue
            for part in re.split(r",| and | or | & ", FILLER.sub(" ", match.group(1))):
                words = []
                for word in part.replace(".", " ").replace("!", " ").split():
                    if word in STOP_WORDS:
                        break
                    words.append(word)
                food = " ".join(words[:3]).strip(" -'")
                if len(food) > 2:
                    terms.append(food)
    return terms


def mentions(texts: list[str], terms: list[str]) -> bool:
    words = [_singular(t) for t in terms]
    return any(re.search(rf"\b{re.escape(w)}", _singular(text)) for text in texts for w in words)


def with_salt(ingredients: list[dict], servings: int, meal_type: str | None) -> list[dict]:
    """Give salt an amount when the recipe has none, scaled to servings."""
    if (spoonacular.spoonacular_meal_type(meal_type) or "") in SWEET_MEAL_TYPES:
        return ingredients
    amount = max(0.25, round(servings * SALT_TSP_PER_SERVING * 4) / 4)
    suggested = {"name": "salt", "quantity": amount, "unit": "tsp", "have": True,
                 "note": f"Suggested amount for {servings} serving{'s' if servings != 1 else ''}; adjust to taste."}
    out, found = [], False
    for item in ingredients:
        name = item["name"].lower()
        if SALT.search(name) and not NOT_SALT.search(name):
            found = True
            if not item["quantity"] or item["unit"].strip().lower() in NO_AMOUNT_UNITS:
                item = {**suggested, "name": item["name"]}
        out.append(item)
    return out if found else out + [suggested]


def _search_terms(ingredients: list[dict]) -> list[str]:
    terms = []
    for item in ingredients:
        if item.get("id") in NOT_FOR_COOKING:
            continue
        terms.append(SEARCH_NAMES.get(item.get("id"), item["name"].lower()))
    return terms


def options(user: User, ingredients: list[dict], answers: dict) -> dict:
    _expire()
    allergies, diet = list(user.allergies or []), user.diet
    confirmed = [i["name"] for i in ingredients]
    terms = _search_terms(ingredients) or [c.lower() for c in confirmed]
    use_spoonacular = get_settings().chef_source != "llm"
    notes = note_texts(user)
    dislikes = disliked_terms(notes)
    # "Something with rice" in this chat's note: search for rice too, and only offer recipes that use it.
    wanted = [w for w in wanted_terms(answers.get("note")) if w not in dislikes]
    if wanted:
        terms = list(dict.fromkeys(terms + wanted))
        answers = {**answers, "must_include": ", ".join(wanted)}

    chosen: list[dict] = []
    removed = 0
    removed_by_notes = 0
    notice = None

    if use_spoonacular:
        try:
            candidates = spoonacular.search(terms, allergies, diet, answers.get("cuisine"), answers.get("max_minutes"),
                                            meal_type=answers.get("meal_type"))
            safe = []
            for c in candidates:
                texts = [c["title"], *c["ingredient_names"]]
                if not safety.is_safe(texts, allergies, diet):
                    removed += 1
                elif dislikes and mentions(texts, dislikes):
                    removed_by_notes += 1
                else:
                    safe.append(c)
            if wanted:
                matching = [c for c in safe if mentions([c["title"], *c["ingredient_names"]], wanted)]
                if not matching and safe:
                    notice = f"No library recipes used {', '.join(wanted)}, so the chef wrote these."
                safe = matching
            if safe:
                try:
                    picks = llm.pick_options(safe, answers, allergies, diet, notes=notes)
                except LLMUnavailable:
                    picks = [llm.Pick(index=i, summary="") for i in range(min(3, len(safe)))]
                for p in picks:
                    c = safe[p.index]
                    chosen.append({"kind": "spoonacular", "title": c["title"], "summary": p.summary,
                                   "minutes": c["minutes"], "uses": c["uses"], "missing": c["missing"],
                                   "image_url": c["image_url"], "spoonacular_id": c["spoonacular_id"]})
        except SpoonacularUnavailable:
            notice = "Our recipe library is busy, so the chef wrote these recipes."

    if len(chosen) < 3:
        try:
            generated = llm.generate_options(confirmed, answers, allergies, diet, count=3 - len(chosen) + 1, notes=notes)
        except LLMUnavailable:
            generated = []
            if not chosen:
                raise ApiError(502, "CHEF_UNAVAILABLE", "The chef is unavailable right now. Please try again.")
        for r in generated:
            if len(chosen) >= 3:
                break
            names = [i.name for i in r.ingredients]
            if not safety.is_safe([r.title, *names], allergies, diet):
                removed += 1
                continue
            if dislikes and mentions([r.title, *names], dislikes):
                removed_by_notes += 1
                continue
            chosen.append({"kind": "llm", "title": r.title, "summary": r.summary, "minutes": r.minutes,
                           "uses": [n for n in names if have_it(n, confirmed)],
                           "missing": [n for n in names if not have_it(n, confirmed)],
                           "image_url": None, "recipe": r.model_dump()})

    if not chosen:
        raise ApiError(502, "NO_SAFE_RECIPES", "We couldn't find a safe recipe for these ingredients. Try adding more items.")
    if len(chosen) < 3:
        notice = f"Only {len(chosen)} safe recipe{'s' if len(chosen) > 1 else ''} found for these ingredients."

    result = []
    for option in chosen:
        option_id = _new_id("opt")
        _options[option_id] = {**option, "user_id": user.id, "confirmed": confirmed,
                               "meal_type": answers.get("meal_type"), "created": time.time()}
        result.append({"option_id": option_id, "title": option["title"], "summary": option["summary"],
                       "minutes": option["minutes"], "uses": option["uses"], "missing": option["missing"],
                       "image_url": option["image_url"],
                       "source": "spoonacular" if option["kind"] == "spoonacular" else "llm"})
    return {"options": result, "removed_by_safety_filter": removed, "removed_by_your_notes": removed_by_notes, "notice": notice}


def recipe(user: User, option_id: str, servings: int) -> dict:
    _expire()
    option = _options.get(option_id)
    if option is None or option["user_id"] != user.id:
        raise ApiError(404, "NOT_FOUND", "That recipe option has expired. Please ask the chef again.")

    if option["kind"] == "spoonacular":
        try:
            full = spoonacular.details(option["spoonacular_id"])
        except SpoonacularUnavailable:
            raise ApiError(502, "CHEF_UNAVAILABLE", "The recipe library is unavailable right now. Please try again.")
    else:
        full = {**option["recipe"], "image_url": None}

    allergies, diet = list(user.allergies or []), user.diet
    names = [i["name"] for i in full["ingredients"]]
    # The full recipe can list more than the search did, so check again.
    if not safety.is_safe([full["title"], *names], allergies, diet):
        raise ApiError(422, "UNSAFE_RECIPE", "This recipe contains something you can't eat. Please choose another.")

    factor = servings / max(1, full["servings"])
    ingredients = [
        {"name": i["name"], "quantity": nice_quantity(i["quantity"] * factor) if i["quantity"] else 0,
         "unit": i["unit"], "have": have_it(i["name"], option["confirmed"])}
        for i in full["ingredients"]
    ]
    ingredients = with_salt(ingredients, servings, option.get("meal_type"))
    recipe_id = _new_id("rec")
    _recipes[recipe_id] = {"title": full["title"], "ingredients": names, "user_id": user.id, "created": time.time()}
    return {
        "recipe_id": recipe_id, "title": full["title"], "servings": servings, "minutes": full["minutes"],
        "ingredients": ingredients, "steps": full["steps"],
        "safety": {"checked": True, "allergies": allergies, "diet": diet},
        "image_url": full.get("image_url"),
    }


def swap(user: User, recipe_id: str, missing: str) -> dict:
    _expire()
    stored = _recipes.get(recipe_id)
    if stored is None or stored["user_id"] != user.id:
        raise ApiError(404, "NOT_FOUND", "That recipe has expired. Please open it again.")
    allergies, diet = list(user.allergies or []), user.diet
    try:
        swaps = llm.suggest_swaps(stored["title"], missing, stored["ingredients"], allergies, diet, notes=note_texts(user))
    except LLMUnavailable:
        raise ApiError(502, "CHEF_UNAVAILABLE", "The chef is unavailable right now. Please try again.")
    safe = [s.model_dump() for s in swaps if safety.is_safe([s.name, s.note], allergies, diet)]
    return {"missing": missing, "swaps": safe}
