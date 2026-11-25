"""Application settings, read from environment variables with safe local defaults."""

from __future__ import annotations

import os
from dataclasses import dataclass, field

# Origins of the local Vite dev server (5173) and `vite preview` (4173).
DEFAULT_CORS_ORIGINS: tuple[str, ...] = (
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
)


def _parse_origins(raw: str | None) -> tuple[str, ...]:
    """Parse a comma-separated origin list; fall back to the local defaults."""
    if raw is None or not raw.strip():
        return DEFAULT_CORS_ORIGINS
    return tuple(o.strip().rstrip("/") for o in raw.split(",") if o.strip())


@dataclass(frozen=True)
class Settings:
    """Immutable runtime configuration.

    ``DISCRETA_CORS_ORIGINS`` may override the allowed browser origins
    (comma-separated). Wildcards are intentionally not the default.
    """

    app_name: str = "DISCRETA"
    service_name: str = "discreta-backend"
    description: str = "Interactive Discrete Mathematics & Cryptography Laboratory"
    api_prefix: str = "/api/v1"
    cors_origins: tuple[str, ...] = field(default_factory=lambda: DEFAULT_CORS_ORIGINS)


def get_settings() -> Settings:
    """Build settings from the current environment."""
    return Settings(cors_origins=_parse_origins(os.environ.get("DISCRETA_CORS_ORIGINS")))
