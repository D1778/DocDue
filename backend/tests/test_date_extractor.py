from datetime import date

import pytest

from app.services.date_extractor import extract_expiry, find_dates

TODAY = date(2026, 10, 17)


@pytest.mark.parametrize("text, expected", [
    ("Passport\nDate of Issue 05/03/2018\nDate of Expiry 04/03/2028", date(2028, 3, 4)),
    ("Valid till 31 Dec 2027", date(2027, 12, 31)),
    ("DOB: 01-01-1999   Valid upto: 15/08/2031", date(2031, 8, 15)),
    ("Expires: 2029-02-28", date(2029, 2, 28)),
    ("Policy valid through December 5, 2026", date(2026, 12, 5)),
    ("Exp 31.12.27", date(2027, 12, 31)),
    ("Date of Expiry: 7th March 2029", date(2029, 3, 7)),
    ("Issued 01/01/2020  Expiry 01/01/2030  Renew 01/06/2031", date(2030, 1, 1)),
])
def test_confident_expiry_dates(text, expected):
    result = extract_expiry(text, TODAY)
    assert result.expiry_date == expected
    assert result.confidence >= 0.8
    assert not result.needs_review


def test_numeric_dates_are_day_first():
    # 03/04/2030 is 3 April in India, not March 4
    assert find_dates("Expiry 03/04/2030")[0][0] == date(2030, 4, 3)


def test_impossible_day_month_falls_back_to_month_first():
    assert find_dates("Expiry 12/31/2030")[0][0] == date(2030, 12, 31)


def test_a_single_date_with_no_keyword_needs_review():
    result = extract_expiry("Random text 12/12/2030", TODAY)
    assert result.expiry_date == date(2030, 12, 12)
    assert result.needs_review


def test_birth_date_alone_is_never_trusted():
    result = extract_expiry("Date of Birth: 01/01/1990", TODAY)
    assert result.needs_review


def test_two_expiry_looking_dates_are_ambiguous():
    result = extract_expiry("Expiry 01/01/2030 and also Expiry 01/01/2031", TODAY)
    assert result.needs_review


@pytest.mark.parametrize("text", ["", "no dates in this text", "Expiry 31/02/2027"])
def test_no_usable_date_means_review(text):
    result = extract_expiry(text, TODAY)
    assert result.expiry_date is None
    assert result.needs_review
    assert result.confidence == 0.0