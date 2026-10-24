# API/Config.py
import os
from typing import Final, List, Set

APP_TITLE: Final[str] = "NMEA Core Processing API"
APP_VERSION: Final[str] = "1.0.0"

API_HOST: Final[str] = os.getenv("API_HOST", "127.0.0.1")
API_PORT: Final[int] = int(os.getenv("API_PORT", "8000"))

API_PREFIX: Final[str] = "/api"

ROUTE_HEALTH: Final[str] = "/health"
ROUTE_DEV_LOGS: Final[str] = "/dev/logs"
ROUTE_DEV_AUTH: Final[str] = "/dev/auth"
ROUTE_DEV_SETTINGS: Final[str] = "/dev/settings"
ROUTE_DEV_ENGINE_PARAMS: Final[str] = "/dev/engine-params"
ROUTE_NMEA_PARSE: Final[str] = "/nmea/parse"
ROUTE_NMEA_UPLOAD: Final[str] = "/nmea/upload"
ROUTE_EXTRACTION_COPY: Final[str] = "/extraction/bulk-line-copy"
ROUTE_EXTRACTION_STATUS: Final[str] = "/tasks/{task_id}"

ALLOWED_ORIGINS: Final[List[str]] = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
ALLOWED_ORIGINS_SET: Final[Set[str]] = set(ALLOWED_ORIGINS)

DEV_PASSPHRASES: Final[Set[str]] = {"7788", "admin", "demo"}

__all__ = [
    "APP_TITLE",
    "APP_VERSION",
    "API_HOST",
    "API_PORT",
    "API_PREFIX",
    "ROUTE_HEALTH",
    "ROUTE_DEV_LOGS",
    "ROUTE_DEV_AUTH",
    "ROUTE_DEV_SETTINGS",
    "ROUTE_DEV_ENGINE_PARAMS",
    "ROUTE_NMEA_PARSE",
    "ROUTE_NMEA_UPLOAD",
    "ROUTE_EXTRACTION_COPY",
    "ROUTE_EXTRACTION_STATUS",
    "ALLOWED_ORIGINS",
    "ALLOWED_ORIGINS_SET",
    "DEV_PASSPHRASES",
]