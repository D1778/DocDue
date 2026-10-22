import logging
import secrets
from typing import Optional, Tuple

from fastapi import HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.core import security
from app.core.config import settings
from app.core.utils import parse_object_id
from app.core.utils import utcnow
from app.models.enums import AccountType, Role
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.auth import RegisterRequest, TokenResponse
from app.services import email_service, email_templates
from app.services.google_auth import GoogleProfile

logger = logging.getLogger("docdue.auth")


def _email_taken() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="An account with this email already exists",
    )


async def register_tenant_with_admin(data: RegisterRequest) -> Tuple[Tenant, User]:
    """Create a new tenant and its first user, who becomes the admin."""
    if await User.find_one(User.email == data.email):
        raise _email_taken()

    if data.account_type == AccountType.ORGANIZATION:
        tenant_name = data.organization_name.strip()
    else:
        tenant_name = f"{data.full_name.strip()}'s Vault"

    tenant = Tenant(name=tenant_name, account_type=data.account_type)
    await tenant.insert()

    user = User(
        tenant_id=tenant.id,
        email=data.email,
        full_name=data.full_name.strip(),
        password_hash=security.hash_password(data.password),
        role=Role.ADMIN,
    )
    try:
        await user.insert()
    except DuplicateKeyError:
        # Two sign-ups with the same email raced each other: undo the tenant
        await tenant.delete()
        raise _email_taken()

    return tenant, user


async def authenticate_user(email: str, password: str) -> Optional[User]:
    """Return the user if email and password are right and the account is active."""
    user = await User.find_one(User.email == email.strip().lower())
    if user is None or not user.is_active:
        return None
    if not security.verify_password(password, user.password_hash):
        return None

    tenant = await Tenant.get(user.tenant_id)
    if tenant is None or not tenant.is_active:
        return None

    user.last_login_at = utcnow()
    await user.save()
    return user


async def login_or_register_google(profile: GoogleProfile) -> User:
    """Log in the owner of a verified Google email, creating a personal account the first time."""
    user = await User.find_one(User.email == profile.email)
    if user is None:
        tenant = Tenant(name=f"{profile.name}'s Vault", account_type=AccountType.PERSONAL)
        await tenant.insert()
        user = User(
            tenant_id=tenant.id,
            email=profile.email,
            full_name=profile.name,
            # Nobody knows this password: this account signs in with Google.
            password_hash=security.hash_password(secrets.token_urlsafe(32)),
            role=Role.ADMIN,
            has_password=False,
            avatar=profile.picture,
        )
        try:
            await user.insert()
        except DuplicateKeyError:
            await tenant.delete()
            user = await User.find_one(User.email == profile.email)
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account is switched off")
    tenant = await Tenant.get(user.tenant_id)
    if tenant is None or not tenant.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account is switched off")

    if not user.avatar and profile.picture:      # never replace a picture the user chose
        user.avatar = profile.picture
    user.last_login_at = utcnow()
    await user.save()
    return user


async def change_password(user: User, current_password: Optional[str], new_password: str) -> User:
    """Set or change the password of a logged-in user."""
    if user.has_password:
        if not current_password or not security.verify_password(current_password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail="Your current password is not correct")
    user.password_hash = security.hash_password(new_password)
    user.has_password = True
    await user.save()
    return user


async def send_password_reset_email(email: str) -> None:
    """Email a reset link if the address has an active account. Says nothing either way."""
    user = await User.find_one(User.email == email.strip().lower())
    if user is None or not user.is_active:
        return
    token = security.create_reset_token(user_id=str(user.id), password_hash=user.password_hash)
    link = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?token={token}"
    subject, text, html = email_templates.build_password_reset(
        user.full_name, link, security.RESET_TOKEN_MINUTES)
    try:
        await email_service.send_email(user.email, subject, text, html)
    except email_service.EmailError:
        logger.warning("Could not send a password reset email")


async def reset_password(token: str, new_password: str) -> None:
    invalid = HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="This reset link is invalid or has expired. Please ask for a new one")
    try:
        payload = security.decode_token(token, security.RESET)
    except security.TokenError:
        raise invalid
    user_id = parse_object_id(payload["sub"])
    user = await User.get(user_id) if user_id else None
    if user is None or not user.is_active:
        raise invalid
    if payload.get("fp") != security.password_fingerprint(user.password_hash):
        raise invalid          # the link was already used, or the password changed since
    user.password_hash = security.hash_password(new_password)
    user.has_password = True
    await user.save()


def issue_tokens(user: User) -> TokenResponse:
    claims = dict(
        user_id=str(user.id),
        tenant_id=str(user.tenant_id),
        role=user.role.value,
    )
    return TokenResponse(
        access_token=security.create_access_token(**claims),
        refresh_token=security.create_refresh_token(**claims),
    )