"""
core/extractors/task03_altitude.py
──────────────────────────────────
Calculates corrected MSL Altitude measurements from processed NMEA structures.
"""
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Optional
import pyarrow.parquet as parquet
from .base_extractor import BaseExtractor
from core.constants import KEY_TYPE, KEY_TIME, KEY_DATE, KEY_ALT, KEY_GHEIGHT

from core.debug import DebugExportService

class AltitudeExtractor(BaseExtractor):
    @staticmethod
    def _smartStreamLine(dataframe: pd.DataFrame) -> pd.DataFrame:
        times = dataframe[KEY_TIME].astype(str).values
        types = dataframe[KEY_TYPE].values
        values = dataframe['Value'].values
        
        keep_mask = np.ones(len(dataframe), dtype=bool)
        last_kept_index = 0
        for i in range(1, len(dataframe)):
            current_time = times[i]
            previous_time = times[last_kept_index]
            
            if current_time == previous_time and current_time not in ["000000.00", "0.0", "", "nan"]:
                keep_mask[i] = False
                continue
            if current_time in ["000000.00", "0.0", "", "nan"] and previous_time in ["000000.00", "0.0", "", "nan"]:
                current_type = types[i]
                previous_type = types[last_kept_index]
                
                is_pair = (previous_type == 'GGA' and current_type == 'GNS') or \
                          (previous_type == 'GNS' and current_type == 'GGA')
                if is_pair:
                    current_value = values[i]
                    previous_value = values[last_kept_index]
                    
                    both_nan = np.isnan(current_value) and np.isnan(previous_value)
                    same_value = current_value == previous_value
                    if both_nan or same_value:
                        keep_mask[i] = False
                        continue
            last_kept_index = i
        return dataframe[keep_mask].reset_index(drop=True)       
    
    def _extract(self, parquet_path: Path) -> Optional[pd.DataFrame]:
        try:
            table = parquet.read_table(
                parquet_path,
                columns=[KEY_DATE, KEY_TIME, KEY_TYPE, KEY_ALT, KEY_GHEIGHT],
                filters=[
                    (KEY_TYPE, 'in', ['GGA', 'GNS'])
                ]
            )
            DebugExportService.dump(table, "Stage1_RawParquet", parquet_path.name)
              
            if table.num_rows == 0: return None
            dataframe = table.to_pandas()
            
            alt_numeric = pd.to_numeric(dataframe[KEY_ALT], errors='coerce')
            gheight_numeric = pd.to_numeric(dataframe[KEY_GHEIGHT], errors='coerce')
            dataframe['Value'] = alt_numeric - gheight_numeric
            
            dataframe = self._smartStreamLine(dataframe)
            
            dataframe['Time'] = self._convertToAbsoluteEpoch(dataframe[KEY_DATE], dataframe[KEY_TIME])
            
            outage_mask = dataframe[KEY_TIME].astype(str).isin(["", "None", "000000.00", "0.0", "nan", "<NA>"])
            dataframe.loc[outage_mask, 'Value'] = np.nan
            
            dataframe = dataframe.dropna(subset=['Time'])
            dataframe = dataframe.sort_values(by=['Time']).reset_index(drop=True)
            
            DebugExportService.dump(dataframe[['Time', 'Value']], "Stage2_ExtractorOutput", parquet_path.name)
            return dataframe[['Time', 'Value']]
        except Exception as e:
            print(f"[!] Altitude Extractor Error: {e}")
            return None