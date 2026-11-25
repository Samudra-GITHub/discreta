"""FastAPI application entry point.

Run locally from the ``backend`` directory:

    uvicorn app.main:app --reload --port 8000
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api.v1.router import api_router
from app.core.config import Settings, get_settings


def create_app(settings: Settings | None = None) -> FastAPI:
    """Application factory (lets tests build an app with custom settings)."""
    settings = settings or get_settings()

    app = FastAPI(
        title=f"{settings.app_name} API",
        description=settings.description,
        version=__version__,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "Accept"],
    )

    @app.get("/", tags=["root"], summary="Service banner")
    def root() -> dict[str, str]:
        return {
            "name": settings.app_name,
            "description": settings.description,
            "version": __version__,
            "docs": "/docs",
            "health": f"{settings.api_prefix}/health",
        }

    app.include_router(api_router, prefix=settings.api_prefix)
    return app


app = create_app()
