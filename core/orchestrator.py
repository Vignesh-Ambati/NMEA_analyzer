"""
core/orchestrator.py
────────────────────
Asynchronous task manager to handle multi-file processing across isolated CPU cores
without blocking the main GUI event loop.
"""

from multiprocessing import Manager
import os
from pathlib import Path
from typing import Callable, Dict, Optional
from concurrent.futures import Future, ProcessPoolExecutor

from core.processor import NmeaProcessor

def _isolated_WorkerTask(_filePath: str, _progressVal) -> str:
    try:
        _processor = NmeaProcessor(_filePath)
        _processor.process_file(_sharedProgress=_progressVal)
        return f"SUCCESS:{_filePath}"
    except Exception as e:
        return f"ERROR:{_filePath}: {e}"

class JobOrchestrator:
    def __init__(self, max_workers: Optional[int]=None) -> None:
        _totalCores = os.cpu_count() or 2
        self._maxWorkers = max_workers or max(1, _totalCores - 1)
        
        self._manager = Manager()
        self._pool = ProcessPoolExecutor(max_workers=self._maxWorkers)
        self._activeJobs: Dict[str, Future] = {}
    
    def submitFile(self, _logPath: Path, _onCompleteCallback: Optional[Callable] = None) -> None:
        _pathStr = str(_logPath)
        if _pathStr in self._activeJobs and not self._activeJobs[_pathStr].done():
            print(f"[*] Job already running for {_logPath.name}")
            return None
        print(f"[+] Dispatching {_logPath.name} to background processing pool...")
        
        _progressVal = self._manager.Value('d', 0.0)
        _futureJob = self._pool.submit(_isolated_WorkerTask, _pathStr, _progressVal)
        self._activeJobs[_pathStr] = _futureJob
        
        if _onCompleteCallback:
            _futureJob.add_done_callback(lambda f: self._handle_JobCompletion(f, _onCompleteCallback))
        
        return _progressVal
    
    def _handle_JobCompletion(self, _future:Future, _callback: Callable) -> None:
        try:
            _resultStr = _future.result()
            _callback(_resultStr)
        except Exception as e:
            _callback(f"FATAL:{e}")
    
    def shutdown(self) -> None:
        print("[*] Shutting down processing orchestrator...")
        self._pool.shutdown(wait=False, cancel_futures=True)