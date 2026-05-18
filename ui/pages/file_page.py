"""
ui/pages/file_page.py
─────────────────────
File selection page.
"""

import tkinter as tk
from .base_page import BasePage
from .. import style, config, dialogs
from ..components import ThemedLabel, ThemedFrame, ThemedButton, FileInputFrame
from ..state import AppState


class FilePage(BasePage):
    """File selection page for loading NMEA log files."""
    
    def setup_ui(self):
        """Build the file selection UI."""
        # Main container
        main_frame = tk.Frame(self, bg=style.COLORS['bg_card'])
        main_frame.pack(fill='both', expand=True, padx=config.SPACING['xl'], pady=config.SPACING['xl'])
        
        # Left panel - branding
        left_panel = tk.Frame(main_frame, bg=style.COLORS['bg_card'])
        left_panel.pack(side='left', fill='y', padx=(0, config.SPACING['xl']))
        
        branding_box = tk.Frame(left_panel, bg=style.COLORS['bg_card_light'], width=200)
        branding_box.pack(fill='y')
        branding_box.pack_propagate(False)
        
        icon_label = ThemedLabel(branding_box, "📊", style_type='normal')
        icon_label.config(font=('Segoe UI', 48))
        icon_label.pack(pady=config.SPACING['lg'])
        
        title = ThemedLabel(branding_box, "ACCORD", style_type='heading')
        title.config(font=('Segoe UI', 24, 'bold'))
        title.pack()
        
        subtitle = ThemedLabel(branding_box, "Log Analyzer", style_type='muted')
        subtitle.pack(pady=config.SPACING['md'])
        
        description = ThemedLabel(
            branding_box,
            "GNSS Analysis & Visualization",
            style_type='muted'
        )
        description.config(font=('Segoe UI', 8), wraplength=180, justify='center')
        description.pack(padx=config.SPACING['md'])
        
        # Right panel - file selection
        right_panel = tk.Frame(main_frame, bg=style.COLORS['bg_card'])
        right_panel.pack(side='right', fill='both', expand=True)
        
        # Card
        card = ThemedFrame(right_panel, frame_type='card')
        card.pack(fill='both', expand=True)
        
        card_content = tk.Frame(card, bg=style.COLORS['bg_card_light'])
        card_content.pack(fill='both', expand=True, padx=config.SPACING['xl'], pady=config.SPACING['xl'])
        
        # Instructions
        title_label = ThemedLabel(card_content, "Load GNSS Log File", style_type='heading')
        title_label.pack(anchor='w', pady=(0, config.SPACING['md']))
        
        instructions = ThemedLabel(
            card_content,
            "Select a NMEA, UBX, or log file to analyze",
            style_type='muted'
        )
        instructions.pack(anchor='w', pady=(0, config.SPACING['lg']))
        
        # File input
        self.file_input = FileInputFrame(
            card_content,
            on_browse=self._browse_file,
            placeholder="No file selected",
        )
        self.file_input.pack(fill='x', pady=config.SPACING['md'])
        
        # Buttons
        button_frame = tk.Frame(card_content, bg=style.COLORS['bg_card_light'])
        button_frame.pack(fill='x', pady=(config.SPACING['lg'], 0))
        
        start_btn = ThemedButton(
            button_frame,
            text="🚀 Start Analysis",
            command=self._start_processing,
            is_primary=True,
            font=('Segoe UI', 10, 'bold'),
            padx=config.SPACING['xl'],
            pady=config.SPACING['md'],
        )
        start_btn.pack(side='left', fill='x', expand=True)
        
        cancel_btn = ThemedButton(
            button_frame,
            text="Cancel",
            command=self.controller.root.quit,
            font=('Segoe UI', 10),
            padx=config.SPACING['lg'],
            pady=config.SPACING['md'],
        )
        cancel_btn.pack(side='right', padx=(config.SPACING['md'], 0))
    
    def _browse_file(self):
        """Handle browse button click."""
        file_path = dialogs.ask_file(parent=self.controller.root)
        if file_path:
            self.file_input.set_value(file_path)
    
    def _start_processing(self):
        """Start processing the selected file."""
        file_path = self.file_input.get_value()
        
        if not file_path:
            dialogs.show_warning(
                "No File Selected",
                "Please select a log file to analyze.",
                parent=self.controller.root,
            )
            return
        
        # Update state
        self.controller.state.set_file(file_path)
        
        # Start processing
        self.controller.process_file(file_path)
