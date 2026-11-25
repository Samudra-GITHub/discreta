"""Number theory & algebraic structures module.

Implemented: Euclidean and extended Euclidean algorithms, modular inverses, and the
Caesar and affine ciphers (arithmetic over Z_26). Everything else is still planned.
"""

from app.modules.algebra.router import router
from app.modules.base import ModuleInfo

INFO = ModuleInfo(
    slug="algebra",
    title="Algebra",
    summary="Modular arithmetic, number theory and algebraic structures behind ciphers.",
    status="in_progress",
)

__all__ = ["INFO", "router"]
