from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import Base, engine
from .errors import register_error_handlers
from .routers import auth, chef, detect, profile

Base.metadata.create_all(engine)

app = FastAPI(title="Frigi API", version="1.0")
register_error_handlers(app)

# The app runs on a different address during development (Expo), so allow cross-origin calls.
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(detect.router)
app.include_router(chef.router)


@app.get("/health", tags=["system"])
def health():
    detector = "rfdetr-small" if get_settings().detector == "rfdetr" else "mock"
    return {"status": "ok", "detector": detector, "version": app.version}
