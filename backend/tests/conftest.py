import pytest_asyncio
from beanie import init_beanie
from httpx import ASGITransport, AsyncClient
from pymongo import AsyncMongoClient

from app.core.config import settings
from app.models import ALL_MODELS
from main import app

TEST_DB_NAME = "docdue_test"


@pytest_asyncio.fixture(autouse=True)
async def database():
    """Point Beanie at the test database for every test, then wipe it afterwards."""
    client = AsyncMongoClient(settings.MONGODB_URI, tz_aware=True)
    await init_beanie(database=client[TEST_DB_NAME], document_models=ALL_MODELS)
    yield
    await client.drop_database(TEST_DB_NAME)
    await client.close()


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c