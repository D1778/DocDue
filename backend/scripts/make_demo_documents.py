"""Makes five SAMPLE documents for testing and for your demo.

Run it from the backend folder:   python scripts/make_demo_documents.py
Files are written to the folder  demo-documents/
All names and numbers are made up and every page says SAMPLE. Dates are counted from today,
so run the script again shortly before a demo to get fresh dates.
"""
import random
from datetime import date, timedelta
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = Path("demo-documents")
SIZE = (1240, 900)                       # roughly an A5 page at screen resolution
FONT_FILES = ["arial.ttf", "Arial.ttf", "DejaVuSans.ttf", "LiberationSans-Regular.ttf"]
BOLD_FILES = ["arialbd.ttf", "Arial Bold.ttf", "DejaVuSans-Bold.ttf", "LiberationSans-Bold.ttf"]


def load_font(candidates, size):
    for name in candidates:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default(size=size)


def draw_document(title, lines):
    """White page, a border, a big title, and one 'label: value' line per row."""
    img = Image.new("RGB", SIZE, "white")
    d = ImageDraw.Draw(img)
    d.rectangle([30, 30, SIZE[0] - 30, SIZE[1] - 30], outline="black", width=5)
    d.text((70, 70), title, fill="black", font=load_font(BOLD_FILES, 54))
    d.text((70, 140), "SAMPLE - NOT A REAL DOCUMENT", fill=(150, 0, 0), font=load_font(BOLD_FILES, 32))
    y = 250
    for label, value in lines:
        d.text((70, y), f"{label}:", fill="black", font=load_font(BOLD_FILES, 40))
        d.text((520, y), value, fill="black", font=load_font(FONT_FILES, 40))
        y += 90
    return img


def fmt(day, pattern):
    return day.strftime(pattern)


def main():
    OUT.mkdir(exist_ok=True)
    today = date.today()

    # 1. clear and valid (more than 30 days left)
    draw_document("DRIVING LICENCE", [
        ("Holder", "SAMPLE HOLDER"),
        ("Licence no", "DL-0000-0000000"),
        ("Date of issue", fmt(today - timedelta(days=1000), "%d/%m/%Y")),
        ("Valid until", fmt(today + timedelta(days=400), "%d/%m/%Y")),
    ]).save(OUT / "1-driving-licence-valid.png")

    # 2. expiring soon (18 days left)
    draw_document("VEHICLE INSURANCE CERTIFICATE", [
        ("Insured", "SAMPLE HOLDER"),
        ("Policy no", "POL-000-111-222"),
        ("Start date", fmt(today - timedelta(days=347), "%d %b %Y")),
        ("Policy valid till", fmt(today + timedelta(days=18), "%d %b %Y")),
    ]).save(OUT / "2-insurance-expiring-soon.png")

    # 3. already expired (25 days ago)
    draw_document("FIRE SAFETY CERTIFICATE", [
        ("Premises", "SAMPLE WORKSHOP"),
        ("Certificate no", "FSC-2024-0001"),
        ("Issued on", fmt(today - timedelta(days=390), "%Y-%m-%d")),
        ("Expiry date", fmt(today - timedelta(days=25), "%Y-%m-%d")),
    ]).save(OUT / "3-certificate-expired.png")

    # 4. a bad scan: the same kind of page, but blurred, noisy, faint and slightly turned.
    #    It should NOT be read confidently, so the app should say "needs review".
    random.seed(7)
    bad = draw_document("TRADE LICENCE", [
        ("Holder", "SAMPLE TRADERS"),
        ("Licence no", "TL-55-0000"),
        ("Valid until", fmt(today + timedelta(days=200), "%d/%m/%Y")),
    ])
    bad = bad.rotate(4, expand=False, fillcolor="white").filter(ImageFilter.GaussianBlur(6))
    pixels = bad.load()
    for _ in range(90000):                                    # sprinkle noise
        x, y = random.randrange(SIZE[0]), random.randrange(SIZE[1])
        shade = random.randrange(90, 200)
        pixels[x, y] = (shade, shade, shade)
    bad = bad.point(lambda v: 150 + v // 4)                   # wash out the contrast
    bad.save(OUT / "4-unclear-scan.png")

    # 5. a scanned PDF with two dates: the expiry date, not the issue date, must be chosen
    draw_document("WORK PERMIT", [
        ("Permit holder", "SAMPLE HOLDER"),
        ("Date of issue", fmt(today - timedelta(days=60), "%d %B %Y")),
        ("Date of expiry", fmt(today + timedelta(days=300), "%d %B %Y")),
    ]).save(OUT / "5-permit-two-dates.pdf")

    for path in sorted(OUT.iterdir()):
        print("made", path)


if __name__ == "__main__":
    main()