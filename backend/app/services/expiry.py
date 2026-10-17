"""Work out valid / expiring / expired from an expiry date. Pure, no database."""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from app.models.enums import DocumentStatus


def to_utc_midnight(d: date) -> datetime:
    """Store a calendar date as midnight UTC so MongoDB (which stores datetimes) keeps it exact."""
    return datetime(d.year, d.month, d.day, tzinfo=timezone.utc)


def compute_status(expiry: datetime | date | None, soon_days: int,
                   today: date | None = None) -> DocumentStatus:
    """No date -> needs_review. Past -> expired. Within soon_days -> expiring. Else valid."""
    if expiry is None:
        return DocumentStatus.NEEDS_REVIEW
    today = today or datetime.now(timezone.utc).date()
    expiry_day = expiry.date() if isinstance(expiry, datetime) else expiry
    if expiry_day < today:
        return DocumentStatus.EXPIRED
    if expiry_day <= today + timedelta(days=soon_days):
        return DocumentStatus.EXPIRING
    return DocumentStatus.VALID