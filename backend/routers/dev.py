"""
Developer, health check, and task telemetry routes. Placed in backend/routers/dev.py.
"""

import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any

from backend.services.extraction import extraction_service
from backend.services.nmea_parser import nmea_parser_service

router = APIRouter(tags=["Developer & Telemetry"])

class AuthModel(BaseModel):
    password: str

class EngineParamsModel(BaseModel):
    batchSize: int = 500
    retentionWindow: int = 3600
    workerCount: int = 4

stored_engine_params = {
    "batchSize": 500,
    "retentionWindow": 3600,
    "workerCount": 4,
    "updatedAt": "2026-10-29T05:00:00Z"
}

@router.get("/api/health")
async def health_check():
    return {
        "status": "online",
        "service": "FastAPI 5GB Core Engine",
        "message": "FastAPI streaming backend operational",
        "version": "2.0.0",
        "capabilities": ["5gb_streaming", "chunked_upload", "regex_extractor", "nmea_parser"]
    }

@router.get("/api/tasks/{task_id}")
async def get_task_telemetry(task_id: str):
    # Check extraction job
    job = extraction_service.get_job(task_id)
    if job:
        return job.to_dict()

    # Check NMEA parse task
    nmea_task = nmea_parser_service.get_progress(task_id)
    if nmea_task:
        return nmea_task.to_dict()

    return {
        "taskId": task_id,
        "status": "idle",
        "statusText": "AWAITING COMMAND...",
        "progressPct": 0,
        "linesExtracted": 0,
        "linesProcessed": 0,
    }

@router.post("/api/dev/auth")
async def dev_auth(payload: AuthModel):
    # Default development suite PIN / password
    if payload.password in ("2468", "1234", "admin", "dev"):
        return {
            "authenticated": True,
            "status": "ok",
            "message": "FastAPI Developer Authentication verified",
            "user": "developer"
        }
    return {
        "authenticated": False,
        "status": "error",
        "message": "Invalid developer access credentials"
    }

@router.get("/api/dev/engine-params")
async def get_engine_params():
    return stored_engine_params

@router.post("/api/dev/engine-params")
async def update_engine_params(payload: EngineParamsModel):
    stored_engine_params["batchSize"] = payload.batchSize
    stored_engine_params["retentionWindow"] = payload.retentionWindow
    stored_engine_params["workerCount"] = payload.workerCount
    stored_engine_params["updatedAt"] = "2026-10-29T05:20:00Z"
    return {"success": True, "params": stored_engine_params}
