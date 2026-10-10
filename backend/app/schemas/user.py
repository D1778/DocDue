from datetime import datetime
from typing import Optional

from beanie import PydanticObjectId
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.enums import AccountType, Role


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