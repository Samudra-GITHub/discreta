"""Registry of the backend modules (cipher arithmetic and ciphertext analysis).

To add a module: create a package following the contract in ``base.py`` and add
it to ``MODULES`` below. Nothing else in the application needs to change.
"""

from __future__ import annotations

from types import ModuleType

from app.modules import algebra, analysis
from app.modules.base import ModuleInfo

MODULES: tuple[ModuleType, ...] = (algebra, analysis)


def module_infos() -> list[ModuleInfo]:
    """Metadata of every registered module, in display order."""
    return [m.INFO for m in MODULES]
