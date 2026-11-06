"""Request and response shapes. Field names match docs/api-contract.md."""

from pydantic import BaseModel, EmailStr, Field, field_validator

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


class Note(BaseModel):
    id: str
    text: str
    created_at: str


class InventoryItem(BaseModel):
    id: str | None = Field(default=None, max_length=60)
    name: str = Field(min_length=1, max_length=80)
    confidence: float | None = None
    source: str = Field(default="manual", max_length=20)


class InventoryIn(BaseModel):
    items: list[InventoryItem] = Field(max_length=200)


class InventoryOut(BaseModel):
    items: list[InventoryItem]


class NoteIn(BaseModel):
    text: str = Field(min_length=1, max_length=300)


class ProfileOut(BaseModel):
    id: int
    name: str
    email: str
    age: int | None
    allergies: list[str]
    diet: str
    household_size: int
    chef_notes: list[Note] = []

    @field_validator("allergies", "chef_notes", mode="before")
    @classmethod
    def _none_is_empty(cls, value):
        return value or []


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
    # Edge-sharpness score; below the threshold the app asks the user to retake the photo.
    sharpness: float
    blurry: bool


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


class ChefAnswers(BaseModel):
    cuisine: str | None = Field(default=None, max_length=50)
    meal_type: str | None = Field(default=None, max_length=50)
    mood: str | None = Field(default=None, max_length=50)
    max_minutes: int | None = Field(default=None, ge=5, le=240)
    servings: int | None = Field(default=None, ge=1, le=20)
    note: str | None = Field(default=None, max_length=200)


class OptionsIn(BaseModel):
    ingredients: list[Ingredient] = Field(min_length=1, max_length=60)
    answers: ChefAnswers = ChefAnswers()


class RecipeOption(BaseModel):
    option_id: str
    title: str
    summary: str
    minutes: int | None
    uses: list[str]
    missing: list[str]
    image_url: str | None
    source: str


class OptionsOut(BaseModel):
    options: list[RecipeOption]
    removed_by_safety_filter: int
    removed_by_your_notes: int = 0
    notice: str | None


class RecipeIn(BaseModel):
    option_id: str
    servings: int = Field(ge=1, le=20)


class RecipeIngredientOut(BaseModel):
    name: str
    quantity: float
    unit: str
    have: bool
    note: str | None = None


class SafetyOut(BaseModel):
    checked: bool
    allergies: list[str]
    diet: str


class RecipeOut(BaseModel):
    recipe_id: str
    title: str
    servings: int
    minutes: int | None
    ingredients: list[RecipeIngredientOut]
    steps: list[str]
    safety: SafetyOut
    image_url: str | None


class SwapIn(BaseModel):
    recipe_id: str
    missing: str = Field(min_length=1, max_length=60)


class SwapItem(BaseModel):
    name: str
    note: str


class SwapOut(BaseModel):
    missing: str
    swaps: list[SwapItem]
