from tests.helpers import auth_header, login, register_user


async def test_register_creates_tenant_and_admin(client):
    resp = await register_user(
        client, "owner@example.com",
        account_type="organization", organization_name="Acme Clinic",
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["user"]["role"] == "admin"
    assert body["tenant"]["name"] == "Acme Clinic"
    assert body["tenant"]["account_type"] == "organization"
    assert "access_token" in body["tokens"]
    assert "password" not in body["user"]
    assert "password_hash" not in body["user"]


async def test_personal_register_gets_a_personal_vault(client):
    resp = await register_user(client, "solo@example.com")
    assert resp.status_code == 201
    assert resp.json()["tenant"]["account_type"] == "personal"


async def test_duplicate_email_returns_409(client):
    await register_user(client, "dup@example.com")
    resp = await register_user(client, "dup@example.com")
    assert resp.status_code == 409


async def test_email_is_case_insensitive(client):
    await register_user(client, "case@example.com")
    resp = await register_user(client, "CASE@example.com")
    assert resp.status_code == 409


async def test_weak_password_returns_422(client):
    resp = await register_user(client, "weak@example.com", password="abcdefgh")
    assert resp.status_code == 422


async def test_organization_without_name_returns_422(client):
    resp = await register_user(client, "noname@example.com", account_type="organization")
    assert resp.status_code == 422


async def test_login_success(client):
    await register_user(client, "login@example.com")
    resp = await login(client, "login@example.com")
    assert resp.status_code == 200
    assert resp.json()["token_type"] == "bearer"


async def test_login_wrong_password_returns_401(client):
    await register_user(client, "wrong@example.com")
    resp = await login(client, "wrong@example.com", password="Nope@12345")
    assert resp.status_code == 401


async def test_login_unknown_email_returns_401(client):
    resp = await login(client, "ghost@example.com")
    assert resp.status_code == 401


async def test_me_requires_a_token(client):
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401


async def test_me_returns_current_user_and_tenant(client):
    reg = await register_user(client, "me@example.com")
    token = reg.json()["tokens"]["access_token"]
    resp = await client.get("/api/v1/auth/me", headers=auth_header(token))
    assert resp.status_code == 200
    assert resp.json()["user"]["email"] == "me@example.com"
    assert resp.json()["tenant"]["id"] == reg.json()["tenant"]["id"]


async def test_refresh_returns_a_new_token_pair(client):
    reg = await register_user(client, "refresh@example.com")
    refresh_token = reg.json()["tokens"]["refresh_token"]
    resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


async def test_refresh_token_cannot_be_used_as_access_token(client):
    reg = await register_user(client, "swap1@example.com")
    refresh_token = reg.json()["tokens"]["refresh_token"]
    resp = await client.get("/api/v1/auth/me", headers=auth_header(refresh_token))
    assert resp.status_code == 401


async def test_access_token_cannot_be_used_to_refresh(client):
    reg = await register_user(client, "swap2@example.com")
    access_token = reg.json()["tokens"]["access_token"]
    resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": access_token})
    assert resp.status_code == 401


async def test_garbage_token_returns_401(client):
    resp = await client.get("/api/v1/auth/me", headers=auth_header("not.a.token"))
    assert resp.status_code == 401

async def test_user_can_set_and_remove_their_own_profile_picture(client):
    token = (await register_user(client, "pic@example.com")).json()["tokens"]["access_token"]
    picture = "data:image/jpeg;base64,/9j/4AAQSkZJRg=="

    resp = await client.put("/api/v1/auth/me/avatar", json={"avatar": picture}, headers=auth_header(token))
    assert resp.status_code == 200
    assert resp.json()["avatar"] == picture
    me = await client.get("/api/v1/auth/me", headers=auth_header(token))
    assert me.json()["user"]["avatar"] == picture

    resp = await client.delete("/api/v1/auth/me/avatar", headers=auth_header(token))
    assert resp.status_code == 200
    assert resp.json()["avatar"] is None


async def test_profile_picture_must_be_a_small_image(client):
    token = (await register_user(client, "pic2@example.com")).json()["tokens"]["access_token"]
    for bad in ("https://example.com/x.jpg", "data:text/html;base64,PGI+", "data:image/jpeg;base64," + "A" * 200_000):
        resp = await client.put("/api/v1/auth/me/avatar", json={"avatar": bad}, headers=auth_header(token))
        assert resp.status_code == 422


# ---------- Sign in with Google (Google itself is replaced by a stub) ----------

from app.services import google_auth  # noqa: E402


def _fake_google(monkeypatch, email="gina@gmail.com", name="Gina G", picture="https://lh3.googleusercontent.com/a/pic"):
    async def fake(credential):
        return google_auth.GoogleProfile(email=email, name=name, picture=picture)
    monkeypatch.setattr(google_auth, "verify_google_credential", fake)


async def test_google_login_creates_a_personal_account_with_the_google_photo(client, monkeypatch):
    _fake_google(monkeypatch)
    resp = await client.post("/api/v1/auth/google", json={"credential": "x" * 30})
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    me = (await client.get("/api/v1/auth/me", headers=auth_header(token))).json()
    assert me["user"]["email"] == "gina@gmail.com"
    assert me["user"]["avatar"] == "https://lh3.googleusercontent.com/a/pic"
    assert me["tenant"]["account_type"] == "personal"


async def test_google_login_finds_an_existing_account_and_keeps_a_chosen_picture(client, monkeypatch):
    reg = (await register_user(client, "gina@gmail.com")).json()
    mine = "data:image/jpeg;base64,/9j/4AAQSkZJRg=="
    await client.put("/api/v1/auth/me/avatar", json={"avatar": mine},
                     headers=auth_header(reg["tokens"]["access_token"]))
    _fake_google(monkeypatch)
    resp = await client.post("/api/v1/auth/google", json={"credential": "x" * 30})
    assert resp.status_code == 200
    me = (await client.get("/api/v1/auth/me", headers=auth_header(resp.json()["access_token"]))).json()
    assert me["user"]["id"] == reg["user"]["id"]          # same account, not a second one
    assert me["user"]["avatar"] == mine


async def test_google_login_without_a_client_id_is_refused(client, monkeypatch):
    monkeypatch.setattr(google_auth.settings, "GOOGLE_CLIENT_ID", None)
    resp = await client.post("/api/v1/auth/google", json={"credential": "x" * 30})
    assert resp.status_code == 503


def test_only_google_image_addresses_are_kept():
    assert google_auth.safe_picture("https://lh3.googleusercontent.com/a/x")
    assert google_auth.safe_picture("http://lh3.googleusercontent.com/a/x") is None
    assert google_auth.safe_picture("https://evil.example.com/a.jpg") is None
    assert google_auth.safe_picture(None) is None
