"""Find the most likely EXPIRY date in OCR text. Pure functions, no I/O."""
from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date

MONTHS = {
    "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
    "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6, "jul": 7, "july": 7,
    "aug": 8, "august": 8, "sep": 9, "sept": 9, "september": 9,
    "oct": 10, "october": 10, "nov": 11, "november": 11, "dec": 12, "december": 12,
}
_MONTH_RE = "|".join(sorted(MONTHS, key=len, reverse=True))

# 31/12/2027, 31-12-2027, 31.12.2027, 31/12/27
NUMERIC = re.compile(r"(?<!\d)(\d{1,2})\s*[/\-.]\s*(\d{1,2})\s*[/\-.]\s*(\d{4}|\d{2})(?!\d)")
# 2027-12-31
ISO = re.compile(r"(?<!\d)(\d{4})\s*[/\-.]\s*(\d{1,2})\s*[/\-.]\s*(\d{1,2})(?!\d)")
# 31 Dec 2027, 31st December, 2027
DMY_TEXT = re.compile(rf"(?<!\d)(\d{{1,2}})(?:st|nd|rd|th)?[\s\-/.,]*({_MONTH_RE})[a-z]*[\s\-/.,]*(\d{{4}}|\d{{2}})(?!\d)", re.I)
# Dec 31, 2027
MDY_TEXT = re.compile(rf"\b({_MONTH_RE})[a-z]*\.?\s+(\d{{1,2}})(?:st|nd|rd|th)?,?\s+(\d{{4}})(?!\d)", re.I)

EXPIRY_WORDS = ("expiry", "expires", "expire", "expiration", "valid until", "valid upto",
                "valid up to", "valid till", "validity", "date of expiry", "exp date",
                "exp.", "exp:", "renew before", "due date", "valid thru", "valid through",
                "use before", "best before")
ISSUE_WORDS = ("issue", "issued", "date of birth", "dob", "d.o.b", "birth", "born",
               "date of issue", "doi", "printed", "dated", "invoice date", "mfg", "manufactured")

EXP_WORD = re.compile(r"\bexp\b")   # a bare "Exp" label
WINDOW = 45  # characters before a date that we look at for keywords


@dataclass(frozen=True)
class Candidate:
    value: date
    score: int
    reason: str


@dataclass(frozen=True)
class ExtractionResult:
    expiry_date: date | None
    confidence: float          # 0.0 - 1.0
    needs_review: bool
    candidates: tuple[Candidate, ...] = ()


def _year(y: int) -> int:
    return 2000 + y if y < 100 else y


def _make(y: int, m: int, d: int) -> date | None:
    try:
        return date(y, m, d)
    except ValueError:
        return None


def find_dates(text: str) -> list[tuple[date, int, int]]:
    """Return (date, start, end) for each date-looking string. Day-first for numeric dates."""
    found: list[tuple[date, int, int]] = []
    taken: list[tuple[int, int]] = []

    def free(s: int, e: int) -> bool:
        return all(e <= a or s >= b for a, b in taken)

    def add(dt: date | None, m) -> None:
        if dt and free(m.start(), m.end()):
            found.append((dt, m.start(), m.end()))
            taken.append((m.start(), m.end()))

    for m in ISO.finditer(text):
        add(_make(int(m[1]), int(m[2]), int(m[3])), m)
    for m in DMY_TEXT.finditer(text):
        add(_make(_year(int(m[3])), MONTHS[m[2].lower()], int(m[1])), m)
    for m in MDY_TEXT.finditer(text):
        add(_make(int(m[3]), MONTHS[m[1].lower()], int(m[2])), m)
    for m in NUMERIC.finditer(text):
        a, b, y = int(m[1]), int(m[2]), _year(int(m[3]))
        dt = _make(y, b, a)            # day / month / year  (India)
        if dt is None:
            dt = _make(y, a, b)        # impossible as D/M -> try M/D
        add(dt, m)
    found.sort(key=lambda t: t[1])
    return found


def extract_expiry(text: str, today: date | None = None) -> ExtractionResult:
    today = today or date.today()
    low = text.lower()
    dates = find_dates(text)
    if not dates:
        return ExtractionResult(None, 0.0, True)

    cands: list[Candidate] = []
    prev_end = 0
    for dt, start, end in dates:
        # look only at the text between the previous date and this one, so a
        # keyword that belongs to the previous date cannot leak into this one
        window = low[max(prev_end, start - WINDOW):start]
        prev_end = end
        score, reason = 0, "date with no keyword"
        if any(w in window for w in EXPIRY_WORDS) or EXP_WORD.search(window):
            score += 60
            reason = "next to an expiry keyword"
        if any(w in window for w in ISSUE_WORDS):
            score -= 40
            reason = "next to an issue/birth keyword"
        if dt.year < 1990 or dt.year > today.year + 40:
            score -= 50
            reason += " (implausible year)"
        elif dt >= today:
            score += 10          # expiry dates are normally in the future
        cands.append(Candidate(dt, score, reason))

    # nothing near a keyword: only trust it when there is exactly one date
    ranked = sorted(cands, key=lambda c: (c.score, c.value), reverse=True)
    best = ranked[0]
    runner = ranked[1] if len(ranked) > 1 else None

    if best.score >= 60:
        conf = 0.9
        if runner and runner.score >= 60 and runner.value != best.value:
            conf = 0.55      # two expiry-looking dates: ambiguous
    elif len(cands) == 1 and best.score >= 0:
        conf = 0.5
    else:
        conf = 0.2
    needs_review = conf < 0.8
    return ExtractionResult(best.value, conf, needs_review, tuple(ranked[:5]))