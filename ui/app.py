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
        self.top_bar = ThemedFrame(self.root, height=52, bg=_UiStylingPage.COLORS['bg_dark'])
        self.top_bar.pack(fill='x', side='top')
        self.top_bar.pack_propagate(False)
        
        divider = ThemedFrame(self.top_bar, bg=_UiStylingPage.COLORS['border'], height=1)
        divider.pack(fill='x', side='bottom')
        
        self.title_label = ThemedLabel(self.top_bar, text="NMEA Log Analyzer", fg=_UiStylingPage.COLORS['accent'], bg=_UiStylingPage.COLORS['bg_dark'],
                            font=_UiStylingPage.get_font(16, 'bold'))
        self.title_label.pack(side='left', padx=15, pady=(10, 8))
        
        self.theme_btn = ThemedButton(self.top_bar, text="  Dark", command=self._toggle_theme,
            is_primary=True, padx=18, pady=6)
        self.theme_btn.pack(side='right', padx=12, pady=(8, 8))

    def _initialize_app_state_from_config(self):
        self.state.debug_mode = _UiCofigurationPage.DEBUG_GRAPH
        self.state.progress_bar_visible = _UiCofigurationPage.DEBUG_PROGRESS_BAR_VISIBLE
        self.state.console_visible = _UiCofigurationPage.DEBUG_CONSOLE_VISIBLE

    def _setup_main_layout(self):
        main_container = ThemedFrame(self.root, bg=_UiStylingPage.COLORS['bg_dark'])
        main_container.pack(fill='both', expand=True)
        
        self.content_frame = ThemedFrame(main_container, frame_type='default')
        self.console = ConsoleOutput(main_container, app_controller=self)
        self.progress = ProgressIndicator(main_container)
        
        self._update_console_and_progress_placement()
        self.root.after(100, self._process_log_queue)

    def toggle_fullscreen(self, is_full: bool):
        """Globally handles hiding/restoring standard UI chrome for fullscreen modes."""
        self.state.is_fullscreen = is_full
        if is_full:
            self.top_bar.pack_forget()
        else:
            self.top_bar.pack(fill='x', side='top', before=self.content_frame.master)
        self._update_console_and_progress_placement()

    def _toggle_theme(self):
        current = _UiStylingPage.get_current_theme()
        new = 'light' if current == 'dark' else 'dark'
        
        # 1. Capture volatile UI state before the page rebuilds so it isn't lost
        volatile_state = {}
        if self.current_page == FilePage and self.current_page_instance:
            volatile_state['file_input'] = self.current_page_instance.file_input.get_value()
            if hasattr(self.current_page_instance, 'loading_animation') and self.current_page_instance.loading_animation.is_running:
                volatile_state['is_loading'] = True
                volatile_state['loading_text'] = self.current_page_instance.loading_animation.canvas.itemcget(self.current_page_instance.loading_animation.status_id, 'text')
                volatile_state['loading_pct'] = self.current_page_instance.loading_animation.progress_percentage

        elif self.current_page == TaskPage and self.current_page_instance:
            if hasattr(self.current_page_instance, 'loading_animation') and self.current_page_instance.loading_animation.is_running:
                volatile_state['is_loading'] = True
                volatile_state['loading_text'] = self.current_page_instance.loading_animation.canvas.itemcget(self.current_page_instance.loading_animation.status_id, 'text')
                volatile_state['loading_pct'] = self.current_page_instance.loading_animation.progress_percentage
                
        elif self.current_page == GraphPage and self.current_page_instance:
            volatile_state['target_view'] = self.current_page_instance.plotter.target_view.get()

        _UiStylingPage.set_theme(new)
        self.root.configure(bg=_UiStylingPage.COLORS['bg_dark'])
        
        if hasattr(self, 'title_label'):
            self.title_label.configure(bg=_UiStylingPage.COLORS['bg_dark'])
        for child in self.root.winfo_children():
            if isinstance(child, tk.Frame):
                child.configure(bg=_UiStylingPage.COLORS['bg_dark'])
                
        self.theme_btn.config(text="  Light" if new == 'light' else "  Dark")
        self.progress.update_theme()
        self.console.update_theme()
        
        if self.current_page:
            self._load_page(self.current_page)
            
        # 2. Restore the saved volatile UI state onto the newly styled page
        if self.current_page == FilePage and volatile_state:
            if volatile_state.get('file_input'):
                self.current_page_instance.file_input.set_value(volatile_state['file_input'])
            if volatile_state.get('is_loading'):
                self.current_page_instance.start_btn.config(state='disabled')
                self.current_page_instance.file_input.browse_btn.config(state='disabled')
                self.current_page_instance.loading_animation.start(volatile_state['loading_text'])
                self.current_page_instance.loading_animation.set_progress(volatile_state['loading_pct'])
                
        elif self.current_page == TaskPage and volatile_state:
            if volatile_state.get('is_loading'):
                self.current_page_instance.loading_animation.start(volatile_state['loading_text'])
                self.current_page_instance.loading_animation.set_progress(volatile_state['loading_pct'])
                
        elif self.current_page == GraphPage and volatile_state:
            if volatile_state.get('target_view'):
                self.current_page_instance.plotter.target_view.set(volatile_state['target_view'])
            
        self.console.write(f"  Switched to {new} theme")

    def _clear_content(self):
        if self.current_page_instance:
            self.current_page_instance.pack_forget()
            self.current_page_instance.destroy()

    def _update_content_frame_padding(self):
        bottom_pad = self.console._min_height if self.state.console_visible else 12
        self.content_frame.pack_configure(fill='both', expand=True, padx=12, pady=(0, bottom_pad))
        self._update_console_and_progress_placement()

    def _update_console_and_progress_placement(self):
        if getattr(self.state, 'is_fullscreen', False):
            self.progress.place_forget()
            self.console.place_forget()
            return

        progress_bar_fixed_height = 40
        progress_y_offset = 0
        console_y_offset = 0

        if self.state.progress_bar_visible:
            self.progress.place(relx=0, rely=1.0, relwidth=1.0, anchor='sw', height=progress_bar_fixed_height, x=0, width=0, y=progress_y_offset)
            console_y_offset = -progress_bar_fixed_height
        else:
            self.progress.place_forget()

        if self.state.console_visible:
            console_current_height = self.console._max_height if self.console._expanded else self.console._min_height
            self.console.place(relx=0, rely=1.0, relwidth=1.0, anchor='sw', height=console_current_height, x=0, width=0, y=console_y_offset)
        else:
            self.console.place_forget()

    def _toggle_progress_bar_visibility(self, visible: bool):
        self.state.progress_bar_visible = visible
        self._update_console_and_progress_placement()

    def _toggle_console_visibility(self, visible: bool):
        self.state.console_visible = visible
        self._update_content_frame_padding()

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
        self._update_content_frame_padding()
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
        if self.state.progress_bar_visible:
            self.state.progress_bar_visible = False
            self._toggle_progress_bar_visibility(False)
        self.state.set_task(task_index)
        self._load_page(GraphPage)
        self.progress.set_text(f"Executing: {_UiCofigurationPage.TASKS[task_index]}")
        self.console.write(f"  Starting task: {_UiCofigurationPage.TASKS[task_index]}")

    def _safe_ui_update(self, percentage: float, file_path: str):
        job_id = str(file_path)
        filename = file_path.split("/")[-1].split("\\")[-1]
        self.progress.set_job_progress(job_id, percentage, filename)
        
        # Route progress dynamically to any page with an active loading screen
        if hasattr(self.current_page_instance, 'loading_animation') and self.current_page_instance.loading_animation.is_running:
            self.current_page_instance.loading_animation.set_progress(percentage)

    def _safe_ui_complete(self, cache, file_path: str):
        job_id = str(file_path)
        filename = file_path.split("/")[-1].split("\\")[-1]
        
        self.progress.remove_job(job_id)
        self.state.add_cache(file_path, cache)
        self.console.write(f"  Processed {filename}")
        
        if cache and hasattr(cache, 'log_path'):
            self.console.write(f"  Cached: {cache.log_path}")
            
        if hasattr(self.current_page_instance, 'stop_loading_animation'):
            self.current_page_instance.stop_loading_animation()
            
        if self.current_page == FilePage:
            self.navigate_to_task_page()
        elif self.current_page == GraphPage:
            if hasattr(self.current_page_instance, 'plotter') and self.current_page_instance.plotter:
                if hasattr(self.current_page_instance, 'loading_animation'):
                    self.current_page_instance.loading_animation.start("Rendering plot...")
                self.current_page_instance.plotter.request_lod_data(initial_load=True)

    def _safe_ui_error(self, err: str, file_path: str):
        job_id = str(file_path)
        filename = file_path.split("/")[-1].split("\\")[-1]
        self.progress.remove_job(job_id)
        self.console.write(f"  Failed {filename}: {err}")
        
        if hasattr(self.current_page_instance, 'stop_loading_animation'):
            self.current_page_instance.stop_loading_animation()
            
        if not self.state.caches:
            _UiDialoguesPage.show_error("Processing Error", err, parent=self.root)

    def process_file(self, file_path):
        job_id = str(file_path)
        filename = file_path.split("/")[-1].split("\\")[-1]
        
        self.state.set_file(file_path)
        self.progress.add_job(job_id, filename)
        self.console.write(f"  Dispatching {filename} to background workers...")
        
        def safe_after(callback):
            try:
                if self.root.winfo_exists():
                    self.root.after(0, callback)
            except (RuntimeError, tk.TclError):
                pass
                
        cb_complete = lambda cache, path: safe_after(lambda: self._safe_ui_complete(cache, path))
        cb_error    = lambda err, path:   safe_after(lambda: self._safe_ui_error(err, path))
        cb_update   = lambda pct, path:   safe_after(lambda: self._safe_ui_update(pct, path))
        
        self.processing_service.process_file(
            file_path, 
            on_complete=cb_complete, 
            on_error=cb_error, 
            on_progress=cb_update
        )