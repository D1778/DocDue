"""Build the text and HTML of reminder emails. Pure functions."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from html import escape


@dataclass(frozen=True)
class ReminderItem:
    document_id: str
    title: str
    document_type: str
    expiry: date
    days_left: int


def describe(days_left: int) -> str:
    if days_left < -1:
        return f"expired {-days_left} days ago"
    if days_left == -1:
        return "expired yesterday"
    if days_left == 0:
        return "expires today"
    if days_left == 1:
        return "expires tomorrow"
    return f"expires in {days_left} days"


def _fmt(d: date) -> str:
    return d.strftime("%d %b %Y")


def _label(document_type: str) -> str:
    return document_type.replace("_", " ").title()


def build_digest(recipient_name: str, items: list[ReminderItem],
                 app_url: str) -> tuple[str, str, str]:
    """Return (subject, plain_text, html). One email lists every document that needs attention.

    The subject contains only a count, never document titles: titles are typed by users
    and have no place in an email header.
    """
    ordered = sorted(items, key=lambda i: (i.days_left, i.title.lower()))
    n = len(ordered)
    subject = (f"DocDue reminder: {n} document needs attention" if n == 1
               else f"DocDue reminder: {n} documents need attention")
    link = app_url.rstrip("/") + "/documents"
    name = recipient_name.strip() or "there"

    lines = [f"Hello {name},", "", "These documents need your attention:", ""]
    for i in ordered:
        lines.append(f"- {i.title} ({_label(i.document_type)}): {describe(i.days_left)}, "
                     f"on {_fmt(i.expiry)}")
    lines += ["", f"Open DocDue to review them: {link}", "",
              "You receive this because you own these documents or administer the account.",
              "DocDue"]
    text = "\n".join(lines)

    rows = ""
    for i in ordered:
        colour = "#A6412B" if i.days_left < 0 else ("#9A6A1F" if i.days_left <= 7 else "#2F6E62")
        rows += (
            "<tr>"
            f"<td style='padding:8px 12px;border-bottom:1px solid #ddd'>{escape(i.title)}"
            f"<br><span style='color:#666;font-size:12px'>{escape(_label(i.document_type))}</span></td>"
            f"<td style='padding:8px 12px;border-bottom:1px solid #ddd'>{escape(_fmt(i.expiry))}</td>"
            f"<td style='padding:8px 12px;border-bottom:1px solid #ddd;color:{colour};font-weight:bold'>"
            f"{escape(describe(i.days_left))}</td></tr>"
        )
    html = (
        "<div style='font-family:Arial,sans-serif;max-width:600px'>"
        f"<p>Hello {escape(name)},</p>"
        "<p>These documents need your attention:</p>"
        "<table style='border-collapse:collapse;width:100%'>"
        "<tr><th align='left' style='padding:8px 12px;border-bottom:2px solid #333'>Document</th>"
        "<th align='left' style='padding:8px 12px;border-bottom:2px solid #333'>Date</th>"
        "<th align='left' style='padding:8px 12px;border-bottom:2px solid #333'>Status</th></tr>"
        f"{rows}</table>"
        f"<p><a href='{escape(link, quote=True)}'>Open DocDue to review them</a></p>"
        "<p style='color:#666;font-size:12px'>You receive this because you own these documents "
        "or administer the account.</p></div>"
    )
    return subject, text, html


def build_password_reset(recipient_name: str, link: str, minutes: int) -> tuple[str, str, str]:
    """The "forgot password" email. The subject is fixed text, never user-typed."""
    name = recipient_name.strip() or "there"
    subject = "Reset your DocDue password"
    text = (f"Hello {name},\n\nSomeone asked to reset the password for your DocDue account. "
            f"Open this link within {minutes} minutes to choose a new one:\n\n{link}\n\n"
            "If this was not you, ignore this email. Your password stays the same.\n\nDocDue")
    html = (
        "<div style='font-family:Arial,sans-serif;max-width:560px'>"
        f"<p>Hello {escape(name)},</p>"
        "<p>Someone asked to reset the password for your DocDue account. "
        f"The link works for {minutes} minutes.</p>"
        f"<p><a href='{escape(link, quote=True)}' style='display:inline-block;background:#196b50;"
        "color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold'>"
        "Choose a new password</a></p>"
        "<p style='color:#666;font-size:12px'>If this was not you, ignore this email. "
        "Your password stays the same.</p></div>"
    )
    return subject, text, html


def build_test_email(recipient_name: str) -> tuple[str, str, str]:
    name = recipient_name.strip() or "there"
    subject = "DocDue test email"
    text = (f"Hello {name},\n\nThis is a test email from DocDue. "
            "If you can read it, your email settings work.\n\nDocDue")
    html = (f"<div style='font-family:Arial,sans-serif'><p>Hello {escape(name)},</p>"
            "<p>This is a test email from DocDue. If you can read it, your email settings work.</p>"
            "<p>DocDue</p></div>")
    return subject, text, html