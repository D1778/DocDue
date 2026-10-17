DEFAULT_PASSWORD = "Test@1234"
PDF_BYTES = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\n"


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def register_user(client, email, *, account_type="personal",
                        organization_name=None, password=DEFAULT_PASSWORD):
    payload = {
        "full_name": "Test User",
        "email": email,
        "password": password,
        "account_type": account_type,
    }
    if organization_name:
        payload["organization_name"] = organization_name
    return await client.post("/api/v1/auth/register", json=payload)


async def login(client, email, password=DEFAULT_PASSWORD):
    # Login expects form data with the email in the "username" field
    return await client.post(
        "/api/v1/auth/login", data={"username": email, "password": password}
    )


async def register_org_admin(client, email, org_name):
    """Register an organization. Returns (access_token, user_id, tenant_id)."""
    resp = await register_user(
        client, email, account_type="organization", organization_name=org_name
    )
    body = resp.json()
    return body["tokens"]["access_token"], body["user"]["id"], body["tenant"]["id"]


async def create_member_token(client, admin_token, email, password=DEFAULT_PASSWORD):
    """An admin adds a member, then we log in as that member. Returns the member's token."""
    await client.post(
        "/api/v1/users",
        headers=auth_header(admin_token),
        json={"full_name": "Staff Member", "email": email, "password": password},
    )
    resp = await login(client, email, password)
    return resp.json()["access_token"]


async def start_upload(client, token, *, filename="license.pdf",
                       content_type="application/pdf", file_size=1000,
                       document_type="license"):
    return await client.post(
        "/api/v1/documents/upload-url",
        headers=auth_header(token),
        json={
            "filename": filename,
            "content_type": content_type,
            "file_size": file_size,
            "document_type": document_type,
        },
    )


async def upload_and_complete(client, storage, token, *, data=PDF_BYTES,
                              stored_type="application/pdf", **kwargs):
    """Run the whole flow: get a URL, 'upload' the bytes, call /complete.

    Returns (document_id, response_of_complete).
    """
    resp = await start_upload(client, token, **kwargs)
    body = resp.json()
    key = storage.key_from_url(body["upload_url"])
    storage.put(key, stored_type, data)
    done = await client.post(
        f"/api/v1/documents/{body['document_id']}/complete",
        headers=auth_header(token),
    )
    return body["document_id"], done