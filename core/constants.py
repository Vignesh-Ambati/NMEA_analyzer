"""
core/constants.py
─────────────────
Static lookup tables shared across NMEA processing modules.

  TALKER_MAP  — maps two-character NMEA talker IDs to constellation names.
  ID_MAP      — maps numeric system IDs (used in GN-prefixed messages) to
                constellation names.
"""

TALKER_MAP = {
    "GP": "GPS",
    "GL": "GLONASS",
    "GA": "GALILEO",
    "GB": "BEIDOU",
    "GQ": "QZSS",
    "GI": "IRNSS"
}

ID_MAP = {
    1: "GPS",
    2: "GLONASS",
    3: "GALILEO",
    4: "BEIDOU",
    5: "QZSS",
    6: "IRNSS"
}