# accord_analyser/pages/base_page.py
"""Base class for all pages."""

import tkinter as tk
from ..constants import COLORS

class BasePage(tk.Frame):
    """Base class for pages; provides access to the main app controller."""

    def __init__(self, parent, controller, **kwargs):
        """
        :param parent: parent widget (usually the content frame)
        :param controller: the main App instance
        """
        super().__init__(parent, bg=COLORS['bg_card'], **kwargs)
        self.controller = controller
        self.setup_ui()

    def setup_ui(self):
        """Override in subclasses to build the page UI."""
        pass