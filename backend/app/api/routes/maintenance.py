import logging
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel

from app.api.deps import require_admin
from app.core.config import settings
from app.models.user import User
from app.services import daily_job, email_service
from app.services.cron_auth import cron_secret_problem
from app.services.daily_job import JobReport
from app.services.email_service import EmailError
from app.services.email_templates import build_test_email

logger = logging.getLogger("docdue")

router = APIRouter(prefix="/maintenance", tags=["Maintenance"])


class EmailTestResult(BaseModel):
    mode: str
    sent_to: str


def require_cron_secret(x_cron_secret: Optional[str] = Header(default=None)) -> None:
    """Lets an outside scheduler (GitHub Actions) start the daily job without a user login."""
    problem = cron_secret_problem(x_cron_secret, settings.CRON_SECRET)
    if problem == status.HTTP_404_NOT_FOUND:
        raise HTTPException(status_code=problem, detail="Not Found")     # switched off
    if problem is not None:
        raise HTTPException(status_code=problem, detail="Invalid secret")


@router.post("/run-daily-job", response_model=JobReport)
async def run_daily_job_now(dry_run: bool = False, admin: User = Depends(require_admin)):
    """Run the daily job now, for YOUR tenant only. With ?dry_run=true nothing is changed or sent."""
    try:
        return await daily_job.run_daily_job(tenant_id=admin.tenant_id, dry_run=dry_run)
    except daily_job.JobBusy:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The daily job is already running. Try again in a minute.",
        )


@router.post("/test-email", response_model=EmailTestResult)
async def send_test_email(admin: User = Depends(require_admin)):
    """Send a test email to the admin who is logged in, to prove the email settings work."""
    subject, text, html = build_test_email(admin.full_name)
    try:
        await email_service.send_email(admin.email, subject, text, html)
    except EmailError as exc:
        logger.warning("Test email failed: %s (cause: %r)", exc, exc.__cause__)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not send the email. Check the email settings and the server log.",
        )
    return EmailTestResult(mode=settings.EMAIL_MODE, sent_to=admin.email)


@router.post("/cron/daily-job", response_model=JobReport)
async def run_daily_job_from_scheduler(_: None = Depends(require_cron_secret)):
    """Run the daily job for ALL tenants. Needs the X-Cron-Secret header."""
    try:
        return await daily_job.run_daily_job()
    except daily_job.JobBusy:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The daily job is already running.",
        )