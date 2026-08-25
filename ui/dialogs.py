"""
ui/dialogs.py
─────────────
Common dialog wrappers for alerts and file selection, using component classes.
"""
from typing import Tuple
from . import _UiCofigurationPage
from .components import MessageBox, FileDialog

def show_warning(title: str, message: str, parent=None) -> bool:
    """Show a standard warning dialog."""
    return MessageBox.show_warning(title, message, parent=parent)

def show_error(title: str, message: str, parent=None) -> bool:
    """Show an error dialog with a red cross icon."""
    return MessageBox.show_error(title, message, parent=parent)

def show_info(title: str, message: str, parent=None) -> bool:
    """Show an informational dialog."""
    return MessageBox.show_info(title, message, parent=parent)

def ask_yes_no(title: str, message: str, parent=None) -> bool:
    """Show a yes/no confirmation dialog."""
    return MessageBox.ask_yes_no(title, message, parent=parent)

def ask_file(title: str = "Select NMEA Log File", parent=None) -> str:
    """
    Show a file dialog for selecting a SINGLE file.
    Returns the file path string, or an empty string if cancelled.
    """
    extensions = getattr(_UiCofigurationPage, 'SUPPORTED_EXTENSIONS', [("Log Files", "*.log *.txt"), ("All Files", "*.*")])
    return FileDialog.ask_open_file(
        title=title,
        filetypes=extensions,
        parent=parent,
    )

def ask_files(title: str = "Select Multiple NMEA Log Files", parent=None) -> Tuple[str, ...]:
    """
    Show a file dialog for selecting MULTIPLE files at once.
    Returns a tuple of file path strings, or an empty tuple if cancelled.
    """
    extensions = getattr(_UiCofigurationPage, 'SUPPORTED_EXTENSIONS', [("Log Files", "*.log *.txt"), ("All Files", "*.*")])
    return FileDialog.ask_open_files(
        title=title,
        filetypes=extensions,
        parent=parent,
    )

def ask_save_file(title: str = "Save As", default_ext: str = ".png", parent=None) -> str:
    """
    Show a file dialog for saving a file (like an exported graph).
    """
    return FileDialog.ask_save_as_file(
        title=title,
        defaultextension=default_ext,
        filetypes=[(f"{default_ext.upper()} File", f"*{default_ext}"), ("All Files", "*.*")],
        parent=parent,
    )
