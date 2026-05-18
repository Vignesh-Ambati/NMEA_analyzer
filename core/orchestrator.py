"""
core/orchestrator.py
────────────────────
Asynchronous task manager to handle multi-file processing across isolated CPU cores
without blocking the main GUI event loop.
"""

import os
from pathlib import Path
from typing import Callable, Dict, Optional
from concurrent.futures import Future, ProcessPoolExecutor

from core.processor import NmeaProcessor

def _isolated_WorkerTask(_filePath: str) -> str:
    try:
        _processor = NmeaProcessor(_filePath)
        _processor.process_file()
        return f"SUCCESS:{_filePath}"
    except Exception as e:
        return f"ERROR:{_filePath}: {e}"

class JobOrchestrator:
    def __init__(self, max_workers: Optional[int]=None) -> None:
        _totalCores = os.cpu_count() or 2
        self._maxWorkers = max_workers or max(1, _totalCores - 1)
        
        self._pool = ProcessPoolExecutor(max_workers=self._maxWorkers)
        self._activeJobs: Dict[str, Future] = {}
    
    def submitFile(self, _logPath: Path, _onCompleteCallback: Optional[Callable] = None) -> None:
        _pathStr = str(_logPath)
        if _pathStr in self._activeJobs and not self._activeJobs[_pathStr].done():
            print(f"[*] Job already running for {_logPath.name}")
            return
        print(f"[+] Dispatching {_logPath.name} to background processing pool...")
        
        _futureJob = self._pool.submit(_isolated_WorkerTask, _pathStr)
        self._activeJobs[_pathStr] = _futureJob
        
        if _onCompleteCallback:
            _futureJob.add_done_callback(lambda f: self._handle_JobCompletion(f, _onCompleteCallback))
    
    def _handle_JobCompletion(self, _future:Future, _callback: Callable) -> None:
        try:
            _resultStr = _future.result()
            _callback(_resultStr)
        except Exception as e:
            _callback(f"FATAL:{e}")
    
    def shutdown(self) -> None:
        print("[*] Shutting down processing orchestrator...")
        self._pool.shutdown(wait=False, cancel_futures=True)