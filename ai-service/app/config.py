from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    GROQ_API_KEY: str = "your-groq-key-here"
    AI_SERVICE_KEY: str = "your-shared-secret-here"
    OPENAI_API_KEY: str = "your-openai-key-here"

    DATABASE_URL: str = "postgres://postgres:postgres@localhost:5432/creatorpulse"
    REDIS_URL: str = "redis://localhost:6379"
    RENDER_SERVICE_URL: str = "http://localhost:3001"

    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    MAX_ARTICLE_LENGTH: int = 5000
    PORT: int = 8000
    DEBUG: bool = False

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "allow"


@lru_cache()
def get_settings() -> Settings:
    """
    Cached settings singleton.
    Call get_settings() anywhere to access config without re-reading env.
    """
    return Settings()
