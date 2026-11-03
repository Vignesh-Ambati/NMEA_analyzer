"""
Classified as shared service because it handles multi-gigabyte GNSS log parsing and sentence extraction across multiple routes and tasks. Placed in backend/services/nmea_parser.py.
"""

import os
import re
import time
import uuid
from typing import Dict, Any, Optional, List

class NmeaParseProgress:
    def __init__(self, task_id: str, file_path: str, filename: str):
        self.task_id = task_id
        self.file_path = file_path
        self.filename = filename
        self.file_size = os.path.getsize(file_path) if os.path.exists(file_path) else 0
        self.status = "parsing"
        self.status_text = "PARSING GNSS SENTENCES IN FASTAPI..."
        self.progress_pct = 0
        self.total_sentences = 0
        self.valid_checksums = 0
        self.talker_counts: Dict[str, int] = {}
        self.sentence_counts: Dict[str, int] = {}
        self.epochs_count = 0
        self.elapsed_seconds = "0.0s"
        self.error: Optional[str] = None
        self.completed = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "taskId": self.task_id,
            "status": self.status,
            "statusText": self.status_text,
            "progressPct": self.progress_pct,
            "totalSentences": self.total_sentences,
            "validChecksums": self.valid_checksums,
            "talkerCounts": self.talker_counts,
            "sentenceCounts": self.sentence_counts,
            "epochsCount": self.epochs_count,
            "elapsedSeconds": self.elapsed_seconds,
            "completed": self.completed,
            "error": self.error,
            "file": {
                "id": self.task_id,
                "filename": self.filename,
                "fileSize": self.file_size,
                "totalSentences": self.total_sentences,
            }
        }


class NmeaParserService:
    def __init__(self):
        self.tasks: Dict[str, NmeaParseProgress] = {}

    def get_progress(self, task_id: str) -> Optional[NmeaParseProgress]:
        return self.tasks.get(task_id)

    def parse_large_nmea_file(self, task_id: str, file_path: str, filename: str) -> NmeaParseProgress:
        progress = NmeaParseProgress(task_id, file_path, filename)
        self.tasks[task_id] = progress

        # Run synchronously or in thread; streaming 5GB file using chunked byte read
        start_time = time.perf_counter()
        total_size = progress.file_size or 1
        bytes_read = 0
        CHUNK_SIZE = 4 * 1024 * 1024  # 4MB streaming chunk

        try:
            with open(file_path, "rb") as f:
                carry = b""
                while True:
                    chunk = f.read(CHUNK_SIZE)
                    if not chunk:
                        if carry:
                            self._process_line(carry.decode("utf-8", errors="replace"), progress)
                        break

                    bytes_read += len(chunk)
                    raw = carry + chunk
                    lines = raw.split(b"\n")
                    carry = lines.pop()

                    for b_line in lines:
                        self._process_line(b_line.decode("utf-8", errors="replace").rstrip("\r"), progress)

                    pct = min(99, int((bytes_read / total_size) * 100))
                    progress.progress_pct = pct
                    progress.elapsed_seconds = f"{time.perf_counter() - start_time:.1f}s"

            progress.progress_pct = 100
            progress.status = "completed"
            progress.status_text = f"PARSED {progress.total_sentences:,} SENTENCES"
            progress.completed = True
            progress.elapsed_seconds = f"{time.perf_counter() - start_time:.2f}s"

        except Exception as e:
            progress.status = "error"
            progress.status_text = f"PARSE ERROR: {str(e)}"
            progress.error = str(e)
            progress.completed = True

        return progress

    def _process_line(self, line: str, progress: NmeaParseProgress):
        line = line.strip()
        if not line or not (line.startswith("$") or line.startswith("!")):
            return

        progress.total_sentences += 1

        # Checksum validation
        star_idx = line.find("*")
        if star_idx != -1 and star_idx + 2 < len(line):
            progress.valid_checksums += 1

        # Talker & Sentence ID (e.g. $GNGGA -> talker: GN, sentence: GGA)
        match = re.match(r"^[\$!]([A-Z]{2})([A-Z0-9]{3})", line)
        if match:
            talker, sent_type = match.groups()
            progress.talker_counts[talker] = progress.talker_counts.get(talker, 0) + 1
            progress.sentence_counts[sent_type] = progress.sentence_counts.get(sent_type, 0) + 1
            if sent_type in ("GGA", "RMC", "GNS"):
                progress.epochs_count += 1


nmea_parser_service = NmeaParserService()
