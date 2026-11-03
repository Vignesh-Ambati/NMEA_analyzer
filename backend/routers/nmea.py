"""
API routes for NMEA/GNSS 5GB file ingestion, chunked upload, and parsing. Placed in backend/routers/nmea.py.
"""

import os
import uuid
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional

from backend.services.chunk_uploader import chunk_uploader_service
from backend.services.nmea_parser import nmea_parser_service

router = APIRouter(prefix="/api/nmea", tags=["NMEA"])

class ParseRequestModel(BaseModel):
    fileId: Optional[str] = None
    filePath: Optional[str] = None
    filename: Optional[str] = "uploaded_log.log"

@router.post("/upload-chunk")
async def upload_file_chunk(
    uploadId: str = Form(...),
    filename: str = Form(...),
    totalBytes: int = Form(...),
    chunkIndex: int = Form(...),
    chunk: UploadFile = File(...)
):
    """
    Accepts 8MB binary chunk of files up to 5 GB and streams directly to disk.
    Zero RAM bloat.
    """
    chunk_bytes = await chunk.read()
    res = chunk_uploader_service.process_chunk(
        upload_id=uploadId,
        filename=filename,
        total_bytes=totalBytes,
        chunk_index=chunkIndex,
        chunk_bytes=chunk_bytes,
    )
    return res

@router.post("/parse")
async def parse_nmea_file(payload: ParseRequestModel):
    """
    Parses a 5 GB NMEA file on disk in FastAPI without browser RAM usage.
    """
    file_path = payload.filePath
    filename = payload.filename or "log.log"
    task_id = payload.fileId or f"file_{uuid.uuid4().hex[:8]}"

    if not file_path:
        session = chunk_uploader_service.get_session(task_id)
        if session and os.path.exists(session.target_path):
            file_path = session.target_path
        else:
            raise HTTPException(status_code=400, detail="File path or completed upload session required")

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"File not found on server: {file_path}")

    # Parse in backend streaming mode
    progress = nmea_parser_service.parse_large_nmea_file(task_id, file_path, filename)
    return {
        "success": True,
        "fileId": task_id,
        "filename": filename,
        "fileSize": progress.file_size,
        "totalSentences": progress.total_sentences,
        "epochsCount": progress.epochs_count,
        "talkers": progress.talker_counts,
        "sentences": progress.sentence_counts,
        "elapsed": progress.elapsed_seconds,
        "message": f"Successfully parsed {progress.total_sentences:,} sentences from 5 GB stream",
    }
