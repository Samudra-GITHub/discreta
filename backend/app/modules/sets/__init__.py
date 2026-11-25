"""Sets, relations & functions module (engine not implemented yet)."""

from app.modules.base import ModuleInfo
from app.modules.sets.router import router

INFO = ModuleInfo(
    slug="sets",
    title="Sets",
    summary="Set operations, relations, functions and their properties.",
)

__all__ = ["INFO", "router"]
