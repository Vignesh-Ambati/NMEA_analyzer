"""
core/processor.py
─────────────────
Core NMEA processing engine.
"""

from pathlib import Path
from typing import Generator

from .cache import CacheManager
from .stage2 import ParquetStorageEngine
from .parser import BaseParsers
from . import constants as _constantPage


class NmeaProcessor(BaseParsers):
    def __init__(self, abs_filename: str) -> None:
        super().__init__()        
        
        self.abs_filename: Path = Path(abs_filename)
        self._parseMap = {
            "GGA": self._parseGGA,
            "RMC": self._parseRMC,
            "VTG": self._parseVTG,
            "GNS": self._parseGNS,
            "GLL": self._parseGLL,
            "ZDA": self._parseZDA,
            "GSA": self._parseGSA,
            "GSV": self._parseGSV,
        }
        
    def process_file(self, _sharedProgress = None):
        if not self.abs_filename.exists(): 
            raise FileNotFoundError(f"Provided path is invalid: {self.abs_filename}")
        
        _cacheDirectory = CacheManager.getCacheDirectory()
        _existing_data = CacheManager.load_existingCache(self.abs_filename, _cacheDirectory)
        if _existing_data is not None:
            if _sharedProgress is not None: _sharedProgress.value = 1.0
            print(f"[✓] O(1) Cache Match! Preloaded {len(_existing_data)} records instantly.")
            return None
        _finalParquetPath = CacheManager.get_parquetPath(self.abs_filename, _cacheDirectory)
        _storageEngine = ParquetStorageEngine(_finalParquetPath)
        
        try:
            _chunkBuffer: list = []
            _batchSize = _constantPage.BATCH_SIZE
            _parseMap = self._parseMap
            _search = _constantPage.LINE_PATTERN.search
            _totalBytes = self.abs_filename.stat().st_size
            _bytesProcessed = 0
            with self.abs_filename.open(
                mode="r",
                encoding="utf-8",
                errors="ignore",
            ) as _fp:
                for _nmeaLine in _fp:
                    _bytesProcessed += len(_nmeaLine)
                    _matchedLine = _search(_nmeaLine)
                    if not _matchedLine: continue
                    _nmeaString = _matchedLine.group('nmea')
                    _commonIndex = _nmeaString.find(',')
                    if _commonIndex < 4: continue
                    _headerType = _nmeaString[_commonIndex - 3 : _commonIndex]
                    _handler = _parseMap.get(_headerType)
                    if _handler:
                        _parsedData = _handler(_nmeaString.split(','))
                        if _parsedData:
                            _chunkBuffer.append(_parsedData)
                            if len(_chunkBuffer) >= _batchSize:
                                _storageEngine._writeBatch(_chunkBuffer)
                                _chunkBuffer.clear()
                                if _sharedProgress is not None:
                                    _sharedProgress.value = min(0.99, _bytesProcessed / _totalBytes)

            if _chunkBuffer:
                _storageEngine._writeBatch(_chunkBuffer)
                _chunkBuffer.clear()
        except Exception as e:
            _storageEngine.close()
            if _finalParquetPath.exists():
                try: _finalParquetPath.unlink()
                except: pass
            raise e
        finally:
            _storageEngine.close()

        if _sharedProgress is not None:
            _sharedProgress.value = 1.0