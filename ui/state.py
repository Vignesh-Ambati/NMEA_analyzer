"""
ui/state.py
───────────
Application state management.
"""

from dataclasses import dataclass, field
from typing import Dict, Optional, Any, List


@dataclass
class AppState:
    file_paths: List[str] = field(default_factory=list)
    caches: Dict[str, Any] = field(default_factory=dict)
    current_task: Optional[int] = None
    plot_data: Optional[Any] = None
    navigation_stack: List[str] = field(default_factory=list)
    
    def reset(self):
        """Reset state to initial values."""
        self.file_paths.clear()
        self.caches.clear()
        self.current_task = None
        self.plot_data = None
        self.navigation_stack.clear()
    
    def set_file(self, path: str):
        if path not in self.file_paths:
            self.file_paths.append(path)
            
    def add_cache(self, path: str, cache: Any):
        self.caches[path] = cache
    
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
