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
        
    def process_file(self):
        if not self.abs_filename.exists(): 
            raise FileNotFoundError(f"Provided path is invalid: {self.abs_filename}")
        
        _cacheSystem = CacheManager()
        _cacheDirectory = _cacheSystem._tempDirectory
        _existing_data = CacheManager.load_existingCache(self.abs_filename, _cacheDirectory)
        if _existing_data is not None:
            print(f"[✓] O(1) Cache Match! Preloaded {len(_existing_data)} records instantly.")
            return
        _finalParquetPath = CacheManager.get_parquetPath(self.abs_filename, _cacheDirectory)
        
        _chunkBuffer: list = []
        _batchSize = _constantPage.BATCH_SIZE
        _storageEngine = ParquetStorageEngine(_finalParquetPath)
        _parseLineMethod = self._parseLine
        with self.abs_filename.open(
            mode="r",
            encoding="utf-8",
            errors="ignore",
        ) as _fp:
            for _nmea in self.yieldline(_fp):
                _parsedData = _parseLineMethod(_nmea)
                if _parsedData:
                    _chunkBuffer.append(_parsedData)
                    if len(_chunkBuffer) >= _batchSize:
                        _storageEngine._writeBatch(_chunkBuffer)
                        _chunkBuffer.clear()

        if _chunkBuffer:
            _storageEngine._writeBatch(_chunkBuffer)
            _chunkBuffer.clear()  
        _storageEngine.close()
                
    @staticmethod
    def yieldline(_fp: object) -> Generator[str, None, None]:
        _search =  _constantPage.LINE_PATTERN.search
        for raw_line in _fp:
            _matchedLine = _search(raw_line)
            if _matchedLine:
                yield  _matchedLine.group('nmea')
    
    def _parseLine(self, _nmeaString:str) -> None:
        try:
            _commonIndex = _nmeaString.find(',')
            if _commonIndex < 4: return None
            _headerType = _nmeaString[_commonIndex - 3 : _commonIndex]
            _handler = self._parseMap.get(_headerType)
            if _handler:
                _nmeaFields = _nmeaString.split(',')
                return  _handler(_nmeaFields)
        except Exception:
            print(f"Exception in _parseLine method")
            print(_nmeaString)
            return None
