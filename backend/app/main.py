"""FastAPI application entrypoint."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import admin as admin_router
from app.api.routes import auth as auth_router
from app.api.routes import entries as entries_router
from app.config import get_settings
from app.db.seed import run_seed

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    run_seed()
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router, prefix="/api")
app.include_router(admin_router.router, prefix="/api")
app.include_router(entries_router.router, prefix="/api")


@app.get("/api/health", tags=["meta"])
def health() -> dict:
    """Liveness probe. Returns 200 + a small JSON payload when the app is up."""
    return {"status": "ok", "app": settings.app_name}
