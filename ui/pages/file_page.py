# accord_analyser/pages/file_page.py
"""File selection page."""

import tkinter as tk
from tkinter import filedialog, messagebox
from .base_page import BasePage
from ..theme import Theme, SPACING, COLORS
from ..widgets import (
    ThemedButton, ThemedLabel, ThemedFrame, IconLabel, FileInputFrame
)
from ..pages.task_page import TaskPage

class FilePage(BasePage):
    def setup_ui(self):
        # Main frame with two columns
        main_frame = ThemedFrame(self, style='container', height=200)
        main_frame.pack(fill="x")
        main_frame.pack_propagate(False)

        # Left icon panel
        left_frame = ThemedFrame(main_frame, style='container', width=220)
        left_frame.pack(side="left", fill="y", padx=(SPACING['lg'], SPACING['md']), pady=SPACING['md'])
        left_frame.pack_propagate(False)
        
        IconLabel(left_frame, "📊").pack(pady=(SPACING['lg'], SPACING['sm']))
        ThemedLabel(left_frame, "Log Analyser", style='heading').pack()
        ThemedLabel(left_frame, "GNSS Analysis Tool", style='muted').pack()

        # Right file selection card
        right_frame = ThemedFrame(main_frame, style='container')
        right_frame.pack(side="right", fill="both", expand=True, 
                        padx=(SPACING['md'], SPACING['lg']), pady=SPACING['md'])
        
        file_card = ThemedFrame(right_frame, style='card')
        file_card.pack(expand=True, fill="both")
        
        content_frame = tk.Frame(file_card, bg=Theme.get_color('bg_card_light'))
        content_frame.pack(expand=True, fill="both", 
                          padx=SPACING['lg'], pady=SPACING['lg'])

        ThemedLabel(content_frame, "Select Log File", style='heading').pack(anchor="w")

        # File input component
        entry_frame = tk.Frame(content_frame, bg=Theme.get_color('bg_card_light'))
        entry_frame.pack(fill="x", pady=(SPACING['md'], SPACING['sm']))
        
        self.file_input = FileInputFrame(
            entry_frame,
            on_browse=self._browse_file,
            placeholder="No file selected"
        )
        self.file_input.pack(fill="x")

        # Start analysis button
        start_btn = ThemedButton(
            content_frame,
            text="🚀 Start Analysis",
            command=self._start_processing,
            style='primary'
        )
        start_btn.pack(fill="x", ipady=SPACING['md'], pady=(SPACING['lg'], 0))

    def _browse_file(self):
        f = filedialog.askopenfilename(
            title="Select Log File",
            filetypes=[
                # ("Log Files", "*.log"),
                # ("NMEA Files", "*.nmea"),
                # ("UBX Files", "*.ubx"),
                # ("Text Files", "*.txt"),
                ("All files", "*.*")
            ]
        )
        if f:
            self.controller.file_path = f
            self.file_input.set_value(f)

    def _start_processing(self):
        current_path = self.controller.file_path or self.file_input.get_value()
        if not current_path:
            messagebox.showwarning(
                "Warning",
                "Please select a log file",
                parent=self.controller.root
            )
            return
        self.controller.process_file(
            current_path,
            callback=lambda: self.controller._navigate(TaskPage)
        )
