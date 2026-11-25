"""Shared contract that every mathematical module package follows.

A module package (e.g. ``app.modules.logic``) must expose:

* ``INFO``   - a :class:`ModuleInfo` describing the module.
* ``router`` - a FastAPI ``APIRouter`` holding that module's endpoints.

The API layer mounts each router under ``/api/v1/<slug>``. Because modules only
communicate through this contract, each one can be implemented, tested and
documented independently.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

ModuleStatus = Literal["planned", "in_progress", "available"]


@dataclass(frozen=True)
class ModuleInfo:
    """Static description of a mathematical module."""

    slug: str
    title: str
    summary: str
    status: ModuleStatus = "planned"
