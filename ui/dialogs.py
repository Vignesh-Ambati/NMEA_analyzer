"""
ui/dialogs.py
─────────────
Common dialog utilities.
"""

from tkinter import messagebox, filedialog
from . import config


def show_warning(title: str, message: str, parent=None) -> bool:
    """Show a warning dialog."""
    return messagebox.showwarning(title, message, parent=parent)


def show_error(title: str, message: str, parent=None) -> bool:
    """Show an error dialog."""
    return messagebox.showerror(title, message, parent=parent)


def show_info(title: str, message: str, parent=None) -> bool:
    """Show an info dialog."""
    return messagebox.showinfo(title, message, parent=parent)


def ask_yes_no(title: str, message: str, parent=None) -> bool:
    """Show a yes/no confirmation dialog."""
    return messagebox.askyesno(title, message, parent=parent)


def ask_file(title: str = "Select File", parent=None) -> str:
    """
    Show a file dialog.
    
    Returns:
        Selected file path or empty string if cancelled
    """
    return filedialog.askopenfilename(
        title=title,
        filetypes=config.SUPPORTED_EXTENSIONS,
        parent=parent,
    )


def ask_save_file(title: str = "Save As", parent=None) -> str:
    """
    Show a save file dialog.
    
    Returns:
        Selected file path or empty string if cancelled
    """
    return filedialog.asksaveasfilename(
        title=title,
        parent=parent,
    )
