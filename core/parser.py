"""
core/parser.py
──────────────
Low-level NMEA parsing helpers:
"""

from typing import Any, Dict, List, Optional

from . import constants as _constantPage


class BaseParsers:
    """ Parent Class providing methods for NMEA parsing"""
    def __init__(self):
        self._latestTime: str = "000000.00"
        self._lastGSVSeq: int = 0
    
    @staticmethod
    def _nmea_LatLon_to_Dec(_value: str, _direction:str) -> float:
        try:
            if not _value or not _direction: return 0.0
            _split =  _value.find('.') -2
            
            _degree = float(_value[:_split])
            _minutes = float(_value[_split:])
            
            #TODO: Confirm if this math is correct or wrong
            _decimal = round(_degree + (_minutes/60.0), 7)
            return _decimal if _direction not in ('S', 'W') else -_decimal
        except (ValueError, IndexError):
            return 0.0
    
    @staticmethod
    def _knotsToKmph(_knots_value:str) -> float:
        try:
            return round(float(_knots_value) * 1.852, 2) if _knots_value else 0.0
        except ValueError:
            return 0.0
    
    def _parseGGA(self, _fields: List[str]) -> Optional[Dict[str, Any]]:
        _fields += [""] * (15 - len(_fields))
        try:
            #TODO: Confirm if this accurate
            _toDecimalConverter = self._nmea_LatLon_to_Dec
            
            if _fields[1]: self._latestTime = _fields[1]
            _time = self._latestTime
            
            return {
                _constantPage.KEY_TYPE: "GGA",
                _constantPage.KEY_TIME: _time,
                _constantPage.KEY_LAT: _toDecimalConverter(_fields[2], _fields[3]),
                _constantPage.KEY_LON: _toDecimalConverter(_fields[4], _fields[5]),
                _constantPage.KEY_QUAL: int(_fields[6]) if _fields[6] else 0,
                _constantPage.KEY_SVS: int(_fields[7]) if _fields[7] else 0,
                _constantPage.KEY_HDOP: float(_fields[8]) if _fields[8] else 0.0,
                _constantPage.KEY_ALT: float(_fields[9]) if _fields[9]else 0.0,
                _constantPage.KEY_GHEIGHT: float(_fields[11]) if _fields[11] else 0.0
            }
        except (IndexError, ValueError):
            return None
    
    def _parseRMC(self, _fields: List[str]) -> Optional[Dict[str, Any]]:
        _fields += [""] * (13 - len(_fields))
        try:
            #TODO: Confirm if this accurate
            _toDecimalConverter = self._nmea_LatLon_to_Dec
            _toKmphConverter = self._knotsToKmph
            
            if _fields[1]: self._latestTime = _fields[1]
            _time = self._latestTime
            return {
                _constantPage.KEY_TYPE: "RMC",
                _constantPage.KEY_TIME: _time,
                _constantPage.KEY_STATUS: _fields[2], 
                _constantPage.KEY_LAT: _toDecimalConverter(_fields[3], _fields[4]),
                _constantPage.KEY_LON: _toDecimalConverter(_fields[5], _fields[6]),
                _constantPage.KEY_SPD: _toKmphConverter(_fields[7]),
                _constantPage.KEY_COG: float(_fields[8]) if _fields[8]else 0.0,
                _constantPage.KEY_DATE: _fields[9]
            }
        except (IndexError, ValueError):
            return None
    
    def _parseVTG(self, _fields: List[str]) -> Optional[Dict[str, Any]]:
        _fields += [""] * (10 - len(_fields))
        try:
            #TODO: Confirm if this accurate
            
            _toKmphConverter = self._knotsToKmph
            return {
                _constantPage.KEY_TYPE: "VTG",
                _constantPage.KEY_COG: float(_fields[1]) if _fields[1] else 0.0,
                _constantPage.KEY_SPD: float(_fields[7]) if _fields[7] else _toKmphConverter(_fields[5])
            }
        except (ValueError, IndexError):
            return None
    
    def _parseGNS(self, _fields: List[str]) -> Optional[Dict[str, Any]]:
        _fields += [""] * (14 - len(_fields))
        try:
            #TODO: Confirm if this accurate
            
            _toDecimalConverter = self._nmea_LatLon_to_Dec
            if _fields[1]: self._latestTime = _fields[1]
            _time = self._latestTime
            return {
                _constantPage.KEY_TYPE: "GNS",
                _constantPage.KEY_TIME: _time,
                _constantPage.KEY_LAT: _toDecimalConverter(_fields[2], _fields[3]),
                _constantPage.KEY_LON: _toDecimalConverter(_fields[4], _fields[5]),
                # TODO:KEY_MODE is needed to be confirmed
                _constantPage.KEY_MODE: (not (_mode := _fields[6]) or _mode.startswith('N')),
                _constantPage.KEY_SVS: int(_fields[7]) if _fields[7] else 0,
                _constantPage.KEY_HDOP: float(_fields[8]) if _fields[8] else 0.0,
                _constantPage.KEY_ALT: float(_fields[9]) if _fields[9] else 0.0,
                _constantPage.KEY_GHEIGHT: float(_fields[10]) if _fields[10] else 0.0
            }
        except (ValueError, IndexError):
            return None

    def _parseGLL(self, _fields: List[str]) -> Optional[Dict[str, Any]]:
        _fields += [""] * (7 - len(_fields))
        try:
            #TODO: Confirm if this accurate
            
            _toDecimalConverter = self._nmea_LatLon_to_Dec
            if _fields[5]: self._latestTime = _fields[5]
            _time = self._latestTime
            return {
                _constantPage.KEY_TYPE: "GLL",
                _constantPage.KEY_TIME: _time,
                _constantPage.KEY_LAT: _toDecimalConverter(_fields[1], _fields[2]),
                _constantPage.KEY_LON: _toDecimalConverter(_fields[3], _fields[4]),
                _constantPage.KEY_STATUS: _fields[6]
            }
        except (ValueError, IndexError):
            return None  
        
    def _parseZDA(self, _fields: List[str]) -> Optional[Dict[str, Any]]:
        _fields += [""] * (7 - len(_fields))
        try:
            if _fields[1]: self._latestTime = _fields[1]
            _time = self._latestTime
            return {
                _constantPage.KEY_TYPE: "ZDA",
                _constantPage.KEY_TIME: _time,
                _constantPage.KEY_DATE: f"{_fields[2]}/{_fields[3]}/{_fields[4]}" if _fields[2] else "",
                _constantPage.KEY_OFFSET: f"{_fields[5]}:{_fields[6]}" if _fields[5] else "00:00"
            }
        except (ValueError, IndexError):
            return None      
        
    def _parseGSA(self, _fields: List[str]) -> Optional[Dict[str, Any]]:
        _fields += [""] * (19 - len(_fields))
        try:            
            _idChar = _fields[18][:1]
            _constellation = _constantPage.CONSTELLATION_ID.get(int(_idChar) if _idChar else 0, "Unknown")
            _activeSvs = tuple(sv for sv in _fields[3:15] if sv)
            return {
                _constantPage.KEY_TYPE: "GSA",
                _constantPage.KEY_CONSTELLATION: _constellation,
                # TODO:fix type is needed to be confirmed
                _constantPage.KEY_FIX_TYPE: int(_fields[2]) if _fields[2] else 1,
                _constantPage.KEY_SV_IDS: _activeSvs,
                _constantPage.KEY_PDOP: float(_fields[15]) if _fields[15] else 0.0,
                _constantPage.KEY_HDOP: float(_fields[16]) if _fields[16] else 0.0,
                _constantPage.KEY_VDOP: float(_fields[17]) if _fields[17] else 0.0
            }
        except (ValueError, IndexError):
            return None
    
    def _parseGSV(self, _fields: List[str]) -> Optional[Dict[str, Any]]:
        _fields += [""] * (22 - len(_fields))
        try:
            
            _header = _fields[0][1:3]
            _constellation =  _constantPage.CONSTELLATION_DICT.get(_header, "Unknown")
            _msgNum = int(_fields[2]) if _fields[2] else 1
            _time = self._latestTime
            
            if (_msgNum == 1): self._lastGSVSeq = 1
            else :
                if _msgNum != self._lastGSVSeq+1:
                    print(f"[!] CORRUPTION DETECTED: Missing GSV message for {_constellation} at {self._latestTime}. "
                    f"Expected part {self._lastGSVSeq + 1}, got {_msgNum}. Please clean this log section.")
                self._lastGSVSeq = _msgNum
            #TODO: Here the tuple will be filled with '' if there is no almanac or ephemeris data like elevation and azimuth    
            _svData = tuple(tuple(_fields[i:i+4]) for i in range(4, 17, 4) if _fields[i] and '*' not in _fields[i])    
            return {
                _constantPage.KEY_TYPE: "GSV",
                _constantPage.KEY_TIME: _time,
                _constantPage.KEY_CONSTELLATION: _constellation,
                _constantPage.KEY_MSG_NUM: _msgNum,
                _constantPage.KEY_TOTAL_MSGS: int(_fields[1]) if _fields[1] else 1,
                _constantPage.KEY_TOTAL_SVS: int(_fields[3]) if _fields[3] else 0,
                _constantPage.KEY_SATELLITES: tuple(_svData) # Just the 1-4 SVs on THIS line
            }

        except (ValueError, IndexError):
            return None