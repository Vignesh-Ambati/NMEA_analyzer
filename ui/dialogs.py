"""
ui/dialogs.py
─────────────
Common dialog wrappers for alerts and file selection.
"""
from tkinter import messagebox, filedialog
from typing import Tuple, Union
from . import config

def show_warning(title: str, message: str, parent=None) -> bool:
    """Show a standard warning dialog."""
    return messagebox.showwarning(title, message, parent=parent)

def show_error(title: str, message: str, parent=None) -> bool:
    """Show an error dialog with a red cross icon."""
    return messagebox.showerror(title, message, parent=parent)

def show_info(title: str, message: str, parent=None) -> bool:
    """Show an informational dialog."""
    return messagebox.showinfo(title, message, parent=parent)

def ask_yes_no(title: str, message: str, parent=None) -> bool:
    """Show a yes/no confirmation dialog."""
    return messagebox.askyesno(title, message, parent=parent)

def ask_file(title: str = "Select NMEA Log File", parent=None) -> str:
    """
    Show a file dialog for selecting a SINGLE file.
    Returns the file path string, or an empty string if cancelled.
    """
    # Fallback to generic text files if SUPPORTED_EXTENSIONS isn't defined in config
    extensions = getattr(config, 'SUPPORTED_EXTENSIONS', [("Log Files", "*.log *.txt"), ("All Files", "*.*")])
    
    return filedialog.askopenfilename(
        title=title,
        filetypes=extensions,
        parent=parent,
    )

def ask_files(title: str = "Select Multiple NMEA Log Files", parent=None) -> Tuple[str, ...]:
    """
    Show a file dialog for selecting MULTIPLE files at once.
    Returns a tuple of file path strings, or an empty tuple if cancelled.
    """
    extensions = getattr(config, 'SUPPORTED_EXTENSIONS', [("Log Files", "*.log *.txt"), ("All Files", "*.*")])
    
    return filedialog.askopenfilenames(
        title=title,
        filetypes=extensions,
        parent=parent,
    )

def ask_save_file(title: str = "Save As", default_ext: str = ".png", parent=None) -> str:
    """
    Show a file dialog for saving a file (like an exported graph).
    """
    return filedialog.asksaveasfilename(
        title=title,
        defaultextension=default_ext,
        filetypes=[(f"{default_ext.upper()} File", f"*{default_ext}"), ("All Files", "*.*")],
        parent=parent,
    )