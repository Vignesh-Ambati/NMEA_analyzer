"""
Classified as shared service because it manages chunked binary file assembly and streaming disk writes for arbitrary multi-GB files. Placed in backend/services/chunk_uploader.py.
"""

import os
import tempfile
import time
from typing import Dict, Any, Optional

class ChunkUploadSession:
    def __init__(self, upload_id: str, filename: str, total_bytes: int):
        self.upload_id = upload_id
        self.filename = filename
        self.total_bytes = total_bytes
        self.bytes_received = 0
        self.chunks_received = 0
        self.created_at = time.time()
        
        upload_dir = os.path.join(tempfile.gettempdir(), "gnss_uploads")
        os.makedirs(upload_dir, exist_ok=True)
        self.target_path = os.path.join(upload_dir, f"{upload_id}_{filename}")
        # Clean existing file
        if os.path.exists(self.target_path):
            os.remove(self.target_path)

    def append_chunk(self, chunk_data: bytes, chunk_index: int) -> int:
        with open(self.target_path, "ab") as f:
            f.write(chunk_data)
        self.bytes_received += len(chunk_data)
        self.chunks_received += 1
        return self.bytes_received

    def is_complete(self) -> bool:
        return self.bytes_received >= self.total_bytes


class ChunkUploaderService:
    def __init__(self):
        self.sessions: Dict[str, ChunkUploadSession] = {}

    def get_session(self, upload_id: str) -> Optional[ChunkUploadSession]:
        return self.sessions.get(upload_id)

    def init_session(self, upload_id: str, filename: str, total_bytes: int) -> ChunkUploadSession:
        session = ChunkUploadSession(upload_id, filename, total_bytes)
        self.sessions[upload_id] = session
        return session

    def process_chunk(self, upload_id: str, filename: str, total_bytes: int, chunk_index: int, chunk_bytes: bytes) -> Dict[str, Any]:
        session = self.get_session(upload_id)
        if not session:
            session = self.init_session(upload_id, filename, total_bytes)

        received = session.append_chunk(chunk_bytes, chunk_index)
        pct = min(100, int((received / (total_bytes or 1)) * 100))
        is_done = session.is_complete()

        return {
            "uploadId": upload_id,
            "filename": filename,
            "bytesReceived": received,
            "totalBytes": total_bytes,
            "chunkIndex": chunk_index,
            "progressPct": pct,
            "isComplete": is_done,
            "filePath": session.target_path if is_done else None,
        }


chunk_uploader_service = ChunkUploaderService()
