"""Application settings loaded from environment variables / .env file.

All runtime configuration must come through this module. No other module
should read os.environ directly.
"""
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- App ---
    app_name: str = "local-llm-chat"
    environment: str = "development"
    log_level: str = "INFO"

    # --- Server ---
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000

    # --- CORS ---
    # Stored as a raw comma-separated string in the env to avoid Pydantic's
    # default JSON decoding for list-typed env vars.
    cors_origins_raw: str = "http://localhost:5173,http://127.0.0.1:5173"

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.cors_origins_raw.split(",") if o.strip()]

    # --- Database ---
    database_url: str = "sqlite:///./data/app.db"

    # --- Auth ---
    jwt_secret_key: str = "change-me-in-real-env"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60

    # --- LLM providers ---
    groq_api_key: str = ""
    groq_model: str = "llama-3.1-8b-instant"

    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_model: str = "openai/gpt-4o-mini"

@lru_cache
def get_settings() -> Settings:
    """Cached settings accessor — import this everywhere instead of instantiating Settings()."""
    return Settings()
