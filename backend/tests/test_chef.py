"""Chef endpoint tests. Spoonacular and Gemini are replaced with fakes, so no API points are used."""

import os

os.environ["DATABASE_URL"] = "sqlite:///./test_frigi.db"
os.environ["DETECTOR"] = "mock"

import pytest
from fastapi.testclient import TestClient

from app.database import Base, engine
from app.main import app
from app.services import chef, llm, spoonacular
from app.services.llm import GeneratedRecipe, LLMUnavailable, Pick, RecipeIngredient, Swap
from app.services.spoonacular import SpoonacularUnavailable

client = TestClient(app)

CANDIDATES = [
    {"spoonacular_id": 1, "title": "Shakshuka", "minutes": 25, "image_url": "img1", "uses": ["eggs", "tomato"],
     "missing": ["onion"], "ingredient_names": ["eggs", "tomato", "onion"]},
    {"spoonacular_id": 2, "title": "Satay Noodles", "minutes": 20, "image_url": "img2", "uses": ["eggs"],
     "missing": ["peanut butter"], "ingredient_names": ["eggs", "peanut butter"]},
    {"spoonacular_id": 3, "title": "Tomato Omelette", "minutes": 10, "image_url": "img3", "uses": ["eggs", "tomato"],
     "missing": [], "ingredient_names": ["eggs", "tomato"]},
    {"spoonacular_id": 4, "title": "Egg Fried Rice", "minutes": 15, "image_url": "img4", "uses": ["eggs"],
     "missing": ["rice"], "ingredient_names": ["eggs", "rice"]},
]

SHAKSHUKA = {"title": "Shakshuka", "servings": 2, "minutes": 25, "image_url": "img1", "steps": ["Cook."],
             "ingredients": [{"name": "eggs", "quantity": 4, "unit": ""},
                             {"name": "tomatoes", "quantity": 3, "unit": ""},
                             {"name": "onion", "quantity": 1, "unit": ""},
                             {"name": "salt", "quantity": 0.5, "unit": "tsp"}]}


@pytest.fixture(autouse=True)
def setup(monkeypatch):
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    monkeypatch.setattr(spoonacular, "search", lambda *a, **k: CANDIDATES)
    monkeypatch.setattr(spoonacular, "details", lambda _id: SHAKSHUKA)
    monkeypatch.setattr(llm, "pick_options", lambda safe, *a, **k: [Pick(index=i, summary=f"pick {i}") for i in range(3)])
    monkeypatch.setattr(llm, "suggest_swaps", lambda *a, **k: [Swap(name="Spring onion", note="3 stalks"),
                                                               Swap(name="Peanuts", note="crushed")])


def login(allergies=("peanut",), diet="vegetarian"):
    response = client.post("/auth/signup", json={"name": "Sara", "email": "s@example.com", "password": "password123",
                                                 "allergies": list(allergies), "diet": diet})
    return {"Authorization": f"Bearer {response.json()['token']}"}


BODY = {"ingredients": [{"id": "eggs", "name": "Eggs"}, {"id": "tomato", "name": "Tomato"}],
        "answers": {"cuisine": "Any", "mood": "Something quick", "servings": 4}}


def test_options_filters_unsafe_and_returns_three():
    body = client.post("/chef/options", json=BODY, headers=login()).json()
    titles = [o["title"] for o in body["options"]]
    assert len(titles) == 3 and "Satay Noodles" not in titles
    assert body["removed_by_safety_filter"] == 1
    assert all(o["source"] == "spoonacular" for o in body["options"])


def test_recipe_scales_and_marks_what_user_has():
    headers = login()
    option_id = client.post("/chef/options", json=BODY, headers=headers).json()["options"][0]["option_id"]
    recipe = client.post("/chef/recipe", json={"option_id": option_id, "servings": 4}, headers=headers).json()
    items = {i["name"]: i for i in recipe["ingredients"]}
    assert items["eggs"]["quantity"] == 8 and items["tomatoes"]["quantity"] == 6
    assert items["eggs"]["have"] and items["tomatoes"]["have"] and items["salt"]["have"]
    assert not items["onion"]["have"]
    assert recipe["safety"] == {"checked": True, "allergies": ["peanut"], "diet": "vegetarian"}


def test_swap_removes_unsafe_suggestions():
    headers = login()
    option_id = client.post("/chef/options", json=BODY, headers=headers).json()["options"][0]["option_id"]
    recipe_id = client.post("/chef/recipe", json={"option_id": option_id, "servings": 2}, headers=headers).json()["recipe_id"]
    swaps = client.post("/chef/swap", json={"recipe_id": recipe_id, "missing": "onion"}, headers=headers).json()["swaps"]
    assert [s["name"] for s in swaps] == ["Spring onion"]


def test_falls_back_to_llm_when_spoonacular_unavailable(monkeypatch):
    def unavailable(*a, **k):
        raise SpoonacularUnavailable("points used up")

    def generate(ingredients, answers, allergies, diet, count=3):
        meat = GeneratedRecipe(title="Chicken Bake", summary="", minutes=40, servings=2, steps=["Bake."],
                               ingredients=[RecipeIngredient(name="chicken", quantity=300, unit="g")])
        veg = [GeneratedRecipe(title=f"Veg {n}", summary="", minutes=15, servings=2, steps=["Cook."],
                               ingredients=[RecipeIngredient(name="eggs", quantity=2, unit="")]) for n in range(3)]
        return [meat, *veg]

    monkeypatch.setattr(spoonacular, "search", unavailable)
    monkeypatch.setattr(llm, "generate_options", generate)
    body = client.post("/chef/options", json=BODY, headers=login()).json()
    assert [o["source"] for o in body["options"]] == ["llm"] * 3
    assert "Chicken Bake" not in [o["title"] for o in body["options"]]
    assert body["removed_by_safety_filter"] == 1


def test_both_services_down_gives_clear_error(monkeypatch):
    monkeypatch.setattr(spoonacular, "search", lambda *a, **k: (_ for _ in ()).throw(SpoonacularUnavailable("x")))
    monkeypatch.setattr(llm, "generate_options", lambda *a, **k: (_ for _ in ()).throw(LLMUnavailable("x")))
    response = client.post("/chef/options", json=BODY, headers=login())
    assert response.status_code == 502 and response.json()["error"]["code"] == "CHEF_UNAVAILABLE"


def test_other_users_option_is_not_found():
    option_id = client.post("/chef/options", json=BODY, headers=login()).json()["options"][0]["option_id"]
    other = client.post("/auth/signup", json={"name": "B", "email": "b@example.com", "password": "password123"}).json()
    response = client.post("/chef/recipe", json={"option_id": option_id, "servings": 2},
                           headers={"Authorization": f"Bearer {other['token']}"})
    assert response.status_code == 404


def test_chef_needs_login():
    assert client.post("/chef/options", json=BODY).status_code == 401


def test_have_it_matching():
    assert chef.have_it("large eggs", ["Eggs"])
    assert chef.have_it("tomatoes", ["Tomato"])
    assert chef.have_it("olive oil", [])
    assert not chef.have_it("onion", ["Eggs", "Tomato"])
    assert not chef.have_it("low salt chicken stock", ["Salt"])
