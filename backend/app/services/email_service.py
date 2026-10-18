"""Sending email. In "console" mode emails are printed in the terminal; in "smtp" mode they are sent."""
from __future__ import annotations

import asyncio
import logging
import smtplib
import ssl
from email.message import EmailMessage
from typing import Optional

from app.core.config import settings

logger = logging.getLogger("docdue.email")

TIMEOUT_SECONDS = 20


class EmailError(Exception):
    """An email could not be sent (bad settings, network, or the server refused it)."""


def check_configuration() -> None:
    """Called once at startup. Raises ValueError with a clear message if settings are wrong."""
    if settings.EMAIL_MODE not in ("console", "smtp"):
        raise ValueError("EMAIL_MODE must be 'console' or 'smtp'")
    if settings.EMAIL_MODE == "smtp":
        if not settings.SMTP_HOST:
            raise ValueError("EMAIL_MODE=smtp needs SMTP_HOST")
        if settings.SMTP_SECURITY not in ("starttls", "ssl", "none"):
            raise ValueError("SMTP_SECURITY must be 'starttls', 'ssl' or 'none'")
        if bool(settings.SMTP_USERNAME) != bool(settings.SMTP_PASSWORD):
            raise ValueError("Set both SMTP_USERNAME and SMTP_PASSWORD, or neither")


def build_message(to: str, subject: str, text: str, html: Optional[str]) -> EmailMessage:
    message = EmailMessage()
    message["From"] = settings.EMAIL_FROM
    message["To"] = to
    message["Subject"] = subject
    message.set_content(text)
    if html:
        message.add_alternative(html, subtype="html")
    return message


def _send_smtp(message: EmailMessage) -> None:
    """Blocking: talks to the mail server. Always run in a worker thread."""
    try:
        if settings.SMTP_SECURITY == "ssl":
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT,
                                      timeout=TIMEOUT_SECONDS,
                                      context=ssl.create_default_context())
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT,
                                  timeout=TIMEOUT_SECONDS)
        with server:
            if settings.SMTP_SECURITY == "starttls":
                server.ehlo()
                server.starttls(context=ssl.create_default_context())
                server.ehlo()
            if settings.SMTP_USERNAME:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(message)
    except (smtplib.SMTPException, OSError) as exc:
        # Only the exception TYPE is kept: its text can contain addresses or server details.
        raise EmailError(f"SMTP failure: {type(exc).__name__}") from exc


async def send_email(to: str, subject: str, text: str, html: Optional[str] = None) -> None:
    message = build_message(to, subject, text, html)
    if settings.EMAIL_MODE == "console":
        logger.info("EMAIL (console mode, not really sent)\nTo: %s\nSubject: %s\n\n%s",
                    to, subject, text)
        return
    await asyncio.to_thread(_send_smtp, message)
    logger.info("Email sent to %s (subject: %s)", to, subject)