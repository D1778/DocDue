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