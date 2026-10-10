from datetime import datetime

from beanie import Document
from pydantic import Field

from app.core.utils import utcnow
from app.models.enums import AccountType


class Tenant(Document):
    name: str
    account_type: AccountType = AccountType.PERSONAL
    is_active: bool = True
    created_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "tenants"  # collection name in MongoDB