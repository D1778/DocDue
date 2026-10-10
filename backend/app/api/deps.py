from beanie import PydanticObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.core import security
from app.core.utils import parse_object_id
from app.models.enums import Role
from app.models.user import User

# tokenUrl powers the "Authorize" button in Swagger UI
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """Identify the caller from the access token. Used by every protected route."""
    try:
        payload = security.decode_token(token, security.ACCESS)
    except security.TokenError:
        raise _unauthorized()

    user_id = parse_object_id(payload["sub"])
    if user_id is None:
        raise _unauthorized()

    user = await User.get(user_id)
    if user is None or not user.is_active:
        raise _unauthorized()

    # The tenant inside the token must still match the database
    if str(user.tenant_id) != payload.get("tid"):
        raise _unauthorized()
    return user


async def get_current_tenant_id(
    user: User = Depends(get_current_user),
) -> PydanticObjectId:
    """The tenant every query in this request must be filtered by."""
    return user.tenant_id


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user