from . import BasePage
from .. import (
    _UiCofigurationPage,
    _UiDialoguesPage,
    _UiStylingPage,
    ThemedFrame,
    ThemedLabel,
    ThemedButton,
    FileInputFrame,
    LoadingAnimation,
)

class FilePage(BasePage):
    def setup_ui(self):
        main = ThemedFrame(self, bg=_UiStylingPage.COLORS['bg_card'])
        main.pack(fill='both', expand=True)

        # Left panel   slightly narrower
        left = ThemedFrame(main, bg=_UiStylingPage.COLORS['bg_card_light'], width=260)
        left.pack(side='left', fill='y', padx=(10, 0), pady=10)
        left.pack_propagate(False)

        ThemedLabel(left, text="⚙️ CONFIGURATION", font=_UiStylingPage.get_font(10, 'bold'),
                 fg=_UiStylingPage.COLORS['accent'], bg=_UiStylingPage.COLORS['bg_card_light']).pack(anchor='w', padx=15, pady=(15,5))

        # ---- Advanced Config Section ----
        advanced_frame = ThemedFrame(left, frame_type='input')
        advanced_frame.pack(fill='both', expand=True, padx=10, pady=10)

        ThemedLabel(advanced_frame, text="🔧 Advanced Settings", 
                 fg=_UiStylingPage.COLORS['text_muted'], bg=_UiStylingPage.COLORS['bg_input'],
                 font=_UiStylingPage.get_font(9, 'bold')).pack(pady=(15, 10))

        def _toggle_debug():
            new_state = not self.controller.state.debug_mode
            self.controller.state.debug_mode = new_state
            _UiCofigurationPage.DEBUG_GRAPH = new_state
            
            _update_debug_btn()
            if new_state:
                _UiDialoguesPage.show_info('Debug Enabled', 'GUI debug exports are enabled.', parent=self.controller.root)

        def _update_debug_btn():
            if self.controller.state.debug_mode:
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
                                       font=_UiStylingPage.get_font(9, 'bold'), relief='solid', bd=1,
                                       padx=10, pady=6)
        _update_debug_btn()
        self.debug_btn.pack(fill='x', padx=15, pady=5)

        # ---- Progress Bar Visibility Toggle ----
        def _toggle_progress_bar_visibility():
            new_state = not self.controller.state.progress_bar_visible
            self.controller.state.progress_bar_visible = new_state
            _UiCofigurationPage.DEBUG_PROGRESS_BAR_VISIBLE = new_state
            self.controller._toggle_progress_bar_visibility(new_state)
            _update_progress_bar_btn()
            self.controller.console.write(f"  Progress bar visibility: {'ON' if new_state else 'OFF'}")

        def _update_progress_bar_btn():
            if self.controller.state.progress_bar_visible:
                on_bg = _UiStylingPage.COLORS['accent']
                on_fg = _UiStylingPage.COLORS['bg_card']
                self.progress_bar_btn.config(
                    text="Progress Bar",
                    bg=on_bg,
                    fg=on_fg,
                    activebackground=on_bg,
                    activeforeground=on_fg
                )
                self.progress_bar_btn.default_bg = on_bg
                self.progress_bar_btn.hover_bg = on_bg
            else:
                off_bg = _UiStylingPage.COLORS['bg_input']
                off_fg = _UiStylingPage.COLORS['text_primary']
                off_hover = _UiStylingPage.COLORS.get('hover', _UiStylingPage.COLORS['bg_card_light'])
                self.progress_bar_btn.config(text="Progress Bar", bg=off_bg, fg=off_fg, activebackground=off_hover, activeforeground=off_fg)
                self.progress_bar_btn.default_bg = off_bg
                self.progress_bar_btn.hover_bg = off_hover

        self.progress_bar_btn = ThemedButton(advanced_frame, text="", command=_toggle_progress_bar_visibility, font=_UiStylingPage.get_font(9, 'bold'), relief='solid', bd=1, padx=10, pady=6)
        _update_progress_bar_btn()
        self.progress_bar_btn.pack(fill='x', padx=15, pady=5)

        # ---- Console Visibility Toggle ----
        def _toggle_console_visibility():
            new_state = not self.controller.state.console_visible
            self.controller.state.console_visible = new_state
            _UiCofigurationPage.DEBUG_CONSOLE_VISIBLE = new_state
            self.controller._toggle_console_visibility(new_state)
            _update_console_btn()
            self.controller.console.write(f"  Console visibility: {'ON' if new_state else 'OFF'}")

        def _update_console_btn():
            if self.controller.state.console_visible:
                on_bg = _UiStylingPage.COLORS['accent']
                on_fg = _UiStylingPage.COLORS['bg_card']
                self.console_btn.config(
                    text="Console",
                    bg=on_bg,
                    fg=on_fg,
                    activebackground=on_bg,
                    activeforeground=on_fg
                )
                self.console_btn.default_bg = on_bg
                self.console_btn.hover_bg = on_bg
            else:
                off_bg = _UiStylingPage.COLORS['bg_input']
                off_fg = _UiStylingPage.COLORS['text_primary']
                off_hover = _UiStylingPage.COLORS.get('hover', _UiStylingPage.COLORS['bg_card_light'])
                self.console_btn.config(text="Console", bg=off_bg, fg=off_fg, activebackground=off_hover, activeforeground=off_fg)
                self.console_btn.default_bg = off_bg
                self.console_btn.hover_bg = off_hover

        self.console_btn = ThemedButton(advanced_frame, text="", command=_toggle_console_visibility, font=_UiStylingPage.get_font(9, 'bold'), relief='solid', bd=1, padx=10, pady=6)
        _update_console_btn()
        self.console_btn.pack(fill='x', padx=15, pady=5)

        ThemedLabel(advanced_frame, text="(More coming soon)", 
                 fg=_UiStylingPage.COLORS['text_muted'], bg=_UiStylingPage.COLORS['bg_input'],
                 font=_UiStylingPage.get_font(8, italic=True)).pack(side='bottom', pady=15)

        ThemedLabel(left, text="  Tip: Supports NMEA, UBX, .log, .txt", 
                 fg=_UiStylingPage.COLORS['text_secondary'], bg=_UiStylingPage.COLORS['bg_card_light'],
                 font=_UiStylingPage.get_font(8)).pack(side='bottom', pady=8)

        # Right panel
        right = ThemedFrame(main, bg=_UiStylingPage.COLORS['bg_card'])
        right.pack(side='right', fill='both', expand=True, padx=(10, 10), pady=10)

        card = ThemedFrame(right, frame_type='card')
        card.pack(fill='both', expand=True)

        # ---------------------------------------------------------
        # SPLIT FRAME DESIGN 
        # ---------------------------------------------------------
        
        # TOP SECTION (for input and overlay)
        self.top_inner = ThemedFrame(card, bg=_UiStylingPage.COLORS['bg_card_light'])
        self.top_inner.pack(fill='both', expand=True, padx=20, pady=(20, 0))
        self.top_inner.pack_propagate(False)

        ThemedLabel(self.top_inner, "Load GNSS Log File", style_type='heading', bg=_UiStylingPage.COLORS['bg_card_light']).pack(anchor='w', pady=(0,5))
        ThemedLabel(self.top_inner, "Select a NMEA, UBX, or log file to analyze", style_type='muted', bg=_UiStylingPage.COLORS['bg_card_light']).pack(anchor='w', pady=(0,20))

        self.file_input = FileInputFrame(self.top_inner, on_browse=self._browse_file, placeholder="No file selected")
        self.file_input.pack(fill='x', pady=10)

        # Loading animation overlay anchored strictly to the top_inner section
        self.loading_animation = LoadingAnimation(self.top_inner)

        # BOTTOM SECTION (for buttons)
        self.bottom_inner = ThemedFrame(card, bg=_UiStylingPage.COLORS['bg_card_light'])
        self.bottom_inner.pack(fill='x', side='bottom', padx=20, pady=20)

        self.start_btn = ThemedButton(self.bottom_inner, "  Start Analysis", command=self._start_processing, is_primary=True)
        self.start_btn.pack(side='left', fill='x', expand=True, padx=(0,15))

        self.cancel_btn = ThemedButton(self.bottom_inner, "Exit", command=self.controller.root.quit)
        self.cancel_btn.pack(side='right')

    def _browse_file(self):
        path = _UiDialoguesPage.ask_file(parent=self.controller.root)
        if path:
            self.file_input.set_value(path)

    def _start_processing(self):
        path = self.file_input.get_value()
        if not path:
            _UiDialoguesPage.show_warning("No File", "Please select a file.", parent=self.controller.root)
            return None
        
        filename = path.split("/")[-1].split("\\")[-1]
        
        # Disable interaction
        self.start_btn.config(state='disabled')
        self.file_input.browse_btn.config(state='disabled')
        
        self.loading_animation.start(f"Parsing {filename}...")
        self.controller.process_file(path)

    def stop_loading_animation(self):
        """Stop the loading animation (called by app controller when processing completes)."""
        self.loading_animation.stop()
        if self.start_btn.winfo_exists():
            self.start_btn.config(state='normal')
        if self.file_input.browse_btn.winfo_exists():
            self.file_input.browse_btn.config(state='normal')