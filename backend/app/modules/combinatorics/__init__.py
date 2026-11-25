"""Combinatorics module (engine not implemented yet)."""

from app.modules.base import ModuleInfo
from app.modules.combinatorics.router import router

INFO = ModuleInfo(
    slug="combinatorics",
    title="Combinatorics",
    summary="Counting principles, permutations, combinations and recurrences.",
)

__all__ = ["INFO", "router"]
