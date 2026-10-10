from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import require_admin
from app.core import security
from app.core.utils import parse_object_id
from app.models.enums import AccountType
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_member(data: UserCreate, admin: User = Depends(require_admin)):
    """An admin adds a team member to their own organization."""
    tenant = await Tenant.get(admin.tenant_id)
    if tenant is None or tenant.account_type == AccountType.PERSONAL:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Personal accounts cannot have additional users",
        )

    if await User.find_one(User.email == data.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    user = User(
        tenant_id=admin.tenant_id,          # always the admin's tenant, never from the request body
        email=data.email,
        full_name=data.full_name.strip(),
        password_hash=security.hash_password(data.password),
        role=data.role,
    )
    await user.insert()
    return UserResponse.model_validate(user)


@router.get("", response_model=List[UserResponse])
async def list_users(admin: User = Depends(require_admin)):
    users = await User.find(User.tenant_id == admin.tenant_id).to_list()
    return [UserResponse.model_validate(u) for u in users]


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, admin: User = Depends(require_admin)):
    not_found = HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    oid = parse_object_id(user_id)
    if oid is None:
        raise not_found

    # Both conditions in one query: right id AND right tenant
    user = await User.find_one(User.id == oid, User.tenant_id == admin.tenant_id)
    if user is None:
        raise not_found
    return UserResponse.model_validate(user)