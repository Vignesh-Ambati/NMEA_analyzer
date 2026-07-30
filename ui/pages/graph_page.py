import tkinter as tk
from typing import Any, Optional

from . import BasePage
from .. import (
    _UiCofigurationPage,
    _UiStylingPage,
    ThemedFrame,
    ThemedLabel,
    ThemedButton,
    InteractivePlotCanvas,
)

from tkinter import colorchooser, filedialog, messagebox

class GraphPage(BasePage):
    def __init__(self, parent: tk.Misc, controller: Any) -> None:
        self.plotter: Optional[InteractivePlotCanvas] = None
        self.plot_container: Optional[ThemedFrame] = None
        self.sidebar_frame: Optional[ThemedFrame] = None
        self.header_bar: Optional[ThemedFrame] = None
        self.content_frame: Optional[ThemedFrame] = None
        self._fullpage = False
        self._app_top_bar = None
        super().__init__(parent, controller)

    def setup_ui(self) -> None:
        self.main_frame = ThemedFrame(self, bg=_UiStylingPage.COLORS['bg_card'])
        self.main_frame.pack(fill='both', expand=True, padx=(15,10), pady=10)

        # ---- Header (row 0) ----
        self.header_bar = ThemedFrame(self.main_frame, bg=_UiStylingPage.COLORS['bg_card_light'], height=40)
        self.header_bar.grid(row=0, column=0, sticky='ew', pady=(0, 5))
        self.header_bar.grid_propagate(False)

        current_task_idx = self.controller.state.current_task if self.controller.state.current_task is not None else 0
        task_title = _UiCofigurationPage.TASKS[current_task_idx] if current_task_idx < len(_UiCofigurationPage.TASKS) else "Analysis View Frame"

        ThemedLabel(self.header_bar, text=task_title, fg=_UiStylingPage.COLORS['text_primary'],
                 bg=_UiStylingPage.COLORS['bg_card_light'], font=('Segoe UI', 12, 'bold')).pack(side='left', padx=10)

        nav_frame = ThemedFrame(self.header_bar, bg=_UiStylingPage.COLORS['bg_card_light'])
        nav_frame.pack(side='right')
        ThemedButton(nav_frame, text="← Back", command=self._go_back, is_primary=False, padx=12, pady=4).pack(side='left', padx=2)
        ThemedButton(nav_frame, text="⌂ Home", command=self._go_home, is_primary=False, padx=12, pady=4).pack(side='left', padx=2)

        # ---- Content frame (row 1) ----
        self.content_frame = ThemedFrame(self.main_frame, bg=_UiStylingPage.COLORS['bg_card'])
        self.content_frame.grid(row=1, column=0, sticky='nsew')
        self.main_frame.grid_rowconfigure(1, weight=1)
        self.main_frame.grid_columnconfigure(0, weight=1)

        # Plot container
        self.plot_container = ThemedFrame(self.content_frame, bg=_UiStylingPage.COLORS['bg_card'])
        self.plot_container.grid(row=0, column=0, sticky='nsew')
        self.content_frame.grid_columnconfigure(0, weight=1)
        self.content_frame.grid_rowconfigure(0, weight=1)

        # Sidebar
        self._build_sidebar(self.content_frame)

        # Attach plotter
        self._attach_canvas_engine(current_task_idx)

    def _build_sidebar(self, parent: ThemedFrame) -> None:
        self.sidebar_frame = ThemedFrame(parent, bg=_UiStylingPage.COLORS['bg_card_light'], width=220)
        self.sidebar_frame.grid(row=0, column=1, sticky='ns', padx=(10, 0))
        self.sidebar_frame.grid_propagate(False)

        ThemedLabel(self.sidebar_frame, text="⚙️ Graph Matrix", fg=_UiStylingPage.COLORS['accent'],
                 bg=_UiStylingPage.COLORS['bg_card_light'], font=('Segoe UI', 10, 'bold')).pack(pady=(10, 5), padx=10, anchor='w')
        ThemedFrame(self.sidebar_frame, bg=_UiStylingPage.COLORS['border'], height=1).pack(fill='x', padx=10, pady=5)

        self.mode_label = ThemedLabel(self.sidebar_frame, text="Mode: Manual (Idle)",
                                   fg=_UiStylingPage.COLORS['text_secondary'], bg=_UiStylingPage.COLORS['bg_card_light'],
                                   font=('Segoe UI', 9))
        self.mode_label.pack(pady=(0, 5), padx=10, anchor='w')

        self.menu_container = ThemedFrame(self.sidebar_frame, bg=_UiStylingPage.COLORS['bg_card_light'])
        self.menu_container.pack(fill='both', expand=True)

        self._build_main_menu()
        self._build_theme_menu()

        self._show_main_menu()

    def _build_main_menu(self):
        self.main_menu = ThemedFrame(self.menu_container, bg=_UiStylingPage.COLORS['bg_card_light'])

        self.is_manual = True
        self.btn_mode_toggle = ThemedButton(self.main_menu, text="Mode: Manual", command=self._toggle_manual_auto, padx=10, pady=5)
        self.btn_mode_toggle.pack(fill='x', padx=10, pady=6)

        self.btn_fullpage = ThemedButton(self.main_menu, text="⛶ Maximize", command=self._toggle_fullpage, padx=10, pady=5)
        self.btn_fullpage.pack(fill='x', padx=10, pady=6)

        self.btn_pan = ThemedButton(self.main_menu, text="✋ Pan Data", command=self._on_pan, padx=10, pady=5)
        self.btn_pan.pack(fill='x', padx=10, pady=6)

        self.btn_zoom = ThemedButton(self.main_menu, text="🔍 Zoom Box", command=self._on_zoom, padx=10, pady=5)
        self.btn_zoom.pack(fill='x', padx=10, pady=6)

        self.btn_reset = ThemedButton(self.main_menu, text="🏠 Reset View", command=self._on_reset, padx=10, pady=5)
        self.btn_reset.pack(fill='x', padx=10, pady=6)

        self.btn_back = ThemedButton(self.main_menu, text="⏪ Step Back", command=self._on_back, padx=10, pady=5)
        self.btn_back.pack(fill='x', padx=10, pady=6)

        self.btn_forward = ThemedButton(self.main_menu, text="⏩ Step Forward", command=self._on_forward, padx=10, pady=5)
        self.btn_forward.pack(fill='x', padx=10, pady=6)

        self.btn_export = ThemedButton(self.main_menu, text="💾 Export Frame", command=self._save_image, padx=10, pady=5)
        self.btn_export.pack(fill='x', padx=10, pady=6)

        self.btn_theme = ThemedButton(self.main_menu, text="🎨 Theme & Colors", command=self._show_theme_menu, padx=10, pady=5)
        self.btn_theme.pack(fill='x', padx=10, pady=6)

        self._update_nav_buttons()

    def _build_theme_menu(self):
        self.theme_menu = ThemedFrame(self.menu_container, bg=_UiStylingPage.COLORS['bg_card_light'])

        ThemedLabel(self.theme_menu, text="🎨 Appearance Settings", fg=_UiStylingPage.COLORS['accent'],
                 bg=_UiStylingPage.COLORS['bg_card_light'], font=('Segoe UI', 9, 'bold')).pack(pady=(5, 10))

        color_controls = [
            ("🎨 Plot Background", self._change_bg_color),
            ("🖊 Line Color", self._change_line_color),
            ("📝 Text Color", self._change_text_color),
            ("🔲 Grid Color", self._change_grid_color)
        ]

        for text, cmd in color_controls:
            btn = ThemedButton(self.theme_menu, text=text, command=cmd, is_primary=False, padx=10, pady=5)
            btn.pack(fill='x', padx=10, pady=6)

        btn_back = ThemedButton(self.theme_menu, text="🔙 Back", command=self._show_main_menu, padx=10, pady=5)
        btn_back.pack(fill='x', padx=10, pady=(20, 6))

    def _show_main_menu(self) -> None:
        self.theme_menu.pack_forget()
        self.main_menu.pack(fill='both', expand=True)

    def _show_theme_menu(self) -> None:
        self.main_menu.pack_forget()
        self.theme_menu.pack(fill='both', expand=True)

    def _toggle_manual_auto(self) -> None:
        self.is_manual = not self.is_manual
        self.btn_mode_toggle.config(text="Mode: Manual" if self.is_manual else "Mode: Auto")
        
        if not self.is_manual:
            if self.plotter:
                # Safely turn off active manual toolbar states before shifting to custom auto behaviors
                if self.plotter.toolbar.mode == 'pan/zoom':
                    self.plotter.toolbar.pan()
                elif self.plotter.toolbar.mode == 'zoom rect':
                    self.plotter.toolbar.zoom()
                
                self._update_mode_label("Auto Mode Active")
                self.plotter.set_auto_mode(True)
            
            # Disable redundant buttons
            self.btn_pan.config(state='disabled')
            self.btn_zoom.config(state='disabled')
            self.btn_reset.config(state='disabled')
            self.btn_back.config(state='disabled')
            self.btn_forward.config(state='disabled')
        else:
            self.btn_pan.config(state='normal')
            self.btn_zoom.config(state='normal')
            self.btn_reset.config(state='normal')
            if self.plotter:
                self._update_mode_label("Manual: Idle")
                self.plotter.set_auto_mode(False)
            self._update_nav_buttons()

    def _update_nav_buttons(self) -> None:
        if not self.winfo_exists():
            return
            
        plotter = getattr(self, 'plotter', None)
        is_manual = getattr(self, 'is_manual', False)

        if plotter and is_manual:
            can_back = plotter._view_index > 0
            can_forward = plotter._view_index < len(plotter._view_stack) - 1
            
            self.btn_back.config(state='normal' if can_back else 'disabled')
            self.btn_forward.config(state='normal' if can_forward else 'disabled')
            
        self.after(500, self._update_nav_buttons)

    def _toggle_fullpage(self) -> None:
        if not self._fullpage:
            self.header_bar.grid_remove()
            if hasattr(self.controller, 'console') and self.controller.console:
                self.controller.console.place_forget()
            if hasattr(self.controller, 'progress') and self.controller.progress:
                self.controller.progress.pack_forget()
            try:
                slaves = self.controller.root.pack_slaves()
                if slaves and isinstance(slaves[0], tk.Frame) and slaves[0] != self.controller.content_frame.master:
                    self._app_top_bar = slaves[0]
                    self._app_top_bar.pack_forget()
            except Exception:
                pass
            self.btn_fullpage.config(text="⛶ Minimize")
            self._fullpage = True
        else:
            if hasattr(self, '_app_top_bar') and self._app_top_bar:
                try:
                    self._app_top_bar.pack(fill='x', side='top', before=self.controller.content_frame.master)
                except Exception:
                    self._app_top_bar.pack(fill='x', side='top')
            self.header_bar.grid()
            if hasattr(self.controller, 'progress') and self.controller.progress:
                self.controller.progress.pack(fill='x', side='bottom')
            if hasattr(self.controller, 'console') and self.controller.console:
                height = self.controller.console._max_height if self.controller.console._expanded else self.controller.console._min_height
                self.controller.console.place(relx=0, rely=1.0, relwidth=1.0, anchor='sw', height=height)

            self.btn_fullpage.config(text="⛶ Maximize")
            self._fullpage = False

    def _on_pan(self) -> None:
        if self.plotter and self.is_manual:
            self.plotter.set_interaction_mode('pan')
            self._update_mode_label("Manual: Pan" if self.plotter.toolbar.mode == 'pan/zoom' else "Manual: Idle")

    def _on_zoom(self) -> None:
        if self.plotter and self.is_manual:
            self.plotter.set_interaction_mode('zoom')
            self._update_mode_label("Manual: Zoom" if self.plotter.toolbar.mode == 'zoom rect' else "Manual: Idle")

    def _on_reset(self) -> None:
        if self.plotter and self.is_manual:
            self.plotter.reset_scale()
            if self.plotter.toolbar.mode == 'pan/zoom':
                self.plotter.toolbar.pan()
            elif self.plotter.toolbar.mode == 'zoom rect':
                self.plotter.toolbar.zoom()
            self._update_mode_label("Manual: Idle")

    def _on_back(self) -> None:
        if self.plotter and self.is_manual:
            self.plotter.history_back()
            self._update_mode_label("Manual: Hist Back")

    def _on_forward(self) -> None:
        if self.plotter and self.is_manual:
            self.plotter.history_forward()
            self._update_mode_label("Manual: Hist Forward")

    def _update_mode_label(self, mode: str) -> None:
        if self.mode_label and self.mode_label.winfo_exists():
            self.mode_label.config(text=f"Mode: {mode}")

    def _attach_canvas_engine(self, task_index: int) -> None:
        if not self.plot_container:
            return
        for child in self.plot_container.winfo_children():
            child.destroy()

        try:
            self.plotter = InteractivePlotCanvas(
                parent=self.plot_container,
                controller=self.controller,
                task_index=task_index,
                log_fn=self._write_console
            )
            self.plotter.pack(fill='both', expand=True)
            self.plotter.request_lod_data(initial_load=True)
            self._update_mode_label("Manual: Idle")
        except Exception as err:
            self._write_console(f"❌ Initialization error: {err}")

    def _save_image(self) -> None:
        if not self.plotter:
            return
        target_file = filedialog.asksaveasfilename(defaultextension=".png",
                                                   filetypes=[("PNG Image", "*.png")])
        if target_file and self.plotter.export_to_file(target_file):
            messagebox.show_info("Success", f"Chart exported to:\n{target_file}", parent=self.controller.root)

    def _change_bg_color(self) -> None:
        if self.plotter and (c := colorchooser.askcolor(title="Plot Background")[1]):
            self.plotter.plot_bg_color = c
            self.plotter.fig.patch.set_facecolor(c)
            self.plotter.ax.set_facecolor(c)
            self.plotter._format_axes()
            self.plotter.canvas.draw_idle()

    def _change_line_color(self) -> None:
        if self.plotter and (c := colorchooser.askcolor(title="Line Color")[1]):
            self.plotter.color_cycle[0] = c
            self.plotter.request_lod_data()

    def _change_text_color(self) -> None:
        if self.plotter and (c := colorchooser.askcolor(title="Text Color")[1]):
            self.plotter.text_color = c
            self.plotter._format_axes()
            self.plotter.canvas.draw_idle()

    def _change_grid_color(self) -> None:
        if self.plotter and (c := colorchooser.askcolor(title="Grid Color")[1]):
            self.plotter.grid_color = c
            self.plotter.grid_visible = True
            self.plotter._format_axes()
            self.plotter.canvas.draw_idle()

    def _go_back(self) -> None:
        self.controller.navigate_to_task_page()

    def _go_home(self) -> None:
        self.controller.navigate_to_file_page()

    def _write_console(self, text_message: str) -> None:
        if hasattr(self.controller, 'console') and self.controller.console is not None:
            self.controller.console.write(text_message)
