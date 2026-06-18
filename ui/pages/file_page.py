import tkinter as tk
import os
from pathlib import Path
from .base_page import BasePage
from .. import style, config, dialogs
from ..components import ThemedLabel, ThemedButton, FileInputFrame

class FilePage(BasePage):
    def setup_ui(self):
        main = tk.Frame(self, bg=style.COLORS['bg_card'])
        main.pack(fill='both', expand=True)

        # Left panel – slightly narrower
        left = tk.Frame(main, bg=style.COLORS['bg_card_light'], width=260)
        left.pack(side='left', fill='y')
        left.pack_propagate(False)

        tk.Label(left, text="⚙️ CONFIGURATION", font=('Segoe UI', 10, 'bold'),
                 fg=style.COLORS['accent'], bg=style.COLORS['bg_card_light']).pack(anchor='w', padx=15, pady=(15,5))

        placeholder_frame = tk.Frame(left, bg=style.COLORS['bg_input'], bd=1, relief='solid')
        placeholder_frame.pack(fill='both', expand=True, padx=10, pady=10)

        tk.Label(placeholder_frame, text="🔧 Advanced settings will appear here", 
                 fg=style.COLORS['text_muted'], bg=style.COLORS['bg_input'],
                 font=('Segoe UI', 9), wraplength=220).pack(pady=15)

        tk.Label(placeholder_frame, text="(Coming soon)", 
                 fg=style.COLORS['text_muted'], bg=style.COLORS['bg_input'],
                 font=('Segoe UI', 8, 'italic')).pack()

        tk.Label(left, text="💡 Tip: Supports NMEA, UBX, .log, .txt", 
                 fg=style.COLORS['text_secondary'], bg=style.COLORS['bg_card_light'],
                 font=('Segoe UI', 8)).pack(side='bottom', pady=8)

        # Debug toggle
        self._debug_var = tk.BooleanVar(value=getattr(config, 'GUI_DEBUG', False))
        def _on_debug_toggle():
            config.GUI_DEBUG = bool(self._debug_var.get())
            # brief feedback
            if config.GUI_DEBUG:
                dialogs.show_info('Debug Enabled', 'GUI debug exports are enabled.', parent=self.controller.root)

        tk.Checkbutton(left, text='Enable GUI Debug Exports', variable=self._debug_var,
                       bg=style.COLORS['bg_card_light'], fg=style.COLORS['text_primary'],
                       selectcolor=style.COLORS['bg_card_light'], command=_on_debug_toggle).pack(side='bottom', pady=6, padx=12)

        # Right panel – reduced outer/inner padding
        right = tk.Frame(main, bg=style.COLORS['bg_card'])
        right.pack(side='right', fill='both', expand=True, padx=20, pady=20)   # reduced from 30

        card = tk.Frame(right, bg=style.COLORS['bg_card_light'], bd=1, relief='solid')
        card.pack(fill='both', expand=True)

        inner = tk.Frame(card, bg=style.COLORS['bg_card_light'])
        inner.pack(fill='both', expand=True, padx=20, pady=20)                 # reduced from 30

        ThemedLabel(inner, "Load GNSS Log File", style_type='heading').pack(anchor='w', pady=(0,5))
        ThemedLabel(inner, "Select a NMEA, UBX, or log file to analyze", style_type='muted').pack(anchor='w', pady=(0,20))

        self.file_input = FileInputFrame(inner, on_browse=self._browse_file, placeholder="No file selected")
        self.file_input.pack(fill='x', pady=10)

        btn_frame = tk.Frame(inner, bg=style.COLORS['bg_card_light'])
        btn_frame.pack(fill='x', pady=20)                                      # reduced from 30
        start_btn = ThemedButton(btn_frame, "🚀 Start Analysis", command=self._start_processing, is_primary=True)
        start_btn.pack(side='left', fill='x', expand=True, padx=(0,15))
        cancel_btn = ThemedButton(btn_frame, "Exit", command=self.controller.root.quit)  # renamed from Cancel
        cancel_btn.pack(side='right')

    def _browse_file(self):
        path = dialogs.ask_file(parent=self.controller.root)
        if path:
            self.file_input.set_value(path)

    def _start_processing(self):
        path = self.file_input.get_value()
        if not path:
            dialogs.show_warning("No File", "Please select a file.", parent=self.controller.root)
            return None
        self.controller.state.set_file(path)
        self.controller.process_file(path)