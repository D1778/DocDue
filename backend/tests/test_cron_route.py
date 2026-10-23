from app.core.config import settings
from app.services import daily_job
from app.services.daily_job import JobReport

URL = "/api/v1/maintenance/cron/daily-job"


async def test_cron_route_is_hidden_when_no_secret_is_set(client, monkeypatch):
    monkeypatch.setattr(settings, "CRON_SECRET", None)
    resp = await client.post(URL, headers={"X-Cron-Secret": "anything"})
    assert resp.status_code == 404


async def test_cron_route_rejects_a_missing_or_wrong_secret(client, monkeypatch):
    monkeypatch.setattr(settings, "CRON_SECRET", "a-long-test-secret-value-1234")
    assert (await client.post(URL)).status_code == 401
    assert (await client.post(URL, headers={"X-Cron-Secret": "nope"})).status_code == 401


async def test_cron_route_runs_the_job_for_all_tenants(client, monkeypatch):
    monkeypatch.setattr(settings, "CRON_SECRET", "a-long-test-secret-value-1234")
    calls = []

    async def fake_run(tenant_id=None, dry_run=False, today=None, now=None):
        calls.append(tenant_id)
        return JobReport(emails_sent=3)

    monkeypatch.setattr(daily_job, "run_daily_job", fake_run)
    resp = await client.post(URL, headers={"X-Cron-Secret": "a-long-test-secret-value-1234"})
    assert resp.status_code == 200
    assert resp.json()["emails_sent"] == 3
    assert calls == [None]               # None = every tenant


async def test_cron_route_answers_409_when_the_job_is_already_running(client, monkeypatch):
    monkeypatch.setattr(settings, "CRON_SECRET", "a-long-test-secret-value-1234")

    async def busy(*args, **kwargs):
        raise daily_job.JobBusy()

    monkeypatch.setattr(daily_job, "run_daily_job", busy)
    resp = await client.post(URL, headers={"X-Cron-Secret": "a-long-test-secret-value-1234"})
    assert resp.status_code == 409