"""
main.py
───────
Application entry point for ACCORD Log Analyzer.
Run with:
    python main.py
"""
import pycache_config
from ui.app import LogAnalyzerApp

if __name__ == "__main__":
    LogAnalyzerApp()
    
# TODO: ADD A CONFIG BUTTON TO REMOVE THE LOGCACHE AS FAIL SAFE. ALSO PRINT IN CONSOLE IF CACHE IS PRESENT FOR ANY FILE
# TODO: BATCH_SIZE is to be added to config buttons list
# TODO: RETENTION_WINDOW_SECONDS is to be added to buttons list
# TODO: Number of times reset happened.
# TODO: Enable multi file processing.In infra it is possible but not in services, where it is restricted to only 1 file based on flag.
#       Make it such that it process multi files in batch and displays different progressbar for each with its label
# TODO: Integrate the KML file generation and google map plot

# BUG: We are parsing and storing time. In case if the data is missing from vtg to vtg or gsa, with time now being not updated for few seconds,
#      we have a critical issue of saving both data as same.
#      example 1 for this:
# 			$GNGLL,1257.13436,N,07738.41344,E,121820.00,A,A*70
# 			$GNVTG,211.25,T,,M,0009.27,N,017.1,K,A*2D                   --> 121820 time second
			
# 			$GNGSA,A,3,32,28,31,18,23,,,,,,,,03.5,01.4,03.3,1*03        --> 121827 time second
# 			$GNGSA,A,3,,,,,,,,,,,,,03.5,01.4,03.3,2*01
# 			$GNGSA,A,3,,,,,,,,,,,,,03.5,01.4,03.3,4*07
# 			$GNGSA,A,3,09,,,,,,,,,,,,03.5,01.4,03.3,6*0C
# 			$GPGSV,3,1,10,28,53,181,31,32,53,326,30,18,38,140,33,23,31,058,30,1*68
# 			$GPGSV,3,2,10,31,25,198,32,10,37,012,24,08,11,287,21,25,11,115,14,1*61
# 			$GPGSV,3,3,10,02,06,323,,26,05,198,,1*62
# 			$GLGSV,1,1,01,,,,27,1*7C
# 			$GIGSV,1,1,03,02,,,32,09,59,286,35,10,,,35,1*45
# 			$GBGSV,4,1,16,13,60,263,23,38,57,207,30,10,55,094,30,56,45,010,,1*75
# 			$GBGSV,4,2,16,28,39,300,26,33,37,344,20,09,35,029,24,24,33,102,25,1*75
# 			$GBGSV,4,3,16,06,28,057,31,25,27,170,33,41,21,290,,42,17,042,22,1*75
# 			$GBGSV,4,4,16,34,14,158,19,08,10,161,,26,10,059,,44,06,142,,1*70
	
#       	 example 2 for this:
# 			$GNGGA,121820.00,1257.13436,N,07738.41344,E,1,06,01.4,00895.0,M,-088.3,M,,*5C
# 			$GNGNS,121820.00,1257.13436,N,07738.41344,E,ANNNNA,06,01.4,00895.0,-088.3,,,V*0C
# 			$GNRMC,121820.00,A,1257.13436,N,07738.41344,E,0009.27,211.25,190526,,,A,V*0D
# 			$GNGLL,1257.13436,N,07738.41344,E,121820.00,A,A*70
# 			$GNVTG,211.25,T,,M,0009.27,N,017.1,K,A*2D
# 			$GNZDA,121820.00,19,05,2026,-05,30*50                       --> 121820 time second
# 			$GNGSA,A,3,32,28,31,18,23,,,,,,,,03.5,01.4,03.3,1*03
# 			$GNGSA,A,3,,,,,,,,,,,,,03.5,01.4,03.3,2*01
# 			$GNGSA,A,3,,,,,,,,,,,,,03.5,01.4,03.3,4*07
# 			$GNGSA,A,3,09,,,,,,,,,,,,03.5,01.4,03.3,6*0C
# 			$GPGSV,3,1,11,28,53,181,35,32,53,326,28,18,38,140,26,23,31,058,31,1*61
# 			$GPGSV,3,2,11,31,25,198,35,10,37,012,28,08,11,287,14,25,11,115,16,1*6F
# 			$GPGSV,3,3,11,02,06,323,,26,05,198,,41,,,36,1*63
# 			$GLGSV,1,1,01,,,,30,1*7A
# 			$GIGSV,1,1,03,02,,,35,09,59,286,38,10,,,25,1*4E
# 			$GBGSV,4,1,16,13,60,263,,38,57,207,,10,55,094,,56,45,010,,1*74
# 			$GBGSV,4,2,16,28,39,300,21,33,37,344,,09,35,029,,24,33,102,,1*71
# 			$GBGSV,4,3,16,06,28,057,,25,27,170,,41,21,290,,42,17,042,,1*77
# 			$GBGSV,4,4,16,34,14,158,,08,10,161,,26,10,059,,44,07,142,,1*79
			
# 			$GNGSA,A,3,32,28,31,18,23,,,,,,,,03.5,01.4,03.3,1*03        --> 121827 time second
# 			$GNGSA,A,3,,,,,,,,,,,,,03.5,01.4,03.3,2*01
# 			$GNGSA,A,3,,,,,,,,,,,,,03.5,01.4,03.3,4*07
# 			$GNGSA,A,3,09,,,,,,,,,,,,03.5,01.4,03.3,6*0C
# 			$GPGSV,3,1,10,28,53,181,31,32,53,326,30,18,38,140,33,23,31,058,30,1*68
# 			$GPGSV,3,2,10,31,25,198,32,10,37,012,24,08,11,287,21,25,11,115,14,1*61
# 			$GPGSV,3,3,10,02,06,323,,26,05,198,,1*62
# 			$GLGSV,1,1,01,,,,27,1*7C
# 			$GIGSV,1,1,03,02,,,32,09,59,286,35,10,,,35,1*45
# 			$GBGSV,4,1,16,13,60,263,23,38,57,207,30,10,55,094,30,56,45,010,,1*75
# 			$GBGSV,4,2,16,28,39,300,26,33,37,344,20,09,35,029,24,24,33,102,25,1*75
# 			$GBGSV,4,3,16,06,28,057,31,25,27,170,33,41,21,290,,42,17,042,22,1*75
# 			$GBGSV,4,4,16,34,14,158,19,08,10,161,,26,10,059,,44,06,142,,1*70
