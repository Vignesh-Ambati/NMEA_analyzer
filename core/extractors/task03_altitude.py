"""
core/extractors/task03_altitude.py
──────────────────────────────────
Extracts Altitude metrics specifically from GGA and GNS lines.
"""
import pyarrow.parquet as pq
import numpy as np
from pathlib import Path
from typing import Tuple, Optional

from .base_extractor import BaseExtractor
from core.constants import KEY_TYPE, KEY_TIME, KEY_ALT

class AltitudeExtractor(BaseExtractor):
    def _extract(self, parquet_path: Path) -> Tuple[Optional[np.ndarray], Optional[np.ndarray]]:
        try:
            table = pq.read_table(
                parquet_path,
                columns=[KEY_TIME, KEY_ALT],
                filters=[
                    (KEY_TYPE, 'in', ['GGA', 'GNS']),
                    (KEY_TIME, '!=', '000000.00'),
                    (KEY_TIME, '!=', '')
                ]
            )
            
            if table.num_rows == 0:
                return None, None
                
            # Convert PyArrow chunks directly to contiguous NumPy arrays
            times_str = table.column(KEY_TIME).to_numpy(zero_copy_only=False)
            alt_vals = table.column(KEY_ALT).to_numpy(zero_copy_only=False)
            
            times_sec = self._timeToLinearSeconds(times_str)
            
            return times_sec, alt_vals
            
        except Exception as e:
            print(f"[!] Altitude Extractor Error: {e}")
            return None, None