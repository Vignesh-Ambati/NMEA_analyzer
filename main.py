
import sys
from pathlib import Path

if __name__ == "__main__":
    if __package__ is None:
        parent_dir = Path(__file__).resolve().parent.parent
        sys.path.insert(0, str(parent_dir))
        __package__ = Path(__file__).resolve().parent.name

    from . import pycache_config
    from . import LogAnalyzerApp

    LogAnalyzerApp()
    
# TODO: ADD A CONFIG BUTTON TO REMOVE THE LOGCACHE AS FAIL SAFE. ALSO PRINT IN CONSOLE IF CACHE IS PRESENT FOR ANY FILE
# TODO: BATCH_SIZE is to be added to config buttons list
# TODO: RETENTION_WINDOW_SECONDS is to be added to buttons list
# TODO: Number of times reset happened.
# TODO: Enable multi file processing.In infra it is possible but not in services, where it is restricted to only 1 file based on flag.
#       Make it such that it process multi files in batch and displays different progressbar for each with its label
# TODO: Integrate the KML file generation and google map plot

# BUG: Date in the parser has issues. similar to time. If date is gga is available out of corrupted messages instead of rmc or zda, we might have correct time, but date will still be 000000
# BUG: We are parsing and storing time. In case if the data is missing from vtg to vtg or gsa, with time now being not updated for few seconds, we have resolve this but needs to be tested

# TODO: Integrate the 🎨 Theme & Colors inside the UI itself.
# TODO: Matplotlib functions like:
        # 1.Home
        # 2.Search button with zooming-in in that section as rectangle
        # 3.Forward and Backward
        # 4.Moving a section without changing scale.
        # 5.Saving the image
        # 6.Configurations