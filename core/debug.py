"""
core/debug.py
─────────────
Standalone data exportation service for pipeline debugging.
"""
import os
from pathlib import Path
import pandas as pd
import pyarrow as pa

class DebugExportService:
    @staticmethod
    def dump(data, stage_name: str, file_identifier: str) -> None:
        """Dumps PyArrow Tables or Pandas DataFrames to Excel for inspection."""
        out_dir = Path("debug_exports")
        out_dir.mkdir(exist_ok=True)
        
        safe_id = Path(file_identifier).stem
        excel_path = out_dir / f"{safe_id}_{stage_name}.xlsx"
        csv_path = out_dir / f"{safe_id}_{stage_name}.csv"
        
        try:
            if isinstance(data, pa.Table):
                df = data.to_pandas()
            elif isinstance(data, pd.DataFrame):
                df = data.copy()
            else:
                print(f"[Debug] Unsupported data type at {stage_name}")
                return

            # Clean timezone data if present, as Excel rejects timezone-aware datetimes
            for col in df.select_dtypes(include=['datetimetz']).columns:
                df[col] = df[col].dt.tz_localize(None)

            # Excel hard-limit protection
            if len(df) > 1000000:
                df.to_csv(csv_path, index=False)
                print(f"[Debug] Output too large for Excel. Saved as CSV: {csv_path}")
            else:
                df.to_excel(excel_path, index=False)
                print(f"[Debug] Stage Data Exported: {excel_path}")
                
        except Exception as e:
            print(f"[!] Debug Export Failed ({stage_name}): {e}")