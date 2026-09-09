from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Literal

class Settings(BaseSettings):
    """Application settings using Pydantic BaseSettings."""
    environment: Literal['development', 'staging', 'production'] = 'development'
    supabase_url: str
    supabase_anon_key: str
    supabase_jwt_secret: str
    gemini_api_key: str
    rate_limit_per_minute: int = 5
    gemini_model: str = 'gemini-3.6-flash'
    gemini_fallback_model: str = 'gemini-flash-latest'
    ai_max_retries: int = 3
    max_file_size_mb: int = 10
    frontend_url: str = "http://localhost:5173"

    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8')

    @property
    def is_production(self) -> bool:
        """Check if environment is production."""
        return self.environment == 'production'

    @property
    def max_file_size_bytes(self) -> int:
        """Get max file size in bytes."""
        return self.max_file_size_mb * 1024 * 1024

settings = Settings()
