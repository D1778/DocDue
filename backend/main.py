import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.core import database
from app.core.config import settings
from app.core.production_checks import check_production_settings
from app.services import email_service, ocr_service, scheduler
from app.services.reminder_rules import parse_milestones
from app.services.storage_service import StorageError

# Show our own INFO messages (like "OCR done for document ...") in the terminal
logging.basicConfig(level=logging.WARNING)
logging.getLogger("docdue").setLevel(logging.INFO)
logger = logging.getLogger("docdue")


@asynccontextmanager
async def lifespan(app: FastAPI):
    check_production_settings()   # refuse to start with unsafe production settings
    await database.init_db()      # runs once at startup
    try:
        ocr_service.configure_tesseract(settings.TESSERACT_CMD)
    except ocr_service.OcrUnavailable as exc:
        # The API still works; uploaded documents just go to "needs_review"
        logger.warning("OCR disabled: %s", exc)
    # Fail fast with a clear message if the Sprint 4 settings are wrong
    email_service.check_configuration()
    parse_milestones(settings.REMINDER_DAYS)
    scheduler.start_scheduler()   # the daily job
    yield
    scheduler.stop_scheduler()
    await database.close_db()     # runs once at shutdown


IS_PRODUCTION = settings.ENVIRONMENT == "production"

app = FastAPI(
    title="DocDue API",
    description="Document expiry tracking SaaS - backend API",
    version="1.0.0",
    lifespan=lifespan,
    # The interactive API pages are for development only
    docs_url=None if IS_PRODUCTION else "/docs",
    redoc_url=None if IS_PRODUCTION else "/redoc",
    openapi_url=None if IS_PRODUCTION else "/openapi.json",
)

# Allow the Next.js frontend to call this API from the browser
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL.rstrip("/")],   # an origin never ends with "/"
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
        content={"detail": "File storage is temporarily unavailable. Please try again in a moment."},
    )


@app.get("/")
def root():
    return {"status": "ok", "message": "DocDue API is running"}


@app.get("/health")
async def health():
    await database.client.admin.command("ping")
    return {"status": "ok", "database": "connected"}