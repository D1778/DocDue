"""The OCR job: download the file, read it, decide what to store."""
from __future__ import annotations

import asyncio
import logging

from beanie import PydanticObjectId

from app.core.config import settings
from app.core.utils import utcnow
from app.models.document import DocumentRecord
from app.models.enums import DocumentStatus, OcrStatus
from app.services import ocr_service, storage_service
from app.services.date_extractor import ExtractionResult, extract_expiry
from app.services.ocr_outcome import decide

logger = logging.getLogger("docdue.ocr")

# At most 2 documents are read at the same time (protects a small free server)
_slots = asyncio.Semaphore(2)


def analyze_file(data: bytes, content_type: str) -> ExtractionResult:
    """Blocking and CPU-heavy: runs in a worker thread, never on the event loop."""
    text = ocr_service.extract_text(data, content_type, settings.OCR_LANG)
    return extract_expiry(text)          # the text is dropped here, never stored or logged


async def process_document(document_id: PydanticObjectId) -> None:
    """Background job. Must never raise: a crash here would be silent for the user."""
    try:
        async with _slots:
            await _process(document_id)
    except Exception:                                    # noqa: BLE001
        logger.exception("OCR job crashed for document %s", document_id)
        await _mark_failed(document_id)


async def _process(document_id: PydanticObjectId) -> None:
    document = await DocumentRecord.get(document_id)
    if document is None or document.status != DocumentStatus.PROCESSING:
        return                                           # deleted, or already handled

    data = await storage_service.download_object(
        document.file_key, settings.MAX_UPLOAD_SIZE_BYTES
    )
    result = await asyncio.to_thread(analyze_file, data, document.content_type)

    # The user may have typed the date or deleted the file while we were reading
    document = await DocumentRecord.get(document_id)
    if (document is None or document.status != DocumentStatus.PROCESSING
            or document.ocr_status != OcrStatus.PENDING):
        return

    outcome = decide(result, settings.EXPIRING_SOON_DAYS)
    document.expiry_date = outcome.expiry_date
    document.suggested_expiry_date = outcome.suggested_expiry_date
    document.ocr_status = outcome.ocr_status
    document.ocr_confidence = outcome.ocr_confidence
    document.status = outcome.status
    document.updated_at = utcnow()
    await document.save()
    logger.info("OCR done for document %s: %s (confidence %s)",
                document_id, outcome.ocr_status.value, outcome.ocr_confidence)


async def _mark_failed(document_id: PydanticObjectId) -> None:
    """Whatever went wrong, the document must not stay 'processing' forever."""
    try:
        document = await DocumentRecord.get(document_id)
        if document and document.status == DocumentStatus.PROCESSING \
                and document.ocr_status == OcrStatus.PENDING:
            document.ocr_status = OcrStatus.NEEDS_REVIEW
            document.status = DocumentStatus.NEEDS_REVIEW
            document.updated_at = utcnow()
            await document.save()
    except Exception:                                    # noqa: BLE001
        logger.exception("Could not mark document %s as failed", document_id)