"""Propositional & predicate logic module (engine not implemented yet)."""

from app.modules.base import ModuleInfo
from app.modules.logic.router import router

INFO = ModuleInfo(
    slug="logic",
    title="Logic",
    summary="Propositions, truth tables, logical equivalence and proof techniques.",
)

__all__ = ["INFO", "router"]
