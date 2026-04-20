"""Application configuration helpers."""

import os
from dataclasses import dataclass
from pathlib import Path

try:
    from dotenv import load_dotenv
except ModuleNotFoundError:  # pragma: no cover - dotenv is optional.
    load_dotenv = None


def _build_default_db_url() -> str:
    data_dir = Path(__file__).resolve().parents[1] / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{data_dir / 'pulseira_clientes.db'}"


def _load_env_file() -> None:
    if load_dotenv is None:
        return
    env_path = Path(__file__).resolve().parents[2] / ".env"
    if env_path.exists():
        load_dotenv(env_path)


@dataclass(frozen=True)
class Settings:
    adler_ai_provider: str
    adler_file_provider: str
    adler_storage_mode: str
    database_url: str
    cloudinary_url: str | None
    groq_api_key: str | None
    huggingface_api_key: str | None
    app_name: str
    openai_api_key: str | None
    openai_model: str
    openai_api_base: str
    supabase_anon_key: str | None
    supabase_service_role_key: str | None
    supabase_url: str | None
    uploadthing_token: str | None


def _build_settings() -> Settings:
    _load_env_file()
    return Settings(
        adler_ai_provider=os.getenv("ADLER_AI_PROVIDER", "groq"),
        adler_file_provider=os.getenv("ADLER_FILE_PROVIDER", "cloudinary"),
        adler_storage_mode=os.getenv("ADLER_STORAGE_MODE", "local"),
        database_url=os.getenv("DATABASE_URL", _build_default_db_url()),
        cloudinary_url=os.getenv("CLOUDINARY_URL"),
        groq_api_key=os.getenv("GROQ_API_KEY"),
        huggingface_api_key=os.getenv("HUGGINGFACE_API_KEY"),
        app_name=os.getenv("APP_NAME", "8-Game Tournament Profiler"),
        openai_api_key=os.getenv("OPENAI_API_KEY"),
        openai_model=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
        openai_api_base=os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1"),
        supabase_anon_key=os.getenv("SUPABASE_ANON_KEY"),
        supabase_service_role_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
        supabase_url=os.getenv("SUPABASE_URL"),
        uploadthing_token=os.getenv("UPLOADTHING_TOKEN"),
    )


settings = _build_settings()
