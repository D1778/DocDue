from datetime import datetime
from typing import Optional

from beanie import PydanticObjectId
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.enums import AccountType, Role


MAX_AVATAR_CHARS = 150_000   # about 110 KB of image: a 256 px photo is far smaller
AVATAR_PREFIXES = ("data:image/jpeg;base64,", "data:image/png;base64,", "data:image/webp;base64,")


def validate_password_strength(value: str) -> str:
    if len(value.encode("utf-8")) > 72:
        raise ValueError("Password must be at most 72 bytes long")
    if not any(c.isalpha() for c in value) or not any(c.isdigit() for c in value):
        raise ValueError("Password must contain at least one letter and one number")
    return value


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: PydanticObjectId
    tenant_id: PydanticObjectId
    email: str
    full_name: str
    role: Role
    is_active: bool
    created_at: datetime
    last_login_at: Optional[datetime] = None
    avatar: Optional[str] = None


class AvatarUpdate(BaseModel):
    """A profile picture the browser has already shrunk to a small square."""
    avatar: str = Field(max_length=MAX_AVATAR_CHARS)

    @field_validator("avatar")
    @classmethod
    def must_be_a_small_image(cls, v: str) -> str:
        if not v.startswith(AVATAR_PREFIXES):
            raise ValueError("Profile picture must be a JPEG, PNG or WebP image")
        return v


class TenantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: PydanticObjectId
    name: str
    account_type: AccountType
    created_at: datetime


class UserCreate(BaseModel):
    """Body for an admin adding a team member."""
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: Role = Role.MEMBER

    @field_validator("email")
    @classmethod
    def lowercase_email(cls, v: str) -> str:
        return str(v).lower()

    @field_validator("password")
    @classmethod
    def check_password(cls, v: str) -> str:
        return validate_password_strength(v)