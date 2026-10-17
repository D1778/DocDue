from typing import Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status

from app.api.deps import get_current_user, get_tenant_document, require_owner_or_admin
from app.core.config import settings
from app.core.utils import utcnow
from app.models.document import DocumentRecord
from app.models.enums import DocumentStatus, DocumentType, OcrStatus
from app.models.user import User
from app.schemas.document import (
    DocumentListResponse,
    DocumentResponse,
    DocumentUpdate,
    UploadUrlRequest,
    UploadUrlResponse,
    ViewUrlResponse,
)
from app.services import ocr_pipeline, storage_service
from app.services.expiry import compute_status, to_utc_midnight

router = APIRouter(prefix="/documents", tags=["Documents"])


# ---------- 1. start an upload ----------

@router.post("/upload-url", response_model=UploadUrlResponse,
             status_code=status.HTTP_201_CREATED)
async def request_upload_url(data: UploadUrlRequest,
                             user: User = Depends(get_current_user)):
    """Create a pending record and hand back a link the browser can PUT the file to."""
    document_id = PydanticObjectId()
    file_key = storage_service.build_object_key(
        user.tenant_id, document_id, data.content_type
    )
    filename = storage_service.clean_filename(data.filename)
    title = (data.title or "").strip() or filename.rsplit(".", 1)[0][:150] or "Untitled"

    document = DocumentRecord(
        id=document_id,
        tenant_id=user.tenant_id,           # always from the token, never from the body
        owner_user_id=user.id,
        title=title,
        document_type=data.document_type,
        original_filename=filename,
        content_type=data.content_type,
        file_size=data.file_size,
        file_key=file_key,
        status=DocumentStatus.PENDING_UPLOAD,
    )
    await document.insert()

    return UploadUrlResponse(
        document_id=document.id,
        upload_url=storage_service.create_upload_url(file_key, data.content_type),
        headers={"Content-Type": data.content_type},
        expires_in=settings.PRESIGNED_URL_EXPIRE_SECONDS,
    )


# ---------- 2. confirm the upload ----------

@router.post("/{document_id}/complete", response_model=DocumentResponse)
async def complete_upload(
    background_tasks: BackgroundTasks,
    document: DocumentRecord = Depends(get_tenant_document),
):
    """Look at the file that actually arrived in S3 and accept or reject it."""
    if document.status != DocumentStatus.PENDING_UPLOAD:
        return DocumentResponse.model_validate(document)    # already done: safe to repeat

    info = await storage_service.inspect_object(document.file_key)
    if info is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The file has not been uploaded yet. Upload it to the upload URL, "
                   "or request a new upload URL if the old one expired.",
        )

    problem = None
    if info.size > settings.MAX_UPLOAD_SIZE_BYTES:
        problem = f"File is too large (maximum {settings.MAX_UPLOAD_SIZE_MB} MB)."
    elif info.content_type != document.content_type:
        problem = "The uploaded file type does not match what was declared."
    elif not storage_service.matches_signature(document.content_type, info.head):
        problem = "The uploaded file is not a valid PDF, JPEG or PNG."

    if problem:
        # Bad file: remove it from S3 and forget the record
        await storage_service.delete_object(document.file_key)
        await document.delete()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{problem} The file has been removed.",
        )

    document.file_size = info.size                  # trust S3's number, not the client's
    document.status = DocumentStatus.PROCESSING     # OCR reads it in the background
    document.ocr_status = OcrStatus.PENDING
    document.updated_at = utcnow()
    await document.save()

    # Runs AFTER this response is sent, so the user is not kept waiting for OCR
    background_tasks.add_task(ocr_pipeline.process_document, document.id)
    return DocumentResponse.model_validate(document)


# ---------- 3. list and read ----------

@router.get("", response_model=DocumentListResponse)
async def list_documents(
    doc_status: Optional[DocumentStatus] = Query(default=None, alias="status"),
    document_type: Optional[DocumentType] = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    user: User = Depends(get_current_user),
):
    conditions = [DocumentRecord.tenant_id == user.tenant_id]       # tenant filter first
    if doc_status is not None:
        conditions.append(DocumentRecord.status == doc_status)
    else:
        # unfinished uploads are hidden unless you ask for them
        conditions.append(DocumentRecord.status != DocumentStatus.PENDING_UPLOAD)
    if document_type is not None:
        conditions.append(DocumentRecord.document_type == document_type)

    query = DocumentRecord.find(*conditions)
    total = await query.count()
    items = await query.sort("-created_at").skip(skip).limit(limit).to_list()
    return DocumentListResponse(
        items=[DocumentResponse.model_validate(d) for d in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(document: DocumentRecord = Depends(get_tenant_document)):
    return DocumentResponse.model_validate(document)


@router.get("/{document_id}/view-url", response_model=ViewUrlResponse)
async def get_view_url(
    download: bool = False,
    document: DocumentRecord = Depends(get_tenant_document),
):
    """A temporary link to view the file (or download it with ?download=true)."""
    if document.status == DocumentStatus.PENDING_UPLOAD or not document.file_key:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This document has no uploaded file yet",
        )
    url = storage_service.create_download_url(
        document.file_key,
        filename=document.original_filename or document.title,
        content_type=document.content_type or "application/octet-stream",
        download=download,
    )
    return ViewUrlResponse(url=url, expires_in=settings.PRESIGNED_URL_EXPIRE_SECONDS)


# ---------- 4. change and delete ----------

@router.patch("/{document_id}", response_model=DocumentResponse)
async def update_document(
    data: DocumentUpdate,
    document: DocumentRecord = Depends(get_tenant_document),
    user: User = Depends(get_current_user),
):
    require_owner_or_admin(document, user)
    if data.title is not None:
        document.title = data.title.strip()
    if data.document_type is not None:
        document.document_type = data.document_type

    if data.expiry_date is not None:
        if document.status == DocumentStatus.PENDING_UPLOAD:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Finish the upload before setting an expiry date",
            )
        # A human-entered date always wins over OCR
        stamp = to_utc_midnight(data.expiry_date)
        document.expiry_date = stamp
        document.suggested_expiry_date = None
        document.ocr_status = OcrStatus.MANUALLY_SET
        document.status = compute_status(stamp, settings.EXPIRING_SOON_DAYS)

    document.updated_at = utcnow()
    await document.save()
    return DocumentResponse.model_validate(document)


@router.post("/{document_id}/reprocess", response_model=DocumentResponse,
             status_code=status.HTTP_202_ACCEPTED)
async def reprocess_document(
    background_tasks: BackgroundTasks,
    document: DocumentRecord = Depends(get_tenant_document),
    user: User = Depends(get_current_user),
):
    """Run OCR again (after a failure, or if the first read was wrong)."""
    require_owner_or_admin(document, user)
    if document.status == DocumentStatus.PENDING_UPLOAD or not document.file_key:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This document has no uploaded file yet",
        )
    if document.status == DocumentStatus.PROCESSING:
        return DocumentResponse.model_validate(document)     # already running

    document.expiry_date = None
    document.suggested_expiry_date = None
    document.ocr_confidence = None
    document.ocr_status = OcrStatus.PENDING
    document.status = DocumentStatus.PROCESSING
    document.updated_at = utcnow()
    await document.save()
    background_tasks.add_task(ocr_pipeline.process_document, document.id)
    return DocumentResponse.model_validate(document)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document: DocumentRecord = Depends(get_tenant_document),
    user: User = Depends(get_current_user),
):
    """Delete for real: the file in S3 first, then the record in MongoDB."""
    require_owner_or_admin(document, user)
    if document.file_key:
        await storage_service.delete_object(document.file_key)   # if this fails, we keep the record
    await document.delete()