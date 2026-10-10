from typing import Optional

from beanie import init_beanie
from pymongo import AsyncMongoClient

from app.core.config import settings
from app.models import ALL_MODELS

client: Optional[AsyncMongoClient] = None


async def init_db() -> None:
    """Connect to Atlas, then create collections and indexes for every model."""
    global client
    client = AsyncMongoClient(settings.MONGODB_URI, tz_aware=True)
    await client.admin.command("ping")  # fail fast if Atlas is unreachable
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=ALL_MODELS,
    )


async def close_db() -> None:
    if client is not None:
        await client.close()