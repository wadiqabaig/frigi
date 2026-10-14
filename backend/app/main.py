import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from sqlalchemy import text

from .config import get_settings
from .database import Base, engine
from .errors import register_error_handlers
from .routers import auth, chef, detect, profile
from .services import detector

Base.metadata.create_all(engine)

log = logging.getLogger("uvicorn.error")


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Load the model and run one practice prediction before accepting requests,
    # so the first user photo is not slowed down by start-up work.
    start = time.perf_counter()
    await run_in_threadpool(detector.warm_up)
    log.info("Detector ready in %.1f s", time.perf_counter() - start)
    yield


app = FastAPI(title="Frigi API", version="1.0", lifespan=lifespan)
register_error_handlers(app)

# The app runs on a different address during development (Expo), so allow cross-origin calls.
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(detect.router)
app.include_router(chef.router)


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse("/docs")


@app.get("/health", tags=["system"])
def health():
    detector = "rfdetr-small" if get_settings().detector == "rfdetr" else "mock"
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        database = engine.dialect.name
    except Exception:
        database = "unreachable"
    return {"status": "ok" if database != "unreachable" else "degraded", "detector": detector,
            "database": database, "version": app.version}
