"""Health check endpoint, used by the frontend connection indicator."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel

from app import __version__
from app.core.config import get_settings

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    message: str
    timestamp: datetime


@router.get("/health", response_model=HealthResponse, summary="Backend health check")
def health() -> HealthResponse:
    """Confirm that the backend process is running and able to serve requests."""
    return HealthResponse(
        status="ok",
        service=get_settings().service_name,
        version=__version__,
        message="DISCRETA backend is running.",
        timestamp=datetime.now(timezone.utc),
    )
