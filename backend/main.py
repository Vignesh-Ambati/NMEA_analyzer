"""
FastAPI Server Entrypoint for 5 GB Stream Processing. Placed in backend/main.py.
"""

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import extraction, nmea, dev

app = FastAPI(
    title="NMEA & Log Analyzer 5GB Stream Engine",
    description="High-performance FastAPI service for chunked multi-GB log parsing, regex extraction, and temp file streaming.",
    version="2.0.0",
)

# Configure CORS to allow full-duplex streaming from frontend UI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(dev.router)
app.include_router(extraction.router)
app.include_router(nmea.router)

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
