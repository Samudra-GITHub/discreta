"""Number theory & algebraic structures module (engine not implemented yet).

The classical ciphers of the chosen base topic (Caesar, affine, Vigenere) are
arithmetic over Z_n, so their mathematics belongs to this module.
"""

from app.modules.algebra.router import router
from app.modules.base import ModuleInfo

INFO = ModuleInfo(
    slug="algebra",
    title="Algebra",
    summary="Modular arithmetic, number theory and algebraic structures behind ciphers.",
)

__all__ = ["INFO", "router"]
