"""Check a "Sign in with Google" credential. The only place that talks to Google."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional
from urllib.parse import urlparse

import httpx
from fastapi import HTTPException, status

from app.core.config import settings

TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"
ISSUERS = ("accounts.google.com", "https://accounts.google.com")


@dataclass(frozen=True)
class GoogleProfile:
    email: str
    name: str
    picture: Optional[str]


def _bad_credential() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Google sign-in could not be verified",
    )


def safe_picture(url: Optional[str]) -> Optional[str]:
    """Only keep a picture address that really points at Google's image servers."""
    if not url:
        return None
    parsed = urlparse(url)
    if parsed.scheme == "https" and parsed.hostname and parsed.hostname.endswith(".googleusercontent.com"):
        return url if len(url) <= 500 else None
    return None


async def verify_google_credential(credential: str) -> GoogleProfile:
    """Ask Google whether the credential is genuine and was issued for THIS app."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google sign-in is currently unavailable. Please sign in with your email and password.",
        )
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(TOKENINFO_URL, params={"id_token": credential})
    except httpx.HTTPError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not reach Google. Please try again",
        )
    if resp.status_code != 200:
        raise _bad_credential()

    claims = resp.json()
    email = str(claims.get("email", "")).strip().lower()
    verified = str(claims.get("email_verified", "")).lower() == "true"
    if (
        claims.get("aud") != settings.GOOGLE_CLIENT_ID      # issued for a different app
        or claims.get("iss") not in ISSUERS
        or not email
        or not verified
    ):
        raise _bad_credential()

    name = str(claims.get("name") or email.split("@")[0]).strip()[:100] or "DocDue user"
    return GoogleProfile(email=email, name=name, picture=safe_picture(claims.get("picture")))
