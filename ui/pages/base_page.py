"""
ui/pages/base_page.py
─────────────────────
Base page class for all pages.
"""

from .. import ThemedFrame

class BasePage(ThemedFrame):
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
            frame_type='default',
            **kwargs
        )
        
        self.controller = controller
        self.setup_ui()
    
    def setup_ui(self):
        pass