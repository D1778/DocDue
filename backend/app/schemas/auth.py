from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.models.enums import AccountType
from app.schemas.user import TenantResponse, UserResponse, validate_password_strength


class PasswordChange(BaseModel):
    """Needs current_password only when the account already has a password."""
    current_password: Optional[str] = Field(default=None, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def check_password(cls, v: str) -> str:
        return validate_password_strength(v)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr

    @field_validator("email")
    @classmethod
    def lowercase_email(cls, v: str) -> str:
        return str(v).lower()


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=20, max_length=2048)
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def check_password(cls, v: str) -> str:
        return validate_password_strength(v)


class MessageResponse(BaseModel):
    detail: str


class GoogleLoginRequest(BaseModel):
    credential: str = Field(min_length=20, max_length=4096)   # the ID token from Google


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    account_type: AccountType = AccountType.PERSONAL
    organization_name: Optional[str] = Field(default=None, max_length=120)

    @field_validator("email")
    @classmethod
    def lowercase_email(cls, v: str) -> str:
        return str(v).lower()

    @field_validator("password")
    @classmethod
    def check_password(cls, v: str) -> str:
        return validate_password_strength(v)

    @model_validator(mode="after")
    def organization_needs_a_name(self):
        if self.account_type == AccountType.ORGANIZATION:
            if not (self.organization_name and self.organization_name.strip()):
                raise ValueError("organization_name is required for organization accounts")
        return self


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class RegisterResponse(BaseModel):
    user: UserResponse
    tenant: TenantResponse
    tokens: TokenResponse


class MeResponse(BaseModel):
    user: UserResponse
    tenant: TenantResponse