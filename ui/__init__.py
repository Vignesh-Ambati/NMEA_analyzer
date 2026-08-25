# ui/__init__.py
"""
Order of imports is mandatory.
Priority is as follows:
                    1. Base Level(No dependencies on other files)
                    2. Mid Level(Can depend on Base Level)
                    3. High Level(Can depend on above two)
                    4. Top Level(Depends on all the above)
"""

from . import config as _UiCofigurationPage
from . import style as _UiStylingPage
from .state import AppState

from .components import ThemedButton, ThemedLabel, ThemedFrame, ThemedEntry, FileInputFrame, ScrollableFrame, ProgressIndicator, TaskCard, ConsoleOutput, InteractivePlotCanvas, MessageBox, FileDialog, ColorChooser
from . import dialogs as _UiDialoguesPage
from .services import LogService, ProcessingService, ExtractionService

from .pages import BasePage, FilePage, TaskPage, GraphPage

from .app import LogAnalyzerApp