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
from ..components import (
    InteractivePlotCanvas, 
    NoBackendDisplay, 
    PlotErrorDisplay, 
    MATPLOTLIB_AVAILABLE
)


class GraphPage(BasePage):
    """
    A view controller page that manages the sidebar control panels, navigation triggers,
    and interactive plot layouts for the current analytical tracking metrics.
    """
    def __init__(self, parent: tk.Misc, controller: Any) -> None:
        self.plotter: Optional[InteractivePlotCanvas] = None
        self.plot_container: Optional[tk.Frame] = None
        self.title_label: Optional[tk.Label] = None
        super().__init__(parent, controller)

    def setup_ui(self) -> None:
        """Constructs the visual components, layout grids, and interactive sidebars."""
        # Main structure container frame matching core layout theme
        main_frame = tk.Frame(self, bg=style.COLORS['bg_card'])
        main_frame.pack(fill='both', expand=True, padx=10, pady=10)

        # Left side main panel wrapper slot for chart placement
        plot_frame = tk.Frame(main_frame, bg=style.COLORS['bg_card_light'])
        plot_frame.pack(side='left', fill='both', expand=True)

        # Header bar frame containing structural title and navigation
        header_bar = tk.Frame(plot_frame, bg=style.COLORS['bg_card_light'], height=40)
        header_bar.pack(fill='x', pady=(0, 5))
        header_bar.pack_propagate(False)

        # Safely extract currently selected task description name strings
        current_task_idx: int = self.controller.state.current_task if self.controller.state.current_task is not None else 0
        task_title: str = (
            config.TASKS[current_task_idx] 
            if current_task_idx < len(config.TASKS) 
            else "Analysis View Frame"
        )

        self.title_label = tk.Label(
            header_bar, 
            text=task_title, 
            fg=style.COLORS['text_primary'], 
            bg=style.COLORS['bg_card_light'],
            font=('Segoe UI', 12, 'bold')
        )
        self.title_label.pack(side='left', padx=10)

        # Navigation controls button sub-frame block
        nav_frame = tk.Frame(header_bar, bg=style.COLORS['bg_card_light'])
        nav_frame.pack(side='right', padx=5)
        
        tk.Button(
            nav_frame, text="← Back", command=self._go_back, 
            bg=style.COLORS['bg_card'], fg=style.COLORS['text_primary'],
            activebackground=style.COLORS['accent'], activeforeground='white',
            relief='flat', padx=12, pady=4, cursor='hand2'
        ).pack(side='left', padx=2)
        
        tk.Button(
            nav_frame, text="⌂ Home", command=self._go_home, 
            bg=style.COLORS['bg_card'], fg=style.COLORS['text_primary'],
            activebackground=style.COLORS['accent'], activeforeground='white',
            relief='flat', padx=12, pady=4, cursor='hand2'
        ).pack(side='left', padx=2)

        # Dedicated containment block frame where our custom plot component mounts
        self.plot_container = tk.Frame(plot_frame, bg=style.COLORS['bg_card'])
        self.plot_container.pack(fill='both', expand=True)

        # Instantiate action controls sidebar panel
        self._build_sidebar(main_frame)

        # Draw interactive graphical canvas or inject relevant fallbacks if missing dependencies
        self._attach_canvas_engine(current_task_idx)

    def _attach_canvas_engine(self, task_index: int) -> None:
        """Safely creates and attaches the appropriate interactive plot canvas to the view tree."""
        if not self.plot_container:
            return

        # Purge past stale child widget tracking allocations if any exist
        for child in self.plot_container.winfo_children():
            child.destroy()

        if not MATPLOTLIB_AVAILABLE:
            no_engine_view = NoBackendDisplay(self.plot_container)
            no_engine_view.pack(fill='both', expand=True)
            self._write_console("⚠️ Aborted plotting: Matplotlib backend dependencies are missing.")
            return

        try:
            # Instantiate interactive canvas directly mapped against active parsing states
            self.plotter = InteractivePlotCanvas(
                parent=self.plot_container,
                controller=self.controller,
                task_index=task_index,
                log_fn=self._write_console
            )
            self.plotter.pack(fill='both', expand=True)
        except Exception as err:
            error_view = PlotErrorDisplay(self.plot_container, str(err))
            error_view.pack(fill='both', expand=True)
            self._write_console(f"❌ Initialization error during chart generation: {err}")

    def _build_sidebar(self, parent: tk.Frame) -> None:
        """Generates tool parameters buttons list directly on the sidebar frame panel."""
        sidebar_frame = tk.Frame(parent, bg=style.COLORS['bg_card_light'], width=200)
        sidebar_frame.pack(side='right', fill='y', padx=(10, 0))
        sidebar_frame.pack_propagate(False)

        tk.Label(
            sidebar_frame, text="⚙️ Controls", fg=style.COLORS['accent'], 
            bg=style.COLORS['bg_card_light'], font=('Segoe UI', 10, 'bold')
        ).pack(pady=(10, 5), padx=10, anchor='w')
        
        tk.Frame(sidebar_frame, bg=style.COLORS['border'], height=1).pack(fill='x', padx=10, pady=5)

        # Interactive controls command map configuration tuples
        sidebar_controls: List[Tuple[str, Callable[[], None]]] = [
            ("💾 Save Image", self._save_image),
            ("⊞ Toggle Grid", self._toggle_grid),
            ("↔ Auto Scale", self._autoscale),
            ("🎨 Plot Background", self._change_bg_color),
            ("🖊 Line Color", self._change_line_color),
            ("📝 Text Color", self._change_text_color),
            ("🔲 Grid Color", self._change_grid_color),
            ("📐 Axis Color", self._change_spine_color),
        ]

        for button_text, command_func in sidebar_controls:
            btn = tk.Button(
                sidebar_frame, text=button_text, command=command_func,
                bg=style.COLORS['bg_card'], fg=style.COLORS['text_secondary'],
                activebackground=style.COLORS['accent'], activeforeground='white',
                relief='flat', anchor='w', padx=10, pady=6, cursor='hand2'
            )
            btn.pack(fill='x', padx=10, pady=3)
            
            # Safe binding closures to isolate visual pointer state interactions smoothly
            btn.bind("<Enter>", lambda e, target_btn=btn: target_btn.configure(bg=style.COLORS['accent'], fg='white'))
            btn.bind("<Leave>", lambda e, target_btn=btn: target_btn.configure(bg=style.COLORS['bg_card'], fg=style.COLORS['text_secondary']))

    def _go_back(self) -> None:
        self.controller.navigate_to_task_page()

    def _go_home(self) -> None:
        self.controller.navigate_to_file_page()

    def _toggle_grid(self) -> None:
        if self.plotter:
            is_visible: bool = self.plotter.toggle_grid()
            self._write_console(f"Grid state updated: visible -> {is_visible}")

    def _autoscale(self) -> None:
        if self.plotter:
            self.plotter.reset_scale()
            self._write_console("Canvas plotting coordinate boundaries normalized via Auto-Scale.")

    def _save_image(self) -> None:
        if not self.plotter:
            return
        target_file: str = filedialog.asksaveasfilename(
            defaultextension=".png", 
            filetypes=[("PNG Vector Frame Graphic", "*.png")]
        )
        if target_file:
            if self.plotter.export_to_file(target_file):
                self._write_console(f"Captured snapshot exported to file path location: {target_file}")
                messagebox.showinfo(
                    "Success", 
                    f"Chart layout captured and exported to file:\n{target_file}", 
                    parent=self.controller.root
                )

    def _change_bg_color(self) -> None:
        if not self.plotter: return
        chosen_color: Optional[str] = colorchooser.askcolor(title="Select Canvas View Background")[1]
        if chosen_color:
            self.plotter.plot_bg_color = chosen_color
            self.plotter.apply_theme_properties()
            if self.plotter.canvas: self.plotter.canvas.draw_idle()

    def _change_line_color(self) -> None:
        if not self.plotter or not self.plotter.ax: return
        chosen_color: Optional[str] = colorchooser.askcolor(title="Select Track Metrics Line Color")[1]
        if chosen_color:
            # Update the base color cycle and apply to all active plotted lines
            if self.plotter.color_cycle:
                self.plotter.color_cycle[0] = chosen_color
            for line in self.plotter._lines.values():
                line.set_color(chosen_color)
            if self.plotter.canvas: self.plotter.canvas.draw_idle()

    def _change_text_color(self) -> None:
        if not self.plotter: return
        chosen_color: Optional[str] = colorchooser.askcolor(title="Select Labels Typography Color")[1]
        if chosen_color:
            self.plotter.text_color = chosen_color
            self.plotter.apply_theme_properties()
            if self.plotter.canvas: self.plotter.canvas.draw_idle()

    def _change_grid_color(self) -> None:
        if not self.plotter: return
        chosen_color: Optional[str] = colorchooser.askcolor(title="Select Structural Coordinate Grid Color")[1]
        if chosen_color:
            self.plotter.grid_color = chosen_color
            self.plotter.apply_theme_properties()
            if self.plotter.canvas: self.plotter.canvas.draw_idle()

    def _change_spine_color(self) -> None:
        if not self.plotter: return
        chosen_color: Optional[str] = colorchooser.askcolor(title="Select Plot Axis Border Color")[1]
        if chosen_color:
            self.plotter.spine_color = chosen_color
            self.plotter.apply_theme_properties()
            if self.plotter.canvas: self.plotter.canvas.draw_idle()

    def _write_console(self, text_message: str) -> None:
        """Helper handler routing execution logging indicators to the status dashboard console interface panel."""
        if hasattr(self.controller, 'console') and self.controller.console is not None:
            self.controller.console.write(text_message)
        else:
            print(text_message)
