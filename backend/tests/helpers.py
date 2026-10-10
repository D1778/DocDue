DEFAULT_PASSWORD = "Test@1234"


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


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}