"""The daily maintenance job: four small steps, each safe to run again at any time."""
from __future__ import annotations

import asyncio
import logging
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from beanie import PydanticObjectId
from pydantic import BaseModel

from app.core.config import settings
from app.core.utils import utcnow
from app.models.document import DocumentRecord
from app.models.enums import DocumentStatus, Role
from app.models.user import User
from app.services import alerts, email_service, ocr_pipeline, storage_service
from app.services.email_service import EmailError
from app.services.email_templates import ReminderItem, build_digest
from app.services.expiry import compute_status
from app.services.reminder_rules import days_left, due_threshold, parse_milestones
from app.services.storage_service import StorageError

logger = logging.getLogger("docdue.job")

TRACKED = [DocumentStatus.VALID.value, DocumentStatus.EXPIRING.value, DocumentStatus.EXPIRED.value]
STUCK_BATCH = 50

_run_lock = asyncio.Lock()


class JobBusy(Exception):
    """The job is already running in this server."""


class JobReport(BaseModel):
    dry_run: bool = False
    stuck_reprocessed: int = 0
    orphans_deleted: int = 0
    statuses_updated: int = 0
    reminders_due: int = 0
    emails_sent: int = 0
    emails_failed: int = 0


def _scope(base: dict, tenant_id: Optional[PydanticObjectId]) -> dict:
    """Add a tenant filter when the job is run for one tenant only."""
    if tenant_id is not None:
        base["tenant_id"] = tenant_id
    return base


# ---------- step 1: documents stuck on "processing" ----------

async def rescue_stuck(now: datetime, tenant_id, dry_run: bool) -> int:
    cutoff = now - timedelta(minutes=settings.STUCK_PROCESSING_MINUTES)
    stuck = await DocumentRecord.find(_scope({
        "status": DocumentStatus.PROCESSING.value,
        "updated_at": {"$lt": cutoff},
    }, tenant_id)).limit(STUCK_BATCH).to_list()
    for document in stuck:
        if not dry_run:
            await ocr_pipeline.process_document(document.id)   # never raises, ends the stuck state
    return len(stuck)


# ---------- step 2: orphan uploads ----------

async def cleanup_orphans(now: datetime, tenant_id, dry_run: bool) -> int:
    cutoff = now - timedelta(hours=settings.ORPHAN_AFTER_HOURS)
    orphans = await DocumentRecord.find(_scope({
        "status": DocumentStatus.PENDING_UPLOAD.value,
        "created_at": {"$lt": cutoff},
    }, tenant_id)).to_list()
    removed = 0
    for document in orphans:
        if not dry_run:
            try:
                if document.file_key:
                    await storage_service.delete_object(document.file_key)
            except StorageError:
                logger.warning("Orphan %s: could not delete the S3 file, keeping the record",
                               document.id)
                continue                       # try again tomorrow
            await document.delete()
        removed += 1
    return removed


# ---------- step 3: statuses ----------

async def _tracked_documents(tenant_id) -> list[DocumentRecord]:
    return await DocumentRecord.find(_scope({
        "status": {"$in": TRACKED},
        "expiry_date": {"$ne": None},
    }, tenant_id)).to_list()


async def refresh_statuses(today: date, tenant_id, dry_run: bool) -> int:
    changed = 0
    for document in await _tracked_documents(tenant_id):
        new_status = compute_status(document.expiry_date, settings.EXPIRING_SOON_DAYS, today)
        if new_status != document.status:
            changed += 1
            if not dry_run:
                document.status = new_status
                document.updated_at = utcnow()
                await document.save()
    return changed


# ---------- step 4: reminders ----------

async def send_reminders(today: date, tenant_id, dry_run: bool, report: JobReport) -> None:
    milestones = parse_milestones(settings.REMINDER_DAYS)

    due: list[tuple[DocumentRecord, int, int]] = []        # (document, threshold, days left)
    for document in await _tracked_documents(tenant_id):
        left = days_left(document.expiry_date, today)
        if left > milestones[0]:
            continue                                        # too early for any reminder
        threshold = due_threshold(left, milestones, await alerts.sent_thresholds(document.id))
        if threshold is not None:
            due.append((document, threshold, left))

    report.reminders_due = len(due)
    if dry_run or not due:
        return

    # Who is told? The owner plus the admins of the tenant (active users only).
    admins_by_tenant: dict[PydanticObjectId, list[User]] = {}
    owners: dict[PydanticObjectId, Optional[User]] = {}
    digests: dict[PydanticObjectId, tuple[User, list[ReminderItem]]] = {}
    recipients_of: dict[PydanticObjectId, list[PydanticObjectId]] = {}

    for document, _threshold, left in due:
        if document.tenant_id not in admins_by_tenant:
            admins_by_tenant[document.tenant_id] = await User.find(
                User.tenant_id == document.tenant_id,
                User.role == Role.ADMIN,
                User.is_active == True,                      # noqa: E712
            ).to_list()
        if document.owner_user_id not in owners:
            owners[document.owner_user_id] = await User.get(document.owner_user_id)

        people = list(admins_by_tenant[document.tenant_id])
        owner = owners[document.owner_user_id]
        if owner is not None and owner.is_active and all(p.id != owner.id for p in people):
            people.append(owner)

        recipients_of[document.id] = [p.id for p in people]
        item = ReminderItem(
            document_id=str(document.id),
            title=document.title,
            document_type=document.document_type.value,
            expiry=document.expiry_date.date(),
            days_left=left,
        )
        for person in people:
            digests.setdefault(person.id, (person, []))[1].append(item)

    delivered_to: set[PydanticObjectId] = set()
    for user_id, (user, items) in digests.items():
        subject, text, html = build_digest(user.full_name, items, settings.FRONTEND_URL)
        try:
            await email_service.send_email(user.email, subject, text, html)
            report.emails_sent += 1
            delivered_to.add(user_id)
        except EmailError as exc:
            report.emails_failed += 1
            logger.warning("Reminder email to user %s failed: %s", user_id, exc)

    # A reminder counts as sent when at least one recipient received it
    for document, threshold, _left in due:
        ok = any(uid in delivered_to for uid in recipients_of[document.id])
        await alerts.record_alert(document, threshold, ok,
                                  None if ok else "no recipient could be reached")


# ---------- the whole job ----------

async def run_daily_job(tenant_id: Optional[PydanticObjectId] = None, dry_run: bool = False,
                        today: Optional[date] = None,
                        now: Optional[datetime] = None) -> JobReport:
    if _run_lock.locked():
        raise JobBusy()
    async with _run_lock:
        now = now or datetime.now(timezone.utc)
        today = today or now.date()
        report = JobReport(dry_run=dry_run)

        # Each step is isolated: if one breaks, the others still run
        try:
            report.stuck_reprocessed = await rescue_stuck(now, tenant_id, dry_run)
        except Exception:                                    # noqa: BLE001
            logger.exception("Daily job: step 'stuck documents' failed")
        try:
            report.orphans_deleted = await cleanup_orphans(now, tenant_id, dry_run)
        except Exception:                                    # noqa: BLE001
            logger.exception("Daily job: step 'orphan uploads' failed")
        try:
            report.statuses_updated = await refresh_statuses(today, tenant_id, dry_run)
        except Exception:                                    # noqa: BLE001
            logger.exception("Daily job: step 'statuses' failed")
        try:
            await send_reminders(today, tenant_id, dry_run, report)
        except Exception:                                    # noqa: BLE001
            logger.exception("Daily job: step 'reminders' failed")

        logger.info("Daily job finished: %s", report.model_dump())
        return report