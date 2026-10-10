from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import get_current_user
from app.core import security
from app.core.utils import parse_object_id
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.auth import (
    MeResponse,
    RefreshRequest,
    RegisterRequest,
    RegisterResponse,
    TokenResponse,
)
from app.schemas.user import TenantResponse, UserResponse
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["Auth"])

_UNAUTHORIZED_HEADERS = {"WWW-Authenticate": "Bearer"}


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest):
    tenant, user = await auth_service.register_tenant_with_admin(data)
    return RegisterResponse(
        user=UserResponse.model_validate(user),
        tenant=TenantResponse.model_validate(tenant),
        tokens=auth_service.issue_tokens(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(form: OAuth2PasswordRequestForm = Depends()):
    # OAuth2 forms call the login field "username"; for DocDue it holds the email
    user = await auth_service.authenticate_user(form.username, form.password)
    if user is None:
        # Same message for "no such user" and "wrong password" on purpose
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers=_UNAUTHORIZED_HEADERS,
        )
    return auth_service.issue_tokens(user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest):
    invalid = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired refresh token",
        headers=_UNAUTHORIZED_HEADERS,
    )
    try:
        payload = security.decode_token(body.refresh_token, security.REFRESH)
    except security.TokenError:
        raise invalid

    user_id = parse_object_id(payload["sub"])
    if user_id is None:
        raise invalid

    user = await User.get(user_id)
    if user is None or not user.is_active:
        raise invalid
    return auth_service.issue_tokens(user)


@router.get("/me", response_model=MeResponse)
async def me(current_user: User = Depends(get_current_user)):
    tenant = await Tenant.get(current_user.tenant_id)
    return MeResponse(
        user=UserResponse.model_validate(current_user),
        tenant=TenantResponse.model_validate(tenant),
    )