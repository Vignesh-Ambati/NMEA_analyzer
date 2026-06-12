"""
ui/pages/graph_page.py
──────────────────────
Layout view page for rendering and managing analytical data graphs.
"""

import tkinter as tk
from tkinter import filedialog, colorchooser, messagebox
from typing import Optional, Any, List, Tuple, Callable

from .base_page import BasePage
from .. import style, config
from ..components import InteractivePlotCanvas, PlotErrorDisplay

class GraphPage(BasePage):
    def __init__(self, parent: tk.Misc, controller: Any) -> None:
        super().__init__(parent, controller)
        
        self.plotter: Optional[InteractivePlotCanvas] = None
        self.plot_container: Optional[tk.Frame] = None
        self.title_label: Optional[tk.Label] = None
        self.is_maximized: bool = False

    def setup_ui(self) -> None:
        """Constructs the visual components, layout grids, and interactive sidebars."""
        self.main_frame = tk.Frame(self, bg=style.COLORS['bg_card'])
        self.main_frame.pack(fill='both', expand=True, padx=10, pady=10)

        self.plot_frame = tk.Frame(self.main_frame, bg=style.COLORS['bg_card_light'])
        self.plot_frame.pack(side='left', fill='both', expand=True)

        self.header_bar = tk.Frame(self.plot_frame, bg=style.COLORS['bg_card_light'], height=40)
        self.header_bar.pack(fill='x', pady=(0, 5))
        self.header_bar.pack_propagate(False)

        current_task_idx: int = self.controller.state.current_task if self.controller.state.current_task is not None else 0
        task_title: str = config.TASKS[current_task_idx] if current_task_idx < len(config.TASKS) else "Analysis View Frame"

        self.title_label = tk.Label(
            self.header_bar, text=task_title, fg=style.COLORS['text_primary'], 
            bg=style.COLORS['bg_card_light'], font=('Segoe UI', 12, 'bold')
        )
        self.title_label.pack(side='left', padx=10)

        nav_frame = tk.Frame(self.header_bar, bg=style.COLORS['bg_card_light'])
        nav_frame.pack(side='right', padx=5)
        
        tk.Button(nav_frame, text="← Back", command=self._go_back, bg=style.COLORS['bg_card'], fg=style.COLORS['text_primary'], relief='flat', padx=12, pady=4, cursor='hand2').pack(side='left', padx=2)
        tk.Button(nav_frame, text="⌂ Home", command=self._go_home, bg=style.COLORS['bg_card'], fg=style.COLORS['text_primary'], relief='flat', padx=12, pady=4, cursor='hand2').pack(side='left', padx=2)

        self.plot_container = tk.Frame(self.plot_frame, bg=style.COLORS['bg_card'])
        self.plot_container.pack(fill='both', expand=True)

        self._build_sidebar(self.main_frame)
        self._attach_canvas_engine(current_task_idx)

    def _attach_canvas_engine(self, task_index: int) -> None:
        if not self.plot_container: return
        for child in self.plot_container.winfo_children(): child.destroy()

        try:
            self.plotter = InteractivePlotCanvas(
                parent=self.plot_container, controller=self.controller,
                task_index=task_index, log_fn=self._write_console
            )
            self.plotter.pack(fill='both', expand=True)
            
            # THE FIX: Tell Datashader to calculate bounds and render the image immediately
            self.plotter.reset_scale()
                
        except Exception as err:
            self._write_console(f"❌ Initialization error: {err}")
            
    def _build_sidebar(self, parent: tk.Frame) -> None:
        self.sidebar_frame = tk.Frame(parent, bg=style.COLORS['bg_card_light'], width=200)
        self.sidebar_frame.pack(side='right', fill='y', padx=(10, 0))
        self.sidebar_frame.pack_propagate(False)

        tk.Label(self.sidebar_frame, text="⚙️ Graph Matrix", fg=style.COLORS['accent'], bg=style.COLORS['bg_card_light'], font=('Segoe UI', 10, 'bold')).pack(pady=(10, 5), padx=10, anchor='w')
        tk.Frame(self.sidebar_frame, bg=style.COLORS['border'], height=1).pack(fill='x', padx=10, pady=5)

        # Integrating all Matplotlib functional requests strictly into the sidebar
        sidebar_controls: List[Tuple[str, Callable[[], None]]] = [
            ("⛶ Maximize Plot", self._toggle_maximize),
            ("✋ Pan Data", lambda: self.plotter.set_interaction_mode('pan') if self.plotter else None),
            ("🔍 Zoom Box", lambda: self.plotter.set_interaction_mode('zoom') if self.plotter else None),
            ("🏠 Reset Axis", self._autoscale),
            ("⏪ Step Back", lambda: self.plotter.history_back() if self.plotter else None),
            ("⏩ Step Forward", lambda: self.plotter.history_forward() if self.plotter else None),
            ("🎨 Theme & Colors", self._open_theme_popup),
            ("💾 Export Frame", self._save_image),
        ]

        for button_text, command_func in sidebar_controls:
            btn = tk.Button(
                self.sidebar_frame, text=button_text, command=command_func,
                bg=style.COLORS['bg_card'], fg=style.COLORS['text_secondary'],
                activebackground=style.COLORS['accent'], activeforeground='white',
                relief='flat', anchor='w', padx=10, pady=5, cursor='hand2'
            )
            btn.pack(fill='x', padx=10, pady=2)
            btn.bind("<Enter>", lambda e, target_btn=btn: target_btn.configure(bg=style.COLORS['accent'], fg='white'))
            btn.bind("<Leave>", lambda e, target_btn=btn: target_btn.configure(bg=style.COLORS['bg_card'], fg=style.COLORS['text_secondary']))

    def _toggle_maximize(self) -> None:
        """Expands the plot to fill the entire GUI window."""
        if not self.is_maximized:
            self.sidebar_frame.pack_forget()
            self.header_bar.pack_forget()
            if hasattr(self.controller, 'console') and self.controller.console._expanded:
                self.controller.console.toggle()
            self.is_maximized = True
        else:
            self.sidebar_frame.pack(side='right', fill='y', padx=(10, 0))
            self.header_bar.pack(fill='x', pady=(0, 5))
            if hasattr(self.controller, 'console') and not self.controller.console._expanded:
                self.controller.console.toggle()
            self.is_maximized = False

    def _open_theme_popup(self) -> None:
        popup = tk.Toplevel(self.winfo_toplevel())
        popup.title("Theme & Colors")
        popup.geometry("260x340")
        popup.configure(bg=style.COLORS['bg_card'])
        popup.transient(self.winfo_toplevel())
        popup.grab_set()

        popup.update_idletasks()
        x = self.winfo_toplevel().winfo_x() + (self.winfo_toplevel().winfo_width() // 2) - 130
        y = self.winfo_toplevel().winfo_y() + (self.winfo_toplevel().winfo_height() // 2) - 170
        popup.geometry(f"+{x}+{y}")

        tk.Label(popup, text="🎨 Appearance Settings", fg=style.COLORS['accent'], bg=style.COLORS['bg_card'], font=('Segoe UI', 11, 'bold')).pack(pady=(15, 10))
        tk.Frame(popup, bg=style.COLORS['border'], height=1).pack(fill='x', padx=20, pady=(0, 10))

        color_controls = [
            ("🎨 Plot Background", self._change_bg_color),
            ("🖊 Line Color", self._change_line_color),
            ("📝 Text Color", self._change_text_color),
            ("🔲 Grid Color", self._change_grid_color)
        ]

        for text, cmd in color_controls:
            btn = tk.Button(popup, text=text, command=cmd, bg=style.COLORS['bg_card_light'], fg=style.COLORS['text_primary'], relief='flat', anchor='w', padx=15, pady=8, cursor='hand2')
            btn.pack(fill='x', padx=20, pady=4)

        tk.Button(popup, text="Close", command=popup.destroy, bg=style.COLORS['bg_card'], fg=style.COLORS['text_muted'], relief='flat', cursor='hand2').pack(pady=(10, 5))

    def _go_back(self) -> None: self.controller.navigate_to_task_page()
    def _go_home(self) -> None: self.controller.navigate_to_file_page()
    def _autoscale(self) -> None:
        if self.plotter: self.plotter.reset_scale()

    def _save_image(self) -> None:
        if not self.plotter: return
        target_file = filedialog.asksaveasfilename(defaultextension=".png", filetypes=[("PNG Image", "*.png")])
        if target_file and self.plotter.export_to_file(target_file):
            messagebox.showinfo("Success", f"Chart exported to:\n{target_file}", parent=self.controller.root)

    def _change_bg_color(self) -> None:
        if self.plotter and (c := colorchooser.askcolor(title="Plot Background")[1]):
            self.plotter.plot_bg_color = c; self.plotter._draw_canvas_overlay(self.plotter._cached_pil_img)
    def _change_line_color(self) -> None:
        if self.plotter and (c := colorchooser.askcolor(title="Line Color")[1]):
            self.plotter.color_cycle[0] = c; self.plotter.request_lod_data(initial_load=False)
    def _change_text_color(self) -> None:
        if self.plotter and (c := colorchooser.askcolor(title="Text Color")[1]):
            self.plotter.text_color = c; self.plotter._draw_canvas_overlay(self.plotter._cached_pil_img)
    def _change_grid_color(self) -> None:
        if self.plotter and (c := colorchooser.askcolor(title="Grid Color")[1]):
            self.plotter.grid_color = c; self.plotter.grid_visible = True; self.plotter._draw_canvas_overlay(self.plotter._cached_pil_img)

    def _write_console(self, text_message: str) -> None:
        if hasattr(self.controller, 'console') and self.controller.console is not None:
            self.controller.console.write(text_message)
        else: print(text_message)
