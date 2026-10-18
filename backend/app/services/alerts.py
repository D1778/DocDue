"""The alert log: a record of which reminders were already sent for which document."""
from __future__ import annotations

from typing import Optional

from beanie import PydanticObjectId
from pymongo.errors import DuplicateKeyError

from app.core.utils import utcnow
from app.models.alert_log import AlertLog
from app.models.document import DocumentRecord
from app.models.enums import AlertStatus


async def sent_thresholds(document_id: PydanticObjectId) -> set[int]:
    """Milestones that were really sent. A FAILED row does not count, so it is tried again."""
    logs = await AlertLog.find(
        AlertLog.document_id == document_id,
        AlertLog.status == AlertStatus.SENT,
    ).to_list()
    return {log.threshold_days for log in logs}


async def record_alert(document: DocumentRecord, threshold: int, ok: bool,
                       error: Optional[str] = None) -> None:
    """Write (or update) the one row for this document and milestone."""
    status = AlertStatus.SENT if ok else AlertStatus.FAILED
    existing = await AlertLog.find_one(
        AlertLog.document_id == document.id,
        AlertLog.threshold_days == threshold,
    )
    if existing is not None:
        existing.status = status
        existing.error = None if ok else (error or "")[:200]
        existing.sent_at = utcnow()
        await existing.save()
        return
    try:
        await AlertLog(
            document_id=document.id,
            tenant_id=document.tenant_id,
            threshold_days=threshold,
            status=status,
            error=None if ok else (error or "")[:200],
        ).insert()
    except DuplicateKeyError:
        pass        # another run wrote the same row a moment ago: nothing more to do


async def reset_alerts(document_id: PydanticObjectId) -> None:
    """The expiry date changed, so the old reminders no longer apply. Start fresh."""
    await AlertLog.find(AlertLog.document_id == document_id).delete()