"""
core/__init__.py
────────────────
Public API surface for the `core` package.

Importing from `core` directly gives access to all processing primitives
without requiring knowledge of the internal module layout:

    from core import process_nmea_file, query_file, DataCache
"""

from .cache import DataCache
from .constants import TALKER_MAP, ID_MAP
from .parser import stream_nmea, parse_time_to_seconds, resolve_constellation
from .processor import process_nmea_file
from .query import query_file

__all__ = [
    "DataCache",
    "TALKER_MAP",
    "ID_MAP",
    "stream_nmea",
    "parse_time_to_seconds",
    "resolve_constellation",
    "process_nmea_file",
    "query_file",
]