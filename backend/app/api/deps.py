from beanie import PydanticObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.core import security
from app.core.utils import parse_object_id
from app.models.document import DocumentRecord
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


async def get_tenant_document(
    document_id: str,
    user: User = Depends(get_current_user),
) -> DocumentRecord:
    """Load a document by id, but ONLY if it belongs to the caller's tenant.

    Anything else (bad id, unknown id, another tenant's id) gives the same 404,
    so nobody can learn which ids exist.
    """
    not_found = HTTPException(
        status_code=status.HTTP_404_NOT_FOUND, detail="Document not found"
    )
    oid = parse_object_id(document_id)
    if oid is None:
        raise not_found

    document = await DocumentRecord.find_one(
        DocumentRecord.id == oid,
        DocumentRecord.tenant_id == user.tenant_id,
    )
    if document is None:
        raise not_found
    return document


def require_owner_or_admin(document: DocumentRecord, user: User) -> None:
    """Only the uploader or a tenant admin may change or delete a document."""
    if user.role != Role.ADMIN and document.owner_user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the uploader or an admin can do this",
        )