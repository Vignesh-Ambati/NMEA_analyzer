# Thread-safe state tracking singleton
import threading
from typing import Dict, Any

class JobManager:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(JobManager, cls).__new__(cls)
                cls._instance._tasks: Dict[str, Dict[str, Any]] = {}
        return cls._instance

    def initialize_task(self, task_id: str) -> None:
        with self._lock:
            self._tasks[task_id] = {"progress": 0, "status": "Initializing...", "lines": 0, "error": None}

    def update_task(self, task_id: str, progress: int, lines: int, status: str = "Extracting...") -> None:
        with self._lock:
            if task_id in self._tasks:
                self._tasks[task_id].update({"progress": progress, "lines": lines, "status": status})

    def fail_task(self, task_id: str, error_msg: str) -> None:
        with self._lock:
            if task_id in self._tasks:
                self._tasks[task_id].update({"status": "Failed", "error": error_msg})

    def get_task(self, task_id: str) -> Dict[str, Any]:
        with self._lock:
            return self._tasks.get(task_id, {})