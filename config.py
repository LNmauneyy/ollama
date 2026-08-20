"""Application configuration via environment variables.

Uses pydantic-settings to load from .env file or environment variables.
All configurable values are centralized here — no hardcoded strings in services.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Literal


class Settings(BaseSettings):
    """All configurable application settings.

    Load from .env file in project root, or from environment variables.
    Environment variables take precedence over .env file.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── Ollama ──────────────────────────────────────────────────────────
    ollama_api_url: str = "http://localhost:11434/api/generate"
    vision_model_name: str = "qwen2.5vl:7b"
    synthesis_model_name: str = "qwen2.5vl:7b"

    # ── PDF processing ──────────────────────────────────────────────────
    poppler_path: str = r"C:\poppler\bin"
    max_file_size_mb: int = 30
    max_pages: int = 15

    # ── Timeouts (seconds) ──────────────────────────────────────────────
    page_read_timeout: int = 300
    synthesis_timeout: int = 600

    # ── Concurrency ─────────────────────────────────────────────────────
    max_concurrent_pages: int = 3

    # ── CORS ────────────────────────────────────────────────────────────
    cors_origins: list[str] = ["*"]

    # ── History storage (SQLite) ────────────────────────────────────────
    database_path: str = "history.db"

    # ── Server ──────────────────────────────────────────────────────────
    host: str = "0.0.0.0"
    port: int = 8099


settings = Settings()