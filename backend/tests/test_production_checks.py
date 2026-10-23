import pytest

from app.core import production_checks
from app.core.config import settings


def _set(monkeypatch, **values):
    base = {"ENVIRONMENT": "production", "SECRET_KEY": "x" * 40,
            "FRONTEND_URL": "https://docdue.vercel.app", "CRON_SECRET": None}
    base.update(values)
    for key, value in base.items():
        monkeypatch.setattr(settings, key, value)


def test_development_is_never_blocked(monkeypatch):
    _set(monkeypatch, ENVIRONMENT="development", SECRET_KEY="short", FRONTEND_URL="http://localhost:3000")
    production_checks.check_production_settings()            # does not raise


def test_good_production_settings_pass(monkeypatch):
    _set(monkeypatch, CRON_SECRET="c" * 30)
    production_checks.check_production_settings()


@pytest.mark.parametrize("changes, word", [
    ({"SECRET_KEY": "short"}, "SECRET_KEY"),
    ({"FRONTEND_URL": "http://docdue.vercel.app"}, "FRONTEND_URL"),
    ({"CRON_SECRET": "tooshort"}, "CRON_SECRET"),
])
def test_unsafe_production_settings_stop_the_start(monkeypatch, changes, word):
    _set(monkeypatch, **changes)
    with pytest.raises(ValueError) as info:
        production_checks.check_production_settings()
    assert word in str(info.value)


def test_all_problems_are_listed_together(monkeypatch):
    _set(monkeypatch, SECRET_KEY="short", FRONTEND_URL="http://x")
    assert len(production_checks.problems_for_production()) == 2