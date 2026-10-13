from fastapi import APIRouter, Depends

from ..errors import ApiError
from ..models import User
from ..security import current_user

router = APIRouter(prefix="/chef", tags=["chef"])

QUESTIONS = [
    {"key": "cuisine", "text": "What kind of food are you in the mood for?",
     "options": ["Any", "Italian", "Indian", "Asian", "Middle Eastern", "Mexican"]},
    {"key": "mood", "text": "How are you feeling?",
     "options": ["Something quick", "Comfort food", "Something healthy", "Something new"]},
    {"key": "max_minutes", "text": "How much time do you have?", "options": ["15", "30", "60"]},
    {"key": "servings", "text": "How many people are eating?", "options": ["1", "2", "3", "4", "6"]},
]


@router.get("/questions")
def questions():
    return {"questions": QUESTIONS}


def _not_ready():
    raise ApiError(501, "NOT_IMPLEMENTED", "The recipe chef is not available yet.")


# TODO: Spoonacular + Gemini + safety filter. Stubs keep the routes visible in /docs.
@router.post("/options")
def options(user: User = Depends(current_user)):
    _not_ready()


@router.post("/recipe")
def recipe(user: User = Depends(current_user)):
    _not_ready()


@router.post("/swap")
def swap(user: User = Depends(current_user)):
    _not_ready()
