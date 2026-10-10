from datetime import datetime
from typing import Optional

from beanie import Document, PydanticObjectId
from pydantic import Field
from pymongo import ASCENDING, IndexModel

from app.core.utils import utcnow
from app.models.enums import AlertStatus


class AlertLog(Document):
    document_id: PydanticObjectId
    tenant_id: PydanticObjectId
    threshold_days: int
    channel: str = "email"
    status: AlertStatus = AlertStatus.SENT
    sent_at: datetime = Field(default_factory=utcnow)
    error: Optional[str] = None

    class Settings:
        name = "alert_logs"
        indexes = [
            IndexModel(
                [("document_id", ASCENDING), ("threshold_days", ASCENDING)],
                unique=True,
                name="uniq_alert_per_doc_threshold",
            ),
        ]