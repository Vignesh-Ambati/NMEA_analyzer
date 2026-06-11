"""
ui/services.py
──────────────
Backend integration layer for NMEA processing and visual downsampling.
"""
import os
import time
import threading
import numpy as np
import pandas as pd
import datashader as ds
from datashader import transfer_functions
from typing import Dict, List, Tuple, Optional, Callable, Any
from pathlib import Path

from core.debug import DebugExportService

try:
    from core import CacheManager, JobOrchestrator
    from core.extractors import CnoExtractor, AltitudeExtractor
    CORE_AVAILABLE = True
except ImportError:
    CORE_AVAILABLE = False

class ProcessingService:
    def __init__(self):
        if CORE_AVAILABLE:
            self.orchestrator = JobOrchestrator()
    
    def process_file(
        self,
        file_path: str,
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
        # self.queryEngine: QueryEngine = QueryEngine()
        self._dataframeCache: Dict[str, pd.DataFrame] = {}
        
        self.extractors = {
            0: CnoExtractor(),
            3: AltitudeExtractor(),
        }
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
                if not parquet_path or not os.path.exists(parquet_path): 
                    continue
                extractor = self.extractors.get(task_id)
                if not extractor: continue
                result = extractor._extract(Path(parquet_path))
                
                if result is not None:
                    # Smart Wrapper: If the extractor returns an old tuple, convert it.
                    # If it returns a DataFrame, use it natively.
                    if isinstance(result, tuple) and len(result) == 2:
                        t_vec, v_vec = result
                        if t_vec is not None and v_vec is not None and len(t_vec) > 0:
                            dataframe = pd.DataFrame({'Time': t_vec, 'Value': v_vec})
                        else:
                            continue
                    elif isinstance(result, pd.DataFrame):
                        dataframe = result
                    else:
                        continue

                    if not dataframe.empty:
                        dataframe = dataframe.sort_values(by="Time").reset_index(drop=True)
                        self._dataframeCache[fileId] = dataframe
        return available_files
    
    def _getRasterizedFrame(
        self, 
        state: Any, 
        controller: Any,
        task_id: int, 
        target_view: str,
        canvas_width: int, 
        canvas_height: int, 
        x_range: Optional[Tuple[float, float]] = None,
        y_range: Optional[Tuple[float,float]] = None,
        color_cycle: Optional[List[str]] = None
        ) -> Tuple[Optional[Any], Tuple[float, float, float, float]]:
        allCachedFiles = self._syncActiveCache(state, controller, task_id)
        if not self._dataframeCache:
            return None, (0.0, 1.0, 0.0, 1.0)
        renderTargets: List[str] = []
        if target_view.lower() == "combined": renderTargets = list(self._dataframeCache.keys())
        elif target_view in self._dataframeCache: renderTargets = [target_view]
        else: return None, (0.0, 1.0, 0.0, 1.0)
        
        if x_range is None or y_range is None:
            global_Xminimum, global_Xmaximum = float('inf'), float('-inf')
            global_Yminimum, global_Ymaximum = float('inf'), float('-inf')

            for file_id in renderTargets:
                dataframe = self._dataframeCache[file_id]
                global_Xminimum = min(global_Xminimum, dataframe["Time"].min())
                global_Xmaximum = max(global_Xmaximum, dataframe["Time"].max())
                global_Yminimum = min(global_Yminimum, dataframe["Value"].min())
                global_Ymaximum = max(global_Ymaximum, dataframe["Value"].max())
            x_span = (global_Xmaximum - global_Xminimum) if global_Xmaximum > global_Xminimum else 1.0
            y_span = (global_Ymaximum - global_Yminimum) if global_Ymaximum > global_Yminimum else 1.0
            
            x_range = (global_Xminimum - x_span * 0.02, global_Xmaximum + x_span * 0.02)
            y_range = (global_Yminimum - y_span * 0.05, global_Ymaximum + y_span * 0.05)
        
        if x_range[0] == x_range[1] or y_range[0] == y_range[1]:
            return None, (x_range[0], x_range[1], y_range[0], y_range[1])
        
        canvas = ds.Canvas(
            plot_width=max(10, canvas_width),
            plot_height=max(10, canvas_height),
            x_range=x_range,
            y_range=y_range
        )
        colors = color_cycle or ['#FF4400', "#24C9BB", '#00FF7F', '#FF00FF', '#FFD700']
        raster_layers = []
        
        for index, file_id in enumerate(renderTargets):
            dataframe = self._dataframeCache[file_id]
            DebugExportService.dump(dataframe, "Stage3_PrePlotting", file_id)
            aggregate = canvas.line(dataframe, x='Time', y='Value')
            if aggregate is not None and not aggregate.isnull().all():
                layer_color = colors[index % len(colors)]
                image = transfer_functions.shade(aggregate, cmap=[layer_color], how='linear')
                raster_layers.append(image)
        if not raster_layers:
            return None, (x_range[0], x_range[1], y_range[0], y_range[1])
        final_Canvas = raster_layers[0]
        for next_layer in raster_layers[1:]:
            final_Canvas = transfer_functions.stack(final_Canvas, next_layer)
        pilImage = final_Canvas.to_pil()
        return pilImage, (x_range[0], x_range[1], y_range[0], y_range[1])
    
