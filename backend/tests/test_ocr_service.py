import io

import pytest
from PIL import Image, ImageDraw, ImageFont

from app.core.config import settings
from app.services import ocr_service
from app.services.date_extractor import extract_expiry

# Use the same TESSERACT_CMD as the app. If Tesseract is not there, skip (do not fail).
try:
    ocr_service.configure_tesseract(settings.TESSERACT_CMD)
    TESSERACT_OK = True
except ocr_service.OcrUnavailable:
    TESSERACT_OK = False

needs_tesseract = pytest.mark.skipif(not TESSERACT_OK, reason="Tesseract not found (check TESSERACT_CMD)")


def make_png(lines, size=(1000, 360), font_size=44) -> bytes:
    img = Image.new("RGB", size, "white")
    draw = ImageDraw.Draw(img)
    font = ImageFont.load_default(size=font_size)      # built in; no font file needed
    for i, line in enumerate(lines):
        draw.text((40, 40 + i * 90), line, fill="black", font=font)
    buf = io.BytesIO()
    img.save(buf, "PNG")
    return buf.getvalue()


@needs_tesseract
def test_reads_text_from_a_png():
    png = make_png(["DRIVING LICENCE", "Valid Till: 04/03/2038"])
    text = ocr_service.extract_text(png, "image/png")
    assert "2038" in text


@needs_tesseract
def test_png_to_expiry_date_end_to_end():
    png = make_png(["Date of Issue: 05/03/2018", "Date of Expiry: 04/03/2038"])
    result = extract_expiry(ocr_service.extract_text(png, "image/png"))
    assert result.expiry_date.isoformat() == "2038-03-04"
    assert not result.needs_review


def test_preprocess_makes_small_images_bigger_and_grey():
    small = Image.new("RGB", (400, 200), "white")
    out = ocr_service.preprocess(small)
    assert out.mode == "L"
    assert max(out.size) >= 1600


def test_huge_images_are_refused():
    # A decompression bomb: tiny file, enormous pixel count
    img = Image.new("1", (6000, 6000))
    buf = io.BytesIO()
    img.save(buf, "PNG")
    with pytest.raises(Exception):
        ocr_service.ocr_image_bytes(buf.getvalue())