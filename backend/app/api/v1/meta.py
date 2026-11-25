"""Metadata about the registered mathematical modules."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from app.modules import module_infos

router = APIRouter(tags=["meta"])


class ModuleSummary(BaseModel):
    slug: str
    title: str
    summary: str
    status: str


@router.get("/modules", response_model=list[ModuleSummary], summary="List mathematical modules")
def list_modules() -> list[ModuleSummary]:
    """Describe each module and its implementation status (all 'planned' for now)."""
    return [
        ModuleSummary(slug=i.slug, title=i.title, summary=i.summary, status=i.status)
        for i in module_infos()
    ]
