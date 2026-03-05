"""
core/parser.py
──────────────
Low-level NMEA parsing helpers:

  stream_nmea          — high-speed binary file reader; yields ASCII sentences.
  parse_time_to_seconds — converts NMEA hhmmss.ss time field to an integer
                          second value used as the epoch key throughout the
                          processing pipeline.
  resolve_constellation — determines which GNSS constellation produced a
                          given GSA / GSV sentence, handling both talker-
                          prefixed (GP, GL, GA …) and GN (multi-constellation)
                          sentences.
"""

from .constants import TALKER_MAP, ID_MAP


# =========================
# STREAM (HIGH SPEED)
# =========================

def stream_nmea(file_path):
    with open(file_path, "rb", buffering=8 * 1024 * 1024) as f:
        for raw in f:
            if raw and raw[0] == 36:  # '$'
                yield raw.decode("ascii", "ignore").strip()


# =========================
# TIME PARSER
# =========================

def parse_time_to_seconds(t):
    try:
        if not t:
            return None
        return int(float(t))  # hhmmss → second resolution
    except:
        return None


# =========================
# CONSTELLATION RESOLVER
# =========================

def resolve_constellation(msg, parts):
    talker = msg[:2]

    # ---- GLOBAL (STANDARD NMEA) ----
    if talker != "GN":
        return TALKER_MAP.get(talker, "UNKNOWN")

    # ---- LOCAL (GN → use last field before *) ----
    try:
        last = parts[-1]

        if "*" in last:
            last = last.split("*")[0]

        constellation_id = int(last)
        return ID_MAP.get(constellation_id, "UNKNOWN")

    except:
        return "UNKNOWN"