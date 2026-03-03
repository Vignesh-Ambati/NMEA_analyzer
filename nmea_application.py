import sys
import tkinter as tk
from PIL import Image, ImageTk
from tkinter import ttk, filedialog, messagebox
import threading
from nmea_api import *

class LogAnalyserApp:
    WIDTH = 1000
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

    def __init__(self):
        self.root = tk.Tk()
        self.root.title("ACCORD - Log Analyser")
        self.root.geometry(f"{self.WIDTH}x{self.HEIGHT}")
        self.root.resizable(True, True)
        self.root.minsize(width= self.WIDTH, height=self.HEIGHT)

        self.colors = {
            'bg_dark': '#0A0F1E',
            'bg_card': '#1A2535',
            'bg_card_light': '#253241',
            'bg_input': '#0E1322',
            'accent': '#3B82F6',
            'accent_light': '#60A5FA',
            'accent_dark': '#2563EB',
            'success': '#10B981',
            'warning': '#F59E0B',
            'error': '#EF4444',
            'text_primary': '#FFFFFF',
            'text_secondary': '#CBD5E0',
            'text_muted': '#94A3B8',
            'border': '#2D3A4A'
        }

        self.file_path = ""
        self.data = None
        self.back_stack = []
        self.forward_stack = []

        self._setup_style()
        self._setup_layout()
        self._navigate(self._file_page)
        self.root.mainloop()

    def _setup_style(self):
        self.style = ttk.Style()
        self.style.theme_use('clam')

        self.style.configure('Accent.Horizontal.TProgressbar',
                           background=self.colors['accent'],
                           troughcolor=self.colors['bg_input'],
                           borderwidth=0,
                           thickness=4)

    def _setup_layout(self):
        """Setup compact layout with improved header"""
        self.container = tk.Frame(self.root, bg=self.colors['bg_dark'])
        self.container.pack(fill="both", expand=True)

        self.header = tk.Frame(self.container,
                              bg=self.colors['bg_card'],
                              highlightbackground=self.colors['border'],
                              highlightthickness=1,
                              height=85)
        self.header.pack(fill="x", pady=(0, 10))
        self.header.pack_propagate(False)

        self._setup_header_content()

        self.content = tk.Frame(self.container,
                               bg=self.colors['bg_card'],
                               highlightbackground=self.colors['border'],
                               highlightthickness=1)
        self.content.pack(fill="x", padx=15, pady=(0, 5))

        progress_frame = tk.Frame(self.container, bg=self.colors['bg_dark'], height=25)
        progress_frame.pack(fill="x", padx=15, pady=(2, 2))
        progress_frame.pack_propagate(False)

        self.progress_label = tk.Label(progress_frame,
                                      text="Ready",
                                      fg=self.colors['text_secondary'],
                                      bg=self.colors['bg_dark'],
                                      font=("Segoe UI", 8))
        self.progress_label.pack(side="left")

        self.progress = ttk.Progressbar(progress_frame,
                                       mode="determinate",
                                       length=200,
                                       style="Accent.Horizontal.TProgressbar")
        self.progress.pack(side="right", padx=(10, 0))

        console_frame = tk.Frame(self.container, bg=self.colors['bg_input'])
        console_frame.pack(fill="both", expand=True, padx=15, pady=(0, 10))

        console_header = tk.Frame(console_frame, bg=self.colors['bg_card_light'], height=22)
        console_header.pack(fill="x")
        console_header.pack_propagate(False)

        tk.Label(console_header,
                text="⚡ CONSOLE OUTPUT",
                fg=self.colors['accent_light'],
                bg=self.colors['bg_card_light'],
                font=("Segoe UI", 8, "bold")).pack(side="left", padx=15, pady=4)

        text_frame = tk.Frame(console_frame, bg=self.colors['bg_input'])
        text_frame.pack(fill="both", expand=True)

        scrollbar = tk.Scrollbar(text_frame, bg=self.colors['bg_card_light'],
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

        def _log_mousewheel(event):
            self.log.yview_scroll(int(-1 * (event.delta / 60)), "units")
            return "break"

        self.log.bind("<Enter>", lambda e: self.log.bind_all("<MouseWheel>", _log_mousewheel))
        self.log.bind("<Leave>", lambda e: self.log.unbind_all("<MouseWheel>"))

        self._redirect_print()

    def _setup_header_content(self):
        """Setup header with logo, title and navigation"""
        left_frame = tk.Frame(self.header, bg=self.colors['bg_card'])
        left_frame.pack(side="left", padx=15, pady=5, fill="y")

        try:
            logo_img = Image.open('Accord_logo.png')
            logo_img = logo_img.resize((95, 45), Image.Resampling.LANCZOS)
            self.logo_photo = ImageTk.PhotoImage(logo_img)
            logo_label = tk.Label(left_frame, image=self.logo_photo, bg=self.colors['bg_card'])
            logo_label.pack(side="left", padx=(0, 15))
        except:
            logo_text = tk.Label(left_frame,
                               text="ACCORD",
                               fg=self.colors['accent'],
                               bg=self.colors['bg_card'],
                               font=("Segoe UI", 20, "bold"))
            logo_text.pack(side="left", padx=(0, 15))

        title_frame = tk.Frame(left_frame, bg=self.colors['bg_card'])
        title_frame.pack(side="left")

        tk.Label(title_frame,
                text="ACCORD",
                fg=self.colors['text_primary'],
                bg=self.colors['bg_card'],
                font=("Segoe UI", 18, "bold")).pack(anchor="w")

        tk.Label(title_frame,
                text="Inspired to be innovative",
                fg=self.colors['text_secondary'],
                bg=self.colors['bg_card'],
                font=("Segoe UI", 8)).pack(anchor="nw")

        nav_frame = tk.Frame(self.header, bg=self.colors['bg_card'])
        nav_frame.pack(side="right", padx=30, pady=15)

        self.back_btn = self._create_nav_button(nav_frame, "←", self._go_back)
        self.back_btn.pack(side="left", padx=2)

        self.forward_btn = self._create_nav_button(nav_frame, "→", self._go_forward)
        self.forward_btn.pack(side="left", padx=2)

        self.status_frame = tk.Frame(self.header, bg=self.colors['bg_card'])
        self.status_frame.pack(side="right", padx=30, pady=15)

        self.status_indicator = tk.Label(self.status_frame,
                                        text="●",
                                        fg=self.colors['success'],
                                        bg=self.colors['bg_card'],
                                        font=("Segoe UI", 14))
        self.status_indicator.pack(side="left", padx=(0, 8))

        self.status_text = tk.Label(self.status_frame,
                                   text="Ready",
                                   fg=self.colors['text_secondary'],
                                   bg=self.colors['bg_card'],
                                   font=("Segoe UI", 11))
        self.status_text.pack(side="left")

    def _create_nav_button(self, parent, text, command):
        btn = tk.Button(parent,
                       text=text,
                       command=command,
                       bg=self.colors['bg_card_light'],
                       fg=self.colors['text_primary'],
                       activebackground=self.colors['accent'],
                       activeforeground='white',
                       font=("Segoe UI", 14, "bold"),
                       relief=tk.FLAT,
                       padx=15,
                       pady=5,
                       cursor="hand2",
                       bd=0,
                       highlightthickness=1,
                       highlightbackground=self.colors['border'])

        def on_enter(e): btn.configure(bg=self.colors['accent'])
        def on_leave(e): btn.configure(bg=self.colors['bg_card_light'])

        btn.bind("<Enter>", on_enter)
        btn.bind("<Leave>", on_leave)
        return btn

    def _create_action_button(self, parent, text, command, is_primary=False):
        bg_color = self.colors['accent'] if is_primary else self.colors['bg_card_light']
        hover_color = self.colors['accent_light'] if is_primary else self.colors['accent']

        btn = tk.Button(parent,
                       text=text,
                       command=command,
                       bg=bg_color,
                       fg='white',
                       activebackground=hover_color,
                       activeforeground='white',
                       font=("Segoe UI", 10, "bold"),
                       relief=tk.FLAT,
                       padx=20,
                       pady=12,
                       cursor="hand2",
                       bd=0,
                       highlightthickness=1,
                       highlightbackground=self.colors['border'])

        def on_enter(e): btn.configure(bg=hover_color)
        def on_leave(e): btn.configure(bg=bg_color)

        btn.bind("<Enter>", on_enter)
        btn.bind("<Leave>", on_leave)
        return btn

    def _redirect_print(self):
        class ConsoleWriter:
            def __init__(self, widget):
                self.widget = widget

            def write(self, text):
                self.widget.insert(tk.END, text)
                self.widget.see(tk.END)
                self.widget.update_idletasks()

            def flush(self):
                pass

        sys.stdout = ConsoleWriter(self.log)

    def _show_page(self, page):
        for w in self.content.winfo_children():
            w.destroy()
        page(self.content)

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

        icon_label = tk.Label(left_frame,
                             text="📊",
                             bg=self.colors['bg_card'],
                             fg=self.colors['accent'],
                             font=("Segoe UI", 36))
        icon_label.pack(pady=(20, 2))

        tk.Label(left_frame,
                 text="Log Analyser",
                 bg=self.colors['bg_card'],
                 fg=self.colors['text_primary'],
                 font=("Segoe UI", 14, "bold")).pack()

        tk.Label(left_frame,
                 text="GNSS Analysis Tool",
                 bg=self.colors['bg_card'],
                 fg=self.colors['text_secondary'],
                 font=("Segoe UI", 9)).pack()

        right_frame = tk.Frame(main_frame, bg=self.colors['bg_card'])
        right_frame.pack(side="right", fill="both", expand=True, padx=(10, 20), pady=10)

        file_card = tk.Frame(right_frame,
                           bg=self.colors['bg_card_light'],
                           relief=tk.FLAT)
        file_card.pack(expand=True, fill="both")

        content_frame = tk.Frame(file_card, bg=self.colors['bg_card_light'])
        content_frame.pack(expand=True, fill="both", padx=20, pady=15)

        tk.Label(content_frame,
                text="Select Log File",
                bg=self.colors['bg_card_light'],
                fg=self.colors['text_primary'],
                font=("Segoe UI", 12, "bold")).pack(anchor="w")

        entry_frame = tk.Frame(content_frame, bg=self.colors['bg_card_light'])
        entry_frame.pack(fill="x", pady=(10, 12))

        entry_container = tk.Frame(entry_frame,
                                  bg='white',
                                  highlightbackground=self.colors['accent'],
                                  highlightthickness=2)
        entry_container.pack(side="left", fill="x", expand=True, padx=(0, 8))

        self.file_entry = tk.Entry(entry_container,
                                  bg='white',
                                  fg='black',
                                  insertbackground='black',
                                  relief=tk.FLAT,
                                  font=("Segoe UI", 10),
                                  bd=0)
        self.file_entry.pack(fill="both", expand=True, padx=10, pady=8)
        self.file_entry.insert(0, "No file selected")

        browse_btn = tk.Button(entry_frame,
                              text="Browse Files",
                              command=self._browse_file,
                              bg=self.colors['accent'],
                              fg='white',
                              activebackground=self.colors['accent_light'],
                              activeforeground='white',
                              relief=tk.FLAT,
                              padx=15,
                              pady=8,
                              font=("Segoe UI", 9, "bold"),
                              cursor="hand2",
                              bd=0,
                              highlightthickness=2,
                              highlightbackground=self.colors['accent_dark'])
        browse_btn.pack(side="right")

        def browse_enter(e): browse_btn.configure(bg=self.colors['accent_light'])
        def browse_leave(e): browse_btn.configure(bg=self.colors['accent'])
        browse_btn.bind("<Enter>", browse_enter)
        browse_btn.bind("<Leave>", browse_leave)

        submit_btn = self._create_action_button(content_frame,
                                               "🚀 Start Analysis",
                                               lambda: self._start_processing(),
                                               is_primary=True)
        submit_btn.pack(fill="x", ipady=5)

    def _browse_file(self):
        f = filedialog.askopenfilename(
            title="Select Log File",
            filetypes=[("All files", "*.*")]
        )
        if f:
            self.file_path = f
            self.file_entry.config(state='normal')
            self.file_entry.delete(0, tk.END)
            self.file_entry.insert(0, f)
            # self.file_entry.config(state='readonly')

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
        self._set_progress(20)
        self._log_message("📂 Extracting data from log file...")

        try:
            cache = build_dataset(self.file_path)
            self.cache = cache

            self._set_progress(80)
            self._log_message("⏱️ Analyzing time jumps...")

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
        outer = tk.Frame(parent, bg=self.colors['bg_card'], height=200)
        outer.pack(fill="x")
        outer.pack_propagate(False)

        analysis_frame = tk.Frame(outer, bg=self.colors['bg_card'])
        analysis_frame.pack(side="right", fill="both", expand=True, padx=(10, 20), pady=10)

        task_card = tk.Frame(analysis_frame,
                            bg=self.colors['bg_card_light'],
                            relief=tk.FLAT)
        task_card.pack(expand=True, fill="both")

        canvas = tk.Canvas(task_card, bg=self.colors['bg_card_light'],
                        highlightthickness=0)
        scrollbar = ttk.Scrollbar(task_card, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas, bg=self.colors['bg_card_light'])

        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )

        canvas_window = canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")

        def on_canvas_configure(event):
            canvas.itemconfig(canvas_window, width=event.width)
        canvas.bind("<Configure>", on_canvas_configure)

        canvas.configure(yscrollcommand=scrollbar.set)

        def _on_mousewheel(event):
            canvas.yview_scroll(int(-1 * (event.delta / 60)), "units")
        def _bind_mousewheel(e):
            canvas.bind_all("<MouseWheel>", _on_mousewheel)
        def _unbind_mousewheel(e):
            canvas.unbind_all("<MouseWheel>")
        canvas.bind("<Enter>", _bind_mousewheel)
        canvas.bind("<Leave>", _unbind_mousewheel)

        COLS = 3
        cards = []
        for i, task in enumerate(self.TASKS):
            row = i // COLS
            col = i % COLS

            task_card_btn = tk.Frame(scrollable_frame,
                                    bg=self.colors['bg_input'],
                                    highlightbackground=self.colors['border'],
                                    highlightthickness=1)
            task_card_btn.grid(row=row, column=col, padx=3, pady=3, sticky="nsew")

            inner = tk.Frame(task_card_btn, bg=self.colors['bg_input'], padx=6, pady=6)
            inner.pack(fill="both", expand=True)

            icon_text = task.split()[0]
            task_name = " ".join(task.split()[1:])

            lbl = tk.Label(inner,
                        text=f"{icon_text} {task_name}",
                        fg=self.colors['text_secondary'],
                        bg=self.colors['bg_input'],
                        font=("Segoe UI", 12, 'bold'),
                        wraplength=1000,
                        anchor="w")
            lbl.pack(anchor="w", fill="x", pady=(0, 4))

            execute_btn = tk.Button(inner,
                                    text="▶ Run",
                                    command=lambda idx=i: self._run_task(idx),
                                    bg=self.colors['accent'],
                                    fg='white',
                                    activebackground=self.colors['accent_light'],
                                    activeforeground='white',
                                    font=("Segoe UI", 8, "bold"),
                                    relief=tk.FLAT,
                                    padx=8, pady=3,
                                    cursor="hand2",
                                    bd=0)
            execute_btn.pack(fill="x")

            def on_enter(e, btn=execute_btn):
                btn.configure(bg=self.colors['accent_light'])
            def on_leave(e, btn=execute_btn):
                btn.configure(bg=self.colors['accent'])

            execute_btn.bind("<Enter>", on_enter)
            execute_btn.bind("<Leave>", on_leave)

            cards.append(lbl)

        for c in range(COLS):
            scrollable_frame.grid_columnconfigure(c, weight=1, uniform="col")

        def update_wraplength(event=None):
            canvas_w = canvas.winfo_width()
            if canvas_w < 10:
                return
            card_w = (canvas_w // COLS) - 20
            for lbl in cards:
                lbl.configure(wraplength=card_w)

        canvas.bind("<Configure>", lambda e: (on_canvas_configure(e), update_wraplength(e)))

        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

        outer.after(100, update_wraplength)

    def _run_task(self, idx):
        self._log_message(f"🚀 Starting: {self.TASKS[idx]}")
        self.status_text.config(text="Running task...")
        self.status_indicator.config(fg=self.colors['warning'])

        threading.Thread(
            target=self._execute_task,
            args=(idx,),
            daemon=True
        ).start()

    def _execute_task(self, idx):
        try:
            # Map task index to plot function
            if idx == 0:               # Plot CByN0 from a log
                plot_func = plot_cno
            # elif idx == 3:              # Check for position losses (show position)
            #     plot_func = plot_position
            # elif idx == 4:              # Plot altitude for a log
            #     plot_func = plot_altitude
            # elif idx == 6:              # Plot DOP for a log
            #     plot_func = plot_dop
            # elif idx == 8:              # Plot SV count for fix
            #     plot_func = plot_sat
            # elif idx == 10:             # Number of times reset
            #     plot_func = plot_restarts
            # elif idx == 13:             # Velocity Plot
            #     plot_func = plot_velocity
            else:
                self.root.after(0, lambda: self._log_message(
                    f"⚠️ Task '{self.TASKS[idx]}' not implemented yet."))
                self.root.after(0, lambda: self.status_text.config(text="Ready"))
                self.root.after(0, lambda: self.status_indicator.config(
                    fg=self.colors['success']))
                return

            # Schedule the plot in the main thread
            self.root.after(0, lambda: plot_func(self.cache))
            self.root.after(0, lambda: self._log_message(
                f"✅ Task started: {self.TASKS[idx]}"))

            # Status will be updated after plot window closes (when plot returns)
            # But we set it to "Plotting..." during the plot
            self.root.after(0, lambda: self.status_text.config(text="Plotting..."))
            self.root.after(0, lambda: self.status_indicator.config(
                fg=self.colors['warning']))

            # After plot returns, reset status (using a short delay)
            self.root.after(100, lambda: self.status_text.config(text="Ready"))
            self.root.after(100, lambda: self.status_indicator.config(
                fg=self.colors['success']))

        except Exception as e:
            self._log_message(f"❌ Task failed: {str(e)}")
            self.root.after(0, lambda: self.status_text.config(text="Error"))
            self.root.after(0, lambda: self.status_indicator.config(
                fg=self.colors['error']))

if __name__ == "__main__":
    LogAnalyserApp()