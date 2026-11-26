"""Ciphertext analysis: letter frequencies, chi-squared scoring and statistical key search.

Layout: ``english.py`` (reference data), ``scoring.py`` (the chi-squared statistic),
``frequency.py`` (letter counts), ``cryptanalysis.py`` (Caesar and affine key ranking),
``schemas.py`` and ``router.py`` (HTTP). The statistics never depend on FastAPI.
"""

from app.modules.analysis.router import router
from app.modules.base import ModuleInfo

INFO = ModuleInfo(
    slug="analysis",
    title="Analysis",
    summary="Letter-frequency analysis and chi-squared key search for classical ciphers.",
    status="available",
)

__all__ = ["INFO", "router"]
