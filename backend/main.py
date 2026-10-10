from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core import database
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    await database.init_db()      # runs once at startup
    yield
    await database.close_db()     # runs once at shutdown


app = FastAPI(
    title="DocDue API",
    description="Document expiry tracking SaaS - backend API",
    version="0.2.0",
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


@app.get("/")
def root():
    return {"status": "ok", "message": "DocDue API is running"}


@app.get("/health")
async def health():
    await database.client.admin.command("ping")
    return {"status": "ok", "database": "connected"}