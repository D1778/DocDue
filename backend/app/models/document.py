from datetime import datetime
from typing import List, Optional

from beanie import Document, PydanticObjectId
from pydantic import Field
from pymongo import ASCENDING, IndexModel

from app.core.utils import utcnow
from app.models.enums import DocumentStatus, DocumentType, OcrStatus


class DocumentRecord(Document):
    tenant_id: PydanticObjectId
    owner_user_id: PydanticObjectId
    title: str
    document_type: DocumentType = DocumentType.OTHER

    # Filled in during upload (Sprint 2)
    original_filename: Optional[str] = None
    content_type: Optional[str] = None
    file_size: Optional[int] = None
    file_key: Optional[str] = None

    # Filled in by OCR or manual entry (Sprint 3)
    expiry_date: Optional[datetime] = None
    ocr_status: OcrStatus = OcrStatus.PENDING
    ocr_confidence: Optional[float] = None
    status: DocumentStatus = DocumentStatus.PROCESSING

    # Tenants this document is also visible to (vault linking)
    shared_with: List[PydanticObjectId] = Field(default_factory=list)

    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "documents"
        indexes = [
            IndexModel([("tenant_id", ASCENDING), ("status", ASCENDING)], name="idx_doc_tenant_status"),
            IndexModel([("tenant_id", ASCENDING), ("expiry_date", ASCENDING)], name="idx_doc_tenant_expiry"),
            IndexModel([("expiry_date", ASCENDING)], name="idx_doc_expiry"),
            IndexModel([("shared_with", ASCENDING)], name="idx_doc_shared_with"),
        ]