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

        # ---- Advanced Config Section ----
        advanced_frame = tk.Frame(left, bg=style.COLORS['bg_input'], bd=1, relief='solid')
        advanced_frame.pack(fill='both', expand=True, padx=10, pady=10)

        tk.Label(advanced_frame, text="🔧 Advanced Settings", 
                 fg=style.COLORS['text_muted'], bg=style.COLORS['bg_input'],
                 font=('Segoe UI', 9, 'bold')).pack(pady=(15, 10))

        # Make sure the app state syncs with the config file on first boot
        if not hasattr(self.controller.state, 'debug_mode'):
            self.controller.state.debug_mode = getattr(config, 'GUI_DEBUG', False)
            
        def _toggle_debug():
            # Toggle the global state
            new_state = not self.controller.state.debug_mode
            self.controller.state.debug_mode = new_state
            config.GUI_DEBUG = new_state  # Sync for backend services
            
            _update_debug_btn()
            if new_state:
                dialogs.show_info('Debug Enabled', 'GUI debug exports are enabled.', parent=self.controller.root)

        def _update_debug_btn():
            if self.controller.state.debug_mode:
                # Selected State (Highlighted)
                self.debug_btn.config(
                    text="GUI Debug: ON",
                    bg=style.COLORS['accent'],
                    fg=style.COLORS['bg_card'],  
                    activebackground=style.COLORS['accent'],
                    activeforeground=style.COLORS['bg_card']
                )
            else:
                # Deselected State (Flat)
                self.debug_btn.config(
                    text="GUI Debug: OFF",
                    bg=style.COLORS['bg_input'],
                    fg=style.COLORS['text_primary'],
                    activebackground=style.COLORS.get('hover', style.COLORS['bg_card_light']),
                    activeforeground=style.COLORS['text_primary']
                )

        self.debug_btn = tk.Button(advanced_frame, font=('Segoe UI', 9, 'bold'), relief='solid', bd=1,
                                   cursor='hand2', command=_toggle_debug, padx=10, pady=6)
        _update_debug_btn() # Set initial color state
        self.debug_btn.pack(fill='x', padx=15, pady=5)
        
        tk.Label(advanced_frame, text="(More coming soon)", 
                 fg=style.COLORS['text_muted'], bg=style.COLORS['bg_input'],
                 font=('Segoe UI', 8, 'italic')).pack(side='bottom', pady=15)
        # ---------------------------------

        tk.Label(left, text="💡 Tip: Supports NMEA, UBX, .log, .txt", 
                 fg=style.COLORS['text_secondary'], bg=style.COLORS['bg_card_light'],
                 font=('Segoe UI', 8)).pack(side='bottom', pady=8)

        # Right panel – reduced outer/inner padding
        right = tk.Frame(main, bg=style.COLORS['bg_card'])
        right.pack(side='right', fill='both', expand=True, padx=20, pady=20)

        card = tk.Frame(right, bg=style.COLORS['bg_card_light'], bd=1, relief='solid')
        card.pack(fill='both', expand=True)

        inner = tk.Frame(card, bg=style.COLORS['bg_card_light'])
        inner.pack(fill='both', expand=True, padx=20, pady=20)

        ThemedLabel(inner, "Load GNSS Log File", style_type='heading').pack(anchor='w', pady=(0,5))
        ThemedLabel(inner, "Select a NMEA, UBX, or log file to analyze", style_type='muted').pack(anchor='w', pady=(0,20))

        self.file_input = FileInputFrame(inner, on_browse=self._browse_file, placeholder="No file selected")
        self.file_input.pack(fill='x', pady=10)

        btn_frame = tk.Frame(inner, bg=style.COLORS['bg_card_light'])
        btn_frame.pack(fill='x', pady=20)
        start_btn = ThemedButton(btn_frame, "🚀 Start Analysis", command=self._start_processing, is_primary=True)
        start_btn.pack(side='left', fill='x', expand=True, padx=(0,15))
        cancel_btn = ThemedButton(btn_frame, "Exit", command=self.controller.root.quit)
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