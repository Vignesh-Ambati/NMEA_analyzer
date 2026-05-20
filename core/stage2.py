"""
core/stage2.py
──────────────
High-performance PyArrow columnar storage stage.
"""
from pathlib import Path
from typing import Any, Dict, List, Optional
import pyarrow as _pyArrow
import pyarrow.parquet as _parquet
from . import constants as _constantPage

class ParquetStorageEngine:
    def __init__(self, _outputPath: Path) -> None:
        self._outputPath: Path = _outputPath
        self._writer: Optional[_parquet.ParquetWriter] = None
        
        self._schema = _pyArrow.schema([
            (_constantPage.KEY_TYPE, _pyArrow.string()),
            (_constantPage.KEY_TIME, _pyArrow.string()),
            (_constantPage.KEY_LAT, _pyArrow.float64()),
            (_constantPage.KEY_LON, _pyArrow.float64()),
            (_constantPage.KEY_QUAL, _pyArrow.int32()),
            (_constantPage.KEY_SVS, _pyArrow.int32()),
            (_constantPage.KEY_HDOP, _pyArrow.float64()),
            (_constantPage.KEY_ALT, _pyArrow.float64()),
            (_constantPage.KEY_GHEIGHT, _pyArrow.float64()),
            (_constantPage.KEY_STATUS, _pyArrow.string()),
            (_constantPage.KEY_SPD, _pyArrow.float64()),
            (_constantPage.KEY_COG, _pyArrow.float64()),
            (_constantPage.KEY_DATE, _pyArrow.string()),
            (_constantPage.KEY_MODE, _pyArrow.bool_()),
            (_constantPage.KEY_OFFSET, _pyArrow.string()),
            (_constantPage.KEY_FIX_TYPE, _pyArrow.int32()),
            (_constantPage.KEY_PDOP, _pyArrow.float64()),
            (_constantPage.KEY_VDOP, _pyArrow.float64()),
            (_constantPage.KEY_CONSTELLATION, _pyArrow.string()),
            (_constantPage.KEY_MSG_NUM, _pyArrow.int32()),
            (_constantPage.KEY_TOTAL_MSGS, _pyArrow.int32()),
            (_constantPage.KEY_TOTAL_SVS, _pyArrow.int32()),
            (_constantPage.KEY_SV_IDS, _pyArrow.list_(_pyArrow.string())),
            (_constantPage.KEY_SATELLITES, _pyArrow.list_(_pyArrow.list_(_pyArrow.string())))
        ])
        
    def _writeBatch(self, _chunkBuffer:List[Dict[str, Any]]) -> None:
        try:
            if self._writer is None:
                self._writer = _parquet.ParquetWriter(str(self._outputPath), self._schema, compression='snappy')
            _table = _pyArrow.Table.from_pylist(_chunkBuffer, schema=self._schema)
            self._writer.write_table(_table)
        except Exception as e:
            print(f"[!] Critical Error writing columnar batch to Parquet: {e}")
    
    def close(self) -> None:
        if self._writer is not None:
            try:
                self._writer.close()
            except Exception:
                pass
            self._writer = None