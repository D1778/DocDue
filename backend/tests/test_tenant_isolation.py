from tests.helpers import DEFAULT_PASSWORD, auth_header, login, register_user


async def _org_admin(client, email, org_name):
    resp = await register_user(
        client, email, account_type="organization", organization_name=org_name
    )
    body = resp.json()
    return body["tokens"]["access_token"], body["user"]["id"], body["tenant"]["id"]


async def test_admin_only_sees_users_of_their_own_tenant(client):
    token_a, _, _ = await _org_admin(client, "admin.a@example.com", "Org A")
    await _org_admin(client, "admin.b@example.com", "Org B")

    resp = await client.get("/api/v1/users", headers=auth_header(token_a))
    assert resp.status_code == 200
    assert [u["email"] for u in resp.json()] == ["admin.a@example.com"]


async def test_cannot_fetch_another_tenants_user_by_id(client):
    token_a, _, _ = await _org_admin(client, "admin.a@example.com", "Org A")
    _, user_b_id, _ = await _org_admin(client, "admin.b@example.com", "Org B")

    resp = await client.get(f"/api/v1/users/{user_b_id}", headers=auth_header(token_a))
    assert resp.status_code == 404   # not 403: do not reveal that the id exists


async def test_invalid_object_id_returns_404(client):
    token_a, _, _ = await _org_admin(client, "admin.a@example.com", "Org A")
    resp = await client.get("/api/v1/users/not-an-id", headers=auth_header(token_a))
    assert resp.status_code == 404


async def test_admin_can_add_a_member_to_their_organization(client):
    token_a, _, tenant_a = await _org_admin(client, "admin.a@example.com", "Org A")
    resp = await client.post(
        "/api/v1/users",
        headers=auth_header(token_a),
        json={
            "full_name": "New Member",
            "email": "member@example.com",
            "password": DEFAULT_PASSWORD,
        },
    )
    assert resp.status_code == 201
    assert resp.json()["role"] == "member"
    assert resp.json()["tenant_id"] == tenant_a


async def test_member_cannot_list_users(client):
    token_a, _, _ = await _org_admin(client, "admin.a@example.com", "Org A")
    await client.post(
        "/api/v1/users",
        headers=auth_header(token_a),
        json={"full_name": "New Member", "email": "member@example.com",
              "password": DEFAULT_PASSWORD},
    )
    member_login = await login(client, "member@example.com")
    member_token = member_login.json()["access_token"]

    resp = await client.get("/api/v1/users", headers=auth_header(member_token))
    assert resp.status_code == 403


async def test_personal_account_cannot_add_users(client):
    reg = await register_user(client, "solo@example.com")
    token = reg.json()["tokens"]["access_token"]
    resp = await client.post(
        "/api/v1/users",
        headers=auth_header(token),
        json={"full_name": "Someone", "email": "someone@example.com",
              "password": DEFAULT_PASSWORD},
    )
    assert resp.status_code == 400


async def test_cannot_add_a_user_with_an_existing_email(client):
    token_a, _, _ = await _org_admin(client, "admin.a@example.com", "Org A")
    await _org_admin(client, "admin.b@example.com", "Org B")
    resp = await client.post(
        "/api/v1/users",
        headers=auth_header(token_a),
        json={"full_name": "Dup", "email": "admin.b@example.com",
              "password": DEFAULT_PASSWORD},
    )
    assert resp.status_code == 409