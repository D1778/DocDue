"""Turn file bytes into text. PDFs: text layer first, OCR as fallback. Images: OCR."""
from __future__ import annotations

import io
import shutil

import pytesseract
from PIL import Image, ImageFilter, ImageOps

MAX_OCR_PIXELS = 20_000_000       # refuse absurdly large images (decompression bombs)
MAX_PDF_PAGES = 5                 # documents are short; do not OCR a 500 page file
MIN_TEXT_LAYER_CHARS = 30         # below this a PDF is treated as a scan


class OcrUnavailable(RuntimeError):
    """Tesseract is not installed or TESSERACT_CMD is wrong."""


def configure_tesseract(cmd: str | None) -> None:
    """Tell pytesseract where tesseract.exe is, and fail clearly if it is not there."""
    if cmd:
        pytesseract.pytesseract.tesseract_cmd = cmd
    if shutil.which(pytesseract.pytesseract.tesseract_cmd) is None:
        raise OcrUnavailable(
            f"Tesseract not found at '{pytesseract.pytesseract.tesseract_cmd}'. "
            "Install it and set TESSERACT_CMD in .env."
        )


def preprocess(img: Image.Image) -> Image.Image:
    """Grayscale, fix phone rotation, upscale small images, boost contrast."""
    img = ImageOps.exif_transpose(img)
    img = ImageOps.grayscale(img)
    if max(img.size) < 1600:
        factor = 1600 / max(img.size)
        img = img.resize((int(img.width * factor), int(img.height * factor)), Image.LANCZOS)
    img = ImageOps.autocontrast(img)
    return img.filter(ImageFilter.SHARPEN)


def ocr_image(img: Image.Image, lang: str = "eng") -> str:
    # --psm 6: treat as one uniform block; works well for ID cards and certificates
    return pytesseract.image_to_string(preprocess(img), lang=lang, config="--psm 6")


def ocr_image_bytes(data: bytes, lang: str = "eng") -> str:
    with Image.open(io.BytesIO(data)) as img:
        if img.width * img.height > MAX_OCR_PIXELS:      # size is known before decoding
            raise ValueError("Image is too large to read")
        img.load()
        return ocr_image(img, lang)


def extract_text_from_pdf(data: bytes, lang: str = "eng") -> str:
    import pymupdf  # PyMuPDF, imported here so image-only setups still work

    parts: list[str] = []
    with pymupdf.open(stream=data, filetype="pdf") as pdf:
        for page in list(pdf)[:MAX_PDF_PAGES]:
            text = page.get_text().strip()
            if len(text) >= MIN_TEXT_LAYER_CHARS:
                parts.append(text)
                continue
            pix = page.get_pixmap(dpi=200)        # scanned page: render, then OCR
            img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
            parts.append(ocr_image(img, lang))
    return "\n".join(parts)


def extract_text(data: bytes, content_type: str, lang: str = "eng") -> str:
    if content_type == "application/pdf":
        return extract_text_from_pdf(data, lang)
    return ocr_image_bytes(data, lang)