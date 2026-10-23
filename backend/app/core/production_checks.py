"""Refuse to start in production with unsafe settings."""
from __future__ import annotations

import logging

from app.core.config import settings

logger = logging.getLogger("docdue")


def problems_for_production() -> list[str]:
    """Return a list of things that must be fixed. Empty list = fine, or not production."""
    if settings.ENVIRONMENT != "production":
        return []
    found: list[str] = []
    if len(settings.SECRET_KEY) < 32:
        found.append("SECRET_KEY must be at least 32 characters in production")
    if not settings.FRONTEND_URL.startswith("https://"):
        found.append("FRONTEND_URL must start with https:// in production")
    if settings.CRON_SECRET and len(settings.CRON_SECRET) < 24:
        found.append("CRON_SECRET must be at least 24 characters (or leave it empty)")
    return found


def check_production_settings() -> None:
    """Called once at startup. Raises ValueError listing every problem at once."""
    found = problems_for_production()
    if found:
        raise ValueError("Unsafe production settings: " + "; ".join(found))
    if settings.ENVIRONMENT == "production" and settings.EMAIL_MODE == "console":
        logger.warning("EMAIL_MODE is 'console' in production: reminders will not be emailed")