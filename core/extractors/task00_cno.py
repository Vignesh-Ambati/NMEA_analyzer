import pyarrow.parquet as pq
import numpy as np
from pathlib import Path
from typing import Tuple, Optional

from .base_extractor import BaseExtractor
from core.constants import KEY_TYPE, KEY_TIME, KEY_SATELLITES

class CnoExtractor(BaseExtractor):
    def _extract(self, parquet_path: Path) -> Tuple[Optional[np.ndarray], Optional[np.ndarray]]:
        try:
            table = pq.read_table(
                parquet_path,
                columns=[KEY_TIME, KEY_SATELLITES],
                filters=[(KEY_TYPE, '=', 'GSV')]
            )
            
            if table.num_rows == 0:
                return None, None
                
            times_list = table.column(KEY_TIME).to_pylist()
            satellites_list = table.column(KEY_SATELLITES).to_pylist()
            
            valid_times = []
            cno_means = []
            
            for t_val, sv_list in zip(times_list, satellites_list):
                # Skip unrecorded epochs
                if not t_val or t_val == "000000.00":
                    continue
                    
                epoch_cnos = []
                if sv_list:
                    for sv in sv_list:
                        # Verify the satellite array has data in the 4th position (C/N0)
                        if sv and len(sv) >= 4 and sv[3]:
                            try:
                                epoch_cnos.append(float(sv[3]))
                            except (ValueError, TypeError):
                                pass
                
                # Only graph epochs that actively track satellite signals
                if epoch_cnos:
                    valid_times.append(t_val)
                    cno_means.append(sum(epoch_cnos) / len(epoch_cnos))
                    
            if not valid_times:
                return None, None
                
            times_sec = self._timeToLinearSeconds(valid_times)
            return times_sec, np.array(cno_means, dtype=np.float64)
            
        except Exception as e:
            print(f"[!] C/N0 Extractor Error: {e}")
            return None, None