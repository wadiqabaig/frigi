import io
import os

os.environ["DATABASE_URL"] = "sqlite:///./test_frigi.db"
os.environ["DETECTOR"] = "mock"

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.database import Base, engine
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield


def jpeg_bytes() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (640, 480), "white").save(buffer, format="JPEG")
    return buffer.getvalue()


def signup(email="sara@example.com"):
    return client.post("/auth/signup", json={
        "name": "Sara", "email": email, "password": "password123",
        "allergies": ["peanut", "dairy"], "diet": "halal", "household_size": 3,
    })


def test_health():
    assert client.get("/health").json()["status"] == "ok"


def test_signup_login_and_profile():
    assert signup().status_code == 201
    token = client.post("/auth/login", json={"email": "SARA@example.com", "password": "password123"}).json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    profile = client.get("/profile", headers=headers).json()
    assert profile["allergies"] == ["peanut", "dairy"] and profile["diet"] == "halal"

    updated = client.put("/profile", headers=headers, json={"household_size": 2}).json()
    assert updated["household_size"] == 2 and updated["diet"] == "halal"


def test_duplicate_email_and_bad_login():
    signup()
    assert signup().json()["error"]["code"] == "EMAIL_TAKEN"
    bad = client.post("/auth/login", json={"email": "sara@example.com", "password": "wrong-pass"})
    assert bad.status_code == 401 and bad.json()["error"]["code"] == "INVALID_LOGIN"


def test_unknown_allergy_rejected():
    response = client.post("/auth/signup", json={
        "name": "A", "email": "a@example.com", "password": "password123", "allergies": ["nuts"],
    })
    assert response.status_code == 400 and response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_profile_needs_login():
    assert client.get("/profile").json()["error"]["code"] == "UNAUTHORISED"


def test_detect_merges_photos():
    files = [("photos", (f"p{i}.jpg", jpeg_bytes(), "image/jpeg")) for i in range(2)]
    body = client.post("/detect", files=files).json()
    assert len(body["photos"]) == 2
    eggs = next(item for item in body["ingredients"] if item["id"] == "eggs")
    assert eggs["count"] == 2 and eggs["photos"] == [0, 1]
    assert "Eggs" not in [s["name"] for s in body["ask_about_staples"]]


def test_detect_rejects_four_photos_and_bad_files():
    four = [("photos", (f"p{i}.jpg", jpeg_bytes(), "image/jpeg")) for i in range(4)]
    assert client.post("/detect", files=four).json()["error"]["code"] == "TOO_MANY_PHOTOS"
    bad = [("photos", ("notes.txt", b"hello", "text/plain"))]
    assert client.post("/detect", files=bad).json()["error"]["code"] == "UNSUPPORTED_PHOTO"
