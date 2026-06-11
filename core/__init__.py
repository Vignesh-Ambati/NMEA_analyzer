"""
core/__init__.py
────────────────
Public API surface for the `core` package.

Importing from `core` directly gives access to all processing primitives
without requiring knowledge of the internal module layout:

    from core import NmeaProcessor, query_file, CacheManager
"""

from .cache import CacheManager
from .constants import CONSTELLATION_DICT, CONSTELLATION_ID
from .processor import NmeaProcessor
from .orchestrator import JobOrchestrator
__all__ = [
    "CacheManager",
    "CONSTELLATION_DICT",
    "CONSTELLATION_ID",
    "NmeaProcessor",
    "JobOrchestrator",
]