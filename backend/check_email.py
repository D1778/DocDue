"""Send one test email with your current settings.

Run from backend/:   python check_email.py you@example.com
(With no address it uses SMTP_USERNAME.)
"""
import asyncio
import logging
import sys

from app.core.config import settings
from app.services import email_service
from app.services.email_templates import build_test_email

logging.basicConfig(level=logging.INFO, format="%(message)s")


async def main() -> int:
    try:
        email_service.check_configuration()
    except ValueError as exc:
        print(f"[FAIL] Settings problem: {exc}")
        return 1
    print(f"[PASS] Settings look valid (EMAIL_MODE={settings.EMAIL_MODE})")

    recipient = sys.argv[1] if len(sys.argv) > 1 else settings.SMTP_USERNAME
    if not recipient:
        print("[FAIL] Give an address: python check_email.py you@example.com")
        return 1

    subject, text, html = build_test_email("there")
    print(f"Sending a test email to {recipient} ...")
    try:
        await email_service.send_email(recipient, subject, text, html)
    except email_service.EmailError as exc:
        print(f"[FAIL] {exc}")
        print(f"       Detail: {exc.__cause__!r}")
        return 1

    if settings.EMAIL_MODE == "console":
        print("[PASS] Console mode: the email was printed above, nothing was really sent.")
    else:
        print("[PASS] Sent. Check the inbox, and the spam folder too.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))