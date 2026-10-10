import uuid
from datetime import timedelta

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings
from app.core.utils import utcnow

ACCESS = "access"
REFRESH = "refresh"


class TokenError(Exception):
    """Raised when a token is invalid, expired, or of the wrong type."""


# ---------- passwords ----------

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"), password_hash.encode("utf-8")
        )
    except ValueError:
        # Malformed hash or an over-long password: treat as "does not match"
        return False


# ---------- tokens ----------

def _create_token(*, user_id: str, tenant_id: str, role: str,
                  token_type: str, expires_delta: timedelta) -> str:
    now = utcnow()
    claims = {
        "sub": user_id,
        "tid": tenant_id,
        "role": role,
        "type": token_type,
        "jti": uuid.uuid4().hex,
        "iat": now,
        "exp": now + expires_delta,
    }
    return jwt.encode(claims, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_access_token(*, user_id: str, tenant_id: str, role: str) -> str:
    return _create_token(
        user_id=user_id, tenant_id=tenant_id, role=role, token_type=ACCESS,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def create_refresh_token(*, user_id: str, tenant_id: str, role: str) -> str:
    return _create_token(
        user_id=user_id, tenant_id=tenant_id, role=role, token_type=REFRESH,
        expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )


def decode_token(token: str, expected_type: str) -> dict:
    """Verify signature and expiry, check the token type, return the payload."""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
    except JWTError as exc:
        raise TokenError("Invalid or expired token") from exc

    if payload.get("type") != expected_type:
        raise TokenError("Wrong token type")
    if not payload.get("sub"):
        raise TokenError("Token has no subject")
    return payload