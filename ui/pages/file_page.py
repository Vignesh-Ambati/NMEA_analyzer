# accord_analyser/pages/file_page.py
"""File selection page."""

import tkinter as tk
from tkinter import filedialog, messagebox
from .base_page import BasePage
from ..constants import COLORS
from ..pages.task_page import TaskPage

class FilePage(BasePage):
    def setup_ui(self):
        # Main frame with two columns
        main_frame = tk.Frame(self, bg=COLORS['bg_card'], height=200)
        main_frame.pack(fill="x")
        main_frame.pack_propagate(False)

        # Left icon panel
        left_frame = tk.Frame(main_frame, bg=COLORS['bg_card'], width=220)
        left_frame.pack(side="left", fill="y", padx=(20, 10), pady=10)
        left_frame.pack_propagate(False)
        tk.Label(left_frame, text="📊", bg=COLORS['bg_card'], fg=COLORS['accent'],
                 font=("Segoe UI", 36)).pack(pady=(20, 2))
        tk.Label(left_frame, text="Log Analyser", bg=COLORS['bg_card'],
                 fg=COLORS['text_primary'], font=("Segoe UI", 14, "bold")).pack()
        tk.Label(left_frame, text="GNSS Analysis Tool", bg=COLORS['bg_card'],
                 fg=COLORS['text_secondary'], font=("Segoe UI", 9)).pack()

        # Right file selection card
        right_frame = tk.Frame(main_frame, bg=COLORS['bg_card'])
        right_frame.pack(side="right", fill="both", expand=True, padx=(10, 20), pady=10)
        file_card = tk.Frame(right_frame, bg=COLORS['bg_card_light'], relief=tk.FLAT)
        file_card.pack(expand=True, fill="both")
        content_frame = tk.Frame(file_card, bg=COLORS['bg_card_light'])
        content_frame.pack(expand=True, fill="both", padx=20, pady=15)

        tk.Label(content_frame, text="Select Log File", bg=COLORS['bg_card_light'],
                 fg=COLORS['text_primary'], font=("Segoe UI", 12, "bold")).pack(anchor="w")

        entry_frame = tk.Frame(content_frame, bg=COLORS['bg_card_light'])
        entry_frame.pack(fill="x", pady=(10, 12))
        entry_container = tk.Frame(entry_frame, bg='white',
                                   highlightbackground=COLORS['accent'],
                                   highlightthickness=2)
        entry_container.pack(side="left", fill="x", expand=True, padx=(0, 8))
        self.file_entry = tk.Entry(entry_container, bg='white', fg='black',
                                   insertbackground='black', relief=tk.FLAT,
                                   font=("Segoe UI", 10), bd=0)
        self.file_entry.pack(fill="both", expand=True, padx=10, pady=8)
        self.file_entry.insert(0, "No file selected")

        browse_btn = tk.Button(entry_frame, text="Browse Files",
                               command=self._browse_file,
                               bg=COLORS['accent'], fg='white',
                               activebackground=COLORS['accent_light'],
                               activeforeground='white', relief=tk.FLAT,
                               padx=15, pady=8, font=("Segoe UI", 9, "bold"),
                               cursor="hand2", bd=0,
                               highlightthickness=2,
                               highlightbackground=COLORS['accent_dark'])
        browse_btn.pack(side="right")
        browse_btn.bind("<Enter>", lambda e: browse_btn.configure(bg=COLORS['accent_light']))
        browse_btn.bind("<Leave>", lambda e: browse_btn.configure(bg=COLORS['accent']))

        # Start analysis button
        start_btn = tk.Button(content_frame, text="🚀 Start Analysis",
                              command=self._start_processing,
                              bg=COLORS['accent'], fg='white',
                              activebackground=COLORS['accent_light'],
                              activeforeground='white',
                              font=("Segoe UI", 10, "bold"), relief=tk.FLAT,
                              padx=20, pady=12, cursor="hand2", bd=0,
                              highlightthickness=1,
                              highlightbackground=COLORS['border'])
        start_btn.pack(fill="x", ipady=8)
        start_btn.bind("<Enter>", lambda e: start_btn.configure(bg=COLORS['accent_light']))
        start_btn.bind("<Leave>", lambda e: start_btn.configure(bg=COLORS['accent']))

    def _browse_file(self):
        f = filedialog.askopenfilename(title="Select Log File",
                                        filetypes=[("All files", "*.*")])
        if f:
            self.controller.file_path = f
            self.file_entry.config(state='normal')
            self.file_entry.delete(0, tk.END)
            self.file_entry.insert(0, f)

    def _start_processing(self):
        current_path = self.controller.file_path or self.file_entry.get()
        if not current_path or current_path == "No file selected":
            messagebox.showwarning("Warning", "Please select a log file",
                                   parent=self.controller.root)
            return
        self.controller.process_file(current_path,
                                     callback=lambda: self.controller._navigate(TaskPage))

# Standalone test
if __name__ == "__main__":
    # Dummy controller for testing
    class DummyApp:
        def __init__(self):
            self.root = tk.Tk()
            self.file_path = ""
            self.cache = None
        def process_file(self, path, callback):
            print(f"Processing {path}")
            callback()
        def _navigate(self, page_class):
            print(f"Navigating to {page_class.__name__}")
            # Actually show the page for testing
            for w in self.root.winfo_children():
                w.destroy()
            page = page_class(self.root, self)
            page.pack(fill="both", expand=True)
            self.root.update()

    app = DummyApp()
    app.root.geometry("800x600")
    page = FilePage(app.root, app)
    page.pack(fill="both", expand=True)
    app.root.mainloop()