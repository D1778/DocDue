"""Decide what to save after OCR. Pure functions: no database, no network."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime

from app.models.enums import DocumentStatus, OcrStatus
from app.services.date_extractor import ExtractionResult
from app.services.expiry import compute_status, to_utc_midnight


@dataclass(frozen=True)
class Outcome:
    """Exactly what we will write to the document. Built by a pure function."""
    expiry_date: datetime | None
    suggested_expiry_date: datetime | None
    ocr_status: OcrStatus
    ocr_confidence: float | None
    status: DocumentStatus


def decide(result: ExtractionResult | None, soon_days: int,
           today: date | None = None) -> Outcome:
    """Turn an extraction result into the fields to save.

    Confident date  -> saved as the expiry date, status valid/expiring/expired.
    Unsure date     -> kept only as a SUGGESTION; a human must confirm it.
    Nothing / error -> needs_review.
    """
    if result is None or result.expiry_date is None:
        return Outcome(None, None, OcrStatus.NEEDS_REVIEW,
                       result.confidence if result else None,
                       DocumentStatus.NEEDS_REVIEW)

    stamp = to_utc_midnight(result.expiry_date)
    if result.needs_review:
        return Outcome(None, stamp, OcrStatus.NEEDS_REVIEW,
                       result.confidence, DocumentStatus.NEEDS_REVIEW)

    return Outcome(stamp, None, OcrStatus.AUTO_DETECTED, result.confidence,
                   compute_status(stamp, soon_days, today))