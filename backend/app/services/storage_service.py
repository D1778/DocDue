import asyncio
import re
from dataclasses import dataclass
from typing import Optional

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError

from app.core.config import settings

# File types DocDue accepts, and the extension used in the S3 key for each
ALLOWED_CONTENT_TYPES = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
}


class StorageError(Exception):
    """Something went wrong while talking to S3 (permissions, network, bad bucket...)."""


@dataclass
class ObjectInfo:
    size: int            # real size of the stored file in bytes
    content_type: str    # the Content-Type label S3 has stored
    head: bytes          # the first bytes of the file (up to 1024)


# ---------- the S3 client ----------

_client = None


def get_client():
    """Create the boto3 S3 client once and reuse it."""
    global _client
    if _client is None:
        _client = boto3.client(
            "s3",
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            aws_session_token=settings.AWS_SESSION_TOKEN or None,   # "" becomes None
            # "" -> regional endpoint. Without it boto3 signs URLs for the global
            # <bucket>.s3.amazonaws.com host, which answers 307 for non-us-east-1 buckets.
            endpoint_url=settings.S3_ENDPOINT_URL
            or f"https://s3.{settings.AWS_REGION}.amazonaws.com",
            config=Config(signature_version="s3v4"),
        )
    return _client


# ---------- names ----------

def build_object_key(tenant_id, document_id, content_type: str) -> str:
    """Server-made key: only ids and a fixed extension, never user-typed text."""
    extension = ALLOWED_CONTENT_TYPES[content_type]
    return f"tenant_{tenant_id}/documents/{document_id}{extension}"


def clean_filename(name: str) -> str:
    """Drop any folder part and control characters from a user-supplied filename."""
    name = name.replace("\\", "/").split("/")[-1]
    name = re.sub(r"[\x00-\x1f\x7f]", "", name).strip()
    return name[:255] or "document"


def _header_filename(name: str) -> str:
    """A very safe version of the name for the Content-Disposition header."""
    return re.sub(r"[^A-Za-z0-9._-]", "_", name)[:100] or "document"


# ---------- presigned URLs (computed locally, no network call) ----------

def create_upload_url(key: str, content_type: str) -> str:
    """A link the browser can PUT one file to. The Content-Type header must match."""
    return get_client().generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.S3_BUCKET_NAME,
            "Key": key,
            "ContentType": content_type,
        },
        ExpiresIn=settings.PRESIGNED_URL_EXPIRE_SECONDS,
        HttpMethod="PUT",
    )


def create_download_url(key: str, filename: str, content_type: str,
                        download: bool = False) -> str:
    """A temporary link to view the file in the browser, or download it."""
    disposition = "attachment" if download else "inline"
    return get_client().generate_presigned_url(
        "get_object",
        Params={
            "Bucket": settings.S3_BUCKET_NAME,
            "Key": key,
            "ResponseContentType": content_type,
            "ResponseContentDisposition": f'{disposition}; filename="{_header_filename(filename)}"',
        },
        ExpiresIn=settings.PRESIGNED_URL_EXPIRE_SECONDS,
        HttpMethod="GET",
    )


# ---------- checking what really arrived in S3 ----------

def matches_signature(content_type: str, head: bytes) -> bool:
    """Do the file's first bytes fit the type it claims to be?"""
    if content_type == "application/pdf":
        return b"%PDF-" in head[:1024]
    if content_type == "image/png":
        return head.startswith(b"\x89PNG\r\n\x1a\n")
    if content_type == "image/jpeg":
        return head.startswith(b"\xff\xd8\xff")
    return False


def _inspect_object(key: str) -> Optional[ObjectInfo]:
    client = get_client()
    try:
        head = client.head_object(Bucket=settings.S3_BUCKET_NAME, Key=key)
        size = head["ContentLength"]
        first_bytes = b""
        if size > 0:
            part = client.get_object(
                Bucket=settings.S3_BUCKET_NAME, Key=key, Range="bytes=0-1023"
            )
            first_bytes = part["Body"].read()
            part["Body"].close()
        return ObjectInfo(
            size=size,
            content_type=head.get("ContentType", ""),
            head=first_bytes,
        )
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code", "")
        if code in ("404", "NoSuchKey", "NotFound"):
            return None                       # the file simply isn't there
        raise StorageError(f"S3 error while inspecting object: {code}") from exc
    except BotoCoreError as exc:
        raise StorageError("Could not reach S3") from exc


def _delete_object(key: str) -> None:
    try:
        get_client().delete_object(Bucket=settings.S3_BUCKET_NAME, Key=key)
    except (ClientError, BotoCoreError) as exc:
        raise StorageError("Could not delete the file from S3") from exc


# boto3 waits for the network, so these run in a worker thread
# to keep the FastAPI server responsive for other users.

async def inspect_object(key: str) -> Optional[ObjectInfo]:
    return await asyncio.to_thread(_inspect_object, key)


async def delete_object(key: str) -> None:
    await asyncio.to_thread(_delete_object, key)

def _download_object(key: str, max_bytes: int) -> bytes:
    """Read a whole object into memory, but refuse anything bigger than max_bytes."""
    client = get_client()
    try:
        response = client.get_object(Bucket=settings.S3_BUCKET_NAME, Key=key)
        try:
            data = response["Body"].read(max_bytes + 1)   # one extra byte reveals "too big"
        finally:
            response["Body"].close()
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code", "")
        raise StorageError(f"S3 error while downloading object: {code}") from exc
    except BotoCoreError as exc:
        raise StorageError("Could not reach S3") from exc
    if len(data) > max_bytes:
        raise StorageError("Stored file is larger than the allowed maximum")
    return data


async def download_object(key: str, max_bytes: int) -> bytes:
    return await asyncio.to_thread(_download_object, key, max_bytes)