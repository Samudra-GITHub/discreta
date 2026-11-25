"""Aggregate router for API version 1.

Each mathematical module contributes its own router, mounted under
``/api/v1/<module-slug>``.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1 import health, meta
from app.modules import MODULES

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(meta.router)

for _module in MODULES:
    api_router.include_router(_module.router)
