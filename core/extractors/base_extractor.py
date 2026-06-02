from abc import ABC, abstractmethod
from pathlib import Path
from typing import Tuple, Optional
import numpy as np

class BaseExtractor(ABC):
    @abstractmethod
    def _extract(self, parquet_path: Path) -> Tuple[Optional[np.ndarray], Optional[np.ndarray]]:
        pass
    def _timeToLinearSeconds(self, time_sequence: np.ndarray) -> np.ndarray:
        seconds = []
        for t in time_sequence:
            try:
                s = str(t).strip()
                if not s or s == 'None':
                    seconds.append(0.0)
                    continue
                
                val = float(s)
                hh = int(val // 10000)
                mm = int((val % 10000) // 100)
                ss = val % 100
                seconds.append((hh * 3600.0) + (mm * 60.0) + ss)
            except Exception:
                seconds.append(0.0)
                
        return np.array(seconds, dtype=np.float64)