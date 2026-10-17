from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Read values from backend/.env; ignore variables we don't use yet
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- Database ---
    MONGODB_URI: str
    MONGODB_DB_NAME: str = "docdue"

    # --- JWT ---
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # --- AWS S3 ---
    AWS_ACCESS_KEY_ID: str
    AWS_SECRET_ACCESS_KEY: str
    AWS_SESSION_TOKEN: Optional[str] = None      # only for temporary credentials
    AWS_REGION: str = "ap-south-1"
    S3_BUCKET_NAME: str
    S3_ENDPOINT_URL: Optional[str] = None        # only for non-AWS providers
    PRESIGNED_URL_EXPIRE_SECONDS: int = 300
    MAX_UPLOAD_SIZE_MB: int = 10

    # --- OCR (Sprint 3) ---
    TESSERACT_CMD: Optional[str] = None          # full path to tesseract.exe if not on PATH
    OCR_LANG: str = "eng"                        # "eng+hin" if you installed Hindi data
    EXPIRING_SOON_DAYS: int = 30                 # "expiring" means this many days or fewer left

    # --- App ---
    ENVIRONMENT: str = "development"
    FRONTEND_URL: str = "http://localhost:3000"

    @property
    def MAX_UPLOAD_SIZE_BYTES(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()