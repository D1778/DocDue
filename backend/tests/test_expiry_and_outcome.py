from datetime import date, datetime, timezone

from app.models.enums import DocumentStatus as S
from app.models.enums import OcrStatus as O
from app.services.date_extractor import extract_expiry
from app.services.expiry import compute_status, to_utc_midnight
from app.services.ocr_outcome import decide

TODAY = date(2026, 10, 17)


def test_status_boundaries():
    assert compute_status(None, 30, TODAY) == S.NEEDS_REVIEW
    assert compute_status(date(2026, 10, 16), 30, TODAY) == S.EXPIRED     # yesterday
    assert compute_status(date(2026, 10, 17), 30, TODAY) == S.EXPIRING    # today still counts
    assert compute_status(date(2026, 11, 16), 30, TODAY) == S.EXPIRING    # exactly 30 days
    assert compute_status(date(2026, 11, 17), 30, TODAY) == S.VALID       # 31 days


def test_status_accepts_a_datetime():
    assert compute_status(to_utc_midnight(date(2026, 10, 10)), 30, TODAY) == S.EXPIRED


def test_confident_result_is_saved_as_the_expiry_date():
    outcome = decide(extract_expiry("Date of Expiry 04/03/2028", TODAY), 30, TODAY)
    assert outcome.expiry_date == datetime(2028, 3, 4, tzinfo=timezone.utc)
    assert outcome.suggested_expiry_date is None
    assert outcome.ocr_status == O.AUTO_DETECTED
    assert outcome.status == S.VALID


def test_confident_result_close_to_today_is_expiring():
    outcome = decide(extract_expiry("Valid till 30/10/2026", TODAY), 30, TODAY)
    assert outcome.status == S.EXPIRING


def test_unsure_result_is_only_a_suggestion():
    outcome = decide(extract_expiry("random 12/12/2030", TODAY), 30, TODAY)
    assert outcome.expiry_date is None                   # reminders must never use this
    assert outcome.suggested_expiry_date == datetime(2030, 12, 12, tzinfo=timezone.utc)
    assert outcome.ocr_status == O.NEEDS_REVIEW
    assert outcome.status == S.NEEDS_REVIEW


def test_nothing_found_and_errors_need_review():
    nothing = decide(extract_expiry("nothing here", TODAY), 30, TODAY)
    assert nothing.expiry_date is None and nothing.status == S.NEEDS_REVIEW
    failed = decide(None, 30, TODAY)
    assert failed.ocr_confidence is None and failed.status == S.NEEDS_REVIEW