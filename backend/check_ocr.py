"""Self-test for the OCR setup. Run from backend/ :  python check_ocr.py"""
import io
import sys

from PIL import Image, ImageDraw, ImageFont

from app.core.config import settings
from app.services import ocr_service
from app.services.date_extractor import extract_expiry


def step(name, ok, extra=""):
    print(f"[{'PASS' if ok else 'FAIL'}] {name} {extra}")
    return ok


def main() -> int:
    # 1. Is Tesseract installed and can we find it?
    try:
        ocr_service.configure_tesseract(settings.TESSERACT_CMD)
        import pytesseract
        version = pytesseract.get_tesseract_version()
        languages = pytesseract.get_languages()
    except Exception as exc:                          # noqa: BLE001
        step("Tesseract found", False, f"-> {exc}")
        return 1
    step("Tesseract found", True, f"(version {version})")
    step(f"Language '{settings.OCR_LANG}' installed",
         all(part in languages for part in settings.OCR_LANG.split("+")),
         f"(installed: {', '.join(languages)})")

    # 2. Read a picture we draw ourselves
    img = Image.new("RGB", (1000, 360), "white")
    draw = ImageDraw.Draw(img)
    font = ImageFont.load_default(size=44)
    draw.text((40, 40), "Date of Issue: 05/03/2018", fill="black", font=font)
    draw.text((40, 130), "Date of Expiry: 04/03/2038", fill="black", font=font)
    buf = io.BytesIO()
    img.save(buf, "PNG")
    text = ocr_service.extract_text(buf.getvalue(), "image/png", settings.OCR_LANG)
    step("Read text from a picture", "2038" in text)

    # 3. Find the right date in it
    result = extract_expiry(text)
    ok = result.expiry_date is not None and result.expiry_date.isoformat() == "2038-03-04"
    step("Picked the expiry date, not the issue date", ok,
         f"-> {result.expiry_date} (confidence {result.confidence})")

    # 4. PDF support
    try:
        import pymupdf
        pdf = pymupdf.open()
        pdf.new_page().insert_text((72, 100), "Valid till: 31/12/2040", fontsize=14)
        pdf_text = ocr_service.extract_text(pdf.tobytes(), "application/pdf", settings.OCR_LANG)
        step("Read text from a PDF", "2040" in pdf_text)
    except Exception as exc:                          # noqa: BLE001
        step("Read text from a PDF", False, f"-> {exc}")
        return 1

    print("\nALL CHECKS PASSED" if ok else "\nSomething failed, read the FAIL lines above")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())