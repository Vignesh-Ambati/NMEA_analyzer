"""
Classified as shared service because it executes core 5 GB file parsing, searching, filtering, and temp file extraction independently of API route handlers. Placed in backend/services/extraction.py.
"""

import os
import re
import time
import tempfile
import threading
from typing import Dict, Any, Optional, List, Generator
from pydantic import BaseModel

class ExtractionOptionsModel(BaseModel):
    match_case: bool = False
    match_whole_word: bool = False
    wrap_around: bool = True
    bookmark_line: bool = False
    purge_each_search: bool = True
    backward_direction: bool = False
    in_selection: bool = False
    dot_matches_newline: bool = False
    strip_checksum: bool = False
    remove_empty_lines: bool = True
    start_line: Optional[int] = None
    end_line: Optional[int] = None

class ExtractionRequestModel(BaseModel):
    job_id: str
    source_type: str  # 'file_path', 'file_upload', 'raw_text'
    source_path: Optional[str] = None
    raw_text: Optional[str] = None
    target_expression: str
    search_mode: str  # 'normal', 'extended', 'regex'
    options: ExtractionOptionsModel
    file_size: Optional[int] = 0

class ExtractionJobStatus:
    def __init__(self, job_id: str, total_bytes: int, source_name: str):
        self.job_id = job_id
        self.status = "initializing"
        self.status_text = "INITIALIZING FASTAPI ENGINE..."
        self.progress_pct = 0
        self.lines_extracted = 0
        self.lines_processed = 0
        self.throughput_mbps = "0.0 MB/s"
        self.elapsed_seconds = "0.00s"
        self.processed_bytes = 0
        self.total_bytes = total_bytes
        self.error: Optional[str] = None
        self.is_cancelled = False
        
        # Temp file management
        temp_dir = os.path.join(tempfile.gettempdir(), "DataExtractor")
        os.makedirs(temp_dir, exist_ok=True)
        base_clean = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', source_name)
        self.temp_file_name = f"temp_{base_clean}_{job_id[:8]}.tmp"
        self.temp_file_path = os.path.join(temp_dir, self.temp_file_name)
        self.temp_file_size = 0
        self.recent_lines: List[str] = []
        self.lock = threading.Lock()

    def to_dict(self) -> Dict[str, Any]:
        with self.lock:
            return {
                "jobId": self.job_id,
                "status": self.status,
                "statusText": self.status_text,
                "progressPct": self.progress_pct,
                "linesExtracted": self.lines_extracted,
                "linesProcessed": self.lines_processed,
                "throughputMBps": self.throughput_mbps,
                "elapsedSeconds": self.elapsed_seconds,
                "processedBytes": self.processed_bytes,
                "totalBytes": self.total_bytes,
                "error": self.error,
                "tempFile": {
                    "id": self.job_id,
                    "name": self.temp_file_name,
                    "path": self.temp_file_path,
                    "sizeBytes": self.temp_file_size,
                    "totalLines": self.lines_extracted,
                },
                "recentLines": list(self.recent_lines),
            }


class ExtractionService:
    def __init__(self):
        self.jobs: Dict[str, ExtractionJobStatus] = {}
        self.threads: Dict[str, threading.Thread] = {}

    def get_job(self, job_id: str) -> Optional[ExtractionJobStatus]:
        return self.jobs.get(job_id)

    def cancel_job(self, job_id: str) -> bool:
        job = self.jobs.get(job_id)
        if job:
            job.is_cancelled = True
            job.status = "cancelled"
            job.status_text = "CANCELLED BY USER"
            return True
        return False

    def start_job(self, req: ExtractionRequestModel, resolved_file_path: Optional[str] = None) -> ExtractionJobStatus:
        total_size = req.file_size or 0
        source_name = "data"
        if resolved_file_path:
            source_name = os.path.basename(resolved_file_path)
            if os.path.exists(resolved_file_path):
                total_size = os.path.getsize(resolved_file_path)
        elif req.source_path:
            source_name = os.path.basename(req.source_path)

        job = ExtractionJobStatus(req.job_id, total_size, source_name)
        self.jobs[req.job_id] = job

        t = threading.Thread(
            target=self._run_extraction_worker,
            args=(job, req, resolved_file_path),
            daemon=True
        )
        self.threads[req.job_id] = t
        t.start()
        return job

    def _parse_extended_escapes(self, text: str) -> str:
        """Parses Notepad++ extended escape sequences"""
        try:
            return bytes(text, "utf-8").decode("unicode_escape")
        except Exception:
            return text.replace(r"\n", "\n").replace(r"\r", "\r").replace(r"\t", "\t").replace(r"\0", "\0")

    def _compile_matcher(self, req: ExtractionRequestModel):
        target = req.target_expression
        mode = req.search_mode
        opts = req.options

        if not target.strip():
            return lambda line: True

        if mode == "extended":
            unescaped = self._parse_extended_escapes(target)
            if not opts.match_case:
                unescaped = unescaped.lower()
            if opts.match_whole_word:
                esc = re.escape(unescaped)
                flags = 0 if opts.match_case else re.IGNORECASE
                pattern = re.compile(rf"\b{esc}\b", flags)
                return lambda line: bool(pattern.search(line))
            else:
                if opts.match_case:
                    return lambda line: unescaped in line
                else:
                    return lambda line: unescaped in line.lower()

        if mode == "regex":
            flags = 0
            if not opts.match_case:
                flags |= re.IGNORECASE
            if opts.dot_matches_newline:
                flags |= re.DOTALL

            pattern_str = target
            if opts.match_whole_word:
                pattern_str = rf"\b(?:{pattern_str})\b"

            compiled = re.compile(pattern_str, flags)
            return lambda line: bool(compiled.search(line))

        # Normal mode (Literal)
        if opts.match_whole_word:
            esc = re.escape(target)
            flags = 0 if opts.match_case else re.IGNORECASE
            pattern = re.compile(rf"\b{esc}\b", flags)
            return lambda line: bool(pattern.search(line))
        else:
            if opts.match_case:
                return lambda line: target in line
            else:
                low_target = target.lower()
                return lambda line: low_target in line.lower()

    def _run_extraction_worker(
        self,
        job: ExtractionJobStatus,
        req: ExtractionRequestModel,
        file_path: Optional[str]
    ):
        start_time = time.perf_counter()
        job.status = "running"
        job.status_text = "FASTAPI STREAMING CHUNKS..."

        try:
            matcher = self._compile_matcher(req)
        except Exception as e:
            job.status = "error"
            job.status_text = f"REGEX ERROR: {str(e)}"
            job.error = str(e)
            return

        opts = req.options
        start_line = opts.start_line if opts.start_line and opts.start_line > 0 else 1
        end_line = opts.end_line if opts.end_line and opts.end_line >= start_line else float("inf")

        # Open temp file output for streaming writes
        try:
            temp_out = open(job.temp_file_path, "w", encoding="utf-8", buffering=1024 * 1024)
        except Exception as e:
            job.status = "error"
            job.status_text = f"FILE ERROR: {str(e)}"
            job.error = str(e)
            return

        try:
            lines_extracted = 0
            lines_processed = 0
            bytes_read = 0
            total_bytes = job.total_bytes or 1
            recent_preview_max = 500

            # Source generator: either disk file (multi-GB) or raw string
            def line_generator() -> Generator[str, None, None]:
                nonlocal bytes_read
                if file_path and os.path.exists(file_path):
                    # Efficient chunked generator (4MB buffer) capable of reading 5GB+ files with zero RAM spike
                    CHUNK_SIZE = 4 * 1024 * 1024
                    with open(file_path, "rb") as f:
                        carry = b""
                        while True:
                            if job.is_cancelled:
                                break
                            chunk = f.read(CHUNK_SIZE)
                            if not chunk:
                                if carry:
                                    yield carry.decode("utf-8", errors="replace")
                                break
                            bytes_read += len(chunk)
                            raw = carry + chunk
                            split_lines = raw.split(b"\n")
                            carry = split_lines.pop()  # partial line preserved
                            for raw_line in split_lines:
                                yield raw_line.decode("utf-8", errors="replace").rstrip("\r")
                elif req.raw_text:
                    for raw_line in req.raw_text.splitlines():
                        bytes_read += len(raw_line.encode("utf-8")) + 1
                        yield raw_line

            last_report = time.perf_counter()

            for line in line_generator():
                if job.is_cancelled:
                    job.status = "cancelled"
                    job.status_text = "CANCELLED BY USER"
                    break

                lines_processed += 1
                if lines_processed < start_line:
                    continue
                if lines_processed > end_line:
                    break

                if opts.remove_empty_lines and not line.strip():
                    continue

                clean_line = line
                if opts.strip_checksum:
                    clean_line = re.sub(r"\*[0-9A-Fa-f]{2}$", "", clean_line)

                if matcher(clean_line):
                    lines_extracted += 1
                    formatted_line = clean_line
                    if opts.bookmark_line:
                        formatted_line = f"[MATCH #{lines_extracted}] {clean_line}"

                    temp_out.write(formatted_line + "\n")

                    with job.lock:
                        if len(job.recent_lines) < recent_preview_max:
                            job.recent_lines.append(formatted_line)
                        elif lines_extracted % 20 == 0:
                            # Keep most recent sample
                            job.recent_lines.pop(0)
                            job.recent_lines.append(formatted_line)

                # Update telemetry every 0.15s or 10,000 lines
                now = time.perf_counter()
                if now - last_report >= 0.15 or lines_processed % 10000 == 0:
                    last_report = now
                    elapsed = now - start_time
                    mb_read = bytes_read / (1024 * 1024)
                    speed = (mb_read / elapsed) if elapsed > 0 else 0
                    pct = min(99, int((bytes_read / total_bytes) * 100))

                    with job.lock:
                        job.progress_pct = pct
                        job.lines_extracted = lines_extracted
                        job.lines_processed = lines_processed
                        job.throughput_mbps = f"{speed:.1f} MB/s"
                        job.elapsed_seconds = f"{elapsed:.2f}s"
                        job.processed_bytes = bytes_read
                        job.temp_file_size = temp_out.tell()
                        job.status_text = f"STREAMING TO TEMP FILE... ({lines_extracted:,} matches)"

            temp_out.flush()
            temp_out.close()

            if not job.is_cancelled and job.status != "error":
                total_elapsed = time.perf_counter() - start_time
                mb_total = bytes_read / (1024 * 1024)
                final_speed = (mb_total / total_elapsed) if total_elapsed > 0 else 0

                with job.lock:
                    job.status = "completed"
                    job.status_text = f"EXTRACTION COMPLETE ({lines_extracted:,} LINES MATCHED)"
                    job.progress_pct = 100
                    job.lines_extracted = lines_extracted
                    job.lines_processed = lines_processed
                    job.throughput_mbps = f"{final_speed:.1f} MB/s"
                    job.elapsed_seconds = f"{total_elapsed:.2f}s"
                    job.processed_bytes = bytes_read
                    job.temp_file_size = os.path.getsize(job.temp_file_path) if os.path.exists(job.temp_file_path) else 0

        except Exception as e:
            try:
                temp_out.close()
            except Exception:
                pass
            job.status = "error"
            job.status_text = f"FASTAPI STREAM FAILURE: {str(e)}"
            job.error = str(e)


# Singleton shared instance
extraction_service = ExtractionService()
