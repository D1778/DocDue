import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.core import database
from app.core.config import settings
from app.services.storage_service import StorageError

logger = logging.getLogger("docdue")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await database.init_db()      # runs once at startup
    yield
    await database.close_db()     # runs once at shutdown


app = FastAPI(
    title="DocDue API",
    description="Document expiry tracking SaaS - backend API",
    version="0.3.0",
    lifespan=lifespan,
)

# Allow the Next.js frontend to call this API from the browser
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.exception_handler(StorageError)
async def storage_error_handler(request: Request, exc: StorageError):
    # The real reason goes to the server log. The user only gets a safe message.
    logger.error("Storage error: %s (cause: %r)", exc, exc.__cause__)
    return JSONResponse(
        status_code=502,
        content={"detail": "Storage service error. Please try again."},
    )


@app.get("/")
def root():
    return {"status": "ok", "message": "DocDue API is running"}


@app.get("/health")
async def health():
    await database.client.admin.command("ping")
    return {"status": "ok", "database": "connected"}