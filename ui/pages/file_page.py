from . import BasePage
from .. import (
    _UiCofigurationPage,
    _UiDialoguesPage,
    _UiStylingPage,
    ThemedFrame,
    ThemedLabel,
    ThemedButton,
    FileInputFrame,
)

class FilePage(BasePage):
    def setup_ui(self):
        main = ThemedFrame(self, bg=_UiStylingPage.COLORS['bg_card'])
        main.pack(fill='both', expand=True)

        # Left panel – slightly narrower
        left = ThemedFrame(main, bg=_UiStylingPage.COLORS['bg_card_light'], width=260)
        left.pack(side='left', fill='y', padx=(10, 0), pady=10)
        left.pack_propagate(False)

        ThemedLabel(left, text="⚙️ CONFIGURATION", font=('Segoe UI', 10, 'bold'),
                 fg=_UiStylingPage.COLORS['accent'], bg=_UiStylingPage.COLORS['bg_card_light']).pack(anchor='w', padx=15, pady=(15,5))

        # ---- Advanced Config Section ----
        advanced_frame = ThemedFrame(left, frame_type='input')
        advanced_frame.pack(fill='both', expand=True, padx=10, pady=10)

        ThemedLabel(advanced_frame, text="🔧 Advanced Settings", 
                 fg=_UiStylingPage.COLORS['text_muted'], bg=_UiStylingPage.COLORS['bg_input'],
                 font=('Segoe UI', 9, 'bold')).pack(pady=(15, 10))

        # Make sure the app state syncs with the _UiCofigurationPage file on first boot
        if not hasattr(self.controller.state, 'debug_mode'):
            self.controller.state.debug_mode = getattr(_UiCofigurationPage, '_Graph_Debug', False)
            
        def _toggle_debug():
            # Toggle the global state
            new_state = not self.controller.state.debug_mode
            self.controller.state.debug_mode = new_state
            _UiCofigurationPage._Graph_Debug = new_state  # Sync for backend services
            
            _update_debug_btn()
            if new_state:
                _UiDialoguesPage.show_info('Debug Enabled', 'GUI debug exports are enabled.', parent=self.controller.root)

        def _update_debug_btn():
            if self.controller.state.debug_mode:
                # Selected State (Highlighted)
                on_bg = _UiStylingPage.COLORS['accent']
                on_fg = _UiStylingPage.COLORS['bg_card']
                self.debug_btn.config(
                    text="Graph Debug",
                    bg=on_bg,
                    fg=on_fg,
                    activebackground=on_bg,
                    activeforeground=on_fg
                )
                self.debug_btn.default_bg = on_bg
                self.debug_btn.hover_bg = on_bg
            else:
                # Deselected State (Flat)
                off_bg = _UiStylingPage.COLORS['bg_input']
                off_fg = _UiStylingPage.COLORS['text_primary']
                off_hover = _UiStylingPage.COLORS.get('hover', _UiStylingPage.COLORS['bg_card_light'])
                self.debug_btn.config(
                    text="Graph Debug",
                    bg=off_bg,
                    fg=off_fg,
                    activebackground=off_hover,
                    activeforeground=off_fg
                )
                self.debug_btn.default_bg = off_bg
                self.debug_btn.hover_bg = off_hover

        self.debug_btn = ThemedButton(advanced_frame, text="", command=_toggle_debug, 
                                      font=('Segoe UI', 9, 'bold'), relief='solid', bd=1, 
                                      padx=10, pady=6)
        _update_debug_btn() # Set initial color state
        self.debug_btn.pack(fill='x', padx=15, pady=5)
        
        ThemedLabel(advanced_frame, text="(More coming soon)", 
                 fg=_UiStylingPage.COLORS['text_muted'], bg=_UiStylingPage.COLORS['bg_input'],
                 font=('Segoe UI', 8, 'italic')).pack(side='bottom', pady=15)
        # ---------------------------------

        ThemedLabel(left, text="💡 Tip: Supports NMEA, UBX, .log, .txt", 
                 fg=_UiStylingPage.COLORS['text_secondary'], bg=_UiStylingPage.COLORS['bg_card_light'],
                 font=('Segoe UI', 8)).pack(side='bottom', pady=8)

        # Right panel – reduced outer/inner padding
        right = ThemedFrame(main, bg=_UiStylingPage.COLORS['bg_card'])
        right.pack(side='right', fill='both', expand=True, padx=(10, 10), pady=10)

        card = ThemedFrame(right, frame_type='card')
        card.pack(fill='both', expand=True)

        inner = ThemedFrame(card, bg=_UiStylingPage.COLORS['bg_card_light'])
        inner.pack(fill='both', expand=True, padx=20, pady=20)

        ThemedLabel(inner, "Load GNSS Log File", style_type='heading', bg=_UiStylingPage.COLORS['bg_card_light']).pack(anchor='w', pady=(0,5))
        ThemedLabel(inner, "Select a NMEA, UBX, or log file to analyze", style_type='muted', bg=_UiStylingPage.COLORS['bg_card_light']).pack(anchor='w', pady=(0,20))

        self.file_input = FileInputFrame(inner, on_browse=self._browse_file, placeholder="No file selected")
        self.file_input.pack(fill='x', pady=10)

        btn_frame = ThemedFrame(inner, bg=_UiStylingPage.COLORS['bg_card_light'])
        btn_frame.pack(fill='x', pady=20)
        start_btn = ThemedButton(btn_frame, "🚀 Start Analysis", command=self._start_processing, is_primary=True)
        start_btn.pack(side='left', fill='x', expand=True, padx=(0,15))
        cancel_btn = ThemedButton(btn_frame, "Exit", command=self.controller.root.quit)
        cancel_btn.pack(side='right')

    def _browse_file(self):
        path = _UiDialoguesPage.ask_file(parent=self.controller.root)
        if path:
            self.file_input.set_value(path)

    def _start_processing(self):
        path = self.file_input.get_value()
        if not path:
            _UiDialoguesPage.show_warning("No File", "Please select a file.", parent=self.controller.root)
            return None
        self.controller.state.set_file(path)
        self.controller.process_file(path)