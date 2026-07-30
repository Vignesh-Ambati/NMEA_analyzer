"""
core/cache.py
─────────────
Temporary on-disk cache used to store split NMEA message streams
between the processing stage and the query/plot stage.
"""

import os
import time
import zlib
from pathlib import Path
import pyarrow as _pyArrow
from typing import Optional
import pyarrow.parquet as _parquet

from . import _CoreConstantsPage
        
class CacheManager:
    _baseDirectory = os.getcwd()
    _tempDirectory = os.path.join(_baseDirectory, _CoreConstantsPage.CACHE_BASE_NAME)
    
    @classmethod
    def getCacheDirectory(cls) -> str:
        os.makedirs(cls._tempDirectory, exist_ok=True)
        return cls._tempDirectory
    
    def __init__(self, log_path: Optional[Path] = None, _logQueue=None) -> None:
        self._cacheDir = CacheManager.getCacheDirectory()
        CacheManager._purgeExpiredEntries(self._cacheDir, _CoreConstantsPage.RETENTION_WINDOW_SECONDS, _logQueue=_logQueue)
        self.log_path = log_path
        self.parquet_path = CacheManager.get_parquetPath(log_path, self._cacheDir) if log_path else None
        self.temp_dir = self._cacheDir
    
    @staticmethod
    def _generateFingerPrint(_logPath: Path) -> str:
        try:
            _stat = _logPath.stat()
            _size = _stat.st_size
            _mtime = int(_stat.st_mtime)
            
            with _logPath.open("rb") as _fp:
                _chunk = _fp.read(65536)
            _crc = zlib.crc32(_chunk) & 0xffffffff
            return f"{_size}_{_mtime}_{_crc:08x}"
        except Exception as e:
            return f"fallback_{_logPath.stem}"
    
    @staticmethod
    def get_parquetPath(_logPath: Path, _targetDir: str) -> Path:
        _fingerprint = CacheManager._generateFingerPrint(_logPath)
        return Path(_targetDir) / f"cache_{_fingerprint}.parquet"
    
    @classmethod
    def load_existingCache(cls, _logPath:Path, _targetDir: str, _logQueue=None) -> Optional[_pyArrow.Table]:
        _parquetPath = cls.get_parquetPath(_logPath, _targetDir)
        if _parquetPath.exists() and _parquetPath.stat().st_size > 0:
            try:
                os.utime(str(_parquetPath), None)
                return _parquet.read_table(str(_parquetPath))
            except Exception as e:
                if _logQueue is not None:
                    try:
                        _logQueue.put(f"[!] Warning: Found existing cache at {_parquetPath} but failed to read: {e}")
                    except Exception:
                        pass
                return None
        return None
    
    @staticmethod
    def _purgeExpiredEntries(_targetDir: str, _cutoffSeconds: int, _logQueue=None) -> None:
        try:
            _now = time.time()
            for _entry in os.scandir(_targetDir):
                if(_now - _entry.stat().st_mtime) > _cutoffSeconds:
                    try: os.remove(_entry.path)
                    except OSError: pass
        except Exception as e:
            if _logQueue is not None:
                try:
                    _logQueue.put(f"[!] Retention engine sweep met exception: {e}")
                except Exception:
                    pass
