"""
main.py
───────
Application entry point for ACCORD Log Analyzer.
Run with:
    python main.py
"""

from ui.app import LogAnalyzerApp

if __name__ == "__main__":
    LogAnalyzerApp()
    
# TODO: ADD A CONFIG BUTTON TO REMOVE THE LOGCACHE AS FAIL SAFE. ALSO PRINT IN CONSOLE IF CACHE IS PRESENT FOR ANY FILE
# TODO: BATCH_SIZE is to be added to config buttons list
# TODO: RETENTION_WINDOW_SECONDS is to be added to buttons list
# TODO: Number of times reset happened.