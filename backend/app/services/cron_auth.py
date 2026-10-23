"""Checks the secret sent by the outside scheduler. Pure function, easy to test."""
from __future__ import annotations

import hmac
from typing import Optional


def cron_secret_problem(provided: Optional[str], expected: Optional[str]) -> Optional[int]:
    """Return None if the secret is right, otherwise the HTTP status code to answer with.

    404 = the feature is switched off (no CRON_SECRET set), 401 = wrong or missing secret.
    """
    if not expected:
        return 404
    if not provided:
        return 401
    # compare_digest takes the same time however many characters match
    if not hmac.compare_digest(provided.encode("utf-8"), expected.encode("utf-8")):
        return 401
    return None