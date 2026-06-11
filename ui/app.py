import tkinter as tk
from . import style, config, dialogs
from .state import AppState
from .services import ExtractionService, ProcessingService
from .components import ProgressIndicator, ConsoleOutput
from .pages import FilePage, TaskPage, GraphPage

class LogAnalyzerApp:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("NMEA Log Analyzer")
        self.root.geometry("1000x600")
        self.root.minsize(800, 400)
        self.root.configure(bg=style.COLORS['bg_dark'])

        self.state = AppState()
        self.processing_service = ProcessingService()
        self.extraction_service = ExtractionService()
        self.current_page = None
        self.current_page_instance = None
        self._setup_top_bar()
        self._setup_main_layout()
        self.navigate_to_file_page()
        self.root.mainloop()

    def _setup_top_bar(self):
        top = tk.Frame(self.root, bg=style.COLORS['bg_dark'], height=40)
        top.pack(fill='x', side='top')
        top.pack_propagate(False)
        
        self.title_label = tk.Label(top, text="NMEA Log Analyzer", fg=style.COLORS['accent'], bg=style.COLORS['bg_dark'],
                            font=('Segoe UI', 12, 'bold'))
        self.title_label.pack(side='left', padx=15)
        self.theme_btn = tk.Button(top, text="🌙 Dark", command=self._toggle_theme,
            bg=style.COLORS['bg_card_light'], fg=style.COLORS['text_primary'],
            activebackground=style.COLORS['accent'], relief='flat', cursor='hand2', padx=10)
        self.theme_btn.pack(side='right', padx=15)

    def _setup_main_layout(self):
        main_container = tk.Frame(self.root, bg=style.COLORS['bg_dark'])
        main_container.pack(fill='both', expand=True)
        self.content_frame = tk.Frame(main_container, bg=style.COLORS['bg_card'])
        self.content_frame.pack(fill='both', expand=True)
        self.progress = ProgressIndicator(main_container)
        self.progress.pack(fill='x', side='bottom')
        self.console = ConsoleOutput(main_container)
        self.console.pack(fill='x', side='bottom')
        self.console.toggle()

    def _toggle_theme(self):
        current = style.get_current_theme()
        new = 'light' if current == 'dark' else 'dark'
        style.set_theme(new)
        self.root.configure(bg=style.COLORS['bg_dark'])
        if hasattr(self, 'title_label'):
            self.title_label.configure(bg=style.COLORS['bg_dark'])
        for child in self.root.winfo_children():
            if isinstance(child, tk.Frame):
                child.configure(bg=style.COLORS['bg_dark'])
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

    def _load_page(self, page_class):
        self._clear_content()
        self.current_page_instance = page_class(self.content_frame, self)
        self.current_page_instance.pack(fill='both', expand=True)
        self.current_page = page_class

    def navigate_to_file_page(self):
        self.state.clear_navigation()
        self._load_page(FilePage)
        self.progress.set_text("Ready")
        self.console.write("✓ Ready to load file")
        if not self.console._expanded:
            self.console.toggle()

    def navigate_to_task_page(self):
        if not self.state.file_paths:
            dialogs.show_warning("No File", "Please load a file first.", parent=self.root)
            return None
        self._load_page(TaskPage)
        self.progress.set_text("Select a task")
        if self.console._expanded:
            self.console.toggle()

    def navigate_to_graph_page(self, task_index):
        self.state.set_task(task_index)
        self._load_page(GraphPage)
        self.progress.set_text(f"Executing: {config.TASKS[task_index]}")
        self.console.write(f"▶ Starting task: {config.TASKS[task_index]}")
        if self.console._expanded:
            self.console.toggle()

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
            dialogs.show_error("Processing Error", err, parent=self.root)

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