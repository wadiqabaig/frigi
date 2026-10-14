from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Values come from backend/.env (see .env.example)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    secret_key: str = "dev-only-change-me"
    token_days: int = 7
    database_url: str = "sqlite:///./frigi.db"

    detector: str = "mock"
    detector_weights: str = "weights/checkpoint_best_total.pth"
    detector_threshold: float = 0.3

    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.8-flash"
    gemini_fallback_model: str = "gemini-3.5-flash-lite"
    spoonacular_api_key: str = ""
    # "hybrid": Spoonacular recipes picked by Gemini. "llm": Gemini writes recipes (comparison tests).
    chef_source: str = "hybrid"


@lru_cache
def get_settings() -> Settings:
    return Settings()
