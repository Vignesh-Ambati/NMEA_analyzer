import os
import time
import threading
import numpy as np
import pandas as pd
from pathlib import Path
from abc import ABC, abstractmethod
from typing import Any, Optional, Tuple

class BaseExtractor(ABC):        
    @abstractmethod
    def _extract(self, parquet_path: Path, state: Any = None) -> Any:
        # It might return data frame or any. so we kept any.
        # But it must use Optional[pd.DataFrame]
        pass
    @staticmethod
    def safe_format(x):
            if pd.isna(x) or str(x).lower() == 'nan':
                return np.nan
            sx = str(x)
            return sx if '.' in sx else sx + '.00'
    def _convertToAbsoluteEpoch(self, date_series: pd.Series, time_series: pd.Series, state: Any = None) -> np.ndarray:
        """
        Converts NMEA dates and times into absolute Unix epoch seconds.
        Uses linear interpolation to backtrack missing outage seconds and gracefully
        handles midnight wraparounds without relying on error-prone date strings.
        """
        timeNumber = pd.to_numeric(time_series, errors='coerce').values
        timeNumber = np.where((timeNumber == 0.0) | np.isnan(timeNumber), np.nan, timeNumber)
        
        _hour   = timeNumber // 10000
        _minute = (timeNumber % 10000) // 100
        _second = timeNumber % 100
        time_seconds = (_hour * 3600) + (_minute * 60) + _second
        
        interpolated_seconds = pd.Series(time_seconds).interpolate(method='linear').values
        
        time_diffs = np.diff(interpolated_seconds, prepend=interpolated_seconds[0])
        crossovers = np.cumsum(time_diffs < -43200)
        continuous_seconds = interpolated_seconds + (crossovers * 86400)
        
        parsed_dates = pd.to_datetime(date_series, format="%d%m%y", errors='coerce')
        filled_dates = parsed_dates.ffill().bfill()

        if not filled_dates.empty:
            date_jumps = filled_dates.diff().dt.total_seconds().fillna(0).values
            total_date_days = np.sum(date_jumps) / 86400.0
            total_calculated_days = (continuous_seconds[-1] - continuous_seconds[0]) / 86400.0
            
            if total_date_days > (total_calculated_days + 1.5):
                raise ValueError(
                    "LOG TIMELINE CORRUPTION DETECTED: This log file contains an extended multi-day "
                    "hardware outage gap where actual dates don't line up with the continuous timeline."
                )
        dateStr = date_series.astype(str).replace(["", "None", "000000", "nan", "<NA>"], np.nan).str.zfill(6)
        valid_dates = dateStr.dropna()
        
        first_valid_date = valid_dates.iloc[0] if not valid_dates.empty else "010100"
        anchor_date = pd.to_datetime(first_valid_date, format="%d%m%y")
        
        anchor_epoch = anchor_date.value // 10**9
        epochs = anchor_epoch + continuous_seconds
        # Non-blocking debug export of time-only series when UI debug enabled
        try:
            if state is not None and getattr(state, 'debug_mode', False):
                def _dump_times(eps):
                    try:
                        out_dir = os.path.join(os.getcwd(), 'debug_exports')
                        os.makedirs(out_dir, exist_ok=True)
                        fname = f"convertToAbsoluteEpoch_{int(time.time())}.csv"
                        out_path = os.path.join(out_dir, fname)
                        pd.DataFrame({'Time': eps}).to_csv(out_path, index=False)
                    except Exception:
                        pass
                threading.Thread(target=_dump_times, args=(epochs,), daemon=True).start()
        except Exception:
            pass

        return epochs