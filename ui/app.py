"""
ui/app.py
─────────
Main application controller.
"""

import tkinter as tk
from tkinter import ttk

from . import style, config, dialogs
from .state import AppState
from .services import ProcessingService
from .components import ProgressIndicator, ConsoleOutput
from .pages import FilePage, TaskPage, GraphPage


class LogAnalyzerApp:
    """
    Main application controller.
    
    Responsibilities:
    - Window management
    - Page navigation
    - State management
    - Backend integration
    """
    
    def __init__(self):
        """Initialize the application."""
        self.root = tk.Tk()
        self.root.title("ACCORD - NMEA Log Analyzer")
        self.root.geometry(f"{config.WINDOW_WIDTH}x{config.WINDOW_HEIGHT}")
        self.root.minsize(config.WINDOW_MIN_WIDTH, config.WINDOW_MIN_HEIGHT)
        self.root.resizable(True, True)
        
        # Application state
        self.state = AppState()
        
        # Services
        self.processing_service = ProcessingService()
        
        # UI state
        self.current_page = None
        self.current_page_instance = None
        
        # Setup UI
        self._setup_style()
        self._setup_layout()
        
        # Start with file page
        self.navigate_to_file_page()
        
        # Start event loop
        self.root.mainloop()
    
    # ── Style Setup ──────────────────────────────────────────────────────────
    
    def _setup_style(self):
        """Configure application styling."""
        style.setup_ttk_style()
    
    # ── Layout Setup ─────────────────────────────────────────────────────────
    
    def _setup_layout(self):
        """Setup main application layout."""
        # Main container
        self.container = tk.Frame(self.root, bg=style.COLORS['bg_dark'])
        self.container.pack(fill='both', expand=True)
        self.container.pack_propagate(False)
        
        # Content area
        self.content_frame = tk.Frame(self.container, bg=style.COLORS['bg_card'])
        self.content_frame.pack(fill='both', expand=True, padx=0, pady=0)
        
        # Console output
        self.console = ConsoleOutput(self.container)
        self.console.pack(fill='x', padx=config.SPACING['lg'], pady=config.SPACING['md'])
        
        # Progress indicator
        self.progress = ProgressIndicator(self.container)
        self.progress.pack(fill='x', padx=config.SPACING['lg'], pady=(0, config.SPACING['md']))
    
    # ── Navigation ───────────────────────────────────────────────────────────
    
    def _clear_content(self):
        """Clear current page."""
        if self.current_page_instance:
            self.current_page_instance.pack_forget()
            self.current_page_instance.destroy()
            self.current_page_instance = None
    
    def _load_page(self, page_class):
        """Load a new page."""
        self._clear_content()
        self.current_page_instance = page_class(self.content_frame, self)
        self.current_page_instance.pack(fill='both', expand=True)
        self.current_page = page_class
    
    def navigate_to_file_page(self):
        """Navigate to file selection page."""
        self.state.clear_navigation()
        self._load_page(FilePage)
        self.progress.set_text("Ready")
        self.console.write("✓ Ready to load file")
    
    def navigate_to_task_page(self):
        """Navigate to task selection page."""
        if not self.state.file_path:
            dialogs.show_warning(
                "No File Loaded",
                "Please load a file first.",
                parent=self.root,
            )
            return
        
        self._load_page(TaskPage)
        self.progress.set_text("Select a task")
    
    def navigate_to_graph_page(self, task_index: int):
        """Navigate to graph page for a specific task."""
        self._load_page(GraphPage)
        self.progress.set_text(f"Executing: {config.TASKS[task_index]}")
        self.console.write(f"▶ Starting task {task_index}: {config.TASKS[task_index]}")
    
    # ── File Processing ─────────────────────────────────────────────────────
    
    def process_file(self, file_path: str):
        """
        Process a NMEA log file.
        
        Args:
            file_path: Path to the log file
        """
        self.progress.set_text(f"Processing: {file_path}")
        self.progress.start()
        self.console.write(f"⏳ Processing file: {file_path}")
        
        def on_complete(cache):
            """Called when processing completes."""
            self.progress.stop()
            self.progress.set_text("Processing complete")
            self.state.set_cache(cache)
            self.console.write("✓ File processed successfully")
            self.navigate_to_task_page()
        
        def on_error(error_msg):
            """Called if processing fails."""
            self.progress.stop()
            self.progress.set_text("Error")
            self.console.write(f"✗ Error: {error_msg}")
            dialogs.show_error(
                "Processing Error",
                error_msg,
                parent=self.root,
            )
        
        self.processing_service.process_file(
            file_path,
            on_complete=on_complete,
            on_error=on_error,
        )


def main():
    """Entry point for the application."""
    app = LogAnalyzerApp()


if __name__ == '__main__':
    main()