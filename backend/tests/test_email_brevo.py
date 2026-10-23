import io
import json
import urllib.error

import pytest

from app.core.config import settings
from app.services import email_service
from app.services.email_service import EmailError


@pytest.fixture
def brevo(monkeypatch):
    monkeypatch.setattr(settings, "EMAIL_MODE", "brevo_api")
    monkeypatch.setattr(settings, "BREVO_API_KEY", "xkeysib-test-key")
    monkeypatch.setattr(settings, "EMAIL_FROM", "DocDue <project@example.com>")


# ---------- the sender address ----------

@pytest.mark.parametrize("value, expected", [
    ("DocDue <project@example.com>", ("DocDue", "project@example.com")),
    ("project@example.com", ("", "project@example.com")),
    ('"DocDue Alerts" <a@b.co>', ("DocDue Alerts", "a@b.co")),
    ("", ("", "")),
])
def test_parse_sender(value, expected):
    assert email_service.parse_sender(value) == expected


# ---------- the JSON sent to Brevo ----------

def test_payload_has_sender_recipient_subject_and_both_bodies(brevo):
    payload = email_service.build_brevo_payload("user@example.com", "Hello", "plain", "<p>html</p>")
    assert payload["sender"] == {"name": "DocDue", "email": "project@example.com"}
    assert payload["to"] == [{"email": "user@example.com"}]
    assert payload["subject"] == "Hello"
    assert payload["textContent"] == "plain"
    assert payload["htmlContent"] == "<p>html</p>"


def test_payload_without_html_or_sender_name(brevo, monkeypatch):
    monkeypatch.setattr(settings, "EMAIL_FROM", "project@example.com")
    payload = email_service.build_brevo_payload("user@example.com", "Hello", "plain", None)
    assert payload["sender"] == {"email": "project@example.com"}
    assert "htmlContent" not in payload


# ---------- sending ----------

class FakeResponse:
    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


async def test_brevo_mode_posts_json_with_the_api_key_over_https(brevo, monkeypatch):
    seen = {}

    def fake_urlopen(request, timeout=None):
        seen["url"] = request.full_url
        seen["key"] = request.get_header("Api-key")
        seen["body"] = json.loads(request.data.decode("utf-8"))
        seen["method"] = request.get_method()
        return FakeResponse()

    monkeypatch.setattr(email_service.urllib.request, "urlopen", fake_urlopen)
    await email_service.send_email("user@example.com", "Hello", "plain", "<p>x</p>")
    assert seen["url"] == "https://api.brevo.com/v3/smtp/email"
    assert seen["method"] == "POST"
    assert seen["key"] == "xkeysib-test-key"
    assert seen["body"]["to"] == [{"email": "user@example.com"}]


async def test_brevo_http_error_keeps_the_status_but_not_the_key(brevo, monkeypatch):
    def refuse(request, timeout=None):
        raise urllib.error.HTTPError(request.full_url, 401, "Unauthorized", {}, io.BytesIO(b"{}"))

    monkeypatch.setattr(email_service.urllib.request, "urlopen", refuse)
    with pytest.raises(EmailError) as info:
        await email_service.send_email("user@example.com", "Hello", "text")
    assert "401" in str(info.value)
    assert "xkeysib" not in str(info.value)


async def test_brevo_network_error_becomes_email_error(brevo, monkeypatch):
    def down(request, timeout=None):
        raise urllib.error.URLError("no route")

    monkeypatch.setattr(email_service.urllib.request, "urlopen", down)
    with pytest.raises(EmailError):
        await email_service.send_email("user@example.com", "Hello", "text")


async def test_console_mode_never_calls_brevo(monkeypatch):
    monkeypatch.setattr(settings, "EMAIL_MODE", "console")

    def explode(*args, **kwargs):
        raise AssertionError("the network must not be used in console mode")

    monkeypatch.setattr(email_service.urllib.request, "urlopen", explode)
    await email_service.send_email("user@example.com", "Hello", "text")


# ---------- start-up check ----------

@pytest.mark.parametrize("changes", [
    {"BREVO_API_KEY": None},
    {"BREVO_API_KEY": ""},
    {"EMAIL_FROM": "no address here"},
])
def test_bad_brevo_settings_are_caught_at_startup(brevo, monkeypatch, changes):
    for key, value in changes.items():
        monkeypatch.setattr(settings, key, value)
    with pytest.raises(ValueError):
        email_service.check_configuration()


def test_good_brevo_settings_pass(brevo):
    email_service.check_configuration()