# Lookup tables, regex patterns, and static configurations

"""
core/constants.py
─────────────────
Static lookup tables shared across NMEA processing modules.
"""
import re
import os
from pathlib import Path

CONSTELLATION_DICT = {
    "GP": "GPS",
    "GL": "GLONASS",
    "GA": "GALILEO",
    "GB": "BEIDOU",
    "GQ": "QZSS",
    "GI": "IRNSS"
}
"""
    # CONSTELLATION DICT LOOKS FOR THE CONSTELLATION TYPE IN GSV MESSAGES
"""

CONSTELLATION_ID = {
    1: "GPS",
    2: "GLONASS",
    3: "GALILEO",
    4: "BEIDOU",
    5: "QZSS",
    6: "IRNSS"
}
"""
    # CONSTELLATION ID LOOKS FOR THE CONSTELLATION ID IN GSA CHECKSUM FIELD
"""


LINE_PATTERN = re.compile(r'(?:\[(?P<ts>.*?)\])?\s*(?P<nmea>\$.*)')
r"""
    # Regex breakdown:
    # (?:\[(?P<ts>.*?)\])? -> Non-capturing group for optional [...] timestamp
    # \s*                  -> Any whitespace
    # (?P<nmea>\$.*)       -> Captures everything starting from '$' as the NMEA sentence
"""


#Keys used in GGA
KEY_TYPE = "type"
KEY_TIME = "time"
KEY_LAT  = "lat"
KEY_LON  = "lon"
KEY_QUAL = "quality"
KEY_SVS  = "fix_sv"
KEY_HDOP = "hdop"
KEY_ALT  = "alt"
KEY_GHEIGHT = "geoid_height"

KEY_SPD  = "speed_knots" 
KEY_COG  = "course"
KEY_DATE = "date"
KEY_STATUS = "status"

KEY_MODE = "mode_indicator"
KEY_TOTAL_SVS = "total_svs" #TODO: Confirm if this accurate

KEY_PDOP = "pdop"
KEY_VDOP = "vdop"
KEY_FIX_TYPE = "fix_type"
KEY_SV_IDS = "sv_ids"
KEY_CONSTELLATION = "constellation_type"
KEY_MSG_NUM = "msg_num"
KEY_TOTAL_MSGS = "total_msgs"
KEY_SATELLITES = "satellites"

KEY_OFFSET ="local_offset"



BATCH_SIZE:int = 50000
"""No of lines we write at each time. This is sweet spot. Can be modified as per user's need"""

CACHE_BASE_NAME = ".logcache"
""" Base name for folder where we store the data"""

RETENTION_WINDOW_SECONDS = 3 * 24 * 60 * 60
"""Time until we retain the log before clean up"""


_BASE_DIR = Path(__file__).resolve().parent.parent.parent
CERT_FILE_PATH = os.path.join(_BASE_DIR, "cert.pem")
KEY_FILE_PATH = os.path.join(_BASE_DIR, "key.pem")