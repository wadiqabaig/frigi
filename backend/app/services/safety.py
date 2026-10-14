"""Rule-based safety filter (FR10, NFR4).

This is deliberately not AI: every recipe the user sees, whether it came from
Spoonacular or Gemini, is checked here against the user's saved allergies and
diet. A recipe is blocked if any ingredient (or its title) matches a rule.
"""

import re

# Words that mean an allergen is present. Matching is on whole words, so
# "egg" matches "eggs" and "egg yolk" but not "eggplant" (listed under SAFE).
ALLERGEN_WORDS: dict[str, list[str]] = {
    "peanut": ["peanut", "groundnut", "satay", "monkey nut"],
    "tree_nut": [
        "almond", "cashew", "walnut", "pecan", "pistachio", "hazelnut", "macadamia", "brazil nut",
        "pine nut", "chestnut", "praline", "marzipan", "nutella", "gianduja", "pesto", "frangipane",
        "nut",
    ],
    "dairy": [
        "milk", "butter", "cheese", "cream", "yogurt", "yoghurt", "ghee", "whey", "casein", "curd",
        "paneer", "parmesan", "mozzarella", "cheddar", "ricotta", "mascarpone", "feta", "brie",
        "custard", "buttermilk", "creme fraiche", "lactose", "ice cream", "kefir", "labneh",
    ],
    "egg": ["egg", "mayonnaise", "mayo", "meringue", "aioli", "albumen"],
    "gluten": [
        "wheat", "flour", "bread", "breadcrumb", "panko", "pasta", "spaghetti", "noodle", "macaroni",
        "penne", "lasagna", "lasagne", "fettuccine", "couscous", "bulgur", "barley", "rye", "semolina",
        "seitan", "soy sauce", "tortilla", "pita", "naan", "cracker", "biscuit", "cake", "beer", "malt",
        "spelt", "farro", "crouton", "pastry", "pie crust", "bun", "bagel", "baguette",
    ],
    "soy": ["soy", "soya", "tofu", "edamame", "miso", "tempeh", "tamari"],
    "fish": [
        "fish", "salmon", "tuna", "cod", "anchovy", "anchovies", "sardine", "mackerel", "trout",
        "haddock", "tilapia", "halibut", "snapper", "bass", "worcestershire", "caesar dressing",
    ],
    "shellfish": [
        "shrimp", "prawn", "crab", "lobster", "mussel", "clam", "oyster", "scallop", "crayfish",
        "crawfish", "langoustine", "squid", "calamari", "octopus",
    ],
    "sesame": ["sesame", "tahini", "hummus", "halva", "za'atar", "zaatar"],
}

MEAT = [
    "beef", "steak", "pork", "bacon", "ham", "sausage", "chicken", "turkey", "lamb", "mutton", "veal",
    "duck", "goose", "venison", "salami", "pepperoni", "chorizo", "prosciutto", "pancetta", "mince",
    "meatball", "meat", "burger", "brisket", "ribs", "lard", "gelatin", "gelatine", "stock cube", "bouillon",
    "chicken stock", "beef stock", "chicken broth", "beef broth",
]
SEAFOOD = ALLERGEN_WORDS["fish"] + ALLERGEN_WORDS["shellfish"] + ["fish sauce", "oyster sauce"]

DIET_WORDS: dict[str, list[str]] = {
    "none": [],
    "vegetarian": MEAT + SEAFOOD,
    "pescatarian": MEAT,
    "vegan": MEAT + SEAFOOD + ALLERGEN_WORDS["dairy"] + ALLERGEN_WORDS["egg"] + ["honey"],
    "halal": [
        "pork", "bacon", "ham", "prosciutto", "pancetta", "salami", "pepperoni", "chorizo", "lard",
        "gelatin", "gelatine", "wine", "beer", "rum", "brandy", "vodka", "whisky", "whiskey", "sake",
        "mirin", "sherry", "liqueur", "bourbon", "cognac", "kirsch",
    ],
}

# Phrases that contain a rule word but are safe for that rule. They are
# removed from the text before checking that rule.
SAFE: dict[str, list[str]] = {
    "dairy": [
        "coconut milk", "coconut cream", "almond milk", "oat milk", "soy milk", "rice milk",
        "plant milk", "cashew milk", "peanut butter", "almond butter", "nut butter", "cashew butter",
        "apple butter", "cocoa butter", "butternut", "butter bean", "butter beans", "cream of tartar",
        "dairy-free", "vegan cheese", "vegan butter",
    ],
    "egg": ["eggplant", "egg-free", "eggless"],
    "gluten": [
        "gluten-free", "rice flour", "almond flour", "coconut flour", "corn flour", "cornflour",
        "chickpea flour", "buckwheat flour", "tapioca flour", "potato flour", "rice noodle",
        "rice noodles", "glass noodles", "corn tortilla", "corn tortillas", "tamari", "cornbread",
        "root beer",
    ],
    "tree_nut": ["nutmeg", "coconut", "butternut", "doughnut", "donut", "peanut", "water chestnut", "nutritional yeast"],
    "fish": ["fish-free"],
    "vegetarian": ["vegetable stock", "vegetable broth", "vegan", "vegetarian", "meatless", "plant-based"],
    "vegan": [
        "coconut milk", "coconut cream", "almond milk", "oat milk", "soy milk", "rice milk", "plant milk",
        "peanut butter", "almond butter", "nut butter", "cocoa butter", "butternut", "butter bean",
        "butter beans", "eggplant", "vegetable stock", "vegetable broth", "vegan", "cream of tartar",
    ],
    "halal": ["halal", "wine vinegar", "red wine vinegar", "white wine vinegar", "rice vinegar"],
    "pescatarian": ["vegetable stock", "vegetable broth", "vegan", "vegetarian", "meatless"],
}


def _pattern(words: list[str]) -> re.Pattern | None:
    if not words:
        return None
    # Whole words, allowing a plural "s"/"es" ending.
    body = "|".join(re.escape(w) for w in sorted(set(words), key=len, reverse=True))
    return re.compile(rf"\b(?:{body})(?:e?s)?\b")


_RULES: dict[str, re.Pattern | None] = {
    **{f"allergy:{name}": _pattern(words) for name, words in ALLERGEN_WORDS.items()},
    **{f"diet:{name}": _pattern(words) for name, words in DIET_WORDS.items()},
}


def _clean(text: str, rule: str) -> str:
    text = text.lower()
    for phrase in sorted(SAFE.get(rule, []), key=len, reverse=True):
        text = text.replace(phrase, " ")
    return text


def violations(texts: list[str], allergies: list[str], diet: str) -> list[str]:
    """Return a readable reason for every rule the texts break (empty list = safe)."""
    found = []
    checks = [(f"allergy:{a}", a) for a in allergies] + ([(f"diet:{diet}", diet)] if diet != "none" else [])
    for key, name in checks:
        pattern = _RULES.get(key)
        if pattern is None:
            continue
        for text in texts:
            match = pattern.search(_clean(text, name))
            if match:
                found.append(f"{name}: '{text}' contains '{match.group(0)}'")
                break
    return found


def is_safe(texts: list[str], allergies: list[str], diet: str) -> bool:
    return not violations(texts, allergies, diet)
