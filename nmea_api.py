"""
nmea_api.py  (compatibility shim)
──────────────────────────────────
Re-exports every public symbol that the original nmea_api.py defined so that
any external code still using `from nmea_api import *` continues to work
without modification.

All actual logic now lives in the `core` package:

    core/cache.py      → DataCache
    core/constants.py  → TALKER_MAP, ID_MAP
    core/parser.py     → stream_nmea, parse_time_to_seconds,
                         resolve_constellation
    core/processor.py  → process_nmea_file
    core/query.py      → query_file
"""

# ruff: noqa: F401  (re-exports are intentionally unused here)
from core.cache      import DataCache
from core.constants  import TALKER_MAP, ID_MAP
from core.parser     import (stream_nmea, parse_time_to_seconds,
                              resolve_constellation)
from core.processor  import process_nmea_file
from core.query      import query_file


def plot_cno():
    """Stub preserved from original nmea_api.py (not yet implemented)."""
    pass