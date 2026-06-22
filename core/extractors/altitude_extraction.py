"""
core/extractors/task03_altitude.py
──────────────────────────────────
Calculates corrected MSL Altitude measurements from processed NMEA structures.
"""
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Optional, Any
import threading, os, time
import pyarrow.parquet as parquet
from .base_extractor import BaseExtractor
from core.constants import KEY_TYPE, KEY_TIME, KEY_DATE, KEY_ALT, KEY_GHEIGHT

class AltitudeExtractor(BaseExtractor):
    @staticmethod
    def _smartStreamLine(dataframe: pd.DataFrame, state: Any = None) -> pd.DataFrame:
        times = dataframe[KEY_TIME].astype(str).values
        types = dataframe[KEY_TYPE].values
        values = dataframe['Value'].values
        
        keep_mask = np.ones(len(dataframe), dtype=bool)
        last_kept_index = 0
        outage_set = {"000000.00", "0.0", "", "nan", "<NA>"}
        
        for i in range(1, len(dataframe)):
            current_time = times[i]
            previous_time = times[last_kept_index]
            
            if current_time == previous_time and current_time not in outage_set:
                keep_mask[i] = False
                continue
            if current_time in outage_set and previous_time in outage_set:
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
        result = dataframe[keep_mask].reset_index(drop=True)
        # non-blocking debug dump of this stage
        try:
            if state is not None and getattr(state, 'debug_mode', False):
                def _dump(df, stage):
                    try:
                        out_dir = os.path.join(os.getcwd(), 'debug_exports')
                        os.makedirs(out_dir, exist_ok=True)
                        fname = f"altitude_{stage}_{int(time.time())}.csv"
                        out_path = os.path.join(out_dir, fname)
                        df.to_csv(out_path, index=False, header=False)
                    except Exception:
                        pass
                threading.Thread(target=_dump, args=(result.copy(), 'smartStreamLine'), daemon=True).start()
        except Exception:
            pass
        return result       
    
    def _extract(self, parquet_path: Path, state: Any = None) -> Optional[pd.DataFrame]:
        try:
            # 1. High-Speed Bulk Load
            table = parquet.read_table(
                parquet_path,
                columns=[KEY_DATE, KEY_TIME, KEY_TYPE, KEY_ALT, KEY_GHEIGHT],
                filters=[(KEY_TYPE, 'in', ['GGA', 'GNS'])]
            )
            if table.num_rows == 0: return None
            dataframe = table.to_pandas()
            
            # 2. Vectorized Math
            alt_numeric = pd.to_numeric(dataframe[KEY_ALT], errors='coerce')
            gheight_numeric = pd.to_numeric(dataframe[KEY_GHEIGHT], errors='coerce')
            # NMEA: geoid separation (gheight) = ellipsoid_height - orthometric_height (MSL)
            # ellipsoid_height = MSL + geoid_separation
            dataframe['Value'] = alt_numeric + gheight_numeric
            # debug dump after vectorized math (non-blocking)
            try:
                if state is not None and getattr(state, 'debug_mode', False):
                    # Prepare a copy containing original NMEA time and computed Value
                    df_copy = dataframe.copy()
                    def _dump_stage(df):
                        try:
                            out_dir = os.path.join(os.getcwd(), 'debug_exports')
                            os.makedirs(out_dir, exist_ok=True)
                            fname = f"altitude_vectorized_{int(time.time())}.csv"
                            out_path = os.path.join(out_dir, fname)
                            # Ensure NMEA time preserved as string and include Value
                            df_gga = df[df[KEY_TYPE] == "GGA"]

                            df_out = pd.DataFrame({
                                'NMEA_Time': df_gga.get(KEY_TIME),
                                'Altitude_raw': df_gga.get(KEY_ALT),
                                'Geoid_sep': df_gga.get(KEY_GHEIGHT),
                                'Altitude': df_gga.get('Value')
                            })

                            df_out.to_csv(out_path, index=False, header=False)
                        except Exception:
                            pass
                    threading.Thread(target=_dump_stage, args=(df_copy,), daemon=True).start()
            except Exception:
                pass
            
            # 3. Streamline & Time Conversion
            # Keep a snapshot of pre-streamlined raw rows for per-second selection
            raw_rows = dataframe[[KEY_DATE, KEY_TIME, KEY_TYPE, KEY_ALT]].copy()

            dataframe = self._smartStreamLine(dataframe, state=state)
            dataframe['Time'] = self._convertToAbsoluteEpoch(dataframe[KEY_DATE], dataframe[KEY_TIME], state=state)
            
            # 4. Replica Fix: Outages to 0.0 instead of NaN for straight vertical drops
            outage_mask = dataframe[KEY_TIME].astype(str).isin(["", "None", "000000.00", "0.0", "nan", "<NA>"])
            dataframe.loc[outage_mask, 'Value'] = 0.0
            # Debug dump after replica fix (non-blocking)
            try:
                if state is not None and getattr(state, 'debug_mode', False):
                    df_final_copy = dataframe.sort_values(by=['Time']).reset_index(drop=True)[['Time','Value']].copy()
                    def _dump_replica(df, raw):
                        try:
                            out_dir = os.path.join(os.getcwd(), 'debug_exports')
                            os.makedirs(out_dir, exist_ok=True)
                            # Final stage CSV with both epoch and original NMEA time when available
                            fname = f"altitude_replicaFix_{int(time.time())}.csv"
                            out_path = os.path.join(out_dir, fname)
                            df_out = df.copy()
                            # try to attach nearest NMEA_Time from raw rows by matching index where possible
                            # raw contains original NMEA times; perform nearest join on index distance
                            try:
                                df_out['NMEA_Time'] = raw[KEY_TIME].values[:len(df_out)]
                            except Exception:
                                df_out['NMEA_Time'] = None
                            df_out.to_csv(out_path, index=False, header=False)

                            # also write a per-second selection from raw rows preferring GGA over GNS
                            try:
                                persec_fname = f"altitude_nmea_persecond_{int(time.time())}.csv"
                                persec_path = os.path.join(out_dir, persec_fname)
                                r = raw.copy()
                                r['time_num'] = pd.to_numeric(r[KEY_TIME], errors='coerce')
                                r = r.dropna(subset=['time_num'])
                                r['sec_key'] = (r['time_num']//1).astype(int)
                                # for each sec_key prefer GGA
                                def pick_group(g):
                                    ggga = g[g[KEY_TYPE]=='GGA']
                                    if not ggga.empty:
                                        return ggga.iloc[0]
                                    return g.iloc[0]
                                rows = r.groupby('sec_key').apply(pick_group)
                                rows = rows.reset_index(drop=True)
                                rows_out = pd.DataFrame({
                                    'NMEA_Date': rows[KEY_DATE],
                                    'NMEA_Time': rows[KEY_TIME],
                                    'Type': rows[KEY_TYPE],
                                    'Altitude_raw': pd.to_numeric(rows[KEY_ALT], errors='coerce')
                                })
                                rows_out.to_csv(persec_path, index=False, header=False)
                            except Exception:
                                pass
                        except Exception:
                            pass
                    threading.Thread(target=_dump_replica, args=(df_final_copy, raw_rows.copy()), daemon=True).start()
            except Exception:
                pass
            
            dataframe = dataframe.dropna(subset=['Time'])
            return dataframe.sort_values(by=['Time']).reset_index(drop=True)[['Time', 'Value']]
            
        except Exception as e:
            print(f"[!] Altitude Extractor Error: {e}")
            return None