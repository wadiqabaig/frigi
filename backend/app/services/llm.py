"""Recipe chef language model (Gemini).

Gemini is asked for JSON that matches a fixed schema, so its answers can be
checked and passed to the safety filter. Only ingredients, the chat answers and
allergy/diet tags are sent; never names or emails.
"""

from functools import lru_cache

from google import genai
from google.genai import types
from pydantic import BaseModel

from ..config import get_settings

SYSTEM = (
    "You are Frigi, a friendly home chef. You suggest realistic home recipes that mainly use "
    "the ingredients the user already has. Never include an ingredient that conflicts with the "
    "user's allergies or diet. Keep titles short and summaries to one sentence."
)


class LLMUnavailable(Exception):
    pass


class Pick(BaseModel):
    index: int
    summary: str


class Picks(BaseModel):
    picks: list[Pick]


class RecipeIngredient(BaseModel):
    name: str
    quantity: float
    unit: str


class GeneratedRecipe(BaseModel):
    title: str
    summary: str
    minutes: int
    servings: int
    ingredients: list[RecipeIngredient]
    steps: list[str]


class GeneratedRecipes(BaseModel):
    recipes: list[GeneratedRecipe]


class Swap(BaseModel):
    name: str
    note: str


class Swaps(BaseModel):
    swaps: list[Swap]


@lru_cache
def _client() -> genai.Client:
    key = get_settings().gemini_api_key
    if not key:
        raise LLMUnavailable("No Gemini key set.")
    # Fail fast (20 s) so the app can show "try again" instead of hanging.
    return genai.Client(api_key=key, http_options=types.HttpOptions(timeout=20_000))


def _ask(prompt: str, schema: type[BaseModel]) -> BaseModel:
    """Ask Gemini for JSON matching `schema`. If the main model is busy, try the backup model."""
    settings = get_settings()
    config = types.GenerateContentConfig(
        system_instruction=SYSTEM,
        response_mime_type="application/json",
        response_schema=schema,
        temperature=0.7,
    )
    errors = []
    for model in dict.fromkeys([settings.gemini_model, settings.gemini_fallback_model]):
        try:
            response = _client().models.generate_content(model=model, contents=prompt, config=config)
            return schema.model_validate_json(response.text)
        except LLMUnavailable:
            raise
        except Exception as exc:
            errors.append(f"{model}: {exc}")
    raise LLMUnavailable("Gemini failed: " + " | ".join(errors))


def _profile_line(allergies: list[str], diet: str, notes: list[str] | None = None) -> str:
    line = f"Allergies: {', '.join(allergies) or 'none'}. Diet: {diet}."
    if notes:
        line += " Notes the user saved after cooking before, follow them where possible: " + "; ".join(notes) + "."
    return line


def _answers_line(answers: dict) -> str:
    return "; ".join(f"{k}: {v}" for k, v in answers.items() if v not in (None, ""))


def pick_options(candidates: list[dict], answers: dict, allergies: list[str], diet: str, count: int = 3,
                 notes: list[str] | None = None) -> list[Pick]:
    """Choose the best `count` Spoonacular recipes for the user's mood and write a one-line pitch."""
    listing = "\n".join(
        f"{i}. {c['title']} ({c['minutes']} min) uses: {', '.join(c['uses'])}; also needs: {', '.join(c['missing']) or 'nothing'}"
        for i, c in enumerate(candidates)
    )
    prompt = (
        f"The user answered: {_answers_line(answers)}.\n{_profile_line(allergies, diet, notes)}\n"
        f"Candidate recipes:\n{listing}\n\n"
        f"Pick the {count} best candidates for this user, preferring ones that need fewer extra items "
        f"and match their cuisine, meal type and mood. Return their index numbers and a one-sentence summary for each."
    )
    picks = _ask(prompt, Picks).picks
    valid = [p for p in picks if 0 <= p.index < len(candidates)]
    return list({p.index: p for p in valid}.values())[:count]


def generate_options(ingredients: list[str], answers: dict, allergies: list[str], diet: str, count: int = 3,
                     notes: list[str] | None = None) -> list[GeneratedRecipe]:
    """Write recipes from scratch (used when Spoonacular is unavailable, and for comparison testing)."""
    prompt = (
        f"Ingredients the user has: {', '.join(ingredients)}.\n"
        f"The user answered: {_answers_line(answers)}.\n{_profile_line(allergies, diet, notes)}\n\n"
        f"Write {count} different recipes that mainly use these ingredients and match the cuisine and meal type asked for. "
        f"If must_include is given, every recipe must use those foods. Common pantry items "
        f"(salt, pepper, oil, water) may be added. Give quantities for the number of servings you state, "
        f"using units such as g, ml, tsp, tbsp, cup or an empty unit for whole items. Always give an exact amount of salt "
        f"if the dish uses salt. Steps must be short."
    )
    return _ask(prompt, GeneratedRecipes).recipes[:count]


def suggest_swaps(title: str, missing: str, recipe_ingredients: list[str], allergies: list[str], diet: str,
                  notes: list[str] | None = None) -> list[Swap]:
    prompt = (
        f"Recipe: {title}. Its ingredients: {', '.join(recipe_ingredients)}.\n"
        f"{_profile_line(allergies, diet, notes)}\n"
        f"The user does not have: {missing}. Suggest up to 3 replacements with a short note on how much "
        f"to use or how to adjust the recipe."
    )
    return _ask(prompt, Swaps).swaps[:3]
