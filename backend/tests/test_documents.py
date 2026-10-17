import pytest

from app.core.config import settings
from tests.helpers import (
    PDF_BYTES,
    auth_header,
    create_member_token,
    register_org_admin,
    start_upload,
    upload_and_complete,
)

DOCS = "/api/v1/documents"


async def _admin(client, email="admin.a@example.com", org="Org A"):
    token, _user_id, tenant_id = await register_org_admin(client, email, org)
    return token, tenant_id


# ---------- starting an upload ----------

async def test_upload_url_requires_login(client, storage):
    resp = await client.post(f"{DOCS}/upload-url", json={
        "filename": "a.pdf", "content_type": "application/pdf", "file_size": 100,
    })
    assert resp.status_code == 401


async def test_upload_url_creates_a_pending_document(client, storage):
    token, tenant_id = await _admin(client)
    resp = await start_upload(client, token)
    assert resp.status_code == 201
    body = resp.json()
    assert body["method"] == "PUT"
    assert body["headers"] == {"Content-Type": "application/pdf"}
    assert body["expires_in"] == settings.PRESIGNED_URL_EXPIRE_SECONDS

    key = storage.key_from_url(body["upload_url"])
    assert key.startswith(f"tenant_{tenant_id}/documents/")
    assert key.endswith(".pdf")

    # unfinished uploads are hidden from the normal list
    listing = await client.get(DOCS, headers=auth_header(token))
    assert listing.json()["total"] == 0


@pytest.mark.parametrize("overrides", [
    {"content_type": "text/plain"},
    {"content_type": "application/x-msdownload"},
    {"file_size": 0},
    {"file_size": settings.MAX_UPLOAD_SIZE_BYTES + 1},
    {"filename": ""},
])
async def test_upload_url_rejects_invalid_requests(client, storage, overrides):
    token, _ = await _admin(client)
    resp = await start_upload(client, token, **overrides)
    assert resp.status_code == 422


# ---------- completing an upload ----------

async def test_full_upload_flow(client, storage):
    token, _ = await _admin(client)
    doc_id, done = await upload_and_complete(client, storage, token)
    assert done.status_code == 200
    body = done.json()
    assert body["status"] == "processing"
    assert body["file_size"] == len(PDF_BYTES)       # the real size, not the declared 1000
    assert body["title"] == "license"
    assert "file_key" not in body                    # the S3 path stays internal

    listing = await client.get(DOCS, headers=auth_header(token))
    assert listing.json()["total"] == 1


async def test_complete_before_upload_returns_400(client, storage):
    token, _ = await _admin(client)
    resp = await start_upload(client, token)
    doc_id = resp.json()["document_id"]
    done = await client.post(f"{DOCS}/{doc_id}/complete", headers=auth_header(token))
    assert done.status_code == 400
    assert "not been uploaded" in done.json()["detail"]


async def test_complete_is_safe_to_repeat(client, storage):
    token, _ = await _admin(client)
    doc_id, first = await upload_and_complete(client, storage, token)
    second = await client.post(f"{DOCS}/{doc_id}/complete", headers=auth_header(token))
    assert first.status_code == 200
    assert second.status_code == 200


async def test_complete_rejects_a_file_with_the_wrong_signature(client, storage):
    token, _ = await _admin(client)
    doc_id, done = await upload_and_complete(
        client, storage, token, data=b"This is plain text, not a PDF"
    )
    assert done.status_code == 400
    assert storage.objects == {}                      # removed from "S3"
    gone = await client.get(f"{DOCS}/{doc_id}", headers=auth_header(token))
    assert gone.status_code == 404                    # and the record is gone


async def test_complete_rejects_a_file_that_is_too_big(client, storage):
    token, _ = await _admin(client)
    big = b"%PDF-" + b"0" * settings.MAX_UPLOAD_SIZE_BYTES
    _, done = await upload_and_complete(client, storage, token, data=big)
    assert done.status_code == 400
    assert "too large" in done.json()["detail"]
    assert storage.objects == {}


async def test_complete_rejects_a_mismatched_content_type(client, storage):
    token, _ = await _admin(client)
    _, done = await upload_and_complete(
        client, storage, token, data=PDF_BYTES, stored_type="image/png"
    )
    assert done.status_code == 400
    assert storage.objects == {}


# ---------- reading ----------

async def test_view_url_for_a_finished_document(client, storage):
    token, _ = await _admin(client)
    doc_id, _ = await upload_and_complete(client, storage, token)

    view = await client.get(f"{DOCS}/{doc_id}/view-url", headers=auth_header(token))
    assert view.status_code == 200
    assert view.json()["url"].startswith("https://fake-s3.test/download/")
    assert "download=False" in view.json()["url"]

    dl = await client.get(
        f"{DOCS}/{doc_id}/view-url?download=true", headers=auth_header(token)
    )
    assert "download=True" in dl.json()["url"]


async def test_view_url_for_a_pending_document_returns_409(client, storage):
    token, _ = await _admin(client)
    resp = await start_upload(client, token)
    doc_id = resp.json()["document_id"]
    view = await client.get(f"{DOCS}/{doc_id}/view-url", headers=auth_header(token))
    assert view.status_code == 409


async def test_list_filters_and_paging(client, storage):
    token, _ = await _admin(client)
    await upload_and_complete(client, storage, token, document_type="license")
    await upload_and_complete(client, storage, token, document_type="license")
    await upload_and_complete(client, storage, token, document_type="insurance")

    everything = await client.get(DOCS, headers=auth_header(token))
    assert everything.json()["total"] == 3

    licenses = await client.get(f"{DOCS}?document_type=license", headers=auth_header(token))
    assert licenses.json()["total"] == 2

    page = await client.get(f"{DOCS}?limit=1&skip=1", headers=auth_header(token))
    assert page.json()["total"] == 3
    assert len(page.json()["items"]) == 1

    pending_only = await client.get(f"{DOCS}?status=pending_upload", headers=auth_header(token))
    assert pending_only.json()["total"] == 0


async def test_invalid_document_id_returns_404(client, storage):
    token, _ = await _admin(client)
    resp = await client.get(f"{DOCS}/not-an-id", headers=auth_header(token))
    assert resp.status_code == 404


# ---------- changing and deleting ----------

async def test_owner_can_rename_a_document(client, storage):
    token, _ = await _admin(client)
    doc_id, _ = await upload_and_complete(client, storage, token)
    resp = await client.patch(
        f"{DOCS}/{doc_id}", headers=auth_header(token),
        json={"title": "Fire Safety Certificate", "document_type": "certificate"},
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "Fire Safety Certificate"
    assert resp.json()["document_type"] == "certificate"


async def test_delete_removes_the_file_and_the_record(client, storage):
    token, _ = await _admin(client)
    doc_id, _ = await upload_and_complete(client, storage, token)
    assert len(storage.objects) == 1

    resp = await client.delete(f"{DOCS}/{doc_id}", headers=auth_header(token))
    assert resp.status_code == 204
    assert storage.objects == {}                      # really deleted from "S3"
    gone = await client.get(f"{DOCS}/{doc_id}", headers=auth_header(token))
    assert gone.status_code == 404


async def test_members_see_all_tenant_documents_but_cannot_change_others(client, storage):
    admin_token, _ = await _admin(client)
    member_token = await create_member_token(client, admin_token, "staff@example.com")
    doc_id, _ = await upload_and_complete(client, storage, admin_token)

    # the member can see the admin's document
    listing = await client.get(DOCS, headers=auth_header(member_token))
    assert listing.json()["total"] == 1

    # but cannot rename or delete it
    rename = await client.patch(
        f"{DOCS}/{doc_id}", headers=auth_header(member_token), json={"title": "Nope"}
    )
    assert rename.status_code == 403
    delete = await client.delete(f"{DOCS}/{doc_id}", headers=auth_header(member_token))
    assert delete.status_code == 403
    assert len(storage.objects) == 1


async def test_admin_can_delete_a_members_document(client, storage):
    admin_token, _ = await _admin(client)
    member_token = await create_member_token(client, admin_token, "staff@example.com")
    doc_id, _ = await upload_and_complete(client, storage, member_token)

    resp = await client.delete(f"{DOCS}/{doc_id}", headers=auth_header(admin_token))
    assert resp.status_code == 204
    assert storage.objects == {}


# ---------- tenant isolation ----------

async def test_another_tenant_cannot_touch_a_document(client, storage):
    token_a, _ = await _admin(client, "admin.a@example.com", "Org A")
    token_b, _ = await _admin(client, "admin.b@example.com", "Org B")
    doc_id, _ = await upload_and_complete(client, storage, token_a)

    other = auth_header(token_b)
    url = f"{DOCS}/{doc_id}"
    assert (await client.get(url, headers=other)).status_code == 404
    assert (await client.get(f"{url}/view-url", headers=other)).status_code == 404
    assert (await client.post(f"{url}/complete", headers=other)).status_code == 404
    assert (await client.patch(url, headers=other, json={"title": "Hacked"})).status_code == 404
    assert (await client.delete(url, headers=other)).status_code == 404

    # Org B's list is empty
    listing = await client.get(DOCS, headers=other)
    assert listing.json()["total"] == 0

    # and everything is still intact for Org A
    assert len(storage.objects) == 1
    assert (await client.get(url, headers=auth_header(token_a))).status_code == 200


async def test_each_tenant_gets_its_own_storage_prefix(client, storage):
    token_a, tenant_a = await _admin(client, "admin.a@example.com", "Org A")
    token_b, tenant_b = await _admin(client, "admin.b@example.com", "Org B")
    resp_a = await start_upload(client, token_a)
    resp_b = await start_upload(client, token_b)
    key_a = storage.key_from_url(resp_a.json()["upload_url"])
    key_b = storage.key_from_url(resp_b.json()["upload_url"])
    assert key_a.startswith(f"tenant_{tenant_a}/")
    assert key_b.startswith(f"tenant_{tenant_b}/")
    assert tenant_a != tenant_b