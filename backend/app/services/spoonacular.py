"""Spoonacular recipe search, with a disk cache to save the free plan's 50 points a day.

Only ingredient names and allergy/diet tags are sent; never user names or emails.
"""

import hashlib
import json
from pathlib import Path

import httpx

from ..config import get_settings

BASE_URL = "https://api.spoonacular.com"
CACHE_DIR = Path("cache/spoonacular")

# Our allergy and diet words -> Spoonacular's names.
INTOLERANCES = {
    "peanut": "Peanut", "tree_nut": "Tree Nut", "dairy": "Dairy", "egg": "Egg", "gluten": "Gluten",
    "soy": "Soy", "fish": "Seafood", "shellfish": "Shellfish", "sesame": "Sesame",
}
DIETS = {"vegetarian": "vegetarian", "vegan": "vegan", "pescatarian": "pescetarian"}  # no halal option


class SpoonacularUnavailable(Exception):
    """Out of daily points, no key, or the service failed. The chef falls back to Gemini."""


def _get(path: str, params: dict) -> dict | list:
    key = get_settings().spoonacular_api_key
    if not key:
        raise SpoonacularUnavailable("No Spoonacular key set.")
    cache_key = hashlib.sha256(json.dumps([path, params], sort_keys=True).encode()).hexdigest()
    cache_file = CACHE_DIR / f"{cache_key}.json"
    if cache_file.exists():
        return json.loads(cache_file.read_text())
    try:
        response = httpx.get(f"{BASE_URL}{path}", params={**params, "apiKey": key}, timeout=20)
    except httpx.HTTPError as exc:
        raise SpoonacularUnavailable(f"Network error: {exc}") from exc
    if response.status_code == 402:
        raise SpoonacularUnavailable("Daily Spoonacular points used up.")
    if response.status_code != 200:
        raise SpoonacularUnavailable(f"Spoonacular returned {response.status_code}.")
    data = response.json()
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_file.write_text(json.dumps(data))
    return data


def search(ingredients: list[str], allergies: list[str], diet: str, cuisine: str | None,
           max_minutes: int | None, number: int = 10) -> list[dict]:
    """Recipes that use the most of the given ingredients, already filtered by Spoonacular."""
    params = {
        "includeIngredients": ",".join(sorted(ingredients)),
        "sort": "max-used-ingredients",
        "fillIngredients": "true",
        "addRecipeInformation": "true",
        "instructionsRequired": "true",
        "number": number,
    }
    intolerances = [INTOLERANCES[a] for a in allergies if a in INTOLERANCES]
    if intolerances:
        params["intolerances"] = ",".join(sorted(intolerances))
    if diet in DIETS:
        params["diet"] = DIETS[diet]
    if cuisine and cuisine.lower() != "any":
        params["cuisine"] = cuisine
    if max_minutes:
        params["maxReadyTime"] = max_minutes
    results = _get("/recipes/complexSearch", params).get("results", [])
    return [
        {
            "spoonacular_id": r["id"],
            "title": r["title"],
            "minutes": r.get("readyInMinutes"),
            "image_url": r.get("image"),
            "uses": [i["name"] for i in r.get("usedIngredients", [])],
            "missing": [i["name"] for i in r.get("missedIngredients", [])],
            "ingredient_names": [i["name"] for i in r.get("usedIngredients", []) + r.get("missedIngredients", [])],
        }
        for r in results
    ]


def details(spoonacular_id: int) -> dict:
    """Full recipe: ingredients with amounts for the original servings, and steps."""
    r = _get(f"/recipes/{spoonacular_id}/information", {"includeNutrition": "false"})
    steps = [s["step"] for block in r.get("analyzedInstructions", []) for s in block.get("steps", [])]
    return {
        "title": r["title"],
        "servings": r.get("servings") or 1,
        "minutes": r.get("readyInMinutes"),
        "image_url": r.get("image"),
        "ingredients": [
            {"name": i.get("nameClean") or i["name"], "quantity": i.get("amount") or 0, "unit": i.get("unit") or ""}
            for i in r.get("extendedIngredients", [])
        ],
        "steps": steps,
        "source_url": r.get("sourceUrl"),
    }
