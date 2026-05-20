"""
ui/services.py
──────────────
Backend integration layer for NMEA processing.
"""

import threading
import time
from typing import Optional, Callable, Any
from pathlib import Path

try:
    from core import CacheManager, JobOrchestrator
    CORE_AVAILABLE = True
except ImportError:
    CORE_AVAILABLE = False

class ProcessingService:
    def __init__(self):
        self.is_processing = False
        if CORE_AVAILABLE:
            self.orchestrator = JobOrchestrator()
    
    def process_file(
        self,
        file_path: str,
        on_complete: Optional[Callable[[Any], None]] = None,
        on_error: Optional[Callable[[str], None]] = None,
        on_progress: Optional[Callable[[float], None]] = None,
    ) -> bool:
        if not CORE_AVAILABLE:
            if on_error: on_error("Core module not available")
            return False
        if self.is_processing:
            if on_error: on_error("Processing already in progress")
            return False
        
        file_path_obj = Path(file_path)
        if not file_path_obj.exists():
            if on_error: on_error(f"File not found: {file_path}")
            return False
        
        self.is_processing = True
        def _internalCompletion(_resultStr: str):
            self.is_processing = False
            if _resultStr.startswith("SUCCESS"):
                if on_complete: on_complete(CacheManager(file_path_obj))
            else:
                _clean_err = _resultStr.replace("ERROR:", "").replace("FATAL:", "").strip()
                if on_error: on_error(_clean_err)
                
        _progressVal = self.orchestrator.submitFile(file_path_obj, _internalCompletion)
        if _progressVal and on_progress:
            def _progressWatcher():
                while self.is_processing:
                    percentage = _progressVal.value
                    on_progress(percentage)
                    if percentage>= 1.0: break
                    time.sleep(0.1)
            threading.Thread(target=_progressWatcher, daemon=True).start()
        return True