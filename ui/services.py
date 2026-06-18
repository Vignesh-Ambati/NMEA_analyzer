import os
import time
import threading
import numpy as np
import pandas as pd
import datashader as ds
from datashader import transfer_functions
from typing import Dict, List, Tuple, Optional, Callable, Any
from pathlib import Path
from PIL import Image

try:
    from core import CacheManager, JobOrchestrator
    from core.extractors import AltitudeExtractor
    CORE_AVAILABLE = True
except ImportError:
    CORE_AVAILABLE = False

class ProcessingService:
    def __init__(self):
        if CORE_AVAILABLE:
            self.orchestrator = JobOrchestrator()
            
    def process_file(
        self, file_path: str,
        on_complete: Optional[Callable[[Any, str], None]] = None,
        on_error: Optional[Callable[[str, str], None]] = None,
        on_progress: Optional[Callable[[float, str], None]] = None,
    ) -> bool:
        if not CORE_AVAILABLE:
            if on_error: on_error("Core module not available", file_path)
            return False
        
        file_path_obj = Path(file_path)
        if not file_path_obj.exists():
            if on_error: on_error(f"File not found: {file_path}", file_path)
            return False
        
        def _internalCompletion(_resultStr: str):
            if _resultStr.startswith("SUCCESS"):
                if on_complete: on_complete(CacheManager(file_path_obj), file_path)
            else:
                _clean_err = _resultStr.replace("ERROR:", "").replace("FATAL:", "").strip()
                if on_error: on_error(_clean_err, file_path)
                
        _progressVal = self.orchestrator.submitFile(file_path_obj, _internalCompletion)
        if _progressVal and on_progress:
            def _progressWatcher():
                while True:
                    percentage = _progressVal.value
                    on_progress(percentage, file_path)
                    if percentage >= 1.0: break
                    time.sleep(0.5)
            threading.Thread(target=_progressWatcher, daemon=True).start()
        return True

class ExtractionService:
    def __init__(self) -> None:
        self._dataframeCache: Dict[str, pd.DataFrame] = {}
        self.extractors = {3: AltitudeExtractor()}
        
    def _clearCache(self) -> None:
        self._dataframeCache.clear()
    
    def _syncActiveCache(self, state: Any, controller: Any, task_id: int) -> List[str]:
        available_files: List[str] = []
        activeCaches = getattr(state, "caches", {})
        if not activeCaches: return []

        for filePath, cacheManagerObj in activeCaches.items():
            fileId = os.path.basename(filePath)
            available_files.append(fileId)
            if fileId not in self._dataframeCache:
                parquet_path = getattr(cacheManagerObj, "parquet_path", None)
                if not parquet_path or not os.path.exists(parquet_path): continue
                extractor = self.extractors.get(task_id)
                if not extractor: continue
                result = extractor._extract(Path(parquet_path))
                if result is not None and isinstance(result, pd.DataFrame) and not result.empty:
                    self._dataframeCache[fileId] = result
        return available_files
    
    def get_datashader_image(
        self, state: Any, controller: Any, task_id: int, target_view: str,
        canvas_width: int, canvas_height: int, color_cycle: List[str],
        x_range: Optional[Tuple[float, float]] = None,
        y_range: Optional[Tuple[float, float]] = None,
        progress_callback: Optional[Callable[[float, str], None]] = None
    ) -> Tuple[Optional[Image.Image], Tuple[float, float, float, float]]:
        if progress_callback: progress_callback(0.10, "Syncing data caches into RAM...")
        allCachedFiles = self._syncActiveCache(state, controller, task_id)

        if not self._dataframeCache:
            return None, (0, 1, 0, 1)
            
        renderTargets = list(self._dataframeCache.keys()) if target_view.lower() == "combined" else [target_view]
        if target_view not in self._dataframeCache and target_view.lower() != "combined":
            return None, (0, 1, 0, 1)

        if progress_callback: progress_callback(0.30, "Calculating viewport boundaries...")
        
        # Calculate global bounds if no specific zoom level is requested
        if x_range is None or y_range is None:
            global_Xmin, global_Xmax = float('inf'), float('-inf')
            global_Ymin, global_Ymax = float('inf'), float('-inf')
            for file_id in renderTargets:
                df = self._dataframeCache[file_id]
                global_Xmin = min(global_Xmin, df["Time"].min())
                global_Xmax = max(global_Xmax, df["Time"].max())
                global_Ymin = min(global_Ymin, df["Value"].min())
                global_Ymax = max(global_Ymax, df["Value"].max())
                
            x_span = (global_Xmax - global_Xmin) if global_Xmax > global_Xmin else 1.0
            y_span = (global_Ymax - global_Ymin) if global_Ymax > global_Ymin else 1.0
            x_range = (global_Xmin - x_span * 0.02, global_Xmax + x_span * 0.02)
            y_range = (global_Ymin - y_span * 0.05, global_Ymax + y_span * 0.05)

        if progress_callback: progress_callback(0.50, "Datashader rasterization pipeline active...")
        canvas = ds.Canvas(
            plot_width=max(10, int(canvas_width)), 
            plot_height=max(10, int(canvas_height)), 
            x_range=x_range, 
            y_range=y_range
        )
        
        raster_layers = []
        for index, file_id in enumerate(renderTargets):
            df = self._dataframeCache[file_id]
            aggregate = canvas.line(df, x='Time', y='Value')
            if aggregate is not None and not aggregate.isnull().all():
                layer_color = color_cycle[index % len(color_cycle)]
                img = transfer_functions.shade(aggregate, cmap=[layer_color], how='linear')
                raster_layers.append(img)
                
        if progress_callback: progress_callback(0.80, "Compositing multi-file image layers...")
        if not raster_layers:
            return None, (x_range[0], x_range[1], y_range[0], y_range[1])

        final_Canvas = raster_layers[0]
        for next_layer in raster_layers[1:]:
            final_Canvas = transfer_functions.stack(final_Canvas, next_layer)
            
        pil_img = final_Canvas.to_pil()
        extent = (x_range[0], x_range[1], y_range[0], y_range[1])
        
        if progress_callback: progress_callback(1.0, "Render complete.")
        return pil_img, extent