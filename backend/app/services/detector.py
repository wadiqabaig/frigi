"""Ingredient detection sub-system: turns 1 to 3 photos into one ingredient list."""

import io
import time

from PIL import Image, ImageOps
from pillow_heif import register_heif_opener

from ..config import get_settings
from ..errors import ApiError
from ..vocab import CLASS_NAMES, DISPLAY_NAMES, STAPLES

register_heif_opener()

ALLOWED_FORMATS = {"JPEG", "PNG", "HEIF"}
MAX_BYTES = 10 * 1024 * 1024


def open_photo(data: bytes) -> Image.Image:
    """Validate an upload and return an upright RGB image (FR2)."""
    if len(data) > MAX_BYTES:
        raise ApiError(400, "PHOTO_TOO_LARGE", "Each photo must be 10 MB or smaller.")
    try:
        image = Image.open(io.BytesIO(data))
        image.load()
    except Exception:
        raise ApiError(400, "UNSUPPORTED_PHOTO", "Please upload JPG, PNG or HEIC photos.")
    if image.format not in ALLOWED_FORMATS:
        raise ApiError(400, "UNSUPPORTED_PHOTO", "Please upload JPG, PNG or HEIC photos.")
    # Phone photos store rotation in EXIF; apply it so boxes match what the user sees.
    return ImageOps.exif_transpose(image).convert("RGB")


class MockDetector:
    """Fixed sample output so the app can be built before the model is set up."""

    name = "mock"

    def predict(self, image: Image.Image) -> list[dict]:
        w, h = image.size
        samples = [("eggs", 0.91, 0.10), ("milk", 0.84, 0.40), ("tomato", 0.77, 0.70)]
        return [
            {"id": cls, "confidence": conf, "box": [x * w, 0.3 * h, (x + 0.2) * w, 0.5 * h]}
            for cls, conf, x in samples
        ]


class RFDETRDetector:
    """The fine-tuned RF-DETR Small model chosen in the assignment comparison."""

    name = "rfdetr-small"

    def __init__(self, weights: str, threshold: float):
        import torch
        from rfdetr import RFDETR

        device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = RFDETR.from_checkpoint(weights, device=device, compile=False)
        if list(self.model.class_names) != CLASS_NAMES:
            raise RuntimeError("Checkpoint classes do not match vocab.CLASS_NAMES.")
        self.threshold = threshold

    def predict(self, image: Image.Image) -> list[dict]:
        w, h = image.size
        result = self.model.predict(image, threshold=self.threshold)
        detections = []
        for class_id, score, box in zip(result.class_id, result.confidence, result.xyxy):
            class_id = int(class_id)
            # Id 42 is the model's "background" output, not an ingredient.
            if not 0 <= class_id < len(CLASS_NAMES):
                continue
            x1, y1, x2, y2 = (float(v) for v in box)
            x1, x2 = max(0.0, x1), min(float(w), x2)
            y1, y2 = max(0.0, y1), min(float(h), y2)
            if x2 <= x1 or y2 <= y1:
                continue
            detections.append({"id": CLASS_NAMES[class_id], "confidence": float(score), "box": [x1, y1, x2, y2]})
        return detections


_detector = None


def get_detector():
    """Load the detector once, on first use."""
    global _detector
    if _detector is None:
        settings = get_settings()
        if settings.detector == "rfdetr":
            _detector = RFDETRDetector(settings.detector_weights, settings.detector_threshold)
        else:
            _detector = MockDetector()
    return _detector


def merge(photo_results: list[dict]) -> list[dict]:
    """Combine detections from all photos into one list with no duplicates (FR4)."""
    merged: dict[str, dict] = {}
    for photo in photo_results:
        for det in photo["detections"]:
            item = merged.setdefault(det["id"], {
                "id": det["id"], "name": DISPLAY_NAMES[det["id"]], "confidence": 0.0, "count": 0, "photos": [],
            })
            item["confidence"] = max(item["confidence"], round(det["confidence"], 3))
            item["count"] += 1
            if photo["index"] not in item["photos"]:
                item["photos"].append(photo["index"])
    return sorted(merged.values(), key=lambda item: -item["confidence"])


def detect(photos: list[bytes]) -> dict:
    if not 1 <= len(photos) <= 3:
        raise ApiError(400, "TOO_MANY_PHOTOS", "Please upload between 1 and 3 photos.")
    images = [open_photo(data) for data in photos]
    detector = get_detector()
    start = time.perf_counter()
    photo_results = []
    for index, image in enumerate(images):
        detections = [
            {**det, "name": DISPLAY_NAMES[det["id"]], "confidence": round(det["confidence"], 3),
             "box": [round(v, 1) for v in det["box"]]}
            for det in detector.predict(image)
        ]
        photo_results.append({"index": index, "width": image.width, "height": image.height, "detections": detections})
    elapsed_ms = int((time.perf_counter() - start) * 1000)

    ingredients = merge(photo_results)
    found = {item["id"] for item in ingredients}
    return {
        "photos": photo_results,
        "ingredients": ingredients,
        "ask_about_staples": [s for s in STAPLES if s["id"] is None or s["id"] not in found],
        "model": detector.name,
        "elapsed_ms": elapsed_ms,
    }
