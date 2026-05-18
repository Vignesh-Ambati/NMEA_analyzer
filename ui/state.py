"""
ui/state.py
───────────
Application state management.
"""

from dataclasses import dataclass, field
from typing import Optional, Any, List


@dataclass
class AppState:
    """
    Central application state container.
    
    Attributes:
        file_path: Currently loaded log file path
        cache: Data cache object from core
        current_task: Index of currently selected task
        plot_data: Current plot data
        navigation_stack: Navigation history
    """
    
    file_path: str = ""
    cache: Optional[Any] = None
    current_task: Optional[int] = None
    plot_data: Optional[Any] = None
    navigation_stack: List[str] = field(default_factory=list)
    
    def reset(self):
        """Reset state to initial values."""
        self.file_path = ""
        self.cache = None
        self.current_task = None
        self.plot_data = None
        self.navigation_stack = []
    
    def set_file(self, path: str):
        """Set the current file path."""
        self.file_path = path
    
    def set_cache(self, cache: Any):
        """Set the data cache."""
        self.cache = cache
    
    def set_task(self, task_index: int):
        """Set the current task."""
        self.current_task = task_index
    
    def set_plot_data(self, data: Any):
        """Set the current plot data."""
        self.plot_data = data
    
    def push_navigation(self, page_name: str):
        """Push a page onto the navigation stack."""
        self.navigation_stack.append(page_name)
    
    def pop_navigation(self) -> Optional[str]:
        """Pop a page from the navigation stack."""
        if self.navigation_stack:
            return self.navigation_stack.pop()
        return None
    
    def clear_navigation(self):
        """Clear navigation history."""
        self.navigation_stack.clear()
