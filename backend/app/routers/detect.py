from fastapi import APIRouter, File, UploadFile
from fastapi.concurrency import run_in_threadpool

from ..schemas import DetectOut, Ingredient
from ..services import detector
from ..vocab import CLASS_NAMES, DISPLAY_NAMES, STAPLES

router = APIRouter(tags=["detection"])


@router.get("/ingredients")
def ingredients() -> dict[str, list[Ingredient]]:
    return {
        "detectable": [{"id": name, "name": DISPLAY_NAMES[name]} for name in CLASS_NAMES],
        "staples": STAPLES,
    }


@router.post("/detect", response_model=DetectOut)
async def detect(photos: list[UploadFile] = File(...)):
    data = [await photo.read() for photo in photos]
    # The model is slow compared with a web request, so run it off the event loop.
    return await run_in_threadpool(detector.detect, data)
