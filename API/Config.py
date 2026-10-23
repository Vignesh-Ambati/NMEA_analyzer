# This new file to handle all API-level configurations (ports, routes, allowed origins).

import os

APP_TITLE = "NMEA Core Processing API"
APP_VERSION = "1.0.0"

# Static loopback binding increases security by rejecting external network traffic
API_HOST = os.getenv("API_HOST", "127.0.0.1")
API_PORT = int(os.getenv("API_PORT", 8443))

# Strict domain whitelisting. Adjust this environment variable for production.
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]
ROUTE_PREFIX_UTILITIES = "/api/utilities"

__all__ = ["APP_TITLE", "APP_VERSION", "API_HOST", "API_PORT", "ALLOWED_ORIGINS", "ROUTE_PREFIX_UTILITIES"]