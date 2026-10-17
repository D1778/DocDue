from datetime import datetime
from typing import Dict, List, Optional

from beanie import PydanticObjectId
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.config import settings
from app.models.enums import DocumentStatus, DocumentType, OcrStatus
from app.services.storage_service import ALLOWED_CONTENT_TYPES


class UploadUrlRequest(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
    content_type: str
    file_size: int = Field(gt=0, description="Size in bytes")
    document_type: DocumentType = DocumentType.OTHER
    title: Optional[str] = Field(default=None, max_length=150)

    @field_validator("content_type")
    @classmethod
    def only_allowed_types(cls, v: str) -> str:
        v = v.strip().lower()
        if v not in ALLOWED_CONTENT_TYPES:
            raise ValueError("Only PDF, JPEG and PNG files are allowed")
        return v

    @field_validator("file_size")
    @classmethod
    def not_too_big(cls, v: int) -> int:
        if v > settings.MAX_UPLOAD_SIZE_BYTES:
            raise ValueError(f"File is too large (maximum {settings.MAX_UPLOAD_SIZE_MB} MB)")
        return v


class UploadUrlResponse(BaseModel):
    document_id: PydanticObjectId
    upload_url: str
    method: str = "PUT"
    headers: Dict[str, str]       # headers the browser MUST send with the upload
    expires_in: int               # seconds


class DocumentResponse(BaseModel):
    # Note: file_key is deliberately NOT here. The S3 path stays internal.
    model_config = ConfigDict(from_attributes=True)

    id: PydanticObjectId
    tenant_id: PydanticObjectId
    owner_user_id: PydanticObjectId
    title: str
    document_type: DocumentType
    original_filename: Optional[str] = None
    content_type: Optional[str] = None
    file_size: Optional[int] = None
    expiry_date: Optional[datetime] = None
    ocr_status: OcrStatus
    status: DocumentStatus
    created_at: datetime
    updated_at: datetime


class DocumentListResponse(BaseModel):
    items: List[DocumentResponse]
    total: int
    skip: int
    limit: int


class DocumentUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=150)
    document_type: Optional[DocumentType] = None


class ViewUrlResponse(BaseModel):
    url: str
    expires_in: int