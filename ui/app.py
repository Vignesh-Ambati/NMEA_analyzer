"""
ui/app.py
─────────
Main application class for ACCORD Log Analyser.

LogAnalyserApp owns the Tk root window and is responsible for:
  • Window / layout construction  (_setup_layout, _setup_header_content)
  • Page navigation               (_navigate, _go_back, _go_forward, _show_page)
  • Page builders                 (_file_page, _task_page, _graph_page)
  • Task dispatch                 (_run_task, _execute_task)
  • Plot controls                 (_toggle_grid, _autoscale, _save_figure,
                                   _export_csv)
  • Progress / status helpers     (_set_progress, _log_message,
                                   set_progress_visibility)

All widget-factory helpers live in ui.widgets.
All colour tokens live in ui.theme.
All plotting logic lives in ui.plot_helpers.
All NMEA processing lives in the core package.
"""

import sys
import csv
import threading
import tkinter as tk
from tkinter import ttk, filedialog, messagebox

from PIL import Image, ImageTk

import numpy as np

from .theme       import COLORS, setup_ttk_style
from .widgets     import (create_nav_button, create_action_button,
                          create_toolbar_button, create_sidebar_button)
from .plot_helpers import (MATPLOTLIB_AVAILABLE, PLOTLY_AVAILABLE,
                           embed_matplotlib, embed_plotly,
                           show_no_backend_message, show_error_message,
                           extract_plot_data, draw_plot_on_axis)

from core import process_nmea_file


class LogAnalyserApp:
    WIDTH  = 1000
    HEIGHT = 600

    TASKS = [
        "📈 Plot CByN0 from a log",
        "📊 Plot CByN0 from 2 logs",
        "⚙️ Analyze MIPS",
        "📍 Check for position losses",
        "🏔️ Plot altitude for a log",
        "🗻 Plot altitude for 2 logs",
        "🎯 Plot DOP for a log",
        "🎲 Plot DOP for 2 logs",
        "🔢 Plot SV count for fix",
        "🔣 Plot SV count for fix (2 logs)",
        "🔄 Number of times reset",
        "🛰️ SBAS use in the log",
        "📐 Plot statistics vs true values",
        "💨 Velocity Plot",
    ]

    # ── Bootstrap ────────────────────────────────────────────────────────────

    def __init__(self):
        self.root = tk.Tk()
        self.root.title("ACCORD - Log Analyser")
        self.root.geometry(f"{self.WIDTH}x{self.HEIGHT}")
        self.root.resizable(True, True)
        self.root.minsize(width=self.WIDTH, height=self.HEIGHT)

        self.colors = COLORS

        self.file_path  = ""
        self.data       = None
        self.back_stack    = []
        self.forward_stack = []
        self.cache = None

        # Plotting state
        self.current_plot_idx    = None
        self.console_frame_packed = True
        self.fig    = None
        self.ax     = None
        self.canvas = None
        self.grid_visible = True

        self._setup_style()
        self._setup_layout()
        self._navigate(self._file_page)
        self.root.mainloop()

    def _setup_style(self):
        self.style = ttk.Style()
        setup_ttk_style(self.style)

    # ── Layout ───────────────────────────────────────────────────────────────

    def _setup_layout(self):
        self.container = tk.Frame(self.root, bg=self.colors['bg_dark'])
        self.container.pack(fill="both", expand=True)

        # Header
        self.header = tk.Frame(self.container,
                               bg=self.colors['bg_card'],
                               highlightbackground=self.colors['border'],
                               highlightthickness=1,
                               height=85)
        self.header.pack(fill="x", pady=(0, 10))
        self.header.pack_propagate(False)
        self._setup_header_content()

        # Content area
        self.content = tk.Frame(self.container,
                                bg=self.colors['bg_card'],
                                highlightbackground=self.colors['border'],
                                highlightthickness=1)
        self.content.pack(fill="both", expand=True, padx=15, pady=(0, 5))

        # Console frame
        self.console_frame = tk.Frame(self.container, bg=self.colors['bg_input'])
        self.console_frame.pack(fill="x", padx=15, pady=(0, 10))

        console_header = tk.Frame(self.console_frame,
                                  bg=self.colors['bg_card_light'], height=22)
        console_header.pack(fill="x")
        console_header.pack_propagate(False)

        tk.Label(console_header,
                 text="⚡ CONSOLE OUTPUT",
                 fg=self.colors['accent_light'],
                 bg=self.colors['bg_card_light'],
                 font=("Segoe UI", 8, "bold")).pack(side="left", padx=15, pady=4)

        text_frame = tk.Frame(self.console_frame, bg=self.colors['bg_input'])
        text_frame.pack(fill="both", expand=True)

        scrollbar = tk.Scrollbar(text_frame,
                                 bg=self.colors['bg_card_light'],
                                 troughcolor=self.colors['bg_input'],
                                 activebackground=self.colors['accent'])
        scrollbar.pack(side="right", fill="y")

        self.log = tk.Text(text_frame,
                           bg=self.colors['bg_input'],
                           fg='#E5E9F0',
                           font=("Consolas", 8),
                           wrap=tk.WORD,
                           relief=tk.FLAT,
                           borderwidth=0,
                           padx=15,
                           pady=8,
                           yscrollcommand=scrollbar.set)
        self.log.pack(fill="both", expand=True)
        scrollbar.config(command=self.log.yview)

        # Progress bar
        self.progress_frame = tk.Frame(self.container,
                                       bg=self.colors['bg_dark'], height=25)
        self.progress_label = tk.Label(self.progress_frame,
                                       text="Ready",
                                       fg=self.colors['text_secondary'],
                                       bg=self.colors['bg_dark'],
                                       font=("Segoe UI", 8))
        self.progress_label.pack(side="left")

        self.progress = ttk.Progressbar(self.progress_frame,
                                        mode="determinate",
                                        length=200,
                                        style="Accent.Horizontal.TProgressbar")
        self.progress.pack(side="right", padx=(10, 0))
        self.set_progress_visibility(visible=True)

    def set_progress_visibility(self, visible=True):
        if visible:
            self.progress_frame.pack(fill="x", padx=15, pady=(2, 2),
                                     before=self.console_frame)
            self.progress_frame.pack_propagate(False)
        else:
            self.progress_frame.pack_forget()

        def _log_mousewheel(event):
            self.log.yview_scroll(int(-1 * (event.delta / 60)), "units")
            return "break"

        self.log.bind("<Enter>",
                      lambda e: self.log.bind_all("<MouseWheel>", _log_mousewheel))
        self.log.bind("<Leave>",
                      lambda e: self.log.unbind_all("<MouseWheel>"))

    # ── Header ───────────────────────────────────────────────────────────────

    def _setup_header_content(self):
        left_frame = tk.Frame(self.header, bg=self.colors['bg_card'])
        left_frame.pack(side="left", padx=15, pady=5, fill="y")

        try:
            logo_img = Image.open('Accord_logo.png')
            logo_img = logo_img.resize((95, 45), Image.Resampling.LANCZOS)
            self.logo_photo = ImageTk.PhotoImage(logo_img)
            tk.Label(left_frame, image=self.logo_photo,
                     bg=self.colors['bg_card']).pack(side="left", padx=(0, 15))
        except Exception:
            tk.Label(left_frame, text="ACCORD",
                     fg=self.colors['accent'], bg=self.colors['bg_card'],
                     font=("Segoe UI", 20, "bold")).pack(side="left", padx=(0, 15))

        title_frame = tk.Frame(left_frame, bg=self.colors['bg_card'])
        title_frame.pack(side="left")

        tk.Label(title_frame, text="ACCORD",
                 fg=self.colors['text_primary'], bg=self.colors['bg_card'],
                 font=("Segoe UI", 18, "bold")).pack(anchor="w")

        tk.Label(title_frame, text="Inspired to be innovative",
                 fg=self.colors['text_secondary'], bg=self.colors['bg_card'],
                 font=("Segoe UI", 8)).pack(anchor="nw")

        nav_frame = tk.Frame(self.header, bg=self.colors['bg_card'])
        nav_frame.pack(side="right", padx=30, pady=15)

        self.back_btn    = create_nav_button(nav_frame, "←", self._go_back)
        self.back_btn.pack(side="left", padx=2)
        self.forward_btn = create_nav_button(nav_frame, "→", self._go_forward)
        self.forward_btn.pack(side="left", padx=2)

        self.status_frame = tk.Frame(self.header, bg=self.colors['bg_card'])
        self.status_frame.pack(side="right", padx=30, pady=15)

        self.status_indicator = tk.Label(self.status_frame, text="●",
                                         fg=self.colors['success'],
                                         bg=self.colors['bg_card'],
                                         font=("Segoe UI", 14))
        self.status_indicator.pack(side="left", padx=(0, 8))

        self.status_text = tk.Label(self.status_frame, text="Ready",
                                    fg=self.colors['text_secondary'],
                                    bg=self.colors['bg_card'],
                                    font=("Segoe UI", 11))
        self.status_text.pack(side="left")

    # ── Navigation ────────────────────────────────────────────────────────────

    def _show_page(self, page):
        for w in self.content.winfo_children():
            w.destroy()

        self.fig    = None
        self.ax     = None
        self.canvas = None

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

    # ── File page ─────────────────────────────────────────────────────────────

    def _file_page(self, parent):
        main_frame = tk.Frame(parent, bg=self.colors['bg_card'], height=200)
        main_frame.pack(fill="x")
        main_frame.pack_propagate(False)

        left_frame = tk.Frame(main_frame, bg=self.colors['bg_card'], width=220)
        left_frame.pack(side="left", fill="y", padx=(20, 10), pady=10)
        left_frame.pack_propagate(False)

        tk.Label(left_frame, text="📊",
                 bg=self.colors['bg_card'], fg=self.colors['accent'],
                 font=("Segoe UI", 36)).pack(pady=(20, 2))
        tk.Label(left_frame, text="Log Analyser",
                 bg=self.colors['bg_card'], fg=self.colors['text_primary'],
                 font=("Segoe UI", 14, "bold")).pack()
        tk.Label(left_frame, text="GNSS Analysis Tool",
                 bg=self.colors['bg_card'], fg=self.colors['text_secondary'],
                 font=("Segoe UI", 9)).pack()

        right_frame = tk.Frame(main_frame, bg=self.colors['bg_card'])
        right_frame.pack(side="right", fill="both", expand=True,
                         padx=(10, 20), pady=10)

        file_card = tk.Frame(right_frame, bg=self.colors['bg_card_light'],
                             relief=tk.FLAT)
        file_card.pack(expand=True, fill="both")

        content_frame = tk.Frame(file_card, bg=self.colors['bg_card_light'])
        content_frame.pack(expand=True, fill="both", padx=20, pady=15)

        tk.Label(content_frame, text="Select Log File",
                 bg=self.colors['bg_card_light'], fg=self.colors['text_primary'],
                 font=("Segoe UI", 12, "bold")).pack(anchor="w")

        entry_frame = tk.Frame(content_frame, bg=self.colors['bg_card_light'])
        entry_frame.pack(fill="x", pady=(10, 12))

        entry_container = tk.Frame(entry_frame,
                                   bg='white',
                                   highlightbackground=self.colors['accent'],
                                   highlightthickness=2)
        entry_container.pack(side="left", fill="x", expand=True, padx=(0, 8))

        self.file_entry = tk.Entry(entry_container,
                                   bg='white', fg='black',
                                   insertbackground='black',
                                   relief=tk.FLAT,
                                   font=("Segoe UI", 10), bd=0)
        self.file_entry.pack(fill="both", expand=True, padx=10, pady=8)
        self.file_entry.insert(0, "No file selected")

        browse_btn = tk.Button(entry_frame,
                               text="Browse Files",
                               command=self._browse_file,
                               bg=self.colors['accent'], fg='white',
                               activebackground=self.colors['accent_light'],
                               activeforeground='white',
                               relief=tk.FLAT,
                               padx=15, pady=8,
                               font=("Segoe UI", 9, "bold"),
                               cursor="hand2", bd=0,
                               highlightthickness=2,
                               highlightbackground=self.colors['accent_dark'])
        browse_btn.pack(side="right")

        def browse_enter(e): browse_btn.configure(bg=self.colors['accent_light'])
        def browse_leave(e): browse_btn.configure(bg=self.colors['accent'])
        browse_btn.bind("<Enter>", browse_enter)
        browse_btn.bind("<Leave>", browse_leave)

        submit_btn = create_action_button(content_frame,
                                          "🚀 Start Analysis",
                                          self._start_processing,
                                          is_primary=True)
        submit_btn.pack(fill="x", ipady=8)

    def _browse_file(self):
        f = filedialog.askopenfilename(title="Select Log File",
                                       filetypes=[("All files", "*.*")])
        if f:
            self.file_path = f
            self.file_entry.config(state='normal')
            self.file_entry.delete(0, tk.END)
            self.file_entry.insert(0, f)

    def _start_processing(self):
        current_path = self.file_path or self.file_entry.get()
        if not current_path or current_path == "No file selected":
            messagebox.showwarning("Warning", "Please select a log file",
                                   parent=self.root)
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
            cache = process_nmea_file(self.file_path)
            self.cache = cache
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

    # ── Task page ─────────────────────────────────────────────────────────────

    def _task_page(self, parent):
        outer = tk.Frame(parent, bg=self.colors['bg_card'])
        outer.pack(fill="both", expand=True)

        header = tk.Frame(outer, bg=self.colors['bg_card'])
        header.pack(fill="x", padx=20, pady=(15, 10))

        tk.Label(header, text="Select Analysis Task",
                 fg=self.colors['text_primary'], bg=self.colors['bg_card'],
                 font=("Segoe UI", 14, "bold")).pack(side="left")
        tk.Label(header, text=f"  •  {len(self.TASKS)} tasks available",
                 fg=self.colors['text_muted'], bg=self.colors['bg_card'],
                 font=("Segoe UI", 10)).pack(side="left")

        analysis_frame = tk.Frame(outer, bg=self.colors['bg_card'])
        analysis_frame.pack(fill="both", expand=True, padx=10, pady=(0, 10))

        task_card = tk.Frame(analysis_frame,
                             bg=self.colors['bg_card_light'],
                             highlightbackground=self.colors['border'],
                             highlightthickness=1)
        task_card.pack(fill="both", expand=True)

        canvas = tk.Canvas(task_card, bg=self.colors['bg_card_light'],
                           highlightthickness=0)
        scrollable_frame = tk.Frame(canvas, bg=self.colors['bg_card_light'])
        canvas_window = canvas.create_window((0, 0), window=scrollable_frame,
                                              anchor="nw")

        def update_scroll_region(event=None):
            canvas.update_idletasks()
            canvas.configure(scrollregion=canvas.bbox("all"))

        scrollable_frame.bind("<Configure>", update_scroll_region)

        def on_canvas_configure(event):
            canvas.itemconfig(canvas_window, width=event.width)

        def _on_mousewheel(event):
            canvas.yview_scroll(int(-1 * (event.delta / 60)), "units")

        canvas.bind("<Enter>",
                    lambda e: canvas.bind_all("<MouseWheel>", _on_mousewheel))
        canvas.bind("<Leave>",
                    lambda e: canvas.unbind_all("<MouseWheel>"))

        # ── Card creation ────────────────────────────────────────────────────
        cards_data = []

        for i, task in enumerate(self.TASKS):
            task_card_btn = tk.Frame(scrollable_frame,
                                     bg=self.colors['bg_input'],
                                     highlightbackground=self.colors['border'],
                                     highlightthickness=1)
            inner = tk.Frame(task_card_btn, bg=self.colors['bg_input'],
                             padx=12, pady=10)
            inner.pack(fill="both", expand=True)

            icon_text = task.split()[0]
            task_name = " ".join(task.split()[1:])

            top_row = tk.Frame(inner, bg=self.colors['bg_input'])
            top_row.pack(fill="x", pady=(0, 8))

            tk.Label(top_row, text=icon_text,
                     fg=self.colors['accent'], bg=self.colors['bg_input'],
                     font=("Segoe UI", 18)).pack(side="left", padx=(0, 8))

            name_label = tk.Label(top_row, text=task_name,
                                   fg=self.colors['text_secondary'],
                                   bg=self.colors['bg_input'],
                                   font=("Segoe UI", 11, 'bold'),
                                   anchor="w", justify="left")
            name_label.pack(side="left", fill="x", expand=True)

            tk.Frame(inner, bg=self.colors['border'], height=1).pack(
                fill="x", pady=(0, 8))

            execute_btn = tk.Button(inner, text="▶ Run Analysis",
                                    command=lambda idx=i: self._run_task(idx),
                                    bg=self.colors['accent'], fg='white',
                                    activebackground=self.colors['accent_light'],
                                    activeforeground='white',
                                    font=("Segoe UI", 9, "bold"),
                                    relief=tk.FLAT, padx=12, pady=7,
                                    cursor="hand2", bd=0)
            execute_btn.pack(fill="x")

            def on_enter(e, btn=execute_btn):
                btn.configure(bg=self.colors['accent_light'])

            def on_leave(e, btn=execute_btn):
                btn.configure(bg=self.colors['accent'])

            def on_card_enter(e, card=task_card_btn):
                card.configure(highlightbackground=self.colors['accent'],
                               highlightthickness=2)

            def on_card_leave(e, card=task_card_btn):
                card.configure(highlightbackground=self.colors['border'],
                               highlightthickness=1)

            execute_btn.bind("<Enter>", on_enter)
            execute_btn.bind("<Leave>", on_leave)
            task_card_btn.bind("<Enter>", on_card_enter)
            task_card_btn.bind("<Leave>", on_card_leave)

            cards_data.append((task_card_btn, name_label))

        # ── Responsive grid engine ────────────────────────────────────────────
        MIN_CARD_WIDTH  = 220
        MIN_CARD_HEIGHT = 100
        PADDING         = 4
        MIN_COLS        = 4
        MAX_COLS        = 6

        layout_state = {
            "current_cols":     0,
            "current_width":    0,
            "resize_timer":     None,
            "last_layout_time": 0,
        }

        def calculate_columns(available_width):
            if available_width <= 1:
                return MIN_COLS
            usable_width = available_width - (2 * PADDING)
            return max(MIN_COLS,
                       min(MAX_COLS,
                           int(usable_width / (MIN_CARD_WIDTH + PADDING))))

        def perform_relayout(width, force=False):
            import time
            current_time = time.time()
            if not force and (current_time - layout_state["last_layout_time"]) < 0.05:
                return
            layout_state["last_layout_time"] = current_time

            cols = calculate_columns(width)
            if (not force
                    and cols == layout_state["current_cols"]
                    and width == layout_state["current_width"]):
                return

            layout_state["current_cols"]  = cols
            layout_state["current_width"] = width

            for widget, _ in cards_data:
                widget.grid_forget()
            for c in range(MAX_COLS + 2):
                scrollable_frame.grid_columnconfigure(c, weight=0,
                                                      uniform="", minsize=0)

            card_width = max(MIN_CARD_WIDTH,
                             (width - (cols + 1) * PADDING) // cols)

            for i, (widget, name_lbl) in enumerate(cards_data):
                widget.grid(row=i // cols, column=i % cols,
                            padx=PADDING // 2, pady=PADDING // 2,
                            sticky="nsew")

            for c in range(cols):
                scrollable_frame.grid_columnconfigure(
                    c, weight=1, uniform="col", minsize=card_width)

            num_rows = (len(cards_data) + cols - 1) // cols
            for r in range(num_rows):
                scrollable_frame.grid_rowconfigure(r, minsize=MIN_CARD_HEIGHT)

            label_wrap = max(MIN_CARD_WIDTH - 80, card_width - 80)
            for _, name_lbl in cards_data:
                name_lbl.configure(wraplength=label_wrap)

            scrollable_frame.update_idletasks()
            canvas.update_idletasks()
            update_scroll_region()

        def relayout(force=False):
            canvas.update_idletasks()
            task_card.update_idletasks()
            width = canvas.winfo_width()
            if width <= 1:
                width = task_card.winfo_width()
                if width <= 1:
                    return
            perform_relayout(width, force)

        def debounced_relayout(event=None, force=False):
            if layout_state["resize_timer"] is not None:
                try:
                    outer.after_cancel(layout_state["resize_timer"])
                except Exception:
                    pass
            layout_state["resize_timer"] = outer.after(
                30, lambda: relayout(force=force))

        def on_resize(event):
            on_canvas_configure(event)
            debounced_relayout(event, force=False)

        canvas.bind("<Configure>", on_resize)
        outer.bind("<Configure>", lambda e: debounced_relayout(force=True))

        canvas.pack(side="left", fill="both", expand=True)

        def initial_layout_sequence():
            outer.update_idletasks()
            relayout(force=True)
            outer.after(50,  lambda: relayout(force=True))
            outer.after(150, lambda: relayout(force=True))
            outer.after(300, lambda: relayout(force=True))

        outer.after(10, initial_layout_sequence)

    # ── Task execution ────────────────────────────────────────────────────────

    def _run_task(self, idx):
        self._log_message(f"🚀 Starting: {self.TASKS[idx]}")
        self.status_text.config(text="Running task...")
        self.status_indicator.config(fg=self.colors['warning'])
        threading.Thread(target=self._execute_task, args=(idx,),
                         daemon=True).start()

    def _execute_task(self, idx):
        try:
            if idx == 0:
                self.current_plot_idx = idx
                if self.cache is None:
                    self._log_message("⚠️ No data in cache — run analysis first.")
                    self.root.after(0, lambda: self.status_text.config(text="Ready"))
                    self.root.after(0, lambda: self.status_indicator.config(
                        fg=self.colors['success']))
                    return
                self.root.after(0, lambda: self._navigate(self._graph_page))
                self.root.after(0, lambda: self._log_message("✅ Rendering plot..."))
                self.root.after(200, lambda: self.status_text.config(text="Ready"))
                self.root.after(200, lambda: self.status_indicator.config(
                    fg=self.colors['success']))
            else:
                self.root.after(0, lambda: self._log_message(
                    f"⚠️ Task '{self.TASKS[idx]}' not implemented yet."))
                self.root.after(0, lambda: self.status_text.config(text="Ready"))
                self.root.after(0, lambda: self.status_indicator.config(
                    fg=self.colors['success']))
        except Exception as e:
            self._log_message(f"❌ Task failed: {str(e)}")
            self.root.after(0, lambda: self.status_text.config(text="Error"))
            self.root.after(0, lambda: self.status_indicator.config(
                fg=self.colors['error']))

    # ── Graph page ────────────────────────────────────────────────────────────

    def _graph_page(self, parent):
        self.progress_frame.pack_forget()

        main_container = tk.Frame(parent, bg=self.colors['bg_card'])
        main_container.pack(fill="both", expand=True)

        toolbar = tk.Frame(main_container, bg=self.colors['bg_card_light'],
                           height=60)
        toolbar.pack(fill="x", padx=10, pady=10)
        toolbar.pack_propagate(False)

        title_frame = tk.Frame(toolbar, bg=self.colors['bg_card_light'])
        title_frame.pack(side="left", fill="y", padx=15)

        title_text = (self.TASKS[self.current_plot_idx]
                      if self.current_plot_idx is not None else 'Graph View')
        tk.Label(title_frame, text=f"📊 {title_text}",
                 fg=self.colors['text_primary'], bg=self.colors['bg_card_light'],
                 font=("Segoe UI", 12, "bold")).pack(anchor="w")
        tk.Label(title_frame,
                 text="Interactive visualization with zoom and pan controls",
                 fg=self.colors['text_secondary'], bg=self.colors['bg_card_light'],
                 font=("Segoe UI", 9)).pack(anchor="w")

        btn_frame = tk.Frame(toolbar, bg=self.colors['bg_card_light'])
        btn_frame.pack(side="right", padx=15)
        create_toolbar_button(btn_frame, "← Back", self._go_back).pack(
            side="left", padx=3)

        content = tk.Frame(main_container, bg=self.colors['bg_card'])
        content.pack(fill="both", expand=True, padx=10, pady=(0, 10))

        plot_container = tk.Frame(content, bg=self.colors['bg_card'])
        plot_container.pack(side="left", fill="both", expand=True, padx=(0, 10))

        sidebar = tk.Frame(content, bg=self.colors['bg_card_light'], width=200)
        sidebar.pack(side="right", fill="y")
        sidebar.pack_propagate(False)

        self._setup_sidebar(sidebar)

        try:
            if PLOTLY_AVAILABLE:
                embed_plotly(plot_container, self.cache,
                             self.current_plot_idx, self._log_message)
            elif MATPLOTLIB_AVAILABLE:
                holder = {}
                embed_matplotlib(plot_container, holder,
                                 self.cache, self.current_plot_idx,
                                 self._log_message)
                self.fig    = holder.get('fig')
                self.ax     = holder.get('ax')
                self.canvas = holder.get('canvas')

                if self.canvas:
                    self.canvas.mpl_connect("scroll_event", self._on_scroll_zoom)
                    plot_container.bind("<Configure>", self._on_canvas_resize)
            else:
                show_no_backend_message(plot_container)
        except Exception as e:
            show_error_message(plot_container, str(e))

    # ── Plot interaction ──────────────────────────────────────────────────────

    def _on_scroll_zoom(self, event):
        try:
            if not event.inaxes:
                return
            base_scale = 1.2
            scale = (1 / base_scale if event.button == 'up'
                     else base_scale if event.button == 'down'
                     else None)
            if scale is None:
                return
            xlim  = self.ax.get_xlim()
            ylim  = self.ax.get_ylim()
            xdata = event.xdata or (xlim[0] + xlim[1]) / 2
            ydata = event.ydata or (ylim[0] + ylim[1]) / 2
            self.ax.set_xlim([xdata - (xdata - xlim[0]) * scale,
                              xdata + (xlim[1] - xdata) * scale])
            self.ax.set_ylim([ydata - (ydata - ylim[0]) * scale,
                              ydata + (ylim[1] - ydata) * scale])
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

    # ── Sidebar setup ─────────────────────────────────────────────────────────

    def _setup_sidebar(self, sidebar):
        tk.Label(sidebar, text="⚙️ Controls",
                 fg=self.colors['text_primary'], bg=self.colors['bg_card_light'],
                 font=("Segoe UI", 11, "bold")).pack(pady=(15, 10), padx=15,
                                                     anchor="w")
        tk.Frame(sidebar, bg=self.colors['border'], height=1).pack(
            fill="x", padx=15, pady=5)

        for label, cmd in [
            ("💾 Save Image",  self._save_figure),
            ("⊞ Toggle Grid", self._toggle_grid),
            ("↔ Auto Scale",  self._autoscale),
            ("📤 Export CSV",  self._export_csv),
            ("🔄 Refresh",     lambda: self._navigate(self._graph_page)),
        ]:
            create_sidebar_button(sidebar, label, cmd).pack(
                fill="x", padx=15, pady=5)

        tk.Frame(sidebar, bg=self.colors['border'], height=1).pack(
            fill="x", padx=15, pady=(15, 10))
        tk.Label(sidebar, text="💡 Tips",
                 fg=self.colors['text_primary'], bg=self.colors['bg_card_light'],
                 font=("Segoe UI", 10, "bold")).pack(pady=(0, 5), padx=15,
                                                     anchor="w")
        tk.Label(sidebar,
                 text="• Scroll to zoom\n• Click & drag to pan\n"
                      "• Use toolbar buttons\n  for more options",
                 fg=self.colors['text_secondary'], bg=self.colors['bg_card_light'],
                 font=("Segoe UI", 8), justify="left").pack(padx=15, pady=5,
                                                            anchor="w")

    # ── Plot controls ─────────────────────────────────────────────────────────

    def _toggle_grid(self):
        try:
            if self.ax:
                self.grid_visible = not self.grid_visible
                self.ax.grid(self.grid_visible, linestyle='--', alpha=0.3)
                if self.canvas:
                    self.canvas.draw_idle()
                self._log_message(
                    f"Grid {'enabled' if self.grid_visible else 'disabled'}")
        except Exception as e:
            self._log_message(f"⚠️ Grid toggle error: {e}")

    def _autoscale(self):
        try:
            if self.ax:
                self.ax.relim()
                self.ax.autoscale()
                if self.canvas:
                    self.canvas.draw_idle()
                self._log_message("✅ Plot auto-scaled")
        except Exception as e:
            self._log_message(f"⚠️ Autoscale error: {e}")

    def _save_figure(self):
        try:
            fname = filedialog.asksaveasfilename(
                defaultextension=".png",
                filetypes=[("PNG image", "*.png"), ("PDF document", "*.pdf"),
                           ("SVG vector", "*.svg"), ("All files", "*.*")])
            if not fname:
                return
            if self.fig and MATPLOTLIB_AVAILABLE:
                self.fig.savefig(fname, dpi=300, bbox_inches='tight',
                                 facecolor=self.colors['bg_card'])
                self._log_message(f"💾 Saved to {fname}")
                messagebox.showinfo("Success", f"Figure saved to:\n{fname}",
                                    parent=self.root)
            else:
                self._log_message("⚠️ No figure to save")
        except Exception as e:
            self._log_message(f"❌ Save error: {e}")
            messagebox.showerror("Error", f"Failed to save figure:\n{e}",
                                 parent=self.root)

    def _export_csv(self):
        try:
            if self.cache is None:
                messagebox.showwarning("Warning", "No data to export",
                                       parent=self.root)
                return
            fname = filedialog.asksaveasfilename(
                defaultextension=".csv",
                filetypes=[("CSV file", "*.csv"), ("All files", "*.*")])
            if not fname:
                return
            time_data, cno_data = extract_plot_data(self.cache, self._log_message)
            if time_data is not None and cno_data is not None:
                with open(fname, 'w', newline='') as f:
                    writer = csv.writer(f)
                    writer.writerow(['time', 'cno'])
                    for t, c in zip(time_data, cno_data):
                        writer.writerow([t, c])
                self._log_message(f"📤 Data exported to {fname}")
                messagebox.showinfo("Success", f"Data exported to:\n{fname}",
                                    parent=self.root)
            else:
                self._log_message("⚠️ No data to export")
        except Exception as e:
            self._log_message(f"❌ Export error: {e}")
            messagebox.showerror("Error", f"Failed to export data:\n{e}",
                                 parent=self.root)