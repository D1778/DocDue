from app.services.storage_service import ObjectInfo, StorageError


class FakeStorage:
    """An in-memory stand-in for storage_service. No AWS, no network."""

    def __init__(self):
        self.objects = {}   # key -> (content_type, bytes)

    # --- same names and signatures as storage_service ---
    def create_upload_url(self, key, content_type):
        return f"https://fake-s3.test/upload/{key}"

    def create_download_url(self, key, filename, content_type, download=False):
        return f"https://fake-s3.test/download/{key}?download={download}"

    async def inspect_object(self, key):
        item = self.objects.get(key)
        if item is None:
            return None
        content_type, data = item
        return ObjectInfo(size=len(data), content_type=content_type, head=data[:1024])

    async def delete_object(self, key):
        self.objects.pop(key, None)

    async def download_object(self, key, max_bytes):
        item = self.objects.get(key)
        if item is None:
            raise StorageError("fake: object not found")
        data = item[1]
        if len(data) > max_bytes:
            raise StorageError("fake: object too large")
        return data

    # --- helpers only tests use ---
    def put(self, key, content_type, data):
        """Pretend the browser uploaded a file."""
        self.objects[key] = (content_type, data)

    @staticmethod
    def key_from_url(url):
        return url.split("/upload/", 1)[1]