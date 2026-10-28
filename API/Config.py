# API/Config.py
import os
from typing import Final, List, Set

APP_TITLE: str = "NMEA Core Processing API"
APP_VERSION: str = "1.0.0"

API_HOST: str = os.getenv("API_HOST", "127.0.0.1")
API_PORT: Final[int] = int(os.getenv("API_PORT", "8000"))

API_PREFIX: str = "/api"

ROUTE_HEALTH: str = "/health"
ROUTE_DEV_LOGS: str = "/dev/logs"
ROUTE_DEV_AUTH: str = "/dev/auth"
ROUTE_DEV_SETTINGS: str = "/dev/settings"
ROUTE_DEV_ENGINE_PARAMS: str = "/dev/engine-params"
ROUTE_NMEA_PARSE: str = "/nmea/parse"
ROUTE_NMEA_UPLOAD: str = "/nmea/upload"
ROUTE_EXTRACTION_COPY: str = "/extraction/bulk-line-copy"
ROUTE_EXTRACTION_STATUS: str = "/tasks/{task_id}"

ALLOWED_ORIGINS: Final[List[str]] = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    
    "https://localhost:3000",
    "https://127.0.0.1:3000",
    "https://localhost:5173",
    "https://127.0.0.1:5173",
]
ALLOWED_ORIGINS_SET: Final[Set[str]] = set(ALLOWED_ORIGINS)

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
]