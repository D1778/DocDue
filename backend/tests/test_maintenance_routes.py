from beanie import PydanticObjectId

from app.core.config import settings
from app.models.document import DocumentRecord
from app.models.enums import DocumentStatus
from app.services import scheduler
from tests.helpers import auth_header, create_member_token, register_org_admin
from tests.test_daily_job import _document, _status

MAINT = "/api/v1/maintenance"


async def _admin(client, email="admin.a@example.com", org="Org A"):
    token, _user_id, _tenant_id = await register_org_admin(client, email, org)
    return token


# ---------- who may call it ----------

async def test_endpoints_need_login(client, outbox):
    assert (await client.post(f"{MAINT}/run-daily-job")).status_code == 401
    assert (await client.post(f"{MAINT}/test-email")).status_code == 401


async def test_members_cannot_run_the_job_or_send_test_emails(client, outbox):
    admin = await _admin(client)
    member = await create_member_token(client, admin, "member.a@example.com")
    assert (await client.post(f"{MAINT}/run-daily-job", headers=auth_header(member))).status_code == 403
    assert (await client.post(f"{MAINT}/test-email", headers=auth_header(member))).status_code == 403


# ---------- running the job by hand ----------

async def test_admin_can_run_the_job_and_gets_a_report(client, storage, outbox):
    token = await _admin(client)
    await _document(client, storage, token, 5)

    resp = await client.post(f"{MAINT}/run-daily-job", headers=auth_header(token))
    assert resp.status_code == 200
    body = resp.json()
    assert body["dry_run"] is False
    assert body["reminders_due"] == 1 and body["emails_sent"] == 1
    assert len(outbox.sent) == 1


async def test_dry_run_reports_without_sending(client, storage, outbox):
    token = await _admin(client)
    await _document(client, storage, token, 5)

    resp = await client.post(f"{MAINT}/run-daily-job?dry_run=true", headers=auth_header(token))
    assert resp.json()["dry_run"] is True
    assert resp.json()["reminders_due"] == 1
    assert outbox.sent == []


async def test_an_admin_run_never_touches_another_tenant(client, storage, outbox):
    token_a = await _admin(client, "admin.a@example.com", "Org A")
    token_b = await _admin(client, "admin.b@example.com", "Org B")
    doc_a = await _document(client, storage, token_a, 10)
    # make A's stored status stale on purpose: the date says "expiring", the status says "valid"
    record = await DocumentRecord.get(PydanticObjectId(doc_a))
    record.status = DocumentStatus.VALID
    await record.save()

    await client.post(f"{MAINT}/run-daily-job", headers=auth_header(token_b))
    assert await _status(client, token_a, doc_a) == "valid"      # B's run left it alone
    assert outbox.sent == []

    await client.post(f"{MAINT}/run-daily-job", headers=auth_header(token_a))
    assert await _status(client, token_a, doc_a) == "expiring"   # A's own run fixes it


# ---------- test email ----------

async def test_test_email_goes_to_the_logged_in_admin(client, outbox):
    token = await _admin(client)
    resp = await client.post(f"{MAINT}/test-email", headers=auth_header(token))
    assert resp.status_code == 200
    assert resp.json() == {"mode": "console", "sent_to": "admin.a@example.com"}
    assert [m.to for m in outbox.sent] == ["admin.a@example.com"]


async def test_test_email_failure_is_a_clean_502(client, outbox):
    token = await _admin(client)
    outbox.fail = True
    resp = await client.post(f"{MAINT}/test-email", headers=auth_header(token))
    assert resp.status_code == 502
    assert "fake failure" not in resp.text           # the real reason stays in the server log


# ---------- the scheduler ----------

async def test_scheduler_registers_one_daily_job(monkeypatch):
    monkeypatch.setattr(settings, "SCHEDULER_ENABLED", True)
    monkeypatch.setattr(settings, "DAILY_JOB_HOUR_UTC", 3)
    monkeypatch.setattr(settings, "DAILY_JOB_MINUTE_UTC", 30)
    scheduler.start_scheduler()
    try:
        job = scheduler._scheduler.get_job(scheduler.JOB_ID)
        assert job is not None
        fields = {f.name: str(f) for f in job.trigger.fields}
        assert fields["hour"] == "3" and fields["minute"] == "30"
        assert job.max_instances == 1
    finally:
        scheduler.stop_scheduler()


async def test_scheduler_can_be_switched_off(monkeypatch):
    monkeypatch.setattr(settings, "SCHEDULER_ENABLED", False)
    scheduler.start_scheduler()
    assert scheduler._scheduler is None