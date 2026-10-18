"""Rules for WHEN a reminder is due. Pure functions: no database, no email, no clock."""
from __future__ import annotations

from datetime import date, datetime
from typing import Collection, Optional


def parse_milestones(text: str) -> list[int]:
    """'30, 14,7,1,0' -> [30, 14, 7, 1, 0]  (largest first, duplicates removed)."""
    values: set[int] = set()
    for part in text.split(","):
        part = part.strip()
        if not part:
            continue
        if not part.isdigit():
            raise ValueError(
                f"Bad value '{part}' in REMINDER_DAYS. Use whole numbers like 30,14,7,1,0"
            )
        values.add(int(part))
    if not values:
        raise ValueError("REMINDER_DAYS is empty. Use something like 30,14,7,1,0")
    return sorted(values, reverse=True)


def days_left(expiry: datetime | date, today: date) -> int:
    """Whole days from today to the expiry day. 0 = expires today, negative = already expired."""
    expiry_day = expiry.date() if isinstance(expiry, datetime) else expiry
    return (expiry_day - today).days


def due_threshold(left: int, milestones: list[int],
                  already_sent: Collection[int]) -> Optional[int]:
    """Which reminder (if any) should be sent today for a document with `left` days to go?

    A milestone is "reached" once the days left are at or below it. Of all the reached
    milestones we only look at the SMALLEST one (the most urgent). If that one has been sent
    already, nothing is sent. This also handles a job that missed some days: the document is
    never mailed for the old milestones, only for the one that matches today.
    """
    reached = [m for m in milestones if m >= left]
    if not reached:
        return None
    threshold = min(reached)
    return None if threshold in already_sent else threshold