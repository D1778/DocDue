"""The daily job: statuses, reminders, orphan uploads and stuck documents."""
from datetime import datetime, timedelta, timezone

import pytest
from beanie import PydanticObjectId

from app.models.alert_log import AlertLog
from app.models.document import DocumentRecord
from app.models.enums import AlertStatus
from app.services import daily_job, ocr_pipeline, storage_service
from app.services.storage_service import StorageError
from tests.helpers import (
    auth_header,
    create_member_token,
    register_org_admin,
    start_upload,
    upload_and_complete,
)

DOCS = "/api/v1/documents"


def utc_today():
    return datetime.now(timezone.utc).date()


async def _admin(client, email="admin.a@example.com", org="Org A"):
    token, _user_id, tenant_id = await register_org_admin(client, email, org)
    return token, PydanticObjectId(tenant_id)


async def _document(client, storage, token, days_from_today, title=None):
    """Upload a document and give it an expiry date `days_from_today` days away."""
    doc_id, done = await upload_and_complete(client, storage, token)
    assert done.status_code == 200
    expiry = (utc_today() + timedelta(days=days_from_today)).isoformat()
    body = {"expiry_date": expiry}
    if title:
        body["title"] = title
    patch = await client.patch(f"{DOCS}/{doc_id}", headers=auth_header(token), json=body)
    assert patch.status_code == 200
    return doc_id


async def _status(client, token, doc_id):
    resp = await client.get(f"{DOCS}/{doc_id}", headers=auth_header(token))
    return resp.json()["status"]


async def _alerts(doc_id):
    return await AlertLog.find(AlertLog.document_id == PydanticObjectId(doc_id)).to_list()


# ---------- statuses ----------

async def test_statuses_move_along_as_days_pass(client, storage, outbox):
    token, _ = await _admin(client)
    doc_id = await _document(client, storage, token, 40)
    assert await _status(client, token, doc_id) == "valid"

    report = await daily_job.run_daily_job(today=utc_today() + timedelta(days=20))
    assert report.statuses_updated == 1
    assert await _status(client, token, doc_id) == "expiring"

    await daily_job.run_daily_job(today=utc_today() + timedelta(days=41))
    assert await _status(client, token, doc_id) == "expired"


async def test_dry_run_changes_and_sends_nothing(client, storage, outbox):
    token, _ = await _admin(client)
    doc_id = await _document(client, storage, token, 5)

    report = await daily_job.run_daily_job(dry_run=True, today=utc_today() + timedelta(days=60))
    assert report.dry_run is True
    assert report.statuses_updated == 1          # it WOULD change
    assert report.reminders_due == 1             # it WOULD send
    assert await _status(client, token, doc_id) == "expiring"   # but nothing changed
    assert outbox.sent == []
    assert await _alerts(doc_id) == []


async def test_documents_without_a_date_are_left_alone(client, storage, outbox):
    token, _ = await _admin(client)
    doc_id, _done = await upload_and_complete(client, storage, token)   # still "processing"
    report = await daily_job.run_daily_job(today=utc_today() + timedelta(days=365))
    assert report.statuses_updated == 0
    assert report.reminders_due == 0
    assert await _status(client, token, doc_id) == "processing"


# ---------- reminders ----------

async def test_a_reminder_is_sent_once(client, storage, outbox):
    token, _ = await _admin(client)
    doc_id = await _document(client, storage, token, 5)

    first = await daily_job.run_daily_job()
    assert first.reminders_due == 1 and first.emails_sent == 1
    assert len(outbox.sent) == 1
    assert outbox.sent[0].to == "admin.a@example.com"
    assert outbox.sent[0].subject == "DocDue reminder: 1 document needs attention"
    logs = await _alerts(doc_id)
    assert [(l.threshold_days, l.status) for l in logs] == [(7, AlertStatus.SENT)]

    again = await daily_job.run_daily_job()          # same day, second run
    assert again.reminders_due == 0
    assert len(outbox.sent) == 1


async def test_the_next_milestone_is_sent_as_the_date_gets_closer(client, storage, outbox):
    token, _ = await _admin(client)
    doc_id = await _document(client, storage, token, 5)

    await daily_job.run_daily_job()                                           # 5 days left -> 7
    await daily_job.run_daily_job(today=utc_today() + timedelta(days=4))      # 1 day left  -> 1
    await daily_job.run_daily_job(today=utc_today() + timedelta(days=5))      # expires today -> 0
    await daily_job.run_daily_job(today=utc_today() + timedelta(days=9))      # expired, already told

    assert len(outbox.sent) == 3
    assert sorted(l.threshold_days for l in await _alerts(doc_id)) == [0, 1, 7]


async def test_a_far_away_document_gets_no_reminder(client, storage, outbox):
    token, _ = await _admin(client)
    await _document(client, storage, token, 200)
    report = await daily_job.run_daily_job()
    assert report.reminders_due == 0
    assert outbox.sent == []


async def test_one_email_lists_all_documents_of_a_person(client, storage, outbox):
    token, _ = await _admin(client)
    await _document(client, storage, token, 3, title="Fire Licence")
    await _document(client, storage, token, 20, title="Trade Licence")

    report = await daily_job.run_daily_job()
    assert report.reminders_due == 2
    assert len(outbox.sent) == 1
    assert outbox.sent[0].subject == "DocDue reminder: 2 documents need attention"
    assert "Fire Licence" in outbox.sent[0].text and "Trade Licence" in outbox.sent[0].text


async def test_owner_and_admin_both_hear_about_it(client, storage, outbox):
    admin_token, _ = await _admin(client)
    member_token = await create_member_token(client, admin_token, "member.a@example.com")
    await _document(client, storage, member_token, 3)          # uploaded by the member

    await daily_job.run_daily_job()
    assert sorted(m.to for m in outbox.sent) == ["admin.a@example.com", "member.a@example.com"]


async def test_a_failed_email_is_tried_again_next_run(client, storage, outbox):
    token, _ = await _admin(client)
    doc_id = await _document(client, storage, token, 5)

    outbox.fail = True
    broken = await daily_job.run_daily_job()
    assert broken.emails_failed == 1 and broken.emails_sent == 0
    logs = await _alerts(doc_id)
    assert [l.status for l in logs] == [AlertStatus.FAILED]

    outbox.fail = False
    fixed = await daily_job.run_daily_job()
    assert fixed.emails_sent == 1
    logs = await _alerts(doc_id)
    assert len(logs) == 1 and logs[0].status == AlertStatus.SENT     # same row, updated


async def test_changing_the_date_restarts_the_reminders(client, storage, outbox):
    token, _ = await _admin(client)
    doc_id = await _document(client, storage, token, 5)
    await daily_job.run_daily_job()
    assert len(outbox.sent) == 1

    new_date = (utc_today() + timedelta(days=6)).isoformat()
    await client.patch(f"{DOCS}/{doc_id}", headers=auth_header(token),
                       json={"expiry_date": new_date})
    assert await _alerts(doc_id) == []

    await daily_job.run_daily_job()
    assert len(outbox.sent) == 2


async def test_a_tenant_run_only_touches_that_tenant(client, storage, outbox):
    token_a, tenant_a = await _admin(client, "admin.a@example.com", "Org A")
    token_b, tenant_b = await _admin(client, "admin.b@example.com", "Org B")
    await _document(client, storage, token_a, 3)
    await _document(client, storage, token_b, 3)

    await daily_job.run_daily_job(tenant_id=tenant_a)
    assert [m.to for m in outbox.sent] == ["admin.a@example.com"]


# ---------- orphan uploads ----------

async def _age(doc_id, **delta):
    """Pretend a document is older than it is."""
    record = await DocumentRecord.get(PydanticObjectId(doc_id))
    old = datetime.now(timezone.utc) - timedelta(**delta)
    record.created_at = old
    record.updated_at = old
    await record.save()


async def test_old_unfinished_uploads_are_removed_with_their_file(client, storage, outbox):
    token, _ = await _admin(client)
    old = (await start_upload(client, token)).json()
    fresh = (await start_upload(client, token)).json()
    storage.put(storage.key_from_url(old["upload_url"]), "application/pdf", b"%PDF-1.4 x")
    await _age(old["document_id"], hours=25)

    report = await daily_job.run_daily_job()
    assert report.orphans_deleted == 1
    assert await DocumentRecord.get(PydanticObjectId(old["document_id"])) is None
    assert storage.objects == {}
    assert await DocumentRecord.get(PydanticObjectId(fresh["document_id"])) is not None


async def test_orphan_record_stays_when_the_file_cannot_be_deleted(client, storage, outbox, monkeypatch):
    token, _ = await _admin(client)
    old = (await start_upload(client, token)).json()
    await _age(old["document_id"], hours=25)

    async def broken(key):
        raise StorageError("S3 is down")
    monkeypatch.setattr(storage_service, "delete_object", broken)

    report = await daily_job.run_daily_job()
    assert report.orphans_deleted == 0
    assert await DocumentRecord.get(PydanticObjectId(old["document_id"])) is not None


async def test_dry_run_does_not_delete_orphans(client, storage, outbox):
    token, _ = await _admin(client)
    old = (await start_upload(client, token)).json()
    await _age(old["document_id"], hours=25)
    report = await daily_job.run_daily_job(dry_run=True)
    assert report.orphans_deleted == 1
    assert await DocumentRecord.get(PydanticObjectId(old["document_id"])) is not None


# ---------- stuck documents ----------

async def test_documents_stuck_on_processing_are_retried(client, storage, outbox, monkeypatch):
    token, _ = await _admin(client)
    stuck_id, _ = await upload_and_complete(client, storage, token)
    fresh_id, _ = await upload_and_complete(client, storage, token)
    await _age(stuck_id, minutes=30)

    seen = []

    async def recorder(document_id):
        seen.append(str(document_id))
    monkeypatch.setattr(ocr_pipeline, "process_document", recorder)

    report = await daily_job.run_daily_job()
    assert report.stuck_reprocessed == 1
    assert seen == [stuck_id]


# ---------- the job as a whole ----------

async def test_a_broken_step_does_not_stop_the_others(client, storage, outbox, monkeypatch):
    token, _ = await _admin(client)
    doc_id = await _document(client, storage, token, 40)

    async def explode(*args, **kwargs):
        raise RuntimeError("step failed")
    monkeypatch.setattr(daily_job, "cleanup_orphans", explode)

    report = await daily_job.run_daily_job(today=utc_today() + timedelta(days=20))
    assert report.orphans_deleted == 0
    assert report.statuses_updated == 1                      # later steps still ran
    assert await _status(client, token, doc_id) == "expiring"


async def test_two_runs_cannot_overlap(client, storage, outbox):
    async with daily_job._run_lock:
        with pytest.raises(daily_job.JobBusy):
            await daily_job.run_daily_job()