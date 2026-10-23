# Asynchronous multi-core process manager

"""
core/orchestrator.py
────────────────────
Asynchronous task manager to handle multi-file processing across isolated CPU cores
without blocking the main GUI event loop.
"""

import os
import glob
import pandas as pd
from pathlib import Path
from multiprocessing import Manager
from typing import Any, Callable, Dict, Optional
from concurrent.futures import Future, ProcessPoolExecutor

from ..PROCESSING.processor import NmeaProcessor

def _logging_WriteQueue(_logQueue, message: str) -> None:
    if _logQueue is None:
        return
    try:
        _logQueue.put(message)
    except Exception:
        pass


def _isolated_WorkerTask(_filePath: str, _progressVal, _logQueue=None) -> str:
    try:
        _processor = NmeaProcessor(_filePath)
        _processor.process_file(_sharedProgress=_progressVal, _logQueue=_logQueue)
        return f"SUCCESS:{_filePath}"
    except Exception as e:
        _logging_WriteQueue(_logQueue, f"ERROR: Failed processing {_filePath}: {e}")
        return f"ERROR:{_filePath}: {e}"

class JobOrchestrator:
    def __init__(self, max_workers: Optional[int]=None, log_queue=None) -> None:
        _totalCores = os.cpu_count() or 2
        self._maxWorkers = max_workers or max(1, _totalCores - 1)
        
        self._manager = Manager()
        self.log_queue = log_queue if log_queue is not None else self._manager.Queue()
        self._pool = ProcessPoolExecutor(max_workers=self._maxWorkers)
        self._activeJobs: Dict[str, Future] = {}
    
    def submitFile(self, _logPath: Path, _onCompleteCallback: Optional[Callable] = None) -> Any:
        _pathStr = str(_logPath)
        if _pathStr in self._activeJobs and not self._activeJobs[_pathStr].done():
            _logging_WriteQueue(self.log_queue, f"[*] Job already running for {_logPath.name}")
            return None
        _logging_WriteQueue(self.log_queue, f"[+] Dispatching {_logPath.name} to background processing pool...")
        
        _progressVal = self._manager.Value('d', 0.0)
        _futureJob = self._pool.submit(_isolated_WorkerTask, _pathStr, _progressVal, self.log_queue)
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
        _logging_WriteQueue(self.log_queue, "[*] Shutting down processing orchestrator...")
        self._pool.shutdown(wait=False, cancel_futures=True)
    
    def _loadTaskFrame(self, stage2_dir: str, task_id: int) -> Optional[pd.DataFrame]:
        search_pattern = os.path.join(stage2_dir, f"task_{task_id:02d}_*.parquet")
        matching_shards = glob.glob(search_pattern)
        if not matching_shards: return None
        try:
            dataFrame_list = [pd.read_parquet(shard, columns=["Time", "Value"]) for shard in matching_shards]
            combined_dataFrame = pd.concat(dataFrame_list, ignore_index=True)
            return combined_dataFrame
        except Exception:
            return None