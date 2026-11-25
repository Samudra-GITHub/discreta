"""Graph theory module (engine not implemented yet)."""

from app.modules.base import ModuleInfo
from app.modules.graphs.router import router

INFO = ModuleInfo(
    slug="graphs",
    title="Graphs",
    summary="Graphs, trees, connectivity, paths and graph algorithms.",
)

__all__ = ["INFO", "router"]
