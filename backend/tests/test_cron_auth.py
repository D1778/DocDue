import pytest

from app.services.cron_auth import cron_secret_problem


@pytest.mark.parametrize("provided, expected, result", [
    (None, None, 404),                 # feature switched off
    ("anything", "", 404),
    (None, "s3cret-value", 401),       # header missing
    ("", "s3cret-value", 401),
    ("wrong", "s3cret-value", 401),
    ("s3cret-value ", "s3cret-value", 401),   # one extra space is wrong
    ("s3cret-value", "s3cret-value", None),
    ("sécret-välue", "sécret-välue", None),   # non-ASCII text must not crash
    ("sécret", "secret", 401),
])
def test_cron_secret_problem(provided, expected, result):
    assert cron_secret_problem(provided, expected) == result