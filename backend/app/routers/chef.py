from fastapi import APIRouter, Depends
from fastapi.concurrency import run_in_threadpool

from ..models import User
from ..schemas import OptionsIn, OptionsOut, RecipeIn, RecipeOut, SwapIn, SwapOut
from ..security import current_user
from ..services import chef

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


# Spoonacular and Gemini calls take seconds, so run them off the event loop.
@router.post("/options", response_model=OptionsOut)
async def options(body: OptionsIn, user: User = Depends(current_user)):
    ingredients = [i.model_dump() for i in body.ingredients]
    return await run_in_threadpool(chef.options, user, ingredients, body.answers.model_dump())


@router.post("/recipe", response_model=RecipeOut)
async def recipe(body: RecipeIn, user: User = Depends(current_user)):
    return await run_in_threadpool(chef.recipe, user, body.option_id, body.servings)


@router.post("/swap", response_model=SwapOut)
async def swap(body: SwapIn, user: User = Depends(current_user)):
    return await run_in_threadpool(chef.swap, user, body.recipe_id, body.missing)
