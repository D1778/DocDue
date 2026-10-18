from datetime import date, datetime, timezone

import pytest

from app.services.reminder_rules import days_left, due_threshold, parse_milestones

MILESTONES = [30, 14, 7, 1, 0]


def test_parse_milestones_sorts_and_removes_duplicates():
    assert parse_milestones("1, 7,30 ,14,7,0") == [30, 14, 7, 1, 0]


@pytest.mark.parametrize("bad", ["", " , ", "30,abc", "-5", "7.5"])
def test_parse_milestones_rejects_nonsense(bad):
    with pytest.raises(ValueError):
        parse_milestones(bad)


def test_days_left_counts_calendar_days():
    today = date(2026, 10, 17)
    assert days_left(date(2026, 10, 17), today) == 0
    assert days_left(date(2026, 10, 24), today) == 7
    assert days_left(date(2026, 10, 16), today) == -1
    assert days_left(datetime(2026, 11, 16, tzinfo=timezone.utc), today) == 30


@pytest.mark.parametrize("left, expected", [
    (45, None),     # too early: no milestone reached yet
    (31, None),
    (30, 30),       # exactly on the first milestone
    (20, 30),       # between 30 and 14: still the 30-day reminder
    (14, 14),
    (10, 14),
    (7, 7),
    (3, 7),
    (1, 1),
    (0, 0),         # expires today
    (-1, 0),        # expired: the "0" reminder acts as the expired notice
    (-90, 0),
])
def test_first_reminder_for_each_distance(left, expected):
    assert due_threshold(left, MILESTONES, already_sent=set()) == expected


def test_nothing_is_sent_twice():
    assert due_threshold(20, MILESTONES, already_sent={30}) is None
    assert due_threshold(0, MILESTONES, already_sent={30, 14, 7, 1, 0}) is None


def test_next_milestone_fires_after_the_previous_one_was_sent():
    assert due_threshold(7, MILESTONES, already_sent={30, 14}) == 7


def test_a_missed_stretch_sends_only_the_current_milestone():
    # The job did not run for two weeks: only the reminder that matches today goes out
    assert due_threshold(5, MILESTONES, already_sent=set()) == 7


def test_expired_document_without_a_zero_milestone_sends_the_smallest_once():
    assert due_threshold(-5, [30, 7], already_sent=set()) == 7
    assert due_threshold(-5, [30, 7], already_sent={7}) is None