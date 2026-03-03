import sys
import os
import tkinter as tk
from PIL import Image, ImageTk
from tkinter import ttk, filedialog, messagebox
import threading

from nmea_api import mainfunction, extractAllData, findTimeJumps

class LogAnalyserApp:
    WIDTH = 1000
    HEIGHT = 500  # Reduced height

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

        # Modern color palette
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

    # ---------- Modern Styling ----------
    def _setup_style(self):
        self.style = ttk.Style()
        self.style.theme_use('clam')

        # Configure ttk styles
        self.style.configure('Accent.Horizontal.TProgressbar',
                           background=self.colors['accent'],
                           troughcolor=self.colors['bg_input'],
                           borderwidth=0,
                           thickness=4)

    # ---------- Layout ----------
    def _setup_layout(self):
        """Setup compact layout with improved header"""
        # Main container
        self.container = tk.Frame(self.root, bg=self.colors['bg_dark'])
        self.container.pack(fill="both", expand=True)

        # Improved Header (from UI copy 2)
        self.header = tk.Frame(self.container, 
                              bg=self.colors['bg_card'],
                              highlightbackground=self.colors['border'],
                              highlightthickness=1,
                              height=85)
        self.header.pack(fill="x", pady=(0, 20))
        self.header.pack_propagate(False)

        # Header content with logo and title
        self._setup_header_content()

        # Content area
        self.content = tk.Frame(self.container, 
                               bg=self.colors['bg_card'],
                               highlightbackground=self.colors['border'],
                               highlightthickness=1)
        self.content.pack(fill="both", expand=True, padx=15, pady=(0, 10))

        # Compact progress bar
        progress_frame = tk.Frame(self.container, bg=self.colors['bg_dark'], height=25)
        progress_frame.pack(fill="x", padx=15, pady=(5, 5))
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

        # Compact console
        console_frame = tk.Frame(self.container, bg=self.colors['bg_input'], height=80)
        console_frame.pack(fill="x", padx=15, pady=(0, 10))
        console_frame.pack_propagate(False)
        
        console_header = tk.Frame(console_frame, bg=self.colors['bg_card_light'], height=20)
        console_header.pack(fill="x")
        console_header.pack_propagate(False)
        
        tk.Label(console_header,
                text="⚡ CONSOLE OUTPUT",
                fg=self.colors['accent_light'],
                bg=self.colors['bg_card_light'],
                font=("Segoe UI", 8, "bold")).pack(side="left", padx=15, pady=4)
        
        self.log = tk.Text(console_frame,
                          height=3,
                          bg=self.colors['bg_input'],
                          fg='#E5E9F0',
                          font=("Consolas", 8),
                          wrap=tk.WORD,
                          relief=tk.FLAT,
                          borderwidth=0,
                          padx=15,
                          pady=10)
        self.log.pack(fill="both", expand=True)
        
        self._redirect_print()

    def _setup_header_content(self):
        """Setup header with logo, title and navigation (from UI copy 2)"""
        
        # Left side - Logo and title
        left_frame = tk.Frame(self.header, bg=self.colors['bg_card'])
        left_frame.pack(side="left", padx=15, pady=5, fill="y")
        
        # Try to load logo
        try:
            logo_img = Image.open('Accord_logo.png')
            logo_img = logo_img.resize((95, 45), Image.Resampling.LANCZOS)
            self.logo_photo = ImageTk.PhotoImage(logo_img)
            logo_label = tk.Label(left_frame, image=self.logo_photo, bg=self.colors['bg_card'])
            logo_label.pack(side="left", padx=(0, 15))
        except:
            # Fallback logo text
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
        
        # Navigation buttons
        nav_frame = tk.Frame(self.header, bg=self.colors['bg_card'])
        nav_frame.pack(side="right", padx=30, pady=15)
        
        self.back_btn = self._create_nav_button(nav_frame, "←", self._go_back)
        self.back_btn.pack(side="left", padx=2)
        
        self.forward_btn = self._create_nav_button(nav_frame, "→", self._go_forward)
        self.forward_btn.pack(side="left", padx=2)
        
        # Status indicator
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
        """Create a modern navigation button (from UI copy 2)"""
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
        
        def on_enter(e):
            btn.configure(bg=self.colors['accent'])
        def on_leave(e):
            btn.configure(bg=self.colors['bg_card_light'])
            
        btn.bind("<Enter>", on_enter)
        btn.bind("<Leave>", on_leave)
        return btn

    def _create_action_button(self, parent, text, command, is_primary=False):
        """Create a modern action button (from UI copy 2)"""
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
        
        def on_enter(e):
            btn.configure(bg=hover_color)
        def on_leave(e):
            btn.configure(bg=bg_color)
            
        btn.bind("<Enter>", on_enter)
        btn.bind("<Leave>", on_leave)
        return btn

    # ---------- Logging ----------
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

    # ---------- Navigation ----------
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

    # ---------- Compact File Page ----------
    def _file_page(self, parent):
        # Main container with flex layout
        main_frame = tk.Frame(parent, bg=self.colors['bg_card'])
        main_frame.pack(expand=True, fill="both")
        
        # Left side - Icon and title (compact)
        left_frame = tk.Frame(main_frame, bg=self.colors['bg_card'], width=250)
        left_frame.pack(side="left", fill="y", padx=(20, 10), pady=20)
        left_frame.pack_propagate(False)
        
        icon_label = tk.Label(left_frame,
                             text="📊",
                             bg=self.colors['bg_card'],
                             fg=self.colors['accent'],
                             font=("Segoe UI", 48))
        icon_label.pack(pady=(30, 5))
        
        tk.Label(left_frame,
                 text="Log Analyser",
                 bg=self.colors['bg_card'],
                 fg=self.colors['text_primary'],
                 font=("Segoe UI", 18, "bold")).pack()
        
        tk.Label(left_frame,
                 text="GNSS Analysis Tool",
                 bg=self.colors['bg_card'],
                 fg=self.colors['text_secondary'],
                 font=("Segoe UI", 10)).pack(pady=(0, 20))
        
        # Right side - File selection (compact)
        right_frame = tk.Frame(main_frame, bg=self.colors['bg_card'])
        right_frame.pack(side="right", fill="both", expand=True, padx=(10, 20), pady=20)
        
        # File card
        file_card = tk.Frame(right_frame,
                           bg=self.colors['bg_card_light'],
                           relief=tk.FLAT,
                           bd=0)
        file_card.pack(expand=True, fill="both")
        
        content_frame = tk.Frame(file_card, bg=self.colors['bg_card_light'])
        content_frame.pack(expand=True, fill="both", padx=20, pady=20)
        
        tk.Label(content_frame,
                text="Select Log File",
                bg=self.colors['bg_card_light'],
                fg=self.colors['text_primary'],
                font=("Segoe UI", 12, "bold")).pack(anchor="w")
        
        # Compact entry with browse button inline
        entry_frame = tk.Frame(content_frame, bg=self.colors['bg_card_light'])
        entry_frame.pack(fill="x", pady=(10, 15))
        
        entry_container = tk.Frame(entry_frame,
                                  bg=self.colors['bg_input'],
                                  highlightbackground=self.colors['border'],
                                  highlightthickness=1)
        entry_container.pack(side="left", fill="x", expand=True, padx=(0, 8))
        
        self.file_entry = tk.Entry(entry_container,
                                  bg=self.colors['bg_input'],
                                  fg=self.colors['text_secondary'],
                                  insertbackground=self.colors['accent'],
                                  relief=tk.FLAT,
                                  font=("Segoe UI", 10),
                                  bd=0,
                                  state='readonly')
        self.file_entry.pack(fill="both", expand=True, padx=15, pady=10)
        self.file_entry.insert(0, "No file selected")
        
        browse_btn = tk.Button(entry_frame,
                              text="Browse Files",
                              command=self._browse_file,
                              bg=self.colors['bg_card_light'],
                              fg=self.colors['text_primary'],
                              activebackground=self.colors['accent'],
                              activeforeground='white',
                              relief=tk.FLAT,
                              padx=15,
                              pady=8,
                              font=("Segoe UI", 9, "bold"),
                              cursor="hand2",
                              bd=0,
                              highlightthickness=1,
                              highlightbackground=self.colors['border'])
        browse_btn.pack(side="right")
        
        # Start button - full width but compact
        submit_btn = self._create_action_button(content_frame,
                                               "🚀 Start Analysis",
                                               lambda: self._start_processing(self.file_path),
                                               is_primary=True)
        submit_btn.pack(fill="x", ipady=8)

    def _browse_file(self):
        f = filedialog.askopenfilename(
            title="Select Log File",
            filetypes=[("Log files", "*.log *.txt"), ("All files", "*.*")]
        )
        if f:
            self.file_path = f
            self.file_entry.config(state='normal')
            self.file_entry.delete(0, tk.END)
            self.file_entry.insert(0, f)
            self.file_entry.config(state='readonly')

    # ---------- Processing ----------
    def _start_processing(self, path):
        if not path or path == "No file selected":
            messagebox.showwarning("Warning", "Please select a log file", 
                                 parent=self.root)
            return

        self.progress["value"] = 0
        self.progress_label.config(text="0%")
        self.status_text.config(text="Processing...")
        self.status_indicator.config(fg=self.colors['warning'])
        threading.Thread(target=self._process, daemon=True).start()

    def _process(self):
        self._set_progress(20)
        self._log_message("📂 Extracting data from log file...")

        try:
            data = extractAllData(self.file_path)
            
            self._set_progress(80)
            self._log_message("⏱️ Analyzing time jumps...")
            findTimeJumps(self.file_path)

            self._set_progress(100)
            self.data = data

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

    # ---------- Compact Task Page ----------
    def _task_page(self, parent):
        # Title section (compact)
        title_frame = tk.Frame(parent, bg=self.colors['bg_card'])
        title_frame.pack(fill="x", pady=(5, 10))

        tk.Label(title_frame,
                 text="Analysis Tasks",
                 bg=self.colors['bg_card'],
                 fg=self.colors['text_primary'],
                 font=("Segoe UI", 16, "bold")).pack()

        # Create scrollable task grid
        canvas = tk.Canvas(parent, bg=self.colors['bg_card'], highlightthickness=0, height=300)
        scrollbar = ttk.Scrollbar(parent, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas, bg=self.colors['bg_card'])

        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )

        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw", width=600)
        canvas.configure(yscrollcommand=scrollbar.set)

        # Compact task buttons in 3 columns
        for i, task in enumerate(self.TASKS):
            row = i // 3
            col = i % 3

            # Task card style
            task_card = tk.Frame(scrollable_frame,
                               bg=self.colors['bg_card_light'],
                               highlightbackground=self.colors['border'],
                               highlightthickness=1,
                               relief=tk.FLAT,
                               padx=10,
                               pady=10)
            task_card.grid(row=row, column=col, padx=5, pady=5, sticky="ew")

            # Task icon and text
            icon_text = task.split()[0]
            task_name = task.replace(task.split()[0], '').strip()

            tk.Label(task_card,
                    text=icon_text,
                    fg=self.colors['accent'],
                    bg=self.colors['bg_card_light'],
                    font=("Segoe UI", 14)).pack(anchor="w")

            tk.Label(task_card,
                    text=task_name,
                    fg=self.colors['text_primary'],
                    bg=self.colors['bg_card_light'],
                    font=("Segoe UI", 9),
                    wraplength=180,
                    justify=tk.LEFT).pack(anchor="w", pady=(5, 10))

            execute_btn = tk.Button(task_card,
                                  text="Run",
                                  command=lambda idx=i: self._run_task(idx),
                                  bg=self.colors['bg_input'],
                                  fg=self.colors['accent_light'],
                                  activebackground=self.colors['accent'],
                                  activeforeground='white',
                                  font=("Segoe UI", 8, "bold"),
                                  relief=tk.FLAT,
                                  padx=10,
                                  pady=4,
                                  cursor="hand2",
                                  bd=0,
                                  highlightthickness=1,
                                  highlightbackground=self.colors['border'])
            execute_btn.pack(fill="x")

            def on_enter(e, btn=execute_btn):
                btn.configure(bg=self.colors['accent'], fg='white')
            def on_leave(e, btn=execute_btn):
                btn.configure(bg=self.colors['bg_input'], fg=self.colors['accent_light'])

            execute_btn.bind("<Enter>", on_enter)
            execute_btn.bind("<Leave>", on_leave)

        # Configure grid weights
        for i in range(3):
            scrollable_frame.grid_columnconfigure(i, weight=1)

        canvas.pack(side="left", fill="both", expand=True, padx=(0, 5))
        scrollbar.pack(side="right", fill="y")

    # ---------- Task Execution ----------
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
            mainfunction(idx, self.file_path, self.data)
            self._log_message(f"✅ Task completed: {self.TASKS[idx]}")
            self.root.after(0, lambda: self.status_text.config(text="Ready"))
            self.root.after(0, lambda: self.status_indicator.config(fg=self.colors['success']))
        except Exception as e:
            self._log_message(f"❌ Task failed: {str(e)}")
            self.root.after(0, lambda: self.status_text.config(text="Error"))
            self.root.after(0, lambda: self.status_indicator.config(fg=self.colors['error']))


if __name__ == "__main__":
    LogAnalyserApp()