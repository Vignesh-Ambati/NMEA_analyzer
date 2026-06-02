"""
ui/services.py
──────────────
Backend integration layer for NMEA processing and visual downsampling.
"""
import time
import threading
import numpy as np
from typing import Dict, Tuple, Optional, Callable, Any
from pathlib import Path

try:
    from core import CacheManager, JobOrchestrator
    CORE_AVAILABLE = True
except ImportError:
    CORE_AVAILABLE = False
try:
    from core.extractors import (
        CnoExtractor, AltitudeExtractor, 
        GenericNumericExtractor, PlaceholderExtractor
    )
    from core.constants import KEY_SPD, KEY_HDOP, KEY_SVS
    EXTRACTORS_AVAILABLE = True
except ImportError:
    EXTRACTORS_AVAILABLE = False

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
                # Pass the successfully processed file path to the CacheManager
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
                    if percentage >= 1.0: break
                    time.sleep(0.1)
            threading.Thread(target=_progressWatcher, daemon=True).start()
        return True

class ExtractionService:
    def __init__(self) -> None:
        # RAM CACHE: Prevents disk reads during UI zooming
        self._cached_task_index = None
        self._cached_raw_data = {}  
        self._task_routers = {}
        
        if EXTRACTORS_AVAILABLE:
            self._task_routers = {
                0: CnoExtractor(),
                1: PlaceholderExtractor(),
                2: PlaceholderExtractor(),
                3: AltitudeExtractor(),
                4: GenericNumericExtractor(KEY_HDOP, ["GGA", "GSA", "GNS"]),
                # 5: SvCountExtractor(),
                6: PlaceholderExtractor(),
                7: PlaceholderExtractor(),
                8: PlaceholderExtractor(),
                9: GenericNumericExtractor(KEY_SPD, ["RMC", "VTG"]),
            }

    def get_plot_data(self, state: Any, visible_time_bounds: Optional[Tuple[float, float]], max_points_budget: int) -> Dict[str, Tuple[np.ndarray, np.ndarray]]:
        processed_matrix = {}

        if state.current_task not in self._task_routers or not state.cache:
            return processed_matrix

        target_path = getattr(state.cache, 'parquet_path', getattr(state.cache, 'file_path', state.file_path))
        if not target_path:
            return processed_matrix
            
        active_files = {"Log View": Path(target_path)}

        # --- 1. DISK I/O: Execute ONLY when switching to a new task ---
        if self._cached_task_index != state.current_task:
            self._cached_raw_data.clear()
            self._cached_task_index = state.current_task
            extractor = self._task_routers[state.current_task]
            
            for file_id, parquet_path in active_files.items():
                t_vec, m_vec = extractor._extract(parquet_path)
                if t_vec is not None and m_vec is not None and len(t_vec) > 0:
                    self._cached_raw_data[file_id] = (t_vec, m_vec)

        # --- 2. RAM SLICING: Executes instantly on every mouse scroll ---
        for file_id, (t_vec, m_vec) in self._cached_raw_data.items():
            if visible_time_bounds:
                start_idx = np.searchsorted(t_vec, visible_time_bounds[0], side='left')
                end_idx = np.searchsorted(t_vec, visible_time_bounds[1], side='right')
                t_slice = t_vec[start_idx:end_idx]
                m_slice = m_vec[start_idx:end_idx]
            else:
                t_slice = t_vec
                m_slice = m_vec

            f_time, f_metric = self._vectorized_downsample(t_slice, m_slice, max_points_budget)
            if len(f_time) > 0:
                processed_matrix[file_id] = (f_time, f_metric)

        return processed_matrix

    def _vectorized_downsample(self, time_series: np.ndarray, metric_values: np.ndarray, max_points: int) -> Tuple[np.ndarray, np.ndarray]:
        """
        High-performance NumPy vectorized downsampling. 
        Replaces the slow python for-loop.
        """
        total = len(time_series)
        if total <= max_points or max_points <= 0:
            return time_series, metric_values

        num_buckets = max(1, max_points // 2)
        
        # Truncate array slightly to allow perfectly even matrix reshaping
        keep_len = (total // num_buckets) * num_buckets
        if keep_len == 0:
            return time_series, metric_values
            
        t_trunc = time_series[:keep_len].reshape(num_buckets, -1)
        m_trunc = metric_values[:keep_len].reshape(num_buckets, -1)
        
        # Matrix math to find the min and max indices of every bucket simultaneously
        min_idxs = np.argmin(m_trunc, axis=1)
        max_idxs = np.argmax(m_trunc, axis=1)
        row_idxs = np.arange(num_buckets)
        
        # Extract the highest and lowest points for the UI envelope
        t_min, m_min = t_trunc[row_idxs, min_idxs], m_trunc[row_idxs, min_idxs]
        t_max, m_max = t_trunc[row_idxs, max_idxs], m_trunc[row_idxs, max_idxs]
        
        # Stack and re-sort so the line graph draws strictly left-to-right
        t_combined = np.concatenate((t_min, t_max))
        m_combined = np.concatenate((m_min, m_max))
        
        sort_order = np.argsort(t_combined)
        return t_combined[sort_order], m_combined[sort_order]
