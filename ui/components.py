import tkinter as tk
import numpy as np
from tkinter import ttk
from typing import Any, Dict, Optional, Callable, Tuple, List
from . import style, config

try:
    import matplotlib
    matplotlib.use('TkAgg')
    from matplotlib.figure import Figure
    from matplotlib.lines import Line2D
    from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg, NavigationToolbar2Tk
    MATPLOTLIB_AVAILABLE = True
except ImportError:
    MATPLOTLIB_AVAILABLE = False

class ThemedButton(tk.Button):
    def __init__(self, parent, text, command=None, is_primary=False, **kwargs):
        cfg = style.get_button_style(is_primary)
        cfg.update(kwargs)
        # Force a visible border that matches the current text color
        cfg['highlightthickness'] = 2
        cfg['highlightbackground'] = style.COLORS['text_primary']
        cfg['highlightcolor'] = style.COLORS['accent']
        super().__init__(parent, text=text, command=command, **cfg)
        self.default_bg = cfg['bg']
        self.hover_bg = cfg['activebackground']
        self.bind('<Enter>', self._on_enter)
        self.bind('<Leave>', self._on_leave)
    def _on_enter(self, e): self.configure(bg=self.hover_bg)
    def _on_leave(self, e): self.configure(bg=self.default_bg)
    
class ThemedLabel(tk.Label):
    def __init__(self, parent, text="", style_type='normal', **kwargs):
        cfg = style.get_label_style(style_type)
        cfg.update(kwargs)
        super().__init__(parent, text=text, **cfg)

class ThemedFrame(tk.Frame):
    def __init__(self, parent, frame_type='default', **kwargs):
        styles = {
            'default': {'bg': style.COLORS['bg_card'], 'highlightthickness': 0},
            'card': {'bg': style.COLORS['bg_card_light'], 'bd': 1, 'relief': 'solid', 'highlightthickness': 0},
            'input': {'bg': style.COLORS['bg_input'], 'bd': 1, 'relief': 'solid'},
        }
        cfg = styles.get(frame_type, styles['default'])
        cfg.update(kwargs)
        super().__init__(parent, **cfg)

class ThemedEntry(tk.Entry):
    def __init__(self, parent, placeholder="", **kwargs):
        super().__init__(parent, bg=style.COLORS['bg_input'], fg=style.COLORS['text_primary'],
                         insertbackground=style.COLORS['accent'], relief='solid', bd=1,
                         highlightthickness=0, font=('Segoe UI', 10), **kwargs)
        self.placeholder = placeholder
        self._insert_placeholder()
        self.bind('<FocusIn>', self._clear_placeholder)
        self.bind('<FocusOut>', self._insert_placeholder)
    def _insert_placeholder(self, event=None):
        if not self.get():
            self.config(fg=style.COLORS['text_muted'])
            self.insert(0, self.placeholder)
    def _clear_placeholder(self, event):
        if self.get() == self.placeholder:
            self.delete(0, tk.END)
            self.config(fg=style.COLORS['text_primary'])
    def get_value(self):
        val = self.get()
        return '' if val == self.placeholder else val

class FileInputFrame(tk.Frame):
    def __init__(self, parent, on_browse=None, placeholder="Select file..."):
        super().__init__(parent, bg=style.COLORS['bg_card'], bd=1, relief='solid')
        self.entry = ThemedEntry(self, placeholder=placeholder)
        self.entry.pack(side='left', fill='both', expand=True, padx=4, pady=4)
        self.browse_btn = ThemedButton(self, text="📁 Browse", command=on_browse, is_primary=False)
        self.browse_btn.pack(side='right', padx=4, pady=4)
    def set_value(self, val):
        self.entry.delete(0, tk.END)
        self.entry.insert(0, val)
        self.entry.config(fg=style.COLORS['text_primary'])
    def get_value(self):
        return self.entry.get_value()

class ScrollableFrame(tk.Frame):
    def __init__(self, parent, **kwargs):
        super().__init__(parent, **kwargs)
        self.canvas = tk.Canvas(self, bg=style.COLORS['bg_card_light'], highlightthickness=0)
        scrollbar = tk.Scrollbar(self, orient='vertical', command=self.canvas.yview)
        scrollbar.pack(side='right', fill='y')
        self.canvas.pack(side='left', fill='both', expand=True)
        self.canvas.config(yscrollcommand=scrollbar.set)
        self.content_frame = tk.Frame(self.canvas, bg=style.COLORS['bg_card_light'])
        self.canvas_window = self.canvas.create_window((0,0), window=self.content_frame, anchor='nw')
        self.content_frame.bind('<Configure>', self._on_configure)
        self.canvas.bind('<Configure>', self._on_canvas_configure)
        self.canvas.bind('<Enter>', lambda e: self.canvas.bind_all('<MouseWheel>', self._on_mousewheel))
        self.canvas.bind('<Leave>', lambda e: self.canvas.unbind_all('<MouseWheel>'))
    def _on_configure(self, e):
        self.canvas.configure(scrollregion=self.canvas.bbox('all'))
    def _on_canvas_configure(self, e):
        self.canvas.itemconfig(self.canvas_window, width=e.width)
    def _on_mousewheel(self, e):
        self.canvas.yview_scroll(int(-1*(e.delta/120)), 'units')

class ProgressIndicator(tk.Frame):
    def __init__(self, parent):
        super().__init__(parent, bg=style.COLORS['bg_dark'])
        self.label = tk.Label(self, text="Ready", fg=style.COLORS['text_secondary'],
                              bg=style.COLORS['bg_dark'], font=('Segoe UI', 9))
        self.label.pack(side='left', padx=10)
        self.progress = ttk.Progressbar(self, mode='determinate',maximum=100, length=200, style='TProgressbar')
        self.progress.pack(side='left', fill='x', expand=True, padx=10, pady=5)
    def set_text(self, t): self.label.config(text=t)
    def start(self): self.progress['value'] = 0
    def stop(self): self.progress['value'] = 100
    def set_value(self, val): self.progress['value'] = min(100.0, max(0.0, val))
    def update_theme(self):
        self.configure(bg=style.COLORS['bg_dark'])
        self.label.configure(bg=style.COLORS['bg_dark'], fg=style.COLORS['text_secondary'])

class TaskCard(tk.Frame):
    def __init__(self, parent, icon, name, on_execute=None, is_implemented=True, **kwargs):
        super().__init__(parent, bg=style.COLORS['bg_card_light'], bd=1, relief='solid', **kwargs)
        self.is_implemented = is_implemented
        self.on_execute = on_execute
        self.grid_propagate(False)
        self.configure(height=120, width=140)
        
        if is_implemented:
            self.config(cursor="hand2")
        
        # Inner content frame – this will change on hover
        self.content = tk.Frame(self, bg=style.COLORS['bg_card_light'])
        self.content.pack(fill='both', expand=True, padx=6, pady=6)
        
        icon_lbl = tk.Label(self.content, text=icon, font=('Segoe UI', 24), bg=style.COLORS['bg_card_light'], fg=style.COLORS['text_primary'])
        icon_lbl.pack(pady=2)
        
        name_lbl = tk.Label(self.content, text=name, font=('Segoe UI', 8), fg=style.COLORS['text_primary'],
                            bg=style.COLORS['bg_card_light'], wraplength=120, justify='center')
        name_lbl.pack()
        
        if not is_implemented:
            tk.Label(self.content, text="Soon", font=('Segoe UI', 6, 'italic'),
                     fg=style.COLORS['text_muted'], bg=style.COLORS['bg_card_light']).pack(pady=2)
        
        if is_implemented:
            # Bind events to both the outer frame and inner content (to catch all areas)
            for w in (self, self.content, icon_lbl, name_lbl):
                w.bind('<Button-1>', self._on_click)
                w.bind('<Enter>', self._on_enter)
                w.bind('<Leave>', self._on_leave)
    
    def _on_enter(self, event):
        if self.is_implemented:
            # Only change inner content background – outer frame stays the same (border stable)
            self.content.configure(bg=style.COLORS['hover'])
            for child in self.content.winfo_children():
                if isinstance(child, tk.Label):
                    child.configure(bg=style.COLORS['hover'])
    
    def _on_leave(self, event):
        if self.is_implemented:
            self.content.configure(bg=style.COLORS['bg_card_light'])
            for child in self.content.winfo_children():
                if isinstance(child, tk.Label):
                    child.configure(bg=style.COLORS['bg_card_light'])
    
    def _on_click(self, event):
        if self.is_implemented and self.on_execute:
            self.on_execute()

class ConsoleOutput(tk.Frame):
    """Modern console with gradient-like header and clean borders."""
    def __init__(self, parent):
        super().__init__(parent, bg=style.COLORS['bg_console'], bd=1, relief='solid', highlightthickness=0)
        self._expanded = True
        self._min_height = 36
        self._max_height = 320

        # Header with accent border
        self.header = tk.Frame(self, bg=style.COLORS['bg_card_light'], height=36)
        self.header.pack(fill='x')
        self.header.pack_propagate(False)

        # Left accent line
        accent_line = tk.Frame(self.header, bg=style.COLORS['accent'], width=4)
        accent_line.pack(side='left', fill='y')

        tk.Label(self.header, text="⚡ CONSOLE OUTPUT", fg=style.COLORS['accent_light'],
                 bg=style.COLORS['bg_card_light'], font=('Segoe UI', 9, 'bold')).pack(side='left', padx=12)

        btn_frame = tk.Frame(self.header, bg=style.COLORS['bg_card_light'])
        btn_frame.pack(side='right', padx=8)

        self.clear_btn = tk.Button(btn_frame, text="🗑 Clear", command=self.clear,
            bg=style.COLORS['bg_card_light'], fg=style.COLORS['text_secondary'],
            activebackground=style.COLORS['hover'], relief='flat', cursor='hand2', padx=10, pady=4)
        self.clear_btn.pack(side='left', padx=4)

        self.toggle_btn = tk.Button(btn_frame, text="▼", command=self.toggle,
            bg=style.COLORS['bg_card_light'], fg=style.COLORS['text_secondary'],
            activebackground=style.COLORS['hover'], relief='flat', cursor='hand2', padx=10, pady=4)
        self.toggle_btn.pack(side='left', padx=4)

        # Text area with border
        self.text_frame = tk.Frame(self, bg=style.COLORS['bg_console'])
        self.text_frame.pack(fill='both', expand=True, padx=1, pady=1)

        scrollbar = tk.Scrollbar(self.text_frame)
        scrollbar.pack(side='right', fill='y')

        self.text = tk.Text(self.text_frame, bg=style.COLORS['bg_console'], fg=style.COLORS['text_secondary'],
                            font=('Consolas', 9), wrap=tk.WORD, relief='flat', bd=0,
                            yscrollcommand=scrollbar.set, padx=8, pady=6)
        self.text.pack(fill='both', expand=True)
        scrollbar.config(command=self.text.yview)
        self.text.config(state=tk.DISABLED)

    def toggle(self):
        if self._expanded:
            self.text_frame.pack_forget()
            self.configure(height=self._min_height)
            self.toggle_btn.config(text="▲")
        else:
            self.text_frame.pack(fill='both', expand=True, padx=1, pady=1)
            self.configure(height=self._max_height)
            self.toggle_btn.config(text="▼")
        self._expanded = not self._expanded

    def write(self, msg):
        self.text.config(state=tk.NORMAL)
        self.text.insert(tk.END, msg + '\n')
        self.text.see(tk.END)
        self.text.config(state=tk.DISABLED)

    def clear(self):
        self.text.config(state=tk.NORMAL)
        self.text.delete(1.0, tk.END)
        self.text.config(state=tk.DISABLED)

    def update_theme(self):
        self.configure(bg=style.COLORS['bg_console'])
        self.header.configure(bg=style.COLORS['bg_card_light'])
        for child in self.header.winfo_children():
            if isinstance(child, tk.Label):
                child.configure(bg=style.COLORS['bg_card_light'])
            elif isinstance(child, tk.Frame):
                child.configure(bg=style.COLORS['bg_card_light'])
                for btn in child.winfo_children():
                    btn.configure(bg=style.COLORS['bg_card_light'], fg=style.COLORS['text_secondary'])
        self.text_frame.configure(bg=style.COLORS['bg_console'])
        self.text.configure(bg=style.COLORS['bg_console'], fg=style.COLORS['text_secondary'])

class InteractivePlotCanvas(tk.Frame):
    def __init__(
        self, 
        parent: tk.Misc, 
        controller: Any, 
        task_index: int, 
        log_fn: Optional[Callable[[str], None]] = None, 
        **kwargs: Any
    ) -> None:
        super().__init__(parent, bg=style.COLORS['bg_card'], **kwargs)
        self.controller = controller  # Direct access to the app orchestrator
        self.task_index: int = task_index
        self.log_fn: Optional[Callable[[str], None]] = log_fn
        
        self.fig: Optional[Figure] = None
        self.ax: Optional[matplotlib.axes.Axes] = None
        self.canvas: Optional[FigureCanvasTkAgg] = None
        
        self.grid_visible: bool = True
        self.max_display_points: int = 2000
        self._dragging: bool = False
        self._last_mouse_pos: Optional[Tuple[float, float]] = None
        self._debounce_job: Optional[str] = None
        
        self._lines: Dict[str, Line2D] = {}

        self.plot_bg_color: str = style.COLORS.get('bg_card_light', '#1A202C')
        self.text_color: str = style.COLORS.get('text_primary', '#FFFFFF')
        self.grid_color: str = style.COLORS.get('text_muted', '#9CA3AF')
        self.spine_color: str = style.COLORS.get('border', '#374151')

        self.color_cycle: List[str] = ['#FF4400', '#00E5FF', '#00FF7F', '#FF00FF', '#FFD700']

        if MATPLOTLIB_AVAILABLE:
            self._initialize_canvas()
        else:
            self._log("Initialization failed: matplotlib is unavailable.")

    def _initialize_canvas(self) -> None:
        self.fig = Figure(figsize=(6, 4), dpi=100, facecolor=style.COLORS['bg_card'])
        self.ax = self.fig.add_subplot(111, facecolor=self.plot_bg_color)
        
        self.request_lod_data(initial_load=True)
        
        self.canvas = FigureCanvasTkAgg(self.fig, master=self)
        self.canvas.draw()
        self.canvas.get_tk_widget().pack(fill='both', expand=True)

        self.toolbar_frame = tk.Frame(self, bg=self.plot_bg_color, height=35)
        self.toolbar_frame.pack(fill='x')
        NavigationToolbar2Tk(self.canvas, self.toolbar_frame).update()

        self.canvas.mpl_connect("scroll_event", self._on_scroll)
        self.canvas.mpl_connect("button_press_event", self._on_press)
        self.canvas.mpl_connect("button_release_event", self._on_release)
        self.canvas.mpl_connect("motion_notify_event", self._on_move)

    def request_lod_data(self, initial_load: bool = False) -> None:
        if not self.ax or not self.fig: return

        x_bounds = None if initial_load else self.ax.get_xlim()

        # Securely pass the State and bounds to the Extraction Service
        multi_file_data = self.controller.extraction_service.get_plot_data(
            state=self.controller.state,
            visible_time_bounds=x_bounds,
            max_points_budget=self.max_display_points
        )

        if multi_file_data:
            self._update_lines(multi_file_data)
        else:
            # Fallback/Empty state rendering
            x = np.linspace(x_bounds[0] if x_bounds else 0, x_bounds[1] if x_bounds else 100, 500)
            sample_data = {"Awaiting Data Validation": (x, np.zeros_like(x))}
            self._update_lines(sample_data)
            self.ax.set_title("No valid data returned for this task.", color=style.COLORS['text_muted'], fontsize=10, style='italic')

        self.apply_theme_properties()

        if initial_load:
            self.ax.autoscale()
            self.fig.tight_layout()
            
        if self.canvas:
            self.canvas.draw_idle()

    def _update_lines(self, data_dict: Dict[str, Tuple[np.ndarray, np.ndarray]]) -> None:
        current_names = set(data_dict.keys())
        existing_names = set(self._lines.keys())

        for removed in existing_names - current_names:
            self._lines[removed].remove()
            del self._lines[removed]

        for idx, (file_name, (x_arr, y_arr)) in enumerate(data_dict.items()):
            if file_name in self._lines:
                self._lines[file_name].set_data(x_arr, y_arr)
            else:
                color = self.color_cycle[idx % len(self.color_cycle)]
                line, = self.ax.plot(
                    x_arr, y_arr, 
                    label=file_name, color=color, 
                    linewidth=1.5, marker='o', markersize=2, alpha=0.85
                )
                self._lines[file_name] = line

        self.ax.set_xlabel("Time Bounds (s)", color=self.text_color, fontsize=9)
        self.ax.set_ylabel("Measured Data Range", color=self.text_color, fontsize=9)
        if len(self._lines) > 0:
            legend = self.ax.legend(facecolor=style.COLORS['bg_card_light'], edgecolor=style.COLORS['border'])
            for text in legend.get_texts():
                text.set_color(self.text_color)

    def _schedule_lod_update(self) -> None:
        if self._debounce_job:
            self.after_cancel(self._debounce_job)
        self._debounce_job = self.after(250, lambda: self.request_lod_data(initial_load=False))

    def _on_scroll(self, event: Any) -> None:
        if not event.inaxes or not self.ax or not self.canvas: return
        scale_factor = 1/1.2 if event.button == 'up' else 1.2 if event.button == 'down' else 1.0
        xl, yl = self.ax.get_xlim(), self.ax.get_ylim()
        xc, yc = event.xdata or (xl[0]+xl[1])/2, event.ydata or (yl[0]+yl[1])/2
        
        self.ax.set_xlim([xc - (xc - xl[0]) * scale_factor, xc + (xl[1] - xc) * scale_factor])
        self.ax.set_ylim([yc - (yc - yl[0]) * scale_factor, yc + (yl[1] - yc) * scale_factor])
        self.canvas.draw_idle()
        self._schedule_lod_update()

    def _on_press(self, event: Any) -> None:
        if event.inaxes and event.button == 1:
            self._dragging = True
            self._last_mouse_pos = (event.x, event.y)

    def _on_release(self, event: Any) -> None:
        if self._dragging:
            self._dragging = False
            self._last_mouse_pos = None
            self._schedule_lod_update()

    def _on_move(self, event: Any) -> None:
        if not self._dragging or not event.inaxes or not self._last_mouse_pos or not self.ax or not self.canvas: return
        xl, yl = self.ax.get_xlim(), self.ax.get_ylim()
        bbox = self.ax.get_window_extent()
        
        dx = (event.x - self._last_mouse_pos[0]) * (xl[1] - xl[0]) / bbox.width
        dy = (event.y - self._last_mouse_pos[1]) * (yl[1] - yl[0]) / bbox.height
        
        self.ax.set_xlim(xl[0] - dx, xl[1] - dx)
        self.ax.set_ylim(yl[0] - dy, yl[1] - dy)
        self._last_mouse_pos = (event.x, event.y)
        self.canvas.draw_idle()

    def toggle_grid(self) -> bool:
        self.grid_visible = not self.grid_visible
        self.apply_theme_properties()
        if self.canvas: self.canvas.draw_idle()
        return self.grid_visible

    def reset_scale(self) -> None:
        if self.ax and self.canvas:
            self.ax.relim()
            self.ax.autoscale()
            self.canvas.draw_idle()

    def export_to_file(self, target_path: str) -> bool:
        if self.fig:
            self.fig.savefig(target_path, dpi=300, bbox_inches='tight', facecolor=style.COLORS['bg_card'])
            return True
        return False

    def _log(self, message: str) -> None:
        if self.log_fn:
            self.log_fn(message)
    
    def apply_theme_properties(self) -> None:
        if not self.ax: return
        self.ax.set_facecolor(self.plot_bg_color)
        self.ax.grid(self.grid_visible, color=self.grid_color, linestyle='--', linewidth=0.5)
        
        self.ax.xaxis.label.set_color(self.text_color)
        self.ax.yaxis.label.set_color(self.text_color)
        if self.ax.title:
            self.ax.title.set_color(self.text_color)
        self.ax.tick_params(colors=self.text_color, which='both')
        for spine in self.ax.spines.values():
            spine.set_color(self.spine_color)
        legend = self.ax.get_legend()
        if legend:
            legend.get_frame().set_facecolor(style.COLORS.get('bg_card_light', '#1A202C'))
            legend.get_frame().set_edgecolor(style.COLORS.get('border', '#374151'))
            for text in legend.get_texts():
                text.set_color(self.text_color)

class NoBackendDisplay(tk.Frame):
    """Fallback UI view rendered automatically when visualization backends are missing."""
    def __init__(self, parent: tk.Misc, **kwargs: Any) -> None:
        super().__init__(parent, bg=style.COLORS['bg_card'], **kwargs)
        
        tk.Label(self, text="📊", fg=style.COLORS['error'], bg=style.COLORS['bg_card'], font=("Segoe UI", 44)).pack(pady=(30, 5))
        tk.Label(self, text="No Graphing Backend Available", fg=style.COLORS['text_primary'], bg=style.COLORS['bg_card'], font=("Segoe UI", 13, "bold")).pack(pady=5)
        tk.Label(self, text="Install visualization modules to view runtime graphics:\npip install matplotlib", 
                 fg=style.COLORS['text_secondary'], bg=style.COLORS['bg_card'], font=("Segoe UI", 9), justify="center").pack(pady=10)

class PlotErrorDisplay(tk.Frame):
    """Graceful error container displayed if parsing data components hits a snag."""
    def __init__(self, parent: tk.Misc, exception_msg: str, **kwargs: Any) -> None:
        super().__init__(parent, bg=style.COLORS['bg_card'], **kwargs)
        
        tk.Label(self, text="⚠️", fg=style.COLORS['error'], bg=style.COLORS['bg_card'], font=("Segoe UI", 44)).pack(pady=(30, 5))
        tk.Label(self, text="Pipeline Drawing Failure", fg=style.COLORS['error'], bg=style.COLORS['bg_card'], font=("Segoe UI", 13, "bold")).pack(pady=5)
        tk.Label(self, text=f"Details: {exception_msg}", fg=style.COLORS['text_secondary'], bg=style.COLORS['bg_card'], font=("Segoe UI", 9), wraplength=380, justify="center").pack(pady=10)