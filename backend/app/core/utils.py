from datetime import datetime, timezone
from typing import Optional

from beanie import PydanticObjectId
from bson.errors import InvalidId


def utcnow() -> datetime:
    """Current time in UTC (timezone-aware). Use this everywhere instead of datetime.now()."""
    return datetime.now(timezone.utc)


def parse_object_id(value: str) -> Optional[PydanticObjectId]:
    """Turn a string into an ObjectId, or return None if it is not a valid id."""
    try:
        return PydanticObjectId(value)
    except (InvalidId, TypeError):
        return None