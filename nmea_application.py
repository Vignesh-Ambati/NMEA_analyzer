import sys
import tkinter as tk
from PIL import Image, ImageTk
from tkinter import ttk, filedialog, messagebox
import threading
import numpy as np

try:
    import matplotlib; matplotlib.use('TkAgg')
    from matplotlib.figure import Figure
    from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg, NavigationToolbar2Tk
    MATPLOTLIB_AVAILABLE = True
except Exception as e:
    MATPLOTLIB_AVAILABLE = False
    print(f"⚠️ Matplotlib not available: {e}")

try:
    import plotly.graph_objs as go
    import plotly.io as pio
    PLOTLY_AVAILABLE = True
except Exception:
    PLOTLY_AVAILABLE = False

try:
    from tkinterweb import HtmlFrame
    TKINTERWEB_AVAILABLE = True
except Exception:
    TKINTERWEB_AVAILABLE = False

from nmea_api import *

class LogAnalyserApp:
    WIDTH = 1000
    HEIGHT = 600
    TASKS = [
        "📈 Plot CByN0 from a log", "📊 Plot CByN0 from 2 logs", "⚙️ Analyze MIPS",
        "📍 Check for position losses", "🏔️ Plot altitude for a log", "🗻 Plot altitude for 2 logs",
        "🎯 Plot DOP for a log", "🎲 Plot DOP for 2 logs", "🔢 Plot SV count for fix",
        "🔣 Plot SV count for fix (2 logs)", "🔄 Number of times reset", "🛰️ SBAS use in the log",
        "📐 Plot statistics vs true values", "💨 Velocity Plot",
    ]

    def __init__(self):
        self.root = tk.Tk()
        self.root.title("ACCORD - Log Analyser")
        self.root.geometry(f"{self.WIDTH}x{self.HEIGHT}")
        self.root.resizable(True, True)
        self.root.minsize(width=self.WIDTH, height=self.HEIGHT)
        self.colors = {
            'bg_dark': '#0A0F1E', 'bg_card': '#1A2535', 'bg_card_light': '#253241',
            'bg_input': '#0E1322', 'accent': '#3B82F6', 'accent_light': '#60A5FA',
            'accent_dark': '#2563EB', 'success': '#10B981', 'warning': '#F59E0B',
            'error': '#EF4444', 'text_primary': '#FFFFFF', 'text_secondary': '#CBD5E0',
            'text_muted': '#94A3B8', 'border': '#2D3A4A', 'hover': '#334155'
        }
        self.file_path = ""
        self.data = None
        self.back_stack = []
        self.forward_stack = []
        self.cache = None
        self.current_plot_idx = None
        self.console_frame_packed = True
        self.fig = self.ax = self.canvas = None
        self.grid_visible = True
        self._setup_style()
        self._setup_layout()
        self._navigate(self._file_page)
        self.root.mainloop()

    def _setup_style(self):
        self.style = ttk.Style()
        self.style.theme_use('clam')
        self.style.configure('Accent.Horizontal.TProgressbar',
                             background=self.colors['accent'], troughcolor=self.colors['bg_input'],
                             borderwidth=0, thickness=4)

    def _setup_layout(self):
        self.container = tk.Frame(self.root, bg=self.colors['bg_dark'])
        self.container.pack(fill="both", expand=True)
        self.header = tk.Frame(self.container, bg=self.colors['bg_card'],
                               highlightbackground=self.colors['border'], highlightthickness=1, height=85)
        self.header.pack(fill="x", pady=(0, 10))
        self.header.pack_propagate(False)
        self._setup_header_content()
        self.content = tk.Frame(self.container, bg=self.colors['bg_card'],
                                highlightbackground=self.colors['border'], highlightthickness=1)
        self.content.pack(fill="both", expand=True, padx=15, pady=(0, 5))
        self.console_frame = tk.Frame(self.container, bg=self.colors['bg_input'])
        self.console_frame.pack(fill="x", padx=15, pady=(0, 10))
        console_header = tk.Frame(self.console_frame, bg=self.colors['bg_card_light'], height=22)
        console_header.pack(fill="x")
        console_header.pack_propagate(False)
        tk.Label(console_header, text="⚡ CONSOLE OUTPUT", fg=self.colors['accent_light'],
                 bg=self.colors['bg_card_light'], font=("Segoe UI", 8, "bold")).pack(side="left", padx=15, pady=4)
        text_frame = tk.Frame(self.console_frame, bg=self.colors['bg_input'])
        text_frame.pack(fill="both", expand=True)
        scrollbar = tk.Scrollbar(text_frame, bg=self.colors['bg_card_light'],
                                 troughcolor=self.colors['bg_input'], activebackground=self.colors['accent'])
        scrollbar.pack(side="right", fill="y")
        self.log = tk.Text(text_frame, bg=self.colors['bg_input'], fg='#E5E9F0',
                           font=("Consolas", 8), wrap=tk.WORD, relief=tk.FLAT, borderwidth=0,
                           padx=15, pady=8, yscrollcommand=scrollbar.set)
        self.log.pack(fill="both", expand=True)
        scrollbar.config(command=self.log.yview)
        self.progress_frame = tk.Frame(self.container, bg=self.colors['bg_dark'], height=25)
        self.progress_label = tk.Label(self.progress_frame, text="Ready", fg=self.colors['text_secondary'],
                                       bg=self.colors['bg_dark'], font=("Segoe UI", 8))
        self.progress_label.pack(side="left")
        self.progress = ttk.Progressbar(self.progress_frame, mode="determinate", length=200,
                                        style="Accent.Horizontal.TProgressbar")
        self.progress.pack(side="right", padx=(10, 0))
        self.set_progress_visibility(visible=True)

    def set_progress_visibility(self, visible=True):
        if visible:
            self.progress_frame.pack(fill="x", padx=15, pady=(2, 2), before=self.console_frame)
            self.progress_frame.pack_propagate(False)
        else:
            self.progress_frame.pack_forget()

        def _log_mousewheel(event):
            self.log.yview_scroll(int(-1 * (event.delta / 60)), "units")
            return "break"

        self.log.bind("<Enter>", lambda e: self.log.bind_all("<MouseWheel>", _log_mousewheel))
        self.log.bind("<Leave>", lambda e: self.log.unbind_all("<MouseWheel>"))
        self._redirect_print()

    def _setup_header_content(self):
        left_frame = tk.Frame(self.header, bg=self.colors['bg_card'])
        left_frame.pack(side="left", padx=15, pady=5, fill="y")
        try:
            logo_img = Image.open('Accord_logo.png').resize((95, 45), Image.Resampling.LANCZOS)
            self.logo_photo = ImageTk.PhotoImage(logo_img)
            tk.Label(left_frame, image=self.logo_photo, bg=self.colors['bg_card']).pack(side="left", padx=(0, 15))
        except:
            tk.Label(left_frame, text="ACCORD", fg=self.colors['accent'], bg=self.colors['bg_card'],
                     font=("Segoe UI", 20, "bold")).pack(side="left", padx=(0, 15))
        title_frame = tk.Frame(left_frame, bg=self.colors['bg_card'])
        title_frame.pack(side="left")
        tk.Label(title_frame, text="ACCORD", fg=self.colors['text_primary'], bg=self.colors['bg_card'],
                 font=("Segoe UI", 18, "bold")).pack(anchor="w")
        tk.Label(title_frame, text="Inspired to be innovative", fg=self.colors['text_secondary'],
                 bg=self.colors['bg_card'], font=("Segoe UI", 8)).pack(anchor="nw")
        nav_frame = tk.Frame(self.header, bg=self.colors['bg_card'])
        nav_frame.pack(side="right", padx=30, pady=15)
        self.back_btn = self._create_nav_button(nav_frame, "←", self._go_back)
        self.back_btn.pack(side="left", padx=2)
        self.forward_btn = self._create_nav_button(nav_frame, "→", self._go_forward)
        self.forward_btn.pack(side="left", padx=2)
        self.status_frame = tk.Frame(self.header, bg=self.colors['bg_card'])
        self.status_frame.pack(side="right", padx=30, pady=15)
        self.status_indicator = tk.Label(self.status_frame, text="●", fg=self.colors['success'],
                                         bg=self.colors['bg_card'], font=("Segoe UI", 14))
        self.status_indicator.pack(side="left", padx=(0, 8))
        self.status_text = tk.Label(self.status_frame, text="Ready", fg=self.colors['text_secondary'],
                                    bg=self.colors['bg_card'], font=("Segoe UI", 11))
        self.status_text.pack(side="left")

    def _create_nav_button(self, parent, text, command):
        btn = tk.Button(parent, text=text, command=command, bg=self.colors['bg_card_light'],
                        fg=self.colors['text_primary'], activebackground=self.colors['accent'],
                        activeforeground='white', font=("Segoe UI", 14, "bold"), relief=tk.FLAT,
                        padx=15, pady=5, cursor="hand2", bd=0, highlightthickness=1,
                        highlightbackground=self.colors['border'])
        btn.bind("<Enter>", lambda e: btn.configure(bg=self.colors['accent']))
        btn.bind("<Leave>", lambda e: btn.configure(bg=self.colors['bg_card_light']))
        return btn

    def _create_action_button(self, parent, text, command, is_primary=False):
        bg_color = self.colors['accent'] if is_primary else self.colors['bg_card_light']
        hover_color = self.colors['accent_light'] if is_primary else self.colors['accent']
        btn = tk.Button(parent, text=text, command=command, bg=bg_color, fg='white',
                        activebackground=hover_color, activeforeground='white',
                        font=("Segoe UI", 10, "bold"), relief=tk.FLAT, padx=20, pady=12,
                        cursor="hand2", bd=0, highlightthickness=1, highlightbackground=self.colors['border'])
        btn.bind("<Enter>", lambda e: btn.configure(bg=hover_color))
        btn.bind("<Leave>", lambda e: btn.configure(bg=bg_color))
        return btn

    def _redirect_print(self):
        class ConsoleWriter:
            def __init__(self, widget):
                self.widget = widget
            def write(self, text):
                try:
                    self.widget.insert(tk.END, text)
                    self.widget.see(tk.END)
                    self.widget.update_idletasks()
                except: pass
            def flush(self): pass
        sys.stdout = ConsoleWriter(self.log)

    def _show_page(self, page):
        for w in self.content.winfo_children():
            w.destroy()
        self.fig = self.ax = self.canvas = None
        page(self.content)
        if page == self._graph_page:
            if self.console_frame.winfo_ismapped():
                self.console_frame.pack_forget()
                self.console_frame_packed = False
        else:
            if not self.console_frame.winfo_ismapped():
                self.console_frame.pack(fill="x", padx=15, pady=(0, 10))
                self.console_frame_packed = True

    def _navigate(self, page):
        self.back_stack.append(page)
        self.forward_stack.clear()
        self._show_page(page)

    def _go_back(self):
        if len(self.back_stack) > 1:
            self.forward_stack.append(self.back_stack.pop())
            self._show_page(self.back_stack[-1])

    def _go_forward(self):
        if self.forward_stack:
            page = self.forward_stack.pop()
            self.back_stack.append(page)
            self._show_page(page)

    def _file_page(self, parent):
        main_frame = tk.Frame(parent, bg=self.colors['bg_card'], height=200)
        main_frame.pack(fill="x")
        main_frame.pack_propagate(False)
        left_frame = tk.Frame(main_frame, bg=self.colors['bg_card'], width=220)
        left_frame.pack(side="left", fill="y", padx=(20, 10), pady=10)
        left_frame.pack_propagate(False)
        tk.Label(left_frame, text="📊", bg=self.colors['bg_card'], fg=self.colors['accent'],
                 font=("Segoe UI", 36)).pack(pady=(20, 2))
        tk.Label(left_frame, text="Log Analyser", bg=self.colors['bg_card'],
                 fg=self.colors['text_primary'], font=("Segoe UI", 14, "bold")).pack()
        tk.Label(left_frame, text="GNSS Analysis Tool", bg=self.colors['bg_card'],
                 fg=self.colors['text_secondary'], font=("Segoe UI", 9)).pack()
        right_frame = tk.Frame(main_frame, bg=self.colors['bg_card'])
        right_frame.pack(side="right", fill="both", expand=True, padx=(10, 20), pady=10)
        file_card = tk.Frame(right_frame, bg=self.colors['bg_card_light'], relief=tk.FLAT)
        file_card.pack(expand=True, fill="both")
        content_frame = tk.Frame(file_card, bg=self.colors['bg_card_light'])
        content_frame.pack(expand=True, fill="both", padx=20, pady=15)
        tk.Label(content_frame, text="Select Log File", bg=self.colors['bg_card_light'],
                 fg=self.colors['text_primary'], font=("Segoe UI", 12, "bold")).pack(anchor="w")
        entry_frame = tk.Frame(content_frame, bg=self.colors['bg_card_light'])
        entry_frame.pack(fill="x", pady=(10, 12))
        entry_container = tk.Frame(entry_frame, bg='white', highlightbackground=self.colors['accent'],
                                   highlightthickness=2)
        entry_container.pack(side="left", fill="x", expand=True, padx=(0, 8))
        self.file_entry = tk.Entry(entry_container, bg='white', fg='black', insertbackground='black',
                                   relief=tk.FLAT, font=("Segoe UI", 10), bd=0)
        self.file_entry.pack(fill="both", expand=True, padx=10, pady=8)
        self.file_entry.insert(0, "No file selected")
        browse_btn = tk.Button(entry_frame, text="Browse Files", command=self._browse_file,
                               bg=self.colors['accent'], fg='white', activebackground=self.colors['accent_light'],
                               activeforeground='white', relief=tk.FLAT, padx=15, pady=8,
                               font=("Segoe UI", 9, "bold"), cursor="hand2", bd=0,
                               highlightthickness=2, highlightbackground=self.colors['accent_dark'])
        browse_btn.pack(side="right")
        browse_btn.bind("<Enter>", lambda e: browse_btn.configure(bg=self.colors['accent_light']))
        browse_btn.bind("<Leave>", lambda e: browse_btn.configure(bg=self.colors['accent']))
        self._create_action_button(content_frame, "🚀 Start Analysis",
                                   self._start_processing, is_primary=True).pack(fill="x", ipady=8)

    def _browse_file(self):
        f = filedialog.askopenfilename(title="Select Log File", filetypes=[("All files", "*.*")])
        if f:
            self.file_path = f
            self.file_entry.config(state='normal')
            self.file_entry.delete(0, tk.END)
            self.file_entry.insert(0, f)

    def _start_processing(self):
        current_path = self.file_path or self.file_entry.get()
        if not current_path or current_path == "No file selected":
            messagebox.showwarning("Warning", "Please select a log file", parent=self.root)
            return
        self.file_path = current_path
        self.progress["value"] = 0
        self.progress_label.config(text="0%")
        self.status_text.config(text="Processing...")
        self.status_indicator.config(fg=self.colors['warning'])
        threading.Thread(target=self._process, daemon=True).start()

    def _process(self):
        try:
            self._set_progress(20)
            self._log_message("📂 Extracting data from log file...")
            self.cache = build_dataset(self.file_path)
            self._set_progress(80)
            self._log_message("⏱️ Analyzing data...")
            self._set_progress(100)
            self._log_message("✅ Analysis complete! Data ready for visualization.")
            self.root.after(0, lambda: self.progress_label.config(text="100%"))
            self.root.after(0, lambda: self.status_text.config(text="Ready"))
            self.root.after(0, lambda: self.status_indicator.config(fg=self.colors['success']))
            self.root.after(500, lambda: self._navigate(self._task_page))
        except Exception as e:
            self._log_message(f"❌ Error: {str(e)}")
            self.root.after(0, lambda: self.status_text.config(text="Error"))
            self.root.after(0, lambda: self.status_indicator.config(fg=self.colors['error']))

    def _set_progress(self, val):
        self.root.after(0, lambda: self.progress.config(value=val))
        self.root.after(0, lambda: self.progress_label.config(text=f"{val}%"))

    def _log_message(self, message):
        self.root.after(0, lambda: print(f"> {message}\n"))

    def _task_page(self, parent):
        outer = tk.Frame(parent, bg=self.colors['bg_card'])
        outer.pack(fill="both", expand=True)
        header = tk.Frame(outer, bg=self.colors['bg_card'])
        header.pack(fill="x", padx=20, pady=(15, 10))
        tk.Label(header, text="Select Analysis Task", fg=self.colors['text_primary'],
                 bg=self.colors['bg_card'], font=("Segoe UI", 14, "bold")).pack(side="left")
        tk.Label(header, text=f"  •  {len(self.TASKS)} tasks available", fg=self.colors['text_muted'],
                 bg=self.colors['bg_card'], font=("Segoe UI", 10)).pack(side="left")
        analysis_frame = tk.Frame(outer, bg=self.colors['bg_card'])
        analysis_frame.pack(fill="both", expand=True, padx=10, pady=(0, 10))
        task_card = tk.Frame(analysis_frame, bg=self.colors['bg_card_light'],
                             highlightbackground=self.colors['border'], highlightthickness=1)
        task_card.pack(fill="both", expand=True)
        canvas = tk.Canvas(task_card, bg=self.colors['bg_card_light'], highlightthickness=0)
        scrollable_frame = tk.Frame(canvas, bg=self.colors['bg_card_light'])
        canvas_window = canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")

        def update_scroll_region(event=None):
            canvas.update_idletasks()
            canvas.configure(scrollregion=canvas.bbox("all"))

        scrollable_frame.bind("<Configure>", update_scroll_region)
        canvas.bind("<Configure>", lambda e: canvas.itemconfig(canvas_window, width=e.width))

        def _on_mousewheel(event):
            canvas.yview_scroll(int(-1 * (event.delta / 60)), "units")

        canvas.bind("<Enter>", lambda e: canvas.bind_all("<MouseWheel>", _on_mousewheel))
        canvas.bind("<Leave>", lambda e: canvas.unbind_all("<MouseWheel>"))

        cards_data = []
        for i, task in enumerate(self.TASKS):
            icon_text = task.split()[0]
            task_name = " ".join(task.split()[1:])
            task_card_btn = tk.Frame(scrollable_frame, bg=self.colors['bg_input'],
                                     highlightbackground=self.colors['border'], highlightthickness=1)
            inner = tk.Frame(task_card_btn, bg=self.colors['bg_input'], padx=12, pady=10)
            inner.pack(fill="both", expand=True)
            top_row = tk.Frame(inner, bg=self.colors['bg_input'])
            top_row.pack(fill="x", pady=(0, 8))
            tk.Label(top_row, text=icon_text, fg=self.colors['accent'], bg=self.colors['bg_input'],
                     font=("Segoe UI", 18)).pack(side="left", padx=(0, 8))
            name_label = tk.Label(top_row, text=task_name, fg=self.colors['text_secondary'],
                                  bg=self.colors['bg_input'], font=("Segoe UI", 11, 'bold'),
                                  anchor="w", justify="left")
            name_label.pack(side="left", fill="x", expand=True)
            tk.Frame(inner, bg=self.colors['border'], height=1).pack(fill="x", pady=(0, 8))
            execute_btn = tk.Button(inner, text="▶ Run Analysis", command=lambda idx=i: self._run_task(idx),
                                    bg=self.colors['accent'], fg='white', activebackground=self.colors['accent_light'],
                                    activeforeground='white', font=("Segoe UI", 9, "bold"), relief=tk.FLAT,
                                    padx=12, pady=7, cursor="hand2", bd=0)
            execute_btn.pack(fill="x")
            execute_btn.bind("<Enter>", lambda e, b=execute_btn: b.configure(bg=self.colors['accent_light']))
            execute_btn.bind("<Leave>", lambda e, b=execute_btn: b.configure(bg=self.colors['accent']))
            task_card_btn.bind("<Enter>", lambda e, c=task_card_btn: c.configure(
                highlightbackground=self.colors['accent'], highlightthickness=2))
            task_card_btn.bind("<Leave>", lambda e, c=task_card_btn: c.configure(
                highlightbackground=self.colors['border'], highlightthickness=1))
            cards_data.append((task_card_btn, name_label))

        MIN_CARD_WIDTH, MIN_CARD_HEIGHT, PADDING, MIN_COLS, MAX_COLS = 220, 100, 4, 4, 6
        layout_state = {"current_cols": 0, "current_width": 0, "resize_timer": None, "last_layout_time": 0}

        def calculate_columns(available_width):
            if available_width <= 1: return MIN_COLS
            usable_width = available_width - (2 * PADDING)
            return max(MIN_COLS, min(MAX_COLS, int(usable_width / (MIN_CARD_WIDTH + PADDING))))

        def perform_relayout(width, force=False):
            import time
            current_time = time.time()
            if not force and (current_time - layout_state["last_layout_time"]) < 0.05: return
            layout_state["last_layout_time"] = current_time
            cols = calculate_columns(width)
            if not force and cols == layout_state["current_cols"] and width == layout_state["current_width"]: return
            layout_state["current_cols"] = cols
            layout_state["current_width"] = width
            for widget, _ in cards_data: widget.grid_forget()
            for c in range(MAX_COLS + 2): scrollable_frame.grid_columnconfigure(c, weight=0, uniform="", minsize=0)
            card_width = max(MIN_CARD_WIDTH, (width - (cols + 1) * PADDING) // cols)
            for i, (widget, name_lbl) in enumerate(cards_data):
                widget.grid(row=i // cols, column=i % cols, padx=PADDING // 2, pady=PADDING // 2, sticky="nsew")
            for c in range(cols): scrollable_frame.grid_columnconfigure(c, weight=1, uniform="col", minsize=card_width)
            num_rows = (len(cards_data) + cols - 1) // cols
            for r in range(num_rows): scrollable_frame.grid_rowconfigure(r, minsize=MIN_CARD_HEIGHT)
            label_wrap = max(MIN_CARD_WIDTH - 80, card_width - 80)
            for _, name_lbl in cards_data: name_lbl.configure(wraplength=label_wrap)
            scrollable_frame.update_idletasks()
            canvas.update_idletasks()
            update_scroll_region()

        def relayout(force=False):
            canvas.update_idletasks()
            task_card.update_idletasks()
            width = canvas.winfo_width()
            if width <= 1:
                width = task_card.winfo_width()
                if width <= 1: return
            perform_relayout(width, force)

        def debounced_relayout(event=None, force=False):
            if layout_state["resize_timer"] is not None:
                try: outer.after_cancel(layout_state["resize_timer"])
                except: pass
            layout_state["resize_timer"] = outer.after(30, lambda: relayout(force=force))

        def on_resize(event):
            canvas.itemconfig(canvas_window, width=event.width)
            debounced_relayout(event, force=False)

        canvas.bind("<Configure>", on_resize)
        outer.bind("<Configure>", lambda e: debounced_relayout(force=True))
        canvas.pack(side="left", fill="both", expand=True)

        def initial_layout_sequence():
            outer.update_idletasks()
            relayout(force=True)
            for delay in (50, 150, 300):
                outer.after(delay, lambda: relayout(force=True))

        outer.after(10, initial_layout_sequence)

    def _run_task(self, idx):
        self._log_message(f"🚀 Starting: {self.TASKS[idx]}")
        self.status_text.config(text="Running task...")
        self.status_indicator.config(fg=self.colors['warning'])
        threading.Thread(target=self._execute_task, args=(idx,), daemon=True).start()

    def _execute_task(self, idx):
        try:
            if idx == 0:
                self.current_plot_idx = idx
                if self.cache is None:
                    self._log_message("⚠️ No data in cache — run analysis first.")
                    self.root.after(0, lambda: self.status_text.config(text="Ready"))
                    self.root.after(0, lambda: self.status_indicator.config(fg=self.colors['success']))
                    return
                self.root.after(0, lambda: self._navigate(self._graph_page))
                self.root.after(0, lambda: self._log_message(f"✅ Rendering plot..."))
                self.root.after(200, lambda: self.status_text.config(text="Ready"))
                self.root.after(200, lambda: self.status_indicator.config(fg=self.colors['success']))
            else:
                self.root.after(0, lambda: self._log_message(f"⚠️ Task '{self.TASKS[idx]}' not implemented yet."))
                self.root.after(0, lambda: self.status_text.config(text="Ready"))
                self.root.after(0, lambda: self.status_indicator.config(fg=self.colors['success']))
        except Exception as e:
            self._log_message(f"❌ Task failed: {str(e)}")
            self.root.after(0, lambda: self.status_text.config(text="Error"))
            self.root.after(0, lambda: self.status_indicator.config(fg=self.colors['error']))

    def _graph_page(self, parent):
        self.progress_frame.pack_forget()
        main_container = tk.Frame(parent, bg=self.colors['bg_card'])
        main_container.pack(fill="both", expand=True)
        toolbar = tk.Frame(main_container, bg=self.colors['bg_card_light'], height=60)
        toolbar.pack(fill="x", padx=10, pady=10)
        toolbar.pack_propagate(False)
        title_frame = tk.Frame(toolbar, bg=self.colors['bg_card_light'])
        title_frame.pack(side="left", fill="y", padx=15)
        tk.Label(title_frame,
                 text=f"📊 {self.TASKS[self.current_plot_idx] if self.current_plot_idx is not None else 'Graph View'}",
                 fg=self.colors['text_primary'], bg=self.colors['bg_card_light'],
                 font=("Segoe UI", 12, "bold")).pack(anchor="w")
        tk.Label(title_frame, text="Interactive visualization with zoom and pan controls",
                 fg=self.colors['text_secondary'], bg=self.colors['bg_card_light'],
                 font=("Segoe UI", 9)).pack(anchor="w")
        btn_frame = tk.Frame(toolbar, bg=self.colors['bg_card_light'])
        btn_frame.pack(side="right", padx=15)
        self._create_toolbar_button(btn_frame, "← Back", self._go_back).pack(side="left", padx=3)
        content = tk.Frame(main_container, bg=self.colors['bg_card'])
        content.pack(fill="both", expand=True, padx=10, pady=(0, 10))
        plot_container = tk.Frame(content, bg=self.colors['bg_card'])
        plot_container.pack(side="left", fill="both", expand=True, padx=(0, 10))
        sidebar = tk.Frame(content, bg=self.colors['bg_card_light'], width=200)
        sidebar.pack(side="right", fill="y")
        sidebar.pack_propagate(False)
        self._setup_sidebar(sidebar)
        try:
            if PLOTLY_AVAILABLE: self._embed_plotly(plot_container)
            elif MATPLOTLIB_AVAILABLE: self._embed_matplotlib(plot_container)
            else: self._show_no_backend_message(plot_container)
        except Exception as e:
            self._show_error_message(plot_container, str(e))

    def _create_toolbar_button(self, parent, text, command):
        btn = tk.Button(parent, text=text, command=command, bg=self.colors['bg_card'],
                        fg=self.colors['text_primary'], activebackground=self.colors['hover'],
                        activeforeground='white', font=("Segoe UI", 9, "bold"), relief=tk.FLAT,
                        padx=12, pady=6, cursor="hand2", bd=0, highlightthickness=1,
                        highlightbackground=self.colors['border'])
        btn.bind("<Enter>", lambda e: btn.configure(bg=self.colors['hover']))
        btn.bind("<Leave>", lambda e: btn.configure(bg=self.colors['bg_card']))
        return btn

    def _setup_sidebar(self, sidebar):
        tk.Label(sidebar, text="⚙️ Controls", fg=self.colors['text_primary'],
                 bg=self.colors['bg_card_light'], font=("Segoe UI", 11, "bold")).pack(pady=(15, 10), padx=15, anchor="w")
        tk.Frame(sidebar, bg=self.colors['border'], height=1).pack(fill="x", padx=15, pady=5)
        for text, cmd in [("💾 Save Image", self._save_figure), ("⊞ Toggle Grid", self._toggle_grid),
                          ("↔ Auto Scale", self._autoscale), ("📤 Export CSV", self._export_csv),
                          ("🔄 Refresh", lambda: self._navigate(self._graph_page))]:
            self._create_sidebar_button(sidebar, text, cmd).pack(fill="x", padx=15, pady=5)
        tk.Frame(sidebar, bg=self.colors['border'], height=1).pack(fill="x", padx=15, pady=(15, 10))
        tk.Label(sidebar, text="💡 Tips", fg=self.colors['text_primary'],
                 bg=self.colors['bg_card_light'], font=("Segoe UI", 10, "bold")).pack(pady=(0, 5), padx=15, anchor="w")
        tk.Label(sidebar, text="• Scroll to zoom\n• Click & drag to pan\n• Use toolbar buttons\n  for more options",
                 fg=self.colors['text_secondary'], bg=self.colors['bg_card_light'],
                 font=("Segoe UI", 8), justify="left").pack(padx=15, pady=5, anchor="w")

    def _create_sidebar_button(self, parent, text, command):
        btn = tk.Button(parent, text=text, command=command, bg=self.colors['bg_card'],
                        fg=self.colors['text_secondary'], activebackground=self.colors['accent'],
                        activeforeground='white', font=("Segoe UI", 9), relief=tk.FLAT,
                        anchor="w", padx=10, pady=8, cursor="hand2", bd=0, highlightthickness=1,
                        highlightbackground=self.colors['border'])
        btn.bind("<Enter>", lambda e: btn.configure(bg=self.colors['accent'], fg='white'))
        btn.bind("<Leave>", lambda e: btn.configure(bg=self.colors['bg_card'], fg=self.colors['text_secondary']))
        return btn

    def _embed_matplotlib(self, parent):
        try:
            self.fig = Figure(figsize=(8, 6), dpi=100, facecolor=self.colors['bg_card'])
            self.ax = self.fig.add_subplot(111, facecolor=self.colors['bg_card_light'])
            self._draw_plot_on_axis(self.fig, self.ax)
            self.canvas = FigureCanvasTkAgg(self.fig, master=parent)
            self.canvas.draw()
            self.canvas.get_tk_widget().pack(fill="both", expand=True)
            toolbar_frame = tk.Frame(parent, bg=self.colors['bg_card_light'], height=40)
            toolbar_frame.pack(fill="x")
            NavigationToolbar2Tk(self.canvas, toolbar_frame).update()
            self.canvas.mpl_connect("scroll_event", self._on_scroll_zoom)
            parent.bind("<Configure>", self._on_canvas_resize)
            self._log_message("✅ Plot rendered successfully")
        except Exception as e:
            self._log_message(f"❌ Error rendering matplotlib plot: {e}")
            self._show_error_message(parent, str(e))

    def _on_scroll_zoom(self, event):
        try:
            if not event.inaxes: return
            scale = (1 / 1.2) if event.button == 'up' else 1.2 if event.button == 'down' else None
            if scale is None: return
            xlim, ylim = self.ax.get_xlim(), self.ax.get_ylim()
            xdata = event.xdata if event.xdata else (xlim[0] + xlim[1]) / 2
            ydata = event.ydata if event.ydata else (ylim[0] + ylim[1]) / 2
            self.ax.set_xlim([xdata - (xdata - xlim[0]) * scale, xdata + (xlim[1] - xdata) * scale])
            self.ax.set_ylim([ydata - (ydata - ylim[0]) * scale, ydata + (ylim[1] - ydata) * scale])
            self.canvas.draw_idle()
        except Exception as e:
            print(f"Scroll zoom error: {e}")

    def _on_canvas_resize(self, event):
        try:
            if self.fig and self.canvas:
                self.fig.tight_layout()
                self.canvas.draw_idle()
        except Exception as e:
            print(f"Resize error: {e}")

    def _draw_plot_on_axis(self, fig, ax):
        try:
            cache = self.cache or {}
            idx = self.current_plot_idx
            ax.clear()
            if idx == 0:
                time_data, cno_data = self._extract_plot_data(cache)
                if time_data is not None and cno_data is not None:
                    ax.plot(time_data, cno_data, color=self.colors['accent'], linewidth=1.5,
                            marker='o', markersize=3, alpha=0.8)
                    ax.set_title("C/N0 vs Time", color=self.colors['text_primary'], fontsize=14, fontweight='bold', pad=15)
                    ax.set_xlabel("Time", color=self.colors['text_secondary'], fontsize=10)
                    ax.set_ylabel("C/N0 (dB-Hz)", color=self.colors['text_secondary'], fontsize=10)
                else:
                    x = np.linspace(0, 200, 200)
                    y = 40 + 4 * np.sin(x / 12.0) + np.random.normal(scale=1.2, size=len(x))
                    ax.plot(x, y, color=self.colors['accent'], linewidth=1.5, marker='o', markersize=3, alpha=0.8)
                    ax.set_title("Sample C/N0 Data", color=self.colors['text_primary'], fontsize=14, fontweight='bold', pad=15)
                    ax.set_xlabel("Sample Index", color=self.colors['text_secondary'], fontsize=10)
                    ax.set_ylabel("C/N0 (dB-Hz)", color=self.colors['text_secondary'], fontsize=10)
                    self._log_message("⚠️ Using sample data (no cache data found)")
            else:
                x = np.linspace(0, 100, 100)
                ax.plot(x, np.cumsum(np.random.randn(100)), color=self.colors['accent'], linewidth=2)
                ax.set_title("Placeholder Plot", color=self.colors['text_primary'], fontsize=14, fontweight='bold')
                ax.set_xlabel("Index", color=self.colors['text_secondary'])
                ax.set_ylabel("Value", color=self.colors['text_secondary'])
            ax.tick_params(colors=self.colors['text_secondary'], labelsize=9)
            ax.grid(True, linestyle='--', alpha=0.3, color=self.colors['text_muted'])
            for spine in ax.spines.values(): spine.set_color(self.colors['border'])
            fig.tight_layout()
        except Exception as e:
            self._log_message(f"❌ Error drawing plot: {e}")
            ax.clear()
            ax.text(0.5, 0.5, f"Error: {str(e)}", transform=ax.transAxes,
                    ha='center', va='center', color=self.colors['error'])

    def _extract_plot_data(self, cache):
        time_data = cno_data = None
        try:
            for key in ['time', 'timestamp', 'times', 'Time', 'TIMESTAMP']:
                if key in cache:
                    time_data = np.asarray(cache[key]); break
            for key in ['cno', 'cn0', 'CByN0', 'c_by_n0', 'cbyn0', 'CNO', 'CN0']:
                if key in cache:
                    cno_data = np.asarray(cache[key]); break
            if cno_data is None:
                for key, value in cache.items():
                    try:
                        arr = np.asarray(value)
                        if arr.ndim == 1 and arr.size > 10 and np.issubdtype(arr.dtype, np.number):
                            if time_data is None or arr.size == time_data.size:
                                cno_data = arr; break
                    except: continue
            if time_data is not None and cno_data is not None and len(time_data) != len(cno_data):
                min_len = min(len(time_data), len(cno_data))
                time_data, cno_data = time_data[:min_len], cno_data[:min_len]
        except Exception as e:
            self._log_message(f"⚠️ Error extracting data: {e}")
            return None, None
        return time_data, cno_data

    def _embed_plotly(self, parent):
        try:
            fig = self._create_plotly_figure()
            if TKINTERWEB_AVAILABLE:
                html = pio.to_html(fig, include_plotlyjs='cdn', full_html=True)
                html_frame = HtmlFrame(parent, horizontal_scrollbar='auto')
                html_frame.set_content(html)
                html_frame.pack(fill='both', expand=True)
                self._log_message("✅ Interactive plot rendered (Plotly)")
            else:
                import webbrowser, tempfile
                html = pio.to_html(fig, include_plotlyjs='cdn', full_html=True)
                tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.html', mode='w')
                tmp.write(html); tmp.close()
                webbrowser.open(f'file://{tmp.name}')
                self._log_message("✅ Plot opened in browser")
                tk.Label(parent, text="Plot opened in your browser", fg=self.colors['accent'],
                         bg=self.colors['bg_card'], font=("Segoe UI", 12)).pack(expand=True)
        except Exception as e:
            self._log_message(f"❌ Plotly error: {e}")
            self._show_error_message(parent, str(e))

    def _create_plotly_figure(self):
        cache = self.cache or {}
        time_data, cno_data = self._extract_plot_data(cache)
        if time_data is not None and cno_data is not None:
            trace = go.Scatter(x=time_data, y=cno_data, mode='lines+markers', name='C/N0',
                               line=dict(color=self.colors['accent'], width=2), marker=dict(size=4))
            title, xlabel, ylabel = 'C/N0 vs Time', 'Time', 'C/N0 (dB-Hz)'
        else:
            x = np.linspace(0, 200, 200)
            y = 40 + 4 * np.sin(x / 12.0) + np.random.normal(scale=1.2, size=len(x))
            trace = go.Scatter(x=x, y=y, mode='lines+markers', name='Sample',
                               line=dict(color=self.colors['accent'], width=2), marker=dict(size=4))
            title, xlabel, ylabel = 'Sample C/N0 Data', 'Sample Index', 'C/N0 (dB-Hz)'
        layout = go.Layout(title=title,
                           xaxis=dict(title=xlabel, gridcolor=self.colors['border']),
                           yaxis=dict(title=ylabel, gridcolor=self.colors['border']),
                           paper_bgcolor=self.colors['bg_card'], plot_bgcolor=self.colors['bg_card_light'],
                           font=dict(color=self.colors['text_primary']), hovermode='closest')
        return go.Figure(data=[trace], layout=layout)

    def _show_no_backend_message(self, parent):
        frame = tk.Frame(parent, bg=self.colors['bg_card'])
        frame.pack(expand=True)
        tk.Label(frame, text="📊", fg=self.colors['error'], bg=self.colors['bg_card'],
                 font=("Segoe UI", 48)).pack(pady=(20, 10))
        tk.Label(frame, text="No Plotting Backend Available", fg=self.colors['error'],
                 bg=self.colors['bg_card'], font=("Segoe UI", 14, "bold")).pack(pady=5)
        tk.Label(frame, text="Please install matplotlib or plotly:\n\npip install matplotlib\nor\npip install plotly",
                 fg=self.colors['text_secondary'], bg=self.colors['bg_card'],
                 font=("Segoe UI", 10), justify="center").pack(pady=10)

    def _show_error_message(self, parent, error_msg):
        frame = tk.Frame(parent, bg=self.colors['bg_card'])
        frame.pack(expand=True)
        tk.Label(frame, text="⚠️", fg=self.colors['error'], bg=self.colors['bg_card'],
                 font=("Segoe UI", 48)).pack(pady=(20, 10))
        tk.Label(frame, text="Error Rendering Plot", fg=self.colors['error'],
                 bg=self.colors['bg_card'], font=("Segoe UI", 14, "bold")).pack(pady=5)
        tk.Label(frame, text=f"Details: {error_msg}", fg=self.colors['text_secondary'],
                 bg=self.colors['bg_card'], font=("Segoe UI", 9), wraplength=400).pack(pady=10)

    def _toggle_grid(self):
        try:
            if self.ax:
                self.grid_visible = not self.grid_visible
                self.ax.grid(self.grid_visible, linestyle='--', alpha=0.3)
                if self.canvas: self.canvas.draw_idle()
                self._log_message(f"Grid {'enabled' if self.grid_visible else 'disabled'}")
        except Exception as e:
            self._log_message(f"⚠️ Grid toggle error: {e}")

    def _autoscale(self):
        try:
            if self.ax:
                self.ax.relim(); self.ax.autoscale()
                if self.canvas: self.canvas.draw_idle()
                self._log_message("✅ Plot auto-scaled")
        except Exception as e:
            self._log_message(f"⚠️ Autoscale error: {e}")

    def _save_figure(self):
        try:
            fname = filedialog.asksaveasfilename(defaultextension=".png",
                filetypes=[("PNG image", "*.png"), ("PDF document", "*.pdf"),
                           ("SVG vector", "*.svg"), ("All files", "*.*")])
            if not fname: return
            if self.fig and MATPLOTLIB_AVAILABLE:
                self.fig.savefig(fname, dpi=300, bbox_inches='tight', facecolor=self.colors['bg_card'])
                self._log_message(f"💾 Saved to {fname}")
                messagebox.showinfo("Success", f"Figure saved to:\n{fname}", parent=self.root)
            else:
                self._log_message("⚠️ No figure to save")
        except Exception as e:
            self._log_message(f"❌ Save error: {e}")
            messagebox.showerror("Error", f"Failed to save figure:\n{e}", parent=self.root)

    def _export_csv(self):
        try:
            if self.cache is None:
                messagebox.showwarning("Warning", "No data to export", parent=self.root); return
            fname = filedialog.asksaveasfilename(defaultextension=".csv",
                filetypes=[("CSV file", "*.csv"), ("All files", "*.*")])
            if not fname: return
            time_data, cno_data = self._extract_plot_data(self.cache)
            if time_data is not None and cno_data is not None:
                import csv
                with open(fname, 'w', newline='') as f:
                    writer = csv.writer(f)
                    writer.writerow(['time', 'cno'])
                    for t, c in zip(time_data, cno_data): writer.writerow([t, c])
                self._log_message(f"📤 Data exported to {fname}")
                messagebox.showinfo("Success", f"Data exported to:\n{fname}", parent=self.root)
            else:
                self._log_message("⚠️ No data to export")
        except Exception as e:
            self._log_message(f"❌ Export error: {e}")
            messagebox.showerror("Error", f"Failed to export data:\n{e}", parent=self.root)


if __name__ == "__main__":
    LogAnalyserApp()