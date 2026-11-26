"""Number theory & algebraic structures module.

Implemented: Euclidean and extended Euclidean algorithms, modular inverses, and the
Caesar and affine ciphers (arithmetic over Z_26). Everything else is still planned.
"""

from app.modules.algebra.router import router
from app.modules.base import ModuleInfo

INFO = ModuleInfo(
    slug="algebra",
    title="Algebra",
    summary="Modular arithmetic and the Caesar and affine ciphers over Z_26.",
    status="available",
)

__all__ = ["INFO", "router"]
