"""Sending email.

Three modes (EMAIL_MODE):
  console    emails are printed in the terminal (development and tests)
  smtp       emails are sent through an SMTP server (works on your own computer)
  brevo_api  emails are sent through Brevo's web API over HTTPS (works on free hosts
             such as Render, which block the normal SMTP ports)
"""
from __future__ import annotations

import asyncio
import json
import logging
import smtplib
import ssl
import urllib.error
import urllib.request
from email.message import EmailMessage
from email.utils import parseaddr
from typing import Optional

from app.core.config import settings

logger = logging.getLogger("docdue.email")

TIMEOUT_SECONDS = 20
BREVO_URL = "https://api.brevo.com/v3/smtp/email"
EMAIL_MODES = ("console", "smtp", "brevo_api")


class EmailError(Exception):
    """An email could not be sent (bad settings, network, or the server refused it)."""


def parse_sender(value: str) -> tuple[str, str]:
    """'DocDue <me@x.com>' gives ('DocDue', 'me@x.com'). A plain address gives ('', address)."""
    name, address = parseaddr(value or "")
    return name, address


def check_configuration() -> None:
    """Called once at startup. Raises ValueError with a clear message if settings are wrong."""
    if settings.EMAIL_MODE not in EMAIL_MODES:
        raise ValueError("EMAIL_MODE must be 'console', 'smtp' or 'brevo_api'")
    if settings.EMAIL_MODE == "smtp":
        if not settings.SMTP_HOST:
            raise ValueError("EMAIL_MODE=smtp needs SMTP_HOST")
        if settings.SMTP_SECURITY not in ("starttls", "ssl", "none"):
            raise ValueError("SMTP_SECURITY must be 'starttls', 'ssl' or 'none'")
        if bool(settings.SMTP_USERNAME) != bool(settings.SMTP_PASSWORD):
            raise ValueError("Set both SMTP_USERNAME and SMTP_PASSWORD, or neither")
    if settings.EMAIL_MODE == "brevo_api":
        if not settings.BREVO_API_KEY:
            raise ValueError("EMAIL_MODE=brevo_api needs BREVO_API_KEY")
        if "@" not in parse_sender(settings.EMAIL_FROM)[1]:
            raise ValueError("EMAIL_FROM must contain an email address, for example "
                             "DocDue <you@gmail.com>")


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


def build_brevo_payload(to: str, subject: str, text: str, html: Optional[str]) -> dict:
    """The JSON body that Brevo's 'send a transactional email' call expects."""
    name, address = parse_sender(settings.EMAIL_FROM)
    sender = {"email": address}
    if name:
        sender["name"] = name
    payload = {
        "sender": sender,
        "to": [{"email": to}],
        "subject": subject,
        "textContent": text,
    }
    if html:
        payload["htmlContent"] = html
    return payload


def _send_brevo(payload: dict) -> None:
    """Blocking: one HTTPS call to Brevo. Always run in a worker thread."""
    request = urllib.request.Request(
        BREVO_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "api-key": settings.BREVO_API_KEY or "",
            "content-type": "application/json",
            "accept": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS):
            pass                                  # 2xx means Brevo accepted the email
    except urllib.error.HTTPError as exc:
        # HTTPError must be caught before URLError: it is a kind of URLError.
        # Only the status code is kept (401 = wrong key, 400 = sender not allowed).
        raise EmailError(f"Brevo refused the email: HTTP {exc.code}") from exc
    except (urllib.error.URLError, OSError) as exc:
        raise EmailError(f"Brevo failure: {type(exc).__name__}") from exc


async def send_email(to: str, subject: str, text: str, html: Optional[str] = None) -> None:
    message = build_message(to, subject, text, html)      # also refuses bad headers
    if settings.EMAIL_MODE == "console":
        logger.info("EMAIL (console mode, not really sent)\nTo: %s\nSubject: %s\n\n%s",
                    to, subject, text)
        return
    if settings.EMAIL_MODE == "brevo_api":
        await asyncio.to_thread(_send_brevo, build_brevo_payload(to, subject, text, html))
    else:
        await asyncio.to_thread(_send_smtp, message)
    logger.info("Email sent to %s (subject: %s)", to, subject)