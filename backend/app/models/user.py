from datetime import datetime
from typing import Optional

from beanie import Document, PydanticObjectId
from pydantic import Field
from pymongo import ASCENDING, IndexModel

from app.core.utils import utcnow
from app.models.enums import Role


class User(Document):
    tenant_id: PydanticObjectId
    email: str
    full_name: str
    password_hash: str
    role: Role = Role.MEMBER
    is_active: bool = True
    created_at: datetime = Field(default_factory=utcnow)
    last_login_at: Optional[datetime] = None

    class Settings:
        name = "users"
        indexes = [
            IndexModel([("email", ASCENDING)], unique=True, name="uniq_user_email"),
            IndexModel([("tenant_id", ASCENDING)], name="idx_user_tenant"),
        ]