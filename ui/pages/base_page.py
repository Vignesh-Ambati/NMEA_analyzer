"""
ui/pages/base_page.py
─────────────────────
Base page class for all pages.
"""

import tkinter as tk
from .. import style


class BasePage(tk.Frame):
    """
    Base class for all pages in the application.
    
    Provides:
    - Common page interface (setup_ui)
    - Access to application controller
    - Consistent styling
    """
    
    def __init__(self, parent, controller, **kwargs):
        """
        Initialize a page.
        
        Args:
            parent: Parent widget (usually the content frame)
            controller: Main application controller
            **kwargs: Additional frame parameters
        """
        super().__init__(
            parent,
            bg=style.COLORS['bg_card'],
            **kwargs
        )
        
        self.controller = controller
        self.setup_ui()
    
    def setup_ui(self):
        """
        Build the page UI.
        
        Override in subclasses to implement page-specific layout.
        """
        pass