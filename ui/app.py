import queue
import tkinter as tk

from . import (
    AppState,
    FilePage,
    GraphPage,
    TaskPage,
    _UiCofigurationPage,
    _UiDialoguesPage,
    _UiStylingPage,
    ConsoleOutput,
    ProgressIndicator,
    ThemedButton,
    ThemedFrame,
    ThemedLabel,
    ExtractionService,
    ProcessingService,
)

class LogAnalyzerApp:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("NMEA Log Analyzer")
        self.root.geometry("1000x600")
        self.root.minsize(800, 400)
        self.root.option_add("*Font", "Arial 10")
        self.root.option_add("*Button*Font", "Arial 10 bold")
        self.root.option_add("*Label*Font", "Arial 10")

        self.root.configure(bg=_UiStylingPage.COLORS['bg_dark'])

        self.state = AppState()
        self.processing_service = ProcessingService()
        self.extraction_service = ExtractionService()
        self.current_page = None
        self.current_page_instance = None
        self._setup_top_bar()
        self._initialize_app_state_from_config()
        self._setup_main_layout()
        self.navigate_to_file_page()
        self.root.mainloop()

    def _setup_top_bar(self):
        top = ThemedFrame(self.root, height=52, bg=_UiStylingPage.COLORS['bg_dark'])
        top.pack(fill='x', side='top')
        top.pack_propagate(False)

        divider = ThemedFrame(top, bg=_UiStylingPage.COLORS['border'], height=1)
        divider.pack(fill='x', side='bottom')

        self.title_label = ThemedLabel(top, text="NMEA Log Analyzer", fg=_UiStylingPage.COLORS['accent'], bg=_UiStylingPage.COLORS['bg_dark'],
                            font=_UiStylingPage.get_font(16, 'bold'))
        self.title_label.pack(side='left', padx=15, pady=(10, 8))

        self.theme_btn = ThemedButton(top, text="🌙 Dark", command=self._toggle_theme,
            is_primary=True, padx=18, pady=6)
        self.theme_btn.pack(side='right', padx=12, pady=(8, 8))

    def _initialize_app_state_from_config(self):
        # Sync initial debug states from config to app state
        self.state.debug_mode = _UiCofigurationPage.DEBUG_GRAPH
        self.state.progress_bar_visible = _UiCofigurationPage.DEBUG_PROGRESS_BAR_VISIBLE
        self.state.console_visible = _UiCofigurationPage.DEBUG_CONSOLE_VISIBLE

    def _setup_main_layout(self):
        main_container = ThemedFrame(self.root, bg=_UiStylingPage.COLORS['bg_dark'])
        main_container.pack(fill='both', expand=True)
        self.content_frame = ThemedFrame(main_container, frame_type='default')

        # Console and Progress are placed relative to main_container
        # The content_frame padding will be adjusted to avoid overlap
        self.console = ConsoleOutput(main_container, app_controller=self)
        self.progress = ProgressIndicator(main_container)
        
        self._update_console_and_progress_placement() # Initial placement
        self.root.after(100, self._process_log_queue)

    def _toggle_theme(self):
        current = _UiStylingPage.get_current_theme()
        new = 'light' if current == 'dark' else 'dark'
        _UiStylingPage.set_theme(new)
        self.root.configure(bg=_UiStylingPage.COLORS['bg_dark'])
        if hasattr(self, 'title_label'):
            self.title_label.configure(bg=_UiStylingPage.COLORS['bg_dark'])
        for child in self.root.winfo_children():
            if isinstance(child, tk.Frame):
                child.configure(bg=_UiStylingPage.COLORS['bg_dark'])
        self.theme_btn.config(text="☀️ Light" if new == 'light' else "🌙 Dark")
        self.progress.update_theme()
        self.console.update_theme()
        if self.current_page:
            self._load_page(self.current_page)
        self.console.write(f"✨ Switched to {new} theme")

    def _clear_content(self):
        if self.current_page_instance:
            self.current_page_instance.pack_forget()
            self.current_page_instance.destroy()

    def _update_content_frame_padding(self):
        """Adjusts content frame padding to avoid overlapping the console."""
        bottom_pad = self.console._min_height if self.state.console_visible else 12
        self.content_frame.pack_configure(fill='both', expand=True, padx=12, pady=(0, bottom_pad))
        self._update_console_and_progress_placement()

    def _update_console_and_progress_placement(self):
        """Manages the placement of the console and progress bar, allowing them to overlap."""
        progress_bar_fixed_height = 40 # Approximate height of the ProgressIndicator

        # Default y-offsets
        progress_y_offset = 0
        console_y_offset = 0

        # Handle progress bar visibility
        if self.state.progress_bar_visible:
            self.progress.place(relx=0, rely=1.0, relwidth=1.0, anchor='sw', height=progress_bar_fixed_height, x=0, width=0, y=progress_y_offset)
            console_y_offset = -progress_bar_fixed_height # Console goes above progress bar
        else:
            self.progress.place_forget()

        # Handle console visibility
        if self.state.console_visible:
            console_current_height = self.console._max_height if self.console._expanded else self.console._min_height
            self.console.place(relx=0, rely=1.0, relwidth=1.0, anchor='sw', height=console_current_height, x=0, width=0, y=console_y_offset)
        else:
            self.console.place_forget()

    def _toggle_progress_bar_visibility(self, visible: bool):
        """Toggles the visibility of the progress bar."""
        # This method is called when the button is clicked, update the state and then placement
        self.state.progress_bar_visible = visible
        self._update_console_and_progress_placement()

    def _toggle_console_visibility(self, visible: bool):
        """Toggles the visibility of the console."""
        self.state.console_visible = visible
        self._update_content_frame_padding() # This will also call the placement update

    def _process_log_queue(self) -> None:
        log_queue = getattr(self.processing_service, 'log_service', None)
        if log_queue is not None and log_queue.queue is not None:
            while True:
                try:
                    message = log_queue.queue.get_nowait()
                except queue.Empty:
                    break
                self.console.write(message)
        self.root.after(100, self._process_log_queue)

    def _load_page(self, page_class):
        self._clear_content()
        self.current_page_instance = page_class(self.content_frame, self)
        self.current_page_instance.pack(fill='both', expand=True)
        self._update_content_frame_padding() # Ensure padding is correct on every page load
        self.current_page = page_class

    def navigate_to_file_page(self):
        self.state.clear_navigation()
        self._load_page(FilePage)
        self.progress.set_text("Ready")

    def navigate_to_task_page(self):
        if not self.state.file_paths:
            _UiDialoguesPage.show_warning("No File", "Please load a file first.", parent=self.root)
            return None
        self._load_page(TaskPage)
        self.progress.set_text("Select a task")

    def navigate_to_graph_page(self, task_index):
        # Per requirement, always hide progress bar when entering graph view
        if self.state.progress_bar_visible:
            self.state.progress_bar_visible = False
            self._toggle_progress_bar_visibility(False)

        self.state.set_task(task_index)
        self._load_page(GraphPage)
        self.progress.set_text(f"Executing: {_UiCofigurationPage.TASKS[task_index]}")
        self.console.write(f"▶ Starting task: {_UiCofigurationPage.TASKS[task_index]}")

    def _safe_ui_update(self, percentage: float, file_path: str):
        job_id = str(file_path)
        filename = file_path.split("/")[-1].split("\\")[-1]
        self.progress.set_job_progress(job_id, percentage, filename)

    def _safe_ui_complete(self, cache, file_path: str):
        job_id = str(file_path)
        filename = file_path.split("/")[-1].split("\\")[-1]
        
        self.progress.remove_job(job_id)
        self.state.add_cache(file_path, cache)
        self.console.write(f"✓ Processed {filename}")
        
        if cache and hasattr(cache, 'log_path'):
            self.console.write(f"📁 Cached: {cache.log_path}")
            
        # Seamless Navigation Logic
        if self.current_page == FilePage:
            self.navigate_to_task_page()
        elif self.current_page == GraphPage:
            # If the user added a file while viewing a graph, force the graph to reload the new data instantly
            if hasattr(self.current_page_instance, 'plotter') and self.current_page_instance.plotter:
                self.current_page_instance.plotter.request_lod_data(initial_load=True)

    def _safe_ui_error(self, err: str, file_path: str):
        job_id = str(file_path)
        filename = file_path.split("/")[-1].split("\\")[-1]
        self.progress.remove_job(job_id)
        self.console.write(f"✗ Failed {filename}: {err}")
        # Only show a pop-up if they are trying to load their very first file
        if not self.state.caches:
            _UiDialoguesPage.show_error("Processing Error", err, parent=self.root)

    def process_file(self, file_path):
        job_id = str(file_path)
        filename = file_path.split("/")[-1].split("\\")[-1]
        
        self.state.set_file(file_path)
        self.progress.add_job(job_id, filename)
        self.console.write(f"⏳ Dispatching {filename} to background workers...")
        
        # Closures to trap the specific file path for thread-safe UI updates
        cb_complete = lambda cache, path: self.root.after(0, lambda: self._safe_ui_complete(cache, path))
        cb_error    = lambda err, path:   self.root.after(0, lambda: self._safe_ui_error(err, path))
        cb_update   = lambda pct, path:   self.root.after(0, lambda: self._safe_ui_update(pct, path))
        
        self.processing_service.process_file(
            file_path, 
            on_complete=cb_complete, 
            on_error=cb_error, 
            on_progress=cb_update
        )