"""
core/parser.py
──────────────
Low-level NMEA parsing helpers:
"""

from typing import Any, Dict, List, Optional, Tuple

from . import _CoreConstantsPage


class BaseParsers:
    """ Parent Class providing methods for NMEA parsing"""
    def __init__(self):
        self._latestTime: str = "000000.00"
        self._latestDate: str = "000000"
        
        self._lastGSVSeq: Dict[str, int] = {}
        self._epochSignatures = set()
        self._staleTime = False
    
    def _manageEpoch(self, msgTime: str, msgDate: str, signature: str) -> Tuple[str, str]:
        if msgTime and msgTime != self._latestTime and msgTime != "000000.00":
            self._latestTime = msgTime
            self._epochSignatures.clear()
            self._staleTime = False
        if msgDate and msgDate != self._latestDate and msgDate != "000000":
            self._latestDate = msgDate
        if signature in self._epochSignatures:
            self._staleTime = True
            self._epochSignatures.clear()
        
        self._epochSignatures.add(signature)
        
        if self._staleTime: return "000000.00", "000000"
        return self._latestTime, self._latestDate

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
            
            _time, _date = self._manageEpoch(_fields[1], "", _fields[0])

           
            return {
                _CoreConstantsPage.KEY_TYPE: "GGA",
                _CoreConstantsPage.KEY_TIME: _time,
                _CoreConstantsPage.KEY_DATE: _date,
                _CoreConstantsPage.KEY_LAT: _toDecimalConverter(_fields[2], _fields[3]),
                _CoreConstantsPage.KEY_LON: _toDecimalConverter(_fields[4], _fields[5]),
                _CoreConstantsPage.KEY_QUAL: int(_fields[6]) if _fields[6] else 0,
                _CoreConstantsPage.KEY_SVS: int(_fields[7]) if _fields[7] else 0,
                _CoreConstantsPage.KEY_HDOP: float(_fields[8]) if _fields[8] else 0.0,
                _CoreConstantsPage.KEY_ALT: float(_fields[9]) if _fields[9]else 0.0,
                _CoreConstantsPage.KEY_GHEIGHT: float(_fields[11]) if _fields[11] else 0.0
            }
        except (IndexError, ValueError):
            return None
    
    def _parseRMC(self, _fields: List[str]) -> Optional[Dict[str, Any]]:
        _fields += [""] * (13 - len(_fields))
        try:
            #TODO: Confirm if this accurate
            _toDecimalConverter = self._nmea_LatLon_to_Dec
            _toKmphConverter = self._knotsToKmph
            
            _time, _date = self._manageEpoch(_fields[1], _fields[9], _fields[0])


            return {
                _CoreConstantsPage.KEY_TYPE: "RMC",
                _CoreConstantsPage.KEY_TIME: _time,
                _CoreConstantsPage.KEY_STATUS: _fields[2], 
                _CoreConstantsPage.KEY_LAT: _toDecimalConverter(_fields[3], _fields[4]),
                _CoreConstantsPage.KEY_LON: _toDecimalConverter(_fields[5], _fields[6]),
                _CoreConstantsPage.KEY_SPD: _toKmphConverter(_fields[7]),
                _CoreConstantsPage.KEY_COG: float(_fields[8]) if _fields[8]else 0.0,
                _CoreConstantsPage.KEY_DATE: _date
            }
        except (IndexError, ValueError):
            return None
    
    def _parseVTG(self, _fields: List[str]) -> Optional[Dict[str, Any]]:
        _fields += [""] * (10 - len(_fields))
        try:
            _time, _date = self._manageEpoch("", "", _fields[0])
            _toKmphConverter = self._knotsToKmph
            
            return {
                _CoreConstantsPage.KEY_TYPE: "VTG",
                _CoreConstantsPage.KEY_DATE: _date,
                _CoreConstantsPage.KEY_TIME: _time,
                _CoreConstantsPage.KEY_COG: float(_fields[1]) if _fields[1] else 0.0,
                _CoreConstantsPage.KEY_SPD: float(_fields[7]) if _fields[7] else _toKmphConverter(_fields[5])
            }
        except (ValueError, IndexError):
            return None
    
    def _parseGNS(self, _fields: List[str]) -> Optional[Dict[str, Any]]:
        _fields += [""] * (14 - len(_fields))
        try:
            #TODO: Confirm if this accurate
            
            _toDecimalConverter = self._nmea_LatLon_to_Dec
            _time, _date = self._manageEpoch(_fields[1], "", _fields[0])

            
            return {
                _CoreConstantsPage.KEY_TYPE: "GNS",
                _CoreConstantsPage.KEY_TIME: _time,
                _CoreConstantsPage.KEY_DATE: _date,
                _CoreConstantsPage.KEY_LAT: _toDecimalConverter(_fields[2], _fields[3]),
                _CoreConstantsPage.KEY_LON: _toDecimalConverter(_fields[4], _fields[5]),
                # TODO:KEY_MODE is needed to be confirmed
                _CoreConstantsPage.KEY_MODE: (not (_mode := _fields[6]) or _mode.startswith('N')),
                _CoreConstantsPage.KEY_SVS: int(_fields[7]) if _fields[7] else 0,
                _CoreConstantsPage.KEY_HDOP: float(_fields[8]) if _fields[8] else 0.0,
                _CoreConstantsPage.KEY_ALT: float(_fields[9]) if _fields[9] else 0.0,
                _CoreConstantsPage.KEY_GHEIGHT: float(_fields[10]) if _fields[10] else 0.0
            }
        except (ValueError, IndexError):
            return None

    def _parseGLL(self, _fields: List[str]) -> Optional[Dict[str, Any]]:
        _fields += [""] * (7 - len(_fields))
        try:
            #TODO: Confirm if this accurate
            
            _toDecimalConverter = self._nmea_LatLon_to_Dec
            _time, _date = self._manageEpoch(_fields[5], "", _fields[0])

            
            return {
                _CoreConstantsPage.KEY_TYPE: "GLL",
                _CoreConstantsPage.KEY_TIME: _time,
                _CoreConstantsPage.KEY_DATE: _date,
                _CoreConstantsPage.KEY_LAT: _toDecimalConverter(_fields[1], _fields[2]),
                _CoreConstantsPage.KEY_LON: _toDecimalConverter(_fields[3], _fields[4]),
                _CoreConstantsPage.KEY_STATUS: _fields[6]
            }
        except (ValueError, IndexError):
            return None  
        
    def _parseZDA(self, _fields: List[str]) -> Optional[Dict[str, Any]]:
        _fields += [""] * (7 - len(_fields))
        try:
            _zdaDate = f"{_fields[2]}{_fields[3]}{_fields[4][-2:]}" if _fields[2] else ""
                
            _time, _date = self._manageEpoch(_fields[1], _zdaDate, _fields[0])


            return {
                _CoreConstantsPage.KEY_TYPE: "ZDA",
                _CoreConstantsPage.KEY_TIME: _time,
                _CoreConstantsPage.KEY_DATE: _date,
                _CoreConstantsPage.KEY_OFFSET: f"{_fields[5]}:{_fields[6]}" if _fields[5] else "00:00"
            }
        except (ValueError, IndexError):
            return None      
        
    def _parseGSA(self, _fields: List[str]) -> Optional[Dict[str, Any]]:
        _fields += [""] * (19 - len(_fields))
        try:            
            _idChar = _fields[18][:1]
            _constellation = _CoreConstantsPage.CONSTELLATION_ID.get(int(_idChar) if _idChar else 0, "Unknown")
            _activeSvs = tuple(sv for sv in _fields[3:15] if sv)
            
            # GSA Signature: Differentiate multiple GSAs in one epoch by their System ID
            _sig = f"{_fields[0]}_{_idChar}"
            _time, _date = self._manageEpoch("", "", _sig)

            
            return {
                _CoreConstantsPage.KEY_TYPE: "GSA",
                _CoreConstantsPage.KEY_TIME: _time,
                _CoreConstantsPage.KEY_DATE: _date,
                _CoreConstantsPage.KEY_CONSTELLATION: _constellation,
                # TODO:fix type is needed to be confirmed
                _CoreConstantsPage.KEY_FIX_TYPE: int(_fields[2]) if _fields[2] else 1,
                _CoreConstantsPage.KEY_SV_IDS: _activeSvs,
                _CoreConstantsPage.KEY_PDOP: float(_fields[15]) if _fields[15] else 0.0,
                _CoreConstantsPage.KEY_HDOP: float(_fields[16]) if _fields[16] else 0.0,
                _CoreConstantsPage.KEY_VDOP: float(_fields[17]) if _fields[17] else 0.0
            }
        except (ValueError, IndexError):
            return None
    
    def _parseGSV(self, _fields: List[str]) -> Optional[Dict[str, Any]]:
        _fields += [""] * (22 - len(_fields))
        try:
            _header = _fields[0][1:3]
            _constellation =  _CoreConstantsPage.CONSTELLATION_DICT.get(_header, "Unknown")
            _msgNum = int(_fields[2]) if _fields[2] else 1
            _totalMessages = int(_fields[1]) if _fields[1] else 1
            
            # GSV Signature: Constellation + MsgNum prevents false collisions inside a block
            _sig = f"{_constellation}_{_msgNum}_{_totalMessages}"
            _time, _date = self._manageEpoch("", "", _sig)

           
            if _header not in self._lastGSVSeq:
                self._lastGSVSeq[_header] = 0
                
            if _msgNum == 1: 
                self._lastGSVSeq[_header] = 1
            else:
                if _msgNum != self._lastGSVSeq[_header] + 1:
                    pass 
                self._lastGSVSeq[_header] = _msgNum
                
            _svData = tuple(tuple(_fields[i:i+4]) for i in range(4, 17, 4) if _fields[i] and '*' not in _fields[i])    
            return {
                _CoreConstantsPage.KEY_TYPE: "GSV",
                _CoreConstantsPage.KEY_TIME: _time,
                _CoreConstantsPage.KEY_DATE: _date,
                _CoreConstantsPage.KEY_CONSTELLATION: _constellation,
                _CoreConstantsPage.KEY_MSG_NUM: _msgNum,
                _CoreConstantsPage.KEY_TOTAL_MSGS: int(_fields[1]) if _fields[1] else 1,
                _CoreConstantsPage.KEY_TOTAL_SVS: int(_fields[3]) if _fields[3] else 0,
                _CoreConstantsPage.KEY_SATELLITES: tuple(_svData) # Just the 1-4 SVs on THIS line
            }

        except (ValueError, IndexError):
            return None