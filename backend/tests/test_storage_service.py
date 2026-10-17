from app.core.config import settings
from app.services import storage_service as s3


def test_object_key_has_tenant_and_document_ids():
    key = s3.build_object_key("t123", "d456", "application/pdf")
    assert key == "tenant_t123/documents/d456.pdf"


def test_object_key_extension_follows_content_type():
    assert s3.build_object_key("t", "d", "image/jpeg").endswith(".jpg")
    assert s3.build_object_key("t", "d", "image/png").endswith(".png")


def test_clean_filename_removes_folders_and_control_characters():
    assert s3.clean_filename("C:\\Users\\me\\license.pdf") == "license.pdf"
    assert s3.clean_filename("../../etc/passwd") == "passwd"
    assert s3.clean_filename("bad\x00name.pdf") == "badname.pdf"
    assert s3.clean_filename("   ") == "document"


def test_file_signatures():
    assert s3.matches_signature("application/pdf", b"%PDF-1.7 rest of file")
    assert not s3.matches_signature("application/pdf", b"just some text")
    assert s3.matches_signature("image/png", b"\x89PNG\r\n\x1a\n" + b"data")
    assert s3.matches_signature("image/jpeg", b"\xff\xd8\xff\xe0data")
    assert not s3.matches_signature("image/jpeg", b"%PDF-1.4")
    assert not s3.matches_signature("text/plain", b"hello")


def test_presigned_upload_url_is_signed_and_expires():
    # Signing happens locally, so no internet is needed for this check
    url = s3.create_upload_url("some/key.pdf", "application/pdf")
    assert "some/key.pdf" in url
    assert "X-Amz-Signature=" in url
    assert f"X-Amz-Expires={settings.PRESIGNED_URL_EXPIRE_SECONDS}" in url