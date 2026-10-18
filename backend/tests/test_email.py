import smtplib
from datetime import date

import pytest

from app.core.config import settings
from app.services import email_service
from app.services.email_service import EmailError
from app.services.email_templates import ReminderItem, build_digest, build_test_email, describe


def item(title="Trade Licence", left=5, doc_type="license"):
    return ReminderItem("abc123", title, doc_type, date(2026, 10, 22), left)


# ---------- the text of the email ----------

@pytest.mark.parametrize("left, words", [
    (30, "expires in 30 days"),
    (2, "expires in 2 days"),
    (1, "expires tomorrow"),
    (0, "expires today"),
    (-1, "expired yesterday"),
    (-9, "expired 9 days ago"),
])
def test_describe(left, words):
    assert describe(left) == words


def test_digest_subject_counts_documents_and_never_contains_titles():
    one, _, _ = build_digest("Asha", [item("SECRET TITLE")], "http://localhost:3000")
    many, _, _ = build_digest("Asha", [item(), item("Other")], "http://localhost:3000")
    assert one == "DocDue reminder: 1 document needs attention"
    assert many == "DocDue reminder: 2 documents need attention"
    assert "SECRET" not in one


def test_digest_lists_the_most_urgent_first():
    _, text, _ = build_digest("Asha", [item("Later", 20), item("Overdue", -3), item("Soon", 2)], "http://x")
    assert text.index("Overdue") < text.index("Soon") < text.index("Later")


def test_digest_html_escapes_user_text():
    _, _, html = build_digest("<b>Asha</b>", [item("<script>alert(1)</script>")], "http://x")
    assert "<script>" not in html
    assert "&lt;script&gt;" in html
    assert "<b>Asha</b>" not in html


def test_digest_link_points_to_the_app():
    _, text, html = build_digest("Asha", [item()], "http://localhost:3000/")
    assert "http://localhost:3000/documents" in text
    assert "http://localhost:3000/documents" in html


def test_test_email_mentions_the_name():
    subject, text, _ = build_test_email("Asha")
    assert subject == "DocDue test email" and "Asha" in text


# ---------- sending ----------

class FakeSMTP:
    created = []
    fail_on = None                       # name of the step that should fail

    def __init__(self, host, port, timeout=None, context=None):
        self.steps = [("connect", host, port)]
        self.context = context
        FakeSMTP.created.append(self)

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def _step(self, name, *extra):
        if FakeSMTP.fail_on == name:
            raise smtplib.SMTPAuthenticationError(535, b"nope") if name == "login" \
                else smtplib.SMTPException("boom")
        self.steps.append((name, *extra))

    def ehlo(self):
        self._step("ehlo")

    def starttls(self, context=None):
        self._step("starttls")

    def login(self, user, password):
        self._step("login", user)

    def send_message(self, message):
        self._step("send")
        self.message = message


@pytest.fixture
def smtp(monkeypatch):
    FakeSMTP.created = []
    FakeSMTP.fail_on = None
    monkeypatch.setattr(settings, "EMAIL_MODE", "smtp")
    monkeypatch.setattr(settings, "SMTP_HOST", "smtp.example.com")
    monkeypatch.setattr(settings, "SMTP_PORT", 587)
    monkeypatch.setattr(settings, "SMTP_SECURITY", "starttls")
    monkeypatch.setattr(settings, "SMTP_USERNAME", "me@example.com")
    monkeypatch.setattr(settings, "SMTP_PASSWORD", "app-password")
    monkeypatch.setattr(email_service.smtplib, "SMTP", FakeSMTP)
    monkeypatch.setattr(email_service.smtplib, "SMTP_SSL", FakeSMTP)
    return FakeSMTP


async def test_smtp_mode_encrypts_then_logs_in_then_sends(smtp):
    await email_service.send_email("user@example.com", "Hello", "plain text", "<p>html</p>")
    names = [s[0] for s in smtp.created[0].steps]
    assert names == ["connect", "ehlo", "starttls", "ehlo", "login", "send"]
    message = smtp.created[0].message
    assert message["To"] == "user@example.com"
    assert message["Subject"] == "Hello"
    assert message.get_body(preferencelist=("html",)) is not None


async def test_smtp_failure_becomes_email_error_without_leaking_details(smtp):
    smtp.fail_on = "login"
    with pytest.raises(EmailError) as info:
        await email_service.send_email("user@example.com", "Hello", "text")
    assert "app-password" not in str(info.value)
    assert "SMTPAuthenticationError" in str(info.value)


async def test_network_error_becomes_email_error(smtp, monkeypatch):
    def refuse(*args, **kwargs):
        raise ConnectionRefusedError("no route")
    monkeypatch.setattr(email_service.smtplib, "SMTP", refuse)
    with pytest.raises(EmailError):
        await email_service.send_email("user@example.com", "Hello", "text")


async def test_console_mode_never_touches_the_network(monkeypatch):
    monkeypatch.setattr(settings, "EMAIL_MODE", "console")

    def explode(*args, **kwargs):
        raise AssertionError("SMTP must not be used in console mode")
    monkeypatch.setattr(email_service.smtplib, "SMTP", explode)
    await email_service.send_email("user@example.com", "Hello", "text")


def test_header_injection_is_refused():
    with pytest.raises(ValueError):
        email_service.build_message("a@example.com", "Hi\nBcc: evil@example.com", "x", None)


@pytest.mark.parametrize("changes", [
    {"EMAIL_MODE": "carrier-pigeon"},
    {"EMAIL_MODE": "smtp", "SMTP_HOST": None},
    {"EMAIL_MODE": "smtp", "SMTP_HOST": "h", "SMTP_SECURITY": "magic"},
    {"EMAIL_MODE": "smtp", "SMTP_HOST": "h", "SMTP_USERNAME": "u", "SMTP_PASSWORD": None},
])
def test_bad_email_settings_are_caught_at_startup(monkeypatch, changes):
    monkeypatch.setattr(settings, "SMTP_USERNAME", None)
    monkeypatch.setattr(settings, "SMTP_PASSWORD", None)
    monkeypatch.setattr(settings, "SMTP_SECURITY", "starttls")
    for key, value in changes.items():
        monkeypatch.setattr(settings, key, value)
    with pytest.raises(ValueError):
        email_service.check_configuration()