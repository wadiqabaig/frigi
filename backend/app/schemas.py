"""Request and response shapes. Field names match docs/api-contract.md."""

from pydantic import BaseModel, EmailStr, Field

from .vocab import Allergy, Diet


class SignupIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    age: int | None = Field(default=None, ge=1, le=120)
    allergies: list[Allergy] = []
    diet: Diet = "none"
    household_size: int = Field(default=1, ge=1, le=20)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserBrief(BaseModel):
    id: int
    name: str
    email: str


class AuthOut(BaseModel):
    token: str
    user: UserBrief


class ProfileOut(BaseModel):
    id: int
    name: str
    email: str
    age: int | None
    allergies: list[str]
    diet: str
    household_size: int


class ProfileUpdate(BaseModel):
    """Send only the fields that change."""

    name: str | None = Field(default=None, min_length=1, max_length=100)
    age: int | None = Field(default=None, ge=1, le=120)
    allergies: list[Allergy] | None = None
    diet: Diet | None = None
    household_size: int | None = Field(default=None, ge=1, le=20)


class Ingredient(BaseModel):
    id: str | None
    name: str


class Detection(BaseModel):
    id: str
    name: str
    confidence: float
    box: list[float]


class PhotoResult(BaseModel):
    index: int
    width: int
    height: int
    detections: list[Detection]


class MergedIngredient(BaseModel):
    id: str
    name: str
    confidence: float
    count: int
    photos: list[int]


class DetectOut(BaseModel):
    photos: list[PhotoResult]
    ingredients: list[MergedIngredient]
    ask_about_staples: list[Ingredient]
    model: str
    elapsed_ms: int
