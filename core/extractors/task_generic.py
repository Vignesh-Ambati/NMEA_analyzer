"""
core/extractors/task_generic.py
───────────────────────────────
A reusable Parquet extractor for standard numeric metrics.
"""
import pyarrow.parquet as pq
import numpy as np
from pathlib import Path
from typing import Tuple, Optional, List

from .base_extractor import BaseExtractor
from core.constants import KEY_TYPE, KEY_TIME

class GenericNumericExtractor(BaseExtractor):
    def __init__(self, metric_key: str, valid_message_types: List[str]):
        self.metric_key = metric_key
        self.valid_types = valid_message_types

    def _extract(self, parquet_path: Path) -> Tuple[Optional[np.ndarray], Optional[np.ndarray]]:
        try:
            # ⚡ PyArrow Predicate Pushdown Filters
            table = pq.read_table(
                parquet_path,
                columns=[KEY_TIME, self.metric_key],
                filters=[
                    (KEY_TYPE, 'in', self.valid_types),
                    (KEY_TIME, '!=', '000000.00'),
                    (KEY_TIME, '!=', '')
                ]
            )
            
            if table.num_rows == 0:
                return None, None
                
            times_str = table.column(KEY_TIME).to_numpy(zero_copy_only=False)
            metric_vals = table.column(self.metric_key).to_numpy(zero_copy_only=False)
            
            # Use Base class high-speed vectorized math
            times_sec = self._timeToLinearSeconds(times_str)
            
            return times_sec, metric_vals
            
        except Exception as e:
            print(f"[!] Generic Extractor Error ({self.metric_key}): {e}")
            return None, None