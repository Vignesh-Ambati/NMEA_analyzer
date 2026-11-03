"""
API routes for Data Extractor Pro backend operations. Placed in backend/routers/extraction.py.
"""

import os
import shutil
from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional, List

from backend.services.extraction import (
    extraction_service,
    ExtractionRequestModel,
    ExtractionOptionsModel,
)
from backend.services.chunk_uploader import chunk_uploader_service

router = APIRouter(prefix="/api/extraction", tags=["Extraction"])

class SaveRequestModel(BaseModel):
    tempFileId: str
    destinationPath: str
    format: str = "log"

@router.post("/bulk-line-copy")
async def start_bulk_line_copy(payload: ExtractionRequestModel):
    """
    Initiate streaming extraction for up to 5 GB files in the FastAPI backend.
    """
    resolved_path = None
    if payload.source_type == "file_path" and payload.source_path:
        # Check if file exists locally on server
        if os.path.exists(payload.source_path):
            resolved_path = payload.source_path
        elif os.path.exists(os.path.expanduser(payload.source_path)):
            resolved_path = os.path.expanduser(payload.source_path)

    job = extraction_service.start_job(payload, resolved_file_path=resolved_path)
    return {
        "success": True,
        "jobId": job.job_id,
        "status": job.status,
        "message": "FastAPI streaming extraction engine initialized",
        "tempFile": {
            "id": job.job_id,
            "name": job.temp_file_name,
            "path": job.temp_file_path,
        }
    }

@router.get("/status/{job_id}")
async def get_extraction_status(job_id: str):
    """
    Fetch real-time telemetry (lines extracted, lines processed, throughput, temp file snippets).
    """
    job = extraction_service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Extraction job not found")
    return job.to_dict()

@router.post("/cancel/{job_id}")
async def cancel_extraction(job_id: str):
    success = extraction_service.cancel_job(job_id)
    return {"success": success, "message": "Cancellation signal sent to worker"}

@router.post("/save")
async def save_temp_file(payload: SaveRequestModel):
    """
    Commit the extracted temporary file to a chosen destination path or filename.
    """
    job = extraction_service.get_job(payload.tempFileId)
    if not job or not os.path.exists(job.temp_file_path):
        raise HTTPException(status_code=404, detail="Temporary extraction file not found")

    dest = payload.destinationPath
    try:
        dest_dir = os.path.dirname(dest)
        if dest_dir:
            os.makedirs(dest_dir, exist_ok=True)
        shutil.copyfile(job.temp_file_path, dest)
        return {
            "success": True,
            "filePath": dest,
            "sizeBytes": os.path.getsize(dest),
            "message": f"Successfully saved to {dest}",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

@router.get("/download/{job_id}")
async def download_extracted_file(job_id: str, format: str = "log"):
    job = extraction_service.get_job(job_id)
    if not job or not os.path.exists(job.temp_file_path):
        raise HTTPException(status_code=404, detail="Extracted file not found")

    media_types = {
        "log": "text/plain",
        "txt": "text/plain",
        "csv": "text/csv",
    }
    filename = f"extracted_{job_id[:8]}.{format}"
    return FileResponse(
        path=job.temp_file_path,
        media_type=media_types.get(format, "text/plain"),
        filename=filename,
    )

@router.get("/temp/{job_id}")
async def get_temp_file_content(job_id: str, offset_lines: int = 0, limit_lines: int = 500):
    """
    Read sliced content from the temp file without loading the entire multi-GB file into RAM.
    """
    job = extraction_service.get_job(job_id)
    if not job or not os.path.exists(job.temp_file_path):
        raise HTTPException(status_code=404, detail="Temp file not found")

    lines = []
    with open(job.temp_file_path, "r", encoding="utf-8", errors="replace") as f:
        for idx, line in enumerate(f):
            if idx < offset_lines:
                continue
            if len(lines) >= limit_lines:
                break
            lines.append(line.rstrip("\r\n"))

    return {
        "jobId": job_id,
        "offset": offset_lines,
        "limit": limit_lines,
        "totalLines": job.lines_extracted,
        "lines": lines,
    }
