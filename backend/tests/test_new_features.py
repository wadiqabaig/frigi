"""Tests for 5 photos, blur warnings, notes, delete account, meal type, salt and Cognito log-in."""

import io
import os
import time

os.environ["DATABASE_URL"] = "sqlite:///./test_frigi.db"
os.environ["DETECTOR"] = "mock"

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw, ImageFilter

from app import security
from app.config import get_settings
from app.database import Base, engine
from app.main import app
from app.services import chef, llm, spoonacular
from app.services.llm import Pick

client = TestClient(app)

RECIPES = [
    {"spoonacular_id": 1, "title": "Mushroom Omelette", "minutes": 10, "image_url": None, "uses": ["eggs"],
     "missing": ["mushrooms"], "ingredient_names": ["eggs", "mushrooms"]},
    {"spoonacular_id": 2, "title": "Tomato Eggs", "minutes": 15, "image_url": None, "uses": ["eggs", "tomato"],
     "missing": [], "ingredient_names": ["eggs", "tomato"]},
    {"spoonacular_id": 3, "title": "Egg Fried Rice", "minutes": 15, "image_url": None, "uses": ["eggs"],
     "missing": ["rice"], "ingredient_names": ["eggs", "rice"]},
    {"spoonacular_id": 4, "title": "Shakshuka", "minutes": 25, "image_url": None, "uses": ["eggs", "tomato"],
     "missing": ["onion"], "ingredient_names": ["eggs", "tomato", "onion"]},
]
DETAILS = {"title": "Tomato Eggs", "servings": 2, "minutes": 15, "image_url": None, "steps": ["Cook."],
           "ingredients": [{"name": "eggs", "quantity": 4, "unit": ""}, {"name": "salt", "quantity": 2, "unit": "servings"}]}
BODY = {"ingredients": [{"id": "eggs", "name": "Eggs"}, {"id": "tomato", "name": "Tomato"}],
        "answers": {"cuisine": "Pakistani", "meal_type": "Main course", "servings": 4}}


@pytest.fixture(autouse=True)
def setup(monkeypatch):
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    calls = {}

    def search(*args, **kwargs):
        calls["args"], calls["kwargs"] = args, kwargs
        return RECIPES

    monkeypatch.setattr(spoonacular, "search", search)
    monkeypatch.setattr(spoonacular, "details", lambda _id: DETAILS)
    monkeypatch.setattr(llm, "pick_options", lambda safe, *a, **k: [Pick(index=i, summary="") for i in range(min(3, len(safe)))])
    return calls


def login(email="s@example.com"):
    token = client.post("/auth/signup", json={"name": "Sara", "email": email, "password": "password123"}).json()["token"]
    return {"Authorization": f"Bearer {token}"}


def jpeg(blur=0):
    image = Image.new("RGB", (800, 600), "white")
    draw = ImageDraw.Draw(image)
    for x in range(0, 800, 20):
        draw.line([(x, 0), (x, 600)], fill="black", width=3)
    if blur:
        image = image.filter(ImageFilter.GaussianBlur(blur))
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG")
    return buffer.getvalue()


def test_five_photos_accepted_and_blur_flagged():
    files = [("photos", (f"p{i}.jpg", jpeg(blur=8 if i == 4 else 0), "image/jpeg")) for i in range(5)]
    photos = client.post("/detect", files=files).json()["photos"]
    assert len(photos) == 5
    assert [p["blurry"] for p in photos] == [False, False, False, False, True]


def test_meal_type_question_and_typed_cuisine(setup):
    keys = [q["key"] for q in client.get("/chef/questions").json()["questions"]]
    assert keys[:2] == ["cuisine", "meal_type"]
    client.post("/chef/options", json=BODY, headers=login())
    assert setup["args"][3] == "Pakistani" and setup["kwargs"]["meal_type"] == "Main course"
    assert spoonacular.spoonacular_cuisine("Pakistani") == "Indian"
    assert spoonacular.spoonacular_cuisine("Klingon") is None
    assert spoonacular.spoonacular_meal_type("Dessert") == "dessert"
    assert spoonacular.spoonacular_meal_type("something sweet") == "dessert"


def test_salt_gets_a_suggested_amount():
    headers = login()
    option_id = client.post("/chef/options", json=BODY, headers=headers).json()["options"][0]["option_id"]
    recipe = client.post("/chef/recipe", json={"option_id": option_id, "servings": 4}, headers=headers).json()
    salt = next(i for i in recipe["ingredients"] if i["name"] == "salt")
    assert salt["quantity"] == 1.0 and salt["unit"] == "tsp" and "adjust to taste" in salt["note"]


def test_salt_helper():
    listed = [{"name": "sea salt", "quantity": 0.5, "unit": "tsp", "have": True}]
    assert chef.with_salt(listed, 2, "Main course") == listed
    added = chef.with_salt([{"name": "eggs", "quantity": 4, "unit": "", "have": True}], 2, None)
    assert added[-1]["name"] == "salt" and added[-1]["quantity"] == 0.5
    assert chef.with_salt([{"name": "sugar", "quantity": 1, "unit": "cup", "have": True}], 4, "Dessert")[-1]["name"] == "sugar"
    stock = chef.with_salt([{"name": "low salt chicken stock", "quantity": 2, "unit": "cup", "have": False}], 2, None)
    assert stock[0]["quantity"] == 2 and stock[-1]["name"] == "salt"


def test_notes_saved_listed_deleted_and_used():
    headers = login()
    note = client.post("/profile/notes", json={"text": "No mushrooms next time please"}, headers=headers).json()
    assert client.get("/profile", headers=headers).json()["chef_notes"][0]["text"] == "No mushrooms next time please"
    body = client.post("/chef/options", json=BODY, headers=headers).json()
    assert "Mushroom Omelette" not in [o["title"] for o in body["options"]]
    assert body["removed_by_your_notes"] == 1
    assert client.delete(f"/profile/notes/{note['id']}", headers=headers).status_code == 204
    assert client.get("/profile", headers=headers).json()["chef_notes"] == []


def test_disliked_terms():
    assert chef.disliked_terms(["No mushrooms or onions next time", "less spicy", "I don't like coriander and mint"]) == \
        ["mushrooms", "onions", "coriander", "mint"]
    assert chef.disliked_terms(["No parsley next time (after Easy Tabouleh)"]) == ["parsley"]
    assert chef.disliked_terms(["no parsley because my kid hates it", "Without red onion please."]) == ["parsley", "red onion"]


def test_delete_account():
    headers = login()
    assert client.delete("/profile", headers=headers).status_code == 204
    assert client.get("/profile", headers=headers).status_code == 401


@pytest.fixture
def cognito(monkeypatch):
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    settings = get_settings()
    monkeypatch.setattr(settings, "cognito_user_pool_id", "us-east-1_TEST")
    monkeypatch.setattr(settings, "cognito_client_id", "client123")

    class Keys:
        def get_signing_key_from_jwt(self, token):
            return type("K", (), {"key": key.public_key()})()

    monkeypatch.setattr(security, "_cognito_keys", lambda: Keys())

    def token(sub="abc", email="new@example.com", **extra):
        claims = {"sub": sub, "email": email, "email_verified": True, "name": "Nadia", "token_use": "id",
                  "aud": "client123", "iss": "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_TEST",
                  "exp": int(time.time()) + 600, **extra}
        return {"Authorization": "Bearer " + jwt.encode(claims, key, algorithm="RS256")}
    return token


def test_cognito_token_creates_profile_and_blocks_local_signup(cognito):
    profile = client.get("/profile", headers=cognito()).json()
    assert profile["email"] == "new@example.com" and profile["name"] == "Nadia"
    assert client.get("/profile", headers=cognito()).json()["id"] == profile["id"]
    assert client.post("/auth/login", json={"email": "a@example.com", "password": "password123"}).status_code == 410


def test_cognito_rejects_bad_tokens(cognito):
    assert client.get("/profile", headers=cognito(email_verified=False)).status_code == 401
    assert client.get("/profile", headers=cognito(aud="someone-else")).status_code == 401
    assert client.get("/profile", headers=cognito(token_use="access")).status_code == 401
    assert client.get("/profile", headers=cognito(exp=int(time.time()) - 10)).status_code == 401


def test_cognito_links_existing_profile_by_email(cognito, monkeypatch):
    monkeypatch.setattr(get_settings(), "cognito_user_pool_id", "")
    old = login("old@example.com")
    client.put("/profile", json={"allergies": ["peanut"]}, headers=old)
    monkeypatch.setattr(get_settings(), "cognito_user_pool_id", "us-east-1_TEST")
    assert client.get("/profile", headers=cognito(sub="xyz", email="old@example.com")).json()["allergies"] == ["peanut"]
