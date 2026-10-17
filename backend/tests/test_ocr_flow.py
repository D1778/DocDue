"""The OCR job and the new endpoints, with a fake S3 and a pretend OCR reader."""
from datetime import date

import pytest
from beanie import PydanticObjectId

from app.models.document import DocumentRecord
from app.services import ocr_pipeline
from app.services.date_extractor import ExtractionResult
from tests.helpers import (
    auth_header,
    create_member_token,
    register_org_admin,
    start_upload,
    upload_and_complete,
)

DOCS = "/api/v1/documents"

# Typed dates must pass the "sensible year" check (today's year + 50 at most), so these
# are worked out from today instead of being fixed years that go stale.
FAR_FUTURE = f"{date.today().year + 20}-01-01"
OTHER_FUTURE = f"{date.today().year + 25}-08-08"

# Grab the REAL job now. conftest swaps ocr_pipeline.process_document for a no-op,
# but this name still points at the original function.
real_process_document = ocr_pipeline.process_document


def confident(expiry=date(2099, 1, 1)):
    return ExtractionResult(expiry, 0.9, False)


def unsure(expiry=date(2099, 1, 1)):
    return ExtractionResult(expiry, 0.5, True)


def pretend_ocr_returns(monkeypatch, result):
    monkeypatch.setattr(ocr_pipeline, "analyze_file", lambda data, content_type: result)


async def _admin(client, email="admin.a@example.com", org="Org A"):
    token, _user_id, _tenant_id = await register_org_admin(client, email, org)
    return token


async def _uploaded(client, storage, token):
    doc_id, done = await upload_and_complete(client, storage, token)
    assert done.status_code == 200
    return doc_id


async def _get(client, token, doc_id):
    resp = await client.get(f"{DOCS}/{doc_id}", headers=auth_header(token))
    return resp.json()


# ---------- /complete starts the job ----------

async def test_complete_schedules_the_ocr_job(client, storage, monkeypatch):
    seen = []

    async def recorder(document_id):
        seen.append(str(document_id))

    monkeypatch.setattr(ocr_pipeline, "process_document", recorder)
    token = await _admin(client)
    doc_id = await _uploaded(client, storage, token)
    assert seen == [doc_id]


async def test_complete_returns_processing_immediately(client, storage):
    token = await _admin(client)
    doc_id, done = await upload_and_complete(client, storage, token)
    assert done.json()["status"] == "processing"
    assert done.json()["ocr_status"] == "pending"


# ---------- the job itself ----------

async def test_job_saves_a_confident_date(client, storage, monkeypatch):
    pretend_ocr_returns(monkeypatch, confident())
    token = await _admin(client)
    doc_id = await _uploaded(client, storage, token)

    await real_process_document(PydanticObjectId(doc_id))

    body = await _get(client, token, doc_id)
    assert body["ocr_status"] == "auto_detected"
    assert body["status"] == "valid"
    assert body["expiry_date"].startswith("2099-01-01")
    assert body["ocr_confidence"] == 0.9
    assert body["suggested_expiry_date"] is None


async def test_job_keeps_an_unsure_date_only_as_a_suggestion(client, storage, monkeypatch):
    pretend_ocr_returns(monkeypatch, unsure())
    token = await _admin(client)
    doc_id = await _uploaded(client, storage, token)

    await real_process_document(PydanticObjectId(doc_id))

    body = await _get(client, token, doc_id)
    assert body["status"] == "needs_review"
    assert body["ocr_status"] == "needs_review"
    assert body["expiry_date"] is None
    assert body["suggested_expiry_date"].startswith("2099-01-01")


async def test_job_that_crashes_does_not_leave_the_document_processing(client, storage, monkeypatch):
    def boom(data, content_type):
        raise RuntimeError("tesseract exploded")

    monkeypatch.setattr(ocr_pipeline, "analyze_file", boom)
    token = await _admin(client)
    doc_id = await _uploaded(client, storage, token)

    await real_process_document(PydanticObjectId(doc_id))      # must not raise

    body = await _get(client, token, doc_id)
    assert body["status"] == "needs_review"


async def test_job_ignores_a_document_that_is_not_processing(client, storage, monkeypatch):
    pretend_ocr_returns(monkeypatch, confident())
    token = await _admin(client)
    resp = await start_upload(client, token)              # still pending_upload
    doc_id = resp.json()["document_id"]

    await real_process_document(PydanticObjectId(doc_id))

    record = await DocumentRecord.get(PydanticObjectId(doc_id))
    assert record.status.value == "pending_upload"


async def test_job_does_not_overwrite_a_date_typed_by_a_person(client, storage, monkeypatch):
    pretend_ocr_returns(monkeypatch, confident(date(2099, 1, 1)))
    token = await _admin(client)
    doc_id = await _uploaded(client, storage, token)

    typed = await client.patch(f"{DOCS}/{doc_id}", headers=auth_header(token),
                               json={"expiry_date": OTHER_FUTURE})
    assert typed.status_code == 200
    await real_process_document(PydanticObjectId(doc_id))

    body = await _get(client, token, doc_id)
    assert body["expiry_date"].startswith(OTHER_FUTURE)
    assert body["ocr_status"] == "manually_set"


# ---------- entering the date by hand ----------

async def test_manual_date_sets_status_from_the_date(client, storage):
    token = await _admin(client)
    doc_id = await _uploaded(client, storage, token)

    past = await client.patch(f"{DOCS}/{doc_id}", headers=auth_header(token),
                              json={"expiry_date": "2020-01-01"})
    assert past.json()["status"] == "expired"
    assert past.json()["ocr_status"] == "manually_set"

    future = await client.patch(f"{DOCS}/{doc_id}", headers=auth_header(token),
                                json={"expiry_date": FAR_FUTURE})
    assert future.json()["status"] == "valid"


async def test_manual_date_is_refused_before_the_file_is_uploaded(client, storage):
    token = await _admin(client)
    resp = await start_upload(client, token)
    doc_id = resp.json()["document_id"]
    patch = await client.patch(f"{DOCS}/{doc_id}", headers=auth_header(token),
                               json={"expiry_date": FAR_FUTURE})
    assert patch.status_code == 409


@pytest.mark.parametrize("bad", ["1800-01-01", "3500-01-01", "not-a-date", "2027-13-40"])
async def test_manual_date_must_be_sensible(client, storage, bad):
    token = await _admin(client)
    doc_id = await _uploaded(client, storage, token)
    patch = await client.patch(f"{DOCS}/{doc_id}", headers=auth_header(token),
                               json={"expiry_date": bad})
    assert patch.status_code == 422


async def test_member_cannot_set_someone_elses_date(client, storage):
    admin = await _admin(client)
    member = await create_member_token(client, admin, "member.a@example.com")
    doc_id = await _uploaded(client, storage, admin)
    patch = await client.patch(f"{DOCS}/{doc_id}", headers=auth_header(member),
                               json={"expiry_date": FAR_FUTURE})
    assert patch.status_code == 403


# ---------- reprocess ----------

async def test_reprocess_resets_and_schedules_the_job(client, storage, monkeypatch):
    pretend_ocr_returns(monkeypatch, unsure())
    token = await _admin(client)
    doc_id = await _uploaded(client, storage, token)
    await real_process_document(PydanticObjectId(doc_id))
    assert (await _get(client, token, doc_id))["status"] == "needs_review"

    seen = []

    async def recorder(document_id):
        seen.append(str(document_id))

    monkeypatch.setattr(ocr_pipeline, "process_document", recorder)
    resp = await client.post(f"{DOCS}/{doc_id}/reprocess", headers=auth_header(token))
    assert resp.status_code == 202
    assert resp.json()["status"] == "processing"
    assert resp.json()["suggested_expiry_date"] is None
    assert seen == [doc_id]


async def test_reprocess_needs_an_uploaded_file(client, storage):
    token = await _admin(client)
    resp = await start_upload(client, token)
    doc_id = resp.json()["document_id"]
    again = await client.post(f"{DOCS}/{doc_id}/reprocess", headers=auth_header(token))
    assert again.status_code == 409


async def test_another_tenant_cannot_reprocess_or_set_a_date(client, storage):
    admin_a = await _admin(client, "admin.a@example.com", "Org A")
    admin_b = await _admin(client, "admin.b@example.com", "Org B")
    doc_id = await _uploaded(client, storage, admin_a)

    reprocess = await client.post(f"{DOCS}/{doc_id}/reprocess", headers=auth_header(admin_b))
    patch = await client.patch(f"{DOCS}/{doc_id}", headers=auth_header(admin_b),
                               json={"expiry_date": FAR_FUTURE})
    assert reprocess.status_code == 404
    assert patch.status_code == 404