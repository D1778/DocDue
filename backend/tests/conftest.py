import uuid
from types import SimpleNamespace

import pytest
import pytest_asyncio
from beanie import init_beanie
from httpx import ASGITransport, AsyncClient
from pymongo import AsyncMongoClient

from app.core.config import settings
from app.models import ALL_MODELS
from app.services import email_service, ocr_pipeline, storage_service
from app.services.email_service import EmailError
from main import app
from tests.fake_storage import FakeStorage

# One database name per test run. Two runs at the same time (or a run that was stopped half way)
# can then never see each other's users and fail with "email already exists".
TEST_DB_NAME = f"docdue_test_{uuid.uuid4().hex[:8]}"


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


@pytest.fixture
def storage(monkeypatch):
    """Swap the real S3 functions for an in-memory fake, for tests that ask for it."""
    fake = FakeStorage()
    monkeypatch.setattr(storage_service, "create_upload_url", fake.create_upload_url)
    monkeypatch.setattr(storage_service, "create_download_url", fake.create_download_url)
    monkeypatch.setattr(storage_service, "inspect_object", fake.inspect_object)
    monkeypatch.setattr(storage_service, "delete_object", fake.delete_object)
    monkeypatch.setattr(storage_service, "download_object", fake.download_object)
    return fake


@pytest.fixture(autouse=True)
def no_automatic_ocr(monkeypatch):
    """Keep OCR from running by itself in tests, so each test controls when it happens.

    Tests that want OCR call the real function directly (see test_ocr_flow.py).
    """
    async def do_nothing(document_id):
        return None

    monkeypatch.setattr(ocr_pipeline, "process_document", do_nothing)


@pytest.fixture(autouse=True)
def no_real_email(monkeypatch):
    """Tests must never send a real email, whatever EMAIL_MODE says in your .env."""
    monkeypatch.setattr(settings, "EMAIL_MODE", "console")


class Outbox:
    """Collects the emails the app tries to send. Set .fail = True to make sending fail."""

    def __init__(self):
        self.sent = []
        self.fail = False

    async def send_email(self, to, subject, text, html=None):
        if self.fail:
            raise EmailError("fake failure")
        self.sent.append(SimpleNamespace(to=to, subject=subject, text=text, html=html))


@pytest.fixture
def outbox(monkeypatch):
    box = Outbox()
    monkeypatch.setattr(email_service, "send_email", box.send_email)
    return box