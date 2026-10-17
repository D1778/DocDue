import asyncio

import httpx

from app.services import storage_service as s3

KEY = "healthcheck/test.pdf"
CONTENT = b"%PDF-1.4\n% DocDue storage self-test\n"


async def main():
    print("1. Upload through a presigned URL ...")
    upload_url = s3.create_upload_url(KEY, "application/pdf")
    response = httpx.put(
        upload_url, content=CONTENT, headers={"Content-Type": "application/pdf"}
    )
    print("   status:", response.status_code)
    response.raise_for_status()

    print("2. Inspect the stored file ...")
    info = await s3.inspect_object(KEY)
    print("   size:", info.size,
          "| type:", info.content_type,
          "| signature ok:", s3.matches_signature("application/pdf", info.head))

    print("3. Download through a presigned URL ...")
    view_url = s3.create_download_url(KEY, "test.pdf", "application/pdf")
    response = httpx.get(view_url)
    print("   status:", response.status_code, "| bytes:", len(response.content))
    response.raise_for_status()

    print("4. A file that does not exist should come back as None ...")
    print("   result:", await s3.inspect_object("healthcheck/does-not-exist.pdf"))

    print("5. Delete ...")
    await s3.delete_object(KEY)
    print("   gone:", await s3.inspect_object(KEY) is None)

    print("ALL CHECKS PASSED")


asyncio.run(main())