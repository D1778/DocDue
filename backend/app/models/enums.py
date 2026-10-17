from enum import Enum


class AccountType(str, Enum):
    PERSONAL = "personal"
    ORGANIZATION = "organization"


class Role(str, Enum):
    ADMIN = "admin"
    MEMBER = "member"


class DocumentType(str, Enum):
    LICENSE = "license"
    CERTIFICATE = "certificate"
    INSURANCE = "insurance"
    ID_PROOF = "id_proof"
    PERMIT = "permit"
    CONTRACT = "contract"
    OTHER = "other"


class OcrStatus(str, Enum):
    PENDING = "pending"
    AUTO_DETECTED = "auto_detected"
    NEEDS_REVIEW = "needs_review"
    MANUALLY_SET = "manually_set"


class DocumentStatus(str, Enum):
    PENDING_UPLOAD = "pending_upload"   # record exists, file not confirmed yet
    PROCESSING = "processing"           # file is in S3, OCR is reading it
    NEEDS_REVIEW = "needs_review"       # OCR could not find a date it trusts: a human must set it
    VALID = "valid"
    EXPIRING = "expiring"
    EXPIRED = "expired"


class AlertStatus(str, Enum):
    SENT = "sent"
    FAILED = "failed"