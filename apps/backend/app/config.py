from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    app_name: str = "RateIt API"
    app_version: str = "1.0.0"
    debug: bool = False

    database_url: str
    database_pool_size: int = 10
    database_max_overflow: int = 20

    supabase_url: Optional[str] = None
    supabase_key: Optional[str] = None
    supabase_bucket: str = "images"

    hash_salt: str = "rateit-secret-salt-change-in-production"

    # Admin authentication
    admin_secret: str = "change-this-admin-secret-in-production"

    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    rate_limit_requests: int = 100
    rate_limit_window: int = 60

    max_image_size: int = 5 * 1024 * 1024

    redis_url: Optional[str] = None

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
