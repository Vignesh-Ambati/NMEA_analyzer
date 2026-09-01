import os
import time
import datetime
import threading
import numpy as np
import tkinter as tk
from PIL import Image
from tkinter import ttk, messagebox, filedialog, colorchooser
from matplotlib.figure import Figure
from typing import Any, Callable, Dict, List, Optional, Tuple
from matplotlib.ticker import FuncFormatter, StrMethodFormatter, MaxNLocator
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg, NavigationToolbar2Tk
from matplotlib.lines import Line2D

from . import (
    _UiStylingPage,
    _UiCofigurationPage
)

class Tooltip:
    """A lightweight tooltip for Tkinter widgets."""
    def __init__(self, widget: tk.Widget, text: str, condition_fn: Optional[Callable[[], bool]] = None):
        self.widget = widget
        self.text = text
        self.condition_fn = condition_fn
        self.tooltip_window = None
        self.id = None
        # Using add='+' ensures we don't overwrite existing Enter/Leave bindings
        self.widget.bind("<Enter>", self.schedule, add='+')
        self.widget.bind("<Leave>", self.hide, add='+')
        self.widget.bind("<ButtonPress>", self.hide, add='+')

    def schedule(self, event=None) -> None:
        if self.condition_fn and not self.condition_fn():
            return
        self.id = self.widget.after(500, self.show)

    def show(self, event=None) -> None:
        if self.condition_fn and not self.condition_fn():
            return
        
        # Calculate position to pop out directly to the right of the widget
        x = self.widget.winfo_rootx() + self.widget.winfo_width() + 5
        y = self.widget.winfo_rooty() + (self.widget.winfo_height() // 2) - 12
        
        self.tooltip_window = tw = tk.Toplevel(self.widget)
        tw.wm_overrideredirect(True)
        tw.wm_geometry(f"+{x}+{y}")
        
        bg_color = _UiStylingPage.COLORS.get('bg_card_elevated', '#212E3D')
        fg_color = _UiStylingPage.COLORS.get('text_primary', '#F8FAFC')
        
        label = tk.Label(tw, text=self.text, background=bg_color, foreground=fg_color, 
                         relief='solid', borderwidth=1, font=_UiStylingPage.get_font(9))
        label.pack(ipadx=6, ipady=3)

    def hide(self, event=None) -> None:
        if self.id:
            self.widget.after_cancel(self.id)
            self.id = None
        if self.tooltip_window:
            self.tooltip_window.destroy()
            self.tooltip_window = None


class ThemedButton(tk.Button):
    def __init__(self, parent, text, command=None, is_primary=False, tooltip=None, tooltip_condition=None, **kwargs):
        cfg = _UiStylingPage.get_button_style(is_primary)
        cfg.update(kwargs)
        cfg['highlightthickness'] = 2
        cfg['highlightbackground'] = _UiStylingPage.COLORS['border']
        cfg['highlightcolor'] = _UiStylingPage.COLORS['accent_hover']
        super().__init__(parent, text=text, command=command, **cfg)
        self.default_bg = cfg['bg']
        self.hover_bg = cfg['activebackground']
        self.bind('<Enter>', self._on_enter)
        self.bind('<Leave>', self._on_leave)
        
        # Attach tooltip natively if provided
        if tooltip:
            self._tooltip_obj = Tooltip(self, text=tooltip, condition_fn=tooltip_condition)

    def _on_enter(self, e):
        self.configure(bg=self.hover_bg, highlightcolor=_UiStylingPage.COLORS['accent_hover'])

    def _on_leave(self, e):
        self.configure(bg=self.default_bg, highlightcolor=_UiStylingPage.COLORS['accent_hover'])
        

class ThemedLabel(tk.Label):
    def __init__(self, parent, text="", style_type='normal', **kwargs):
        cfg = _UiStylingPage.get_label_style(style_type)
        cfg.update(kwargs)
        super().__init__(parent, text=text, **cfg)

class ThemedFrame(tk.Frame):
    def __init__(self, parent, frame_type='default', **kwargs):
        styles = {
            'default': {'bg': _UiStylingPage.COLORS['bg_card'], 'highlightthickness': 0},
            'card': {'bg': _UiStylingPage.COLORS['bg_card_light'], 'bd': 1, 'relief': 'solid', 'highlightthickness': 0},
            'input': {'bg': _UiStylingPage.COLORS['bg_input'], 'bd': 1, 'relief': 'solid'},
        }
        cfg = styles.get(frame_type, styles['default'])
        cfg.update(kwargs)
        super().__init__(parent, **cfg)

class ThemedEntry(tk.Entry):
    def __init__(self, parent, placeholder="", **kwargs):
        super().__init__(parent, bg=_UiStylingPage.COLORS['bg_input'], fg=_UiStylingPage.COLORS['text_primary'],
                         insertbackground=_UiStylingPage.COLORS['accent'], relief='solid', bd=1,
                         highlightthickness=0, font=_UiStylingPage.get_font(10), **kwargs)
        self.placeholder = placeholder
        self._insert_placeholder()
        self.bind('<FocusIn>', self._clear_placeholder)
        self.bind('<FocusOut>', self._insert_placeholder)

    def _insert_placeholder(self, event=None):
        if not self.get():
            self.config(fg=_UiStylingPage.COLORS['text_muted'])
            self.insert(0, self.placeholder)

    def _clear_placeholder(self, event):
        if self.get() == self.placeholder:
            self.delete(0, tk.END)
            self.config(fg=_UiStylingPage.COLORS['text_primary'])

    def get_value(self):
        val = self.get()
        return '' if val == self.placeholder else val

class FileInputFrame(ThemedFrame):
    def __init__(self, parent, on_browse=None, placeholder="Select file..."):
        super().__init__(parent, bg=_UiStylingPage.COLORS['bg_card'], bd=1, relief='solid')
        self.entry = ThemedEntry(self, placeholder=placeholder)
        self.entry.pack(side='left', fill='both', expand=True, padx=4, pady=4)
        self.browse_btn = ThemedButton(self, text="  Browse", command=on_browse, is_primary=False)
        self.browse_btn.pack(side='right', padx=4, pady=4)

    def set_value(self, val):
        self.entry.delete(0, tk.END)
        self.entry.insert(0, val)
        self.entry.config(fg=_UiStylingPage.COLORS['text_primary'])

    def get_value(self):
        return self.entry.get_value()

class ScrollableFrame(ThemedFrame):
    def __init__(self, parent, **kwargs):
        super().__init__(parent, **kwargs)
        self.canvas = tk.Canvas(self, bg=_UiStylingPage.COLORS['bg_card_light'], highlightthickness=0)
        scrollbar = tk.Scrollbar(self, orient='vertical', command=self.canvas.yview)
        scrollbar.pack(side='right', fill='y')
        self.canvas.pack(side='left', fill='both', expand=True)
        self.canvas.config(yscrollcommand=scrollbar.set)

        self.content_frame = ThemedFrame(self.canvas, bg=_UiStylingPage.COLORS['bg_card_light'])
        self.canvas_window = self.canvas.create_window((0,0), window=self.content_frame, anchor='nw')

        self.content_frame.bind('<Configure>', self._on_configure)
        self.canvas.bind('<Configure>', self._on_canvas_configure)
        self.canvas.bind('<Enter>', lambda e: self.canvas.bind('<MouseWheel>', self._on_mousewheel))
        self.canvas.bind('<Leave>', lambda e: self.canvas.unbind('<MouseWheel>'))

    def _on_configure(self, e):
        self.canvas.configure(scrollregion=self.canvas.bbox('all'))

    def _on_canvas_configure(self, e):
        self.canvas.itemconfig(self.canvas_window, width=e.width)

    def _on_mousewheel(self, e):
        try:
            self.canvas.yview_scroll(int(-1*(e.delta/120)), 'units')
        except Exception:
            pass

class ProgressIndicator(ThemedFrame):
    def __init__(self, parent):
        super().__init__(parent, bg=_UiStylingPage.COLORS['bg_dark'])
        self.active_jobs: Dict[str, Dict[str, Any]] = {}
        self.display_keys: List[str] = []
        self.current_idx: int = 0
        self.rotation_timer: Optional[str] = None
        
        self.container = ThemedFrame(self, bg=_UiStylingPage.COLORS['bg_dark'])
        self.container.pack(fill='x', expand=True)
        
        self.label = ThemedLabel(self.container, text="Ready", fg=_UiStylingPage.COLORS['text_secondary'],
                              bg=_UiStylingPage.COLORS['bg_dark'], font=_UiStylingPage.get_font(9), width=45, anchor='w')
        self.label.pack(side='left', padx=10)
        
        self.progress = ttk.Progressbar(self.container, mode='determinate', maximum=100, style='TProgressbar')
        self.progress.pack(side='left', fill='x', expand=True, padx=10)

    def add_job(self, job_id: str, filename: str) -> None:
        if job_id not in self.active_jobs:
            self.active_jobs[job_id] = {"filename": filename, "pct": 0}
            self.display_keys.append(job_id)
            if len(self.display_keys) == 1:
                self._update_ui_for_current()
            elif not self.rotation_timer:
                self._rotate_display()

    def set_job_progress(self, job_id: str, percentage: float, filename: str) -> None:
        if job_id in self.active_jobs:
            pct = int(percentage * 100)
            self.active_jobs[job_id]["pct"] = pct
            if self.display_keys and self.display_keys[self.current_idx] == job_id:
                self._update_ui_for_current()

    def remove_job(self, job_id: str) -> None:
        if job_id in self.active_jobs:
            del self.active_jobs[job_id]
            self.display_keys.remove(job_id)
            
            if not self.display_keys:
                self._stop_rotation()
                self.label.config(text="Ready")
                self.progress['value'] = 0
            else:
                self.current_idx %= len(self.display_keys)
                self._update_ui_for_current()
                if len(self.display_keys) == 1:
                    self._stop_rotation()

    def _rotate_display(self) -> None:
        if self.rotation_timer:
            self.after_cancel(self.rotation_timer)
            
        if len(self.display_keys) > 1:
            self.current_idx = (self.current_idx + 1) % len(self.display_keys)
            self._update_ui_for_current()
            self.rotation_timer = self.after(2000, self._rotate_display)

    def _stop_rotation(self) -> None:
        if self.rotation_timer:
            self.after_cancel(self.rotation_timer)
            self.rotation_timer = None

    def _update_ui_for_current(self) -> None:
        if not self.display_keys: return
        job_id = self.display_keys[self.current_idx]
        job_data = self.active_jobs[job_id]
        
        queue_text = f" (File {self.current_idx + 1}/{len(self.display_keys)})" if len(self.display_keys) > 1 else ""
        self.label.config(text=f"Parsing {job_data['filename']}{queue_text} ... {job_data['pct']}%")
        self.progress['value'] = job_data['pct']

    def set_text(self, t): 
        if not self.active_jobs: self.label.config(text=t)
    def start(self): pass
    def stop(self): pass
    def set_value(self, val): pass
    
    def update_theme(self):
        self.configure(bg=_UiStylingPage.COLORS['bg_dark'])
        self.container.configure(bg=_UiStylingPage.COLORS['bg_dark'])
        self.label.configure(bg=_UiStylingPage.COLORS['bg_dark'], fg=_UiStylingPage.COLORS['text_secondary'])

class TaskCard(ThemedFrame):
    def __init__(self, parent, icon, name, on_execute=None, is_implemented=True, **kwargs):
        super().__init__(parent, bg=_UiStylingPage.COLORS['bg_card_light'], bd=1, relief='solid', **kwargs)
        self.is_implemented = is_implemented
        self.on_execute = on_execute
        self.grid_propagate(False)
        self.configure(height=120, width=140)
        
        if is_implemented:
            self.config(cursor="hand2")
            
        self.content = ThemedFrame(self, bg=_UiStylingPage.COLORS['bg_card_light'])
        self.content.pack(fill='both', expand=True, padx=6, pady=6)
        
        icon_lbl = ThemedLabel(self.content, text=icon, font=_UiStylingPage.get_font(24), bg=_UiStylingPage.COLORS['bg_card_light'], fg=_UiStylingPage.COLORS['text_primary'])
        icon_lbl.pack(pady=2)
        
        name_lbl = ThemedLabel(self.content, text=name, font=_UiStylingPage.get_font(8), fg=_UiStylingPage.COLORS['text_primary'],
                            bg=_UiStylingPage.COLORS['bg_card_light'], wraplength=120, justify='center')
        name_lbl.pack()
        
        if not is_implemented:
            ThemedLabel(self.content, text="Soon", font=_UiStylingPage.get_font(6, italic=True),
                     fg=_UiStylingPage.COLORS['text_muted'], bg=_UiStylingPage.COLORS['bg_card_light']).pack(pady=2)
                     
        if is_implemented:
            for w in (self, self.content, icon_lbl, name_lbl):
                w.bind('<Button-1>', self._on_click)
                w.bind('<Enter>', self._on_enter)
                w.bind('<Leave>', self._on_leave)

    def _on_enter(self, event):
        if self.is_implemented:
            self.content.configure(bg=_UiStylingPage.COLORS['hover'])
            for child in self.content.winfo_children():
                if isinstance(child, tk.Label):
                    child.configure(bg=_UiStylingPage.COLORS['hover'])

    def _on_leave(self, event):
        if self.is_implemented:
            self.content.configure(bg=_UiStylingPage.COLORS['bg_card_light'])
            for child in self.content.winfo_children():
                if isinstance(child, tk.Label):
                    child.configure(bg=_UiStylingPage.COLORS['bg_card_light'])

    def _on_click(self, event):
        if self.is_implemented and self.on_execute:
            self.on_execute()

class LoadingAnimation(ThemedFrame):
    """Centered circular loading animation overlay using the explicit overlay background."""
    def __init__(self, parent, **kwargs):
        kwargs['bg'] = _UiStylingPage.COLORS.get('bg_overlay', '#101A26')
        super().__init__(parent, **kwargs)
        self.is_running = False
        self.animation_frame = 0
        self.after_id = None
        self.progress_percentage = 0
        
        self.bind("<Button-1>", lambda e: "break")
        
        self.canvas = tk.Canvas(
            self, width=200, height=200,
            bg=kwargs['bg'], highlightthickness=0, bd=0
        )
        self.canvas.place(relx=0.5, rely=0.5, anchor='center')
        self.canvas.bind("<Button-1>", lambda e: "break")
        
        self.num_dots = 12
        self.radius = 40
        self.center_x = 100
        self.center_y = 100
        
        import math
        self.dot_positions = []
        for i in range(self.num_dots):
            angle = (i * 360) / self.num_dots
            rad = math.radians(angle)
            x = self.center_x + self.radius * math.cos(rad)
            y = self.center_y + self.radius * math.sin(rad)
            self.dot_positions.append((x, y))
            
        self.text_id = self.canvas.create_text(
            self.center_x, self.center_y,
            text="0%",
            fill=_UiStylingPage.COLORS['text_primary'],
            font=_UiStylingPage.get_font(12, 'bold')
        )
        
        self.status_id = self.canvas.create_text(
            self.center_x, self.center_y + 70,
            text="",
            fill=_UiStylingPage.COLORS['text_secondary'],
            font=_UiStylingPage.get_font(10)
        )

    def start(self, status_text="Processing..."):
        if self.is_running:
            return
        self.is_running = True
        self.animation_frame = 0
        self.progress_percentage = 0
        
        if self.winfo_exists():
            self.canvas.itemconfig(self.status_id, text=status_text)
            self.canvas.itemconfig(self.text_id, text="0%")
        
        self.place(relx=0, rely=0, relwidth=1.0, relheight=1.0)
        self.tkraise()
        self._animate()

    def stop(self):
        self.is_running = False
        if self.after_id:
            self.after_cancel(self.after_id)
            self.after_id = None
        if self.winfo_exists():
            self.place_forget()

    def set_progress(self, percentage: float):
        val = percentage if percentage > 1.0 else percentage * 100
        self.progress_percentage = min(100, max(0, int(val)))
        
        if self.winfo_exists():
            self.canvas.itemconfig(self.text_id, text=f"{self.progress_percentage}%")

    def _animate(self):
        if not self.winfo_exists():
            self.is_running = False
            return
            
        if self.is_running:
            self.canvas.delete("dots")
            accent_color = _UiStylingPage.COLORS['accent']
            num_active_dots = 4
            
            for i in range(num_active_dots):
                dot_index = (self.animation_frame + i) % self.num_dots
                x, y = self.dot_positions[dot_index]
                
                size = 4
                self.canvas.create_oval(
                    x - size, y - size, x + size, y + size,
                    fill=accent_color, outline=accent_color, tags="dots"
                )
            
            self.animation_frame = (self.animation_frame + 1) % self.num_dots
            self.after_id = self.after(100, self._animate)

class ConsoleOutput(ThemedFrame): # type: ignore
    def __init__(self, parent, app_controller=None):
        super().__init__(parent, bg=_UiStylingPage.COLORS['bg_console'], bd=0, relief='flat', highlightthickness=0)
        self.app_controller = app_controller

        self._expanded = False # Start expanded by default
        self._header_height = 36 # Store header height
        self._min_height = self._header_height # When collapsed, height is just the header
        self._max_height = 320

        self.header = ThemedFrame(self, bg=_UiStylingPage.COLORS['bg_card_light'], height=self._header_height)
        self.header.pack(fill='x')
        self.header.pack_propagate(False)

        accent_line = ThemedFrame(self.header, bg=_UiStylingPage.COLORS['accent'], width=4)
        accent_line.pack(side='left', fill='y')

        ThemedLabel(self.header, text="  CONSOLE OUTPUT", fg=_UiStylingPage.COLORS['accent_light'],
                 bg=_UiStylingPage.COLORS['bg_card_light'], font=_UiStylingPage.get_font(9, 'bold')).pack(side='left', padx=12)

        btn_frame = ThemedFrame(self.header, bg=_UiStylingPage.COLORS['bg_card_light'])
        btn_frame.pack(side='right', padx=(8,0))

        self.clear_btn = ThemedButton(btn_frame, text="  Clear", command=self.clear,
            is_primary=False, fg=_UiStylingPage.COLORS['text_secondary'],
            activebackground=_UiStylingPage.COLORS['hover'], relief='flat', cursor='hand2', padx=10, pady=4)
        self.clear_btn.pack(side='left', padx=4)

        self.toggle_btn = ThemedButton(btn_frame, text="▲", command=self.toggle,
            is_primary=False, fg=_UiStylingPage.COLORS['text_secondary'],
            activebackground=_UiStylingPage.COLORS['hover'], relief='flat', cursor='hand2', padx=10, pady=4)
        self.toggle_btn.pack(side='left')

        self.text_frame = ThemedFrame(self, bg=_UiStylingPage.COLORS['bg_console'])
        if self._expanded: 
            self.text_frame.pack(fill='both', expand=True, padx=1, pady=1)

        scrollbar = tk.Scrollbar(self.text_frame)
        scrollbar.pack(side='right', fill='y')

        self.text = tk.Text(self.text_frame, bg=_UiStylingPage.COLORS['bg_console'], fg=_UiStylingPage.COLORS['text_secondary'],
                            font=('Consolas', 9), wrap=tk.WORD, relief='flat', bd=0,
                            yscrollcommand=scrollbar.set, padx=8, pady=6)
        self.text.pack(fill='both', expand=True)
        scrollbar.config(command=self.text.yview)
        self.text.config(state=tk.DISABLED)
        
        # Set initial toggle button text based on _expanded state
        self.toggle_btn.config(text="▼" if not self._expanded else "▲")

    def toggle(self):
        if self._expanded: # Currently expanded, so collapse it
            self.text_frame.pack_forget()
            self.toggle_btn.config(text="▼")
        else:
            # Currently collapsed, so expand it
            self.text_frame.pack(fill='both', expand=True, padx=1, pady=1)
            self.toggle_btn.config(text="▲")
        self._expanded = not self._expanded
        
        # Notify the app controller to update its placement
        if self.app_controller:
            self.app_controller._update_console_and_progress_placement()

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
        self.configure(bg=_UiStylingPage.COLORS['bg_console'])
        self.header.configure(bg=_UiStylingPage.COLORS['bg_card_light'])
        
        # Update header labels and frames
        for child in self.header.winfo_children():
            if isinstance(child, (ThemedLabel, ThemedFrame)):
                child.configure(bg=_UiStylingPage.COLORS['bg_card_light'])

        # Update buttons with their hover states
        btn_bg = _UiStylingPage.COLORS['bg_card_light']
        btn_fg = _UiStylingPage.COLORS['text_secondary']
        btn_hover = _UiStylingPage.COLORS['hover']
        
        for btn in (self.clear_btn, self.toggle_btn):
            if isinstance(btn, ThemedButton):
                btn.config(bg=btn_bg, fg=btn_fg, activebackground=btn_hover)
                btn.default_bg = btn_bg
                btn.hover_bg = btn_hover
        
        self.text_frame.configure(bg=_UiStylingPage.COLORS['bg_console'])
        self.text.configure(bg=_UiStylingPage.COLORS['bg_console'], fg=_UiStylingPage.COLORS['text_secondary'])


class InteractivePlotCanvas(ThemedFrame):
    def __init__(self, parent: tk.Misc, controller: Any, task_index: int, log_fn: Optional[Callable[[str], None]] = None, dialog_fn: Optional[Callable[[str, str], None]] = None, loading_anim: Optional[Any] = None, **kwargs: Any) -> None:
        super().__init__(parent, bg=_UiStylingPage.COLORS['bg_card'], **kwargs)
        self.controller = controller
        self.task_index = task_index
        self.log_fn = log_fn
        self.dialog_fn = dialog_fn
        self.loading_anim = loading_anim
        
        # State tracking for interactions
        self.auto_mode_active = False
        self._custom_pan_active = False
        self._custom_pan_start_x = None
        self._custom_pan_start_y = None
        
        active_caches = getattr(self.controller.state, "caches", {})
        cache_keys = list(active_caches.keys())

        if len(cache_keys) == 1:
            initial_view = os.path.basename(cache_keys[0])
            self._show_target_selector = False
        else:
            initial_view = "Combined"
            self._show_target_selector = True

        self.target_view = tk.StringVar(value=initial_view)
        self.target_view.trace_add("write", lambda *args: self.request_lod_data(initial_load=True))
        
        self._is_rendering = False
        self._current_xlim = None
        self._current_ylim = None
        
        self._view_stack = []
        self._view_index = -1
        self._push_on_render = True
        
        # Linked strictly to Active Theme colors for visibility
        self.plot_bg_color = _UiStylingPage.COLORS['bg_card']
        self.text_color = _UiStylingPage.COLORS['text_primary']
        self.grid_color = _UiStylingPage.COLORS['border']
        self.grid_visible = True

        self.color_cycle = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd']
        self.legend = None

        self._initialize_canvas()

    def _initialize_canvas(self) -> None:
        self.fig = Figure(figsize=(6, 4), dpi=getattr(_UiCofigurationPage, 'PLOT_DPI', 100))
        self.fig.patch.set_facecolor(self.plot_bg_color)

        self.ax = self.fig.add_subplot(111)
        self._format_axes()

        self.canvas = FigureCanvasTkAgg(self.fig, master=self)
        self.canvas.get_tk_widget().pack(fill='both', expand=True)
        
        self.hidden_toolbar_frame = ThemedFrame(self) 
        self.toolbar = NavigationToolbar2Tk(self.canvas, self.hidden_toolbar_frame)
        self.toolbar.update()

        self.canvas.mpl_connect('scroll_event', self._on_scroll)
        self.canvas.mpl_connect('button_press_event', self._on_mouse_press)
        self.canvas.mpl_connect('motion_notify_event', self._on_mouse_motion)
        self.canvas.mpl_connect('button_release_event', self._on_mouse_release)
        
        self.ax_image = None
        self._render_cache: Dict[Tuple, Tuple[Image.Image, Tuple[float,float,float,float]]] = {}

    def _format_axes(self) -> None:
        self.ax.clear()
        self.ax.set_facecolor(self.plot_bg_color)
        self.fig.patch.set_facecolor(self.plot_bg_color)
        
        self.ax.tick_params(colors=self.text_color, labelsize=7)
        for spine in self.ax.spines.values():
            spine.set_color(self.grid_color)
            
        self.ax.set_ylabel("Altitude (m)" if self.task_index == 3 else "Value", color=self.text_color, fontsize=8, labelpad=4)
        self.ax.set_xlabel("")

        if self.grid_visible:
            self.ax.grid(True, linestyle='--', color=self.grid_color, alpha=0.3)
        
        self.ax.yaxis.set_major_formatter(StrMethodFormatter('{x:,.0f}'))
        self.ax.yaxis.set_major_locator(MaxNLocator(nbins=8, integer=True))
        self.ax.xaxis.set_major_locator(MaxNLocator(nbins=6, integer=True))

        def format_date(x, pos):
            try: return datetime.datetime.fromtimestamp(x).strftime('%Y-%m-%d\n%H:%M:%S')
            except: return ""
            
        self.ax.xaxis.set_major_formatter(FuncFormatter(format_date))
        self.fig.subplots_adjust(bottom=0.12, left=0.08, right=0.99, top=0.98)
            
        for label in self.ax.get_xticklabels():
            label.set_rotation(15)
            label.set_ha('right')

    def set_auto_mode(self, active: bool) -> None:
        self.auto_mode_active = active
        if not active:
            self._custom_pan_active = False
            self.canvas.get_tk_widget().config(cursor='arrow')

    def _on_scroll(self, event):
        if not self.auto_mode_active or event.inaxes != self.ax: return
        
        base_scale = 1.2
        if event.button == 'up':
            scale_factor = 1 / base_scale
        elif event.button == 'down':
            scale_factor = base_scale
        else:
            return

        xdata, ydata = event.xdata, event.ydata
        if xdata is None or ydata is None: return

        cur_xlim = self.ax.get_xlim()
        cur_ylim = self.ax.get_ylim()

        new_width = (cur_xlim[1] - cur_xlim[0]) * scale_factor
        new_height = (cur_ylim[1] - cur_ylim[0]) * scale_factor

        if new_width < 4.0: new_width = 4.0
        if new_height < 4.0: new_height = 4.0

        relx = (xdata - cur_xlim[0]) / (cur_xlim[1] - cur_xlim[0])
        rely = (ydata - cur_ylim[0]) / (cur_ylim[1] - cur_ylim[0])

        new_xlim_0 = xdata - new_width * relx
        new_xlim_1 = xdata + new_width * (1 - relx)
        new_ylim_0 = ydata - new_height * rely
        new_ylim_1 = ydata + new_height * (1 - rely)

        self.ax.set_xlim([new_xlim_0, new_xlim_1])
        self.ax.set_ylim([new_ylim_0, new_ylim_1])

        self.canvas.draw_idle()

        if hasattr(self, '_scroll_timer') and self._scroll_timer:
            self.after_cancel(self._scroll_timer)
        self._scroll_timer = self.after(400, self._delayed_refresh)

    def _delayed_refresh(self):
        if not self.winfo_exists(): return
        self._refresh_datashader_bounds()
        self._push_on_render = True

    def _on_mouse_press(self, event):
        if event.button == 1: 
            if self.legend and self.legend.contains(event)[0]:
                self._show_legend_dropdown(event.x, event.y)
                return

        if not self.auto_mode_active or event.inaxes != self.ax: return

        if event.button == 3:
            if event.dblclick:
                if hasattr(self, '_right_click_timer') and self._right_click_timer:
                    self.after_cancel(self._right_click_timer)
                    self._right_click_timer = None
                self.reset_scale()
            else:
                self._right_click_timer = self.after(300, self._execute_right_single_click)
                
        elif event.button == 1:
            if event.dblclick:
                self._custom_pan_active = True
                self._custom_pan_start_x = event.x
                self._custom_pan_start_y = event.y
                self.canvas.get_tk_widget().config(cursor='fleur')

    def _execute_right_single_click(self):
        if not self.winfo_exists(): return
        self._right_click_timer = None
        self.history_back()

    def _on_mouse_motion(self, event):
        if not self.auto_mode_active or not self._custom_pan_active: return
        if event.x is None or event.y is None: return

        x0, y0 = self.ax.transData.inverted().transform((event.x, event.y))
        x1, y1 = self.ax.transData.inverted().transform((self._custom_pan_start_x, self._custom_pan_start_y))

        data_dx = x0 - x1
        data_dy = y0 - y1

        cur_xlim = self.ax.get_xlim()
        cur_ylim = self.ax.get_ylim()

        self.ax.set_xlim(cur_xlim[0] - data_dx, cur_xlim[1] - data_dx)
        self.ax.set_ylim(cur_ylim[0] - data_dy, cur_ylim[1] - data_dy)

        self.canvas.draw_idle()

        self._custom_pan_start_x = event.x
        self._custom_pan_start_y = event.y

    def _on_mouse_release(self, event):
        if getattr(self, '_custom_pan_active', False):
            self._custom_pan_active = False
            self.canvas.get_tk_widget().config(cursor='arrow')
            self._refresh_datashader_bounds()
            self._push_on_render = True
            return

        if self.toolbar.mode != '':
            self._refresh_datashader_bounds()
            self._push_on_render = True

    def _show_legend_dropdown(self, x: float, y: float) -> None:
        menu = tk.Menu(self.canvas.get_tk_widget(), tearoff=0, 
                       bg=_UiStylingPage.COLORS['bg_card_elevated'], 
                       fg=_UiStylingPage.COLORS['text_primary'], 
                       activebackground=_UiStylingPage.COLORS['accent_hover'],
                       font=_UiStylingPage.get_font(9))
        
        cache_keys = []
        if hasattr(self.controller, 'extraction_service') and hasattr(self.controller.extraction_service, '_dataframeCache'):
            cache_keys = list(self.controller.extraction_service._dataframeCache.keys())
            
        options = ["Combined"] + cache_keys if len(cache_keys) > 1 else cache_keys
        
        if not options:
            return

        for opt in options:
            prefix = "✔  " if self.target_view.get() == opt else "    "
            menu.add_command(label=f"{prefix}{opt}", command=lambda v=opt: self._set_target_view(v))
            
        tk_x = self.canvas.get_tk_widget().winfo_rootx() + int(x)
        tk_y = self.canvas.get_tk_widget().winfo_rooty() + int(self.fig.bbox.height - y)
        menu.tk_popup(tk_x, tk_y)

    def _set_target_view(self, view: str) -> None:
        if self.target_view.get() != view:
            self.target_view.set(view)

    def _push_view(self) -> None:
        xlim = self.ax.get_xlim()
        ylim = self.ax.get_ylim()
        
        if self._view_index < len(self._view_stack) - 1:
            self._view_stack = self._view_stack[:self._view_index + 1]
            
        self._view_stack.append((xlim, ylim))
        self._view_index = len(self._view_stack) - 1
        
        if len(self._view_stack) > 50:
            self._view_stack.pop(0)
            self._view_index -= 1

    def history_back(self) -> None:
        if self._view_index > 0:
            self._view_index -= 1
            xlim, ylim = self._view_stack[self._view_index]
            self._push_on_render = False 
            self.request_lod_data(x_range=xlim, y_range=ylim)
            if self.log_fn: self.log_fn("  Stepped back in history")

    def history_forward(self) -> None:
        if self._view_index < len(self._view_stack) - 1:
            self._view_index += 1
            xlim, ylim = self._view_stack[self._view_index]
            self._push_on_render = False
            self.request_lod_data(x_range=xlim, y_range=ylim)
            if self.log_fn: self.log_fn("  Stepped forward in history")

    def reset_scale(self) -> None:
        self._push_on_render = True
        self.request_lod_data(initial_load=True)
        if self.log_fn: self.log_fn("  Reset view to full data range")

    def set_interaction_mode(self, mode: str) -> None:
        if mode == 'pan':
            if self.toolbar.mode == 'zoom rect':
                self.toolbar.zoom() 
            if self.toolbar.mode != 'pan/zoom':
                self.toolbar.pan() 
            self.canvas.get_tk_widget().config(cursor='fleur')
            if self.log_fn: self.log_fn("  Drag-Pan mode activated.")
        elif mode == 'zoom':
            if self.toolbar.mode == 'pan/zoom':
                self.toolbar.pan()  
            if self.toolbar.mode != 'zoom rect':
                self.toolbar.zoom() 
            self.canvas.get_tk_widget().config(cursor='cross')
            if self.log_fn: self.log_fn("  Box-Zoom mode activated. Draw a box on the graph.")
        else:
            self.canvas.get_tk_widget().config(cursor='arrow')

    def _refresh_datashader_bounds(self):
        new_xlim = list(self.ax.get_xlim())
        new_ylim = list(self.ax.get_ylim())
        
        changed = False
        if (new_xlim[1] - new_xlim[0]) < 4.0:
            mid = (new_xlim[1] + new_xlim[0]) / 2.0
            new_xlim = [mid - 2.0, mid + 2.0]
            self.ax.set_xlim(new_xlim)
            changed = True
            
        if (new_ylim[1] - new_ylim[0]) < 4.0:
            mid = (new_ylim[1] + new_ylim[0]) / 2.0
            new_ylim = [mid - 2.0, mid + 2.0]
            self.ax.set_ylim(new_ylim)
            changed = True
            
        if changed:
            self.canvas.draw_idle()
            
        new_xlim = tuple(new_xlim)
        new_ylim = tuple(new_ylim)
        
        if self._current_xlim != new_xlim or self._current_ylim != new_ylim:
            self.request_lod_data(x_range=new_xlim, y_range=new_ylim)

    def export_to_file(self, target_path: str) -> bool:
        try:
            self.fig.savefig(target_path, bbox_inches='tight', dpi=300)
            if self.log_fn: self.log_fn(f"[ ] Canvas snapshot saved to: {target_path}")
            return True
        except Exception as err:
            if self.log_fn: self.log_fn(f"[!] Export failed: {err}")
            return False

    def request_lod_data(self, initial_load: bool = False, x_range=None, y_range=None) -> None:
        if hasattr(self.controller, 'state') and getattr(self.controller.state, 'is_parsing', getattr(self.controller.state, 'is_processing', False)):
            if initial_load and self.dialog_fn:
                self.dialog_fn("Parsing in Progress", "Files are currently being processed.\nPlease wait.")
            return

        if self._is_rendering: return
        self._is_rendering = True
        
        self.controller.progress.add_job("plot_render", "Datashader Engine")
        
        if self.loading_anim:
            self.loading_anim.start("Rendering plot...")

        w, h = self.canvas.get_width_height()
        w = min(max(w, 10), 1200)
        h = min(max(h, 10), 800)

        if x_range is not None and (x_range[1] - x_range[0]) < 1.0:
            mid = (x_range[1] + x_range[0]) / 2.0
            x_range = (mid - 0.5, mid + 0.5)
            
        if y_range is not None and (y_range[1] - y_range[0]) < 1.0:
            mid = (y_range[1] + y_range[0]) / 2.0
            y_range = (mid - 0.5, mid + 0.5)

        xr = None if x_range is None else (float(x_range[0]), float(x_range[1]))
        yr = None if y_range is None else (float(y_range[0]), float(y_range[1]))

        cache_key = (self.target_view.get(), w, h, xr, yr)

        if not initial_load and cache_key in self._render_cache:
            pil_img, extent = self._render_cache[cache_key]
            if self.log_fn: self.log_fn('  Using cached render for viewport.')
            self._on_render_complete(pil_img, extent)
            return

        def _progress_cb(pct: float, msg: str):
            self.after(0, lambda: self.controller.progress.set_job_progress("plot_render", pct, "Matplotlib Engine"))
            if self.loading_anim:
                self.after(0, lambda: self.loading_anim.set_progress(pct * 100))

        def _worker_thread():
            try:
                if hasattr(self.controller, 'extraction_service'):
                    result = self.controller.extraction_service.get_datashader_image(
                        state=self.controller.state, controller=self.controller, task_id=self.task_index,
                        target_view=self.target_view.get(), canvas_width=w, canvas_height=h,
                        color_cycle=self.color_cycle, x_range=xr, y_range=yr,
                        progress_callback=_progress_cb
                    )
                    
                    if result:
                        pil_img, extent = result
                    else:
                        pil_img, extent = None, (0, 1, 0, 1)

                    self.after(0, lambda: self._on_render_complete(pil_img, extent))
                else:
                    self.after(0, lambda: self._on_render_error("Service unavailable."))
            except Exception as e:
                self.after(0, lambda: self._on_render_error(str(e)))

        threading.Thread(target=_worker_thread, daemon=True).start()

    def _on_render_complete(self, pil_img: Optional[Image.Image], extent: Tuple[float,float,float,float]) -> None:
        self._is_rendering = False
        self.controller.progress.set_job_progress("plot_render", 1.0, "Done")
        self.after(1000, lambda: self.controller.progress.remove_job("plot_render"))
        
        if self.loading_anim:
            self.loading_anim.stop()
        
        self._update_dropdown_options()
        
        if pil_img is None or any(np.isnan(e) or np.isinf(e) for e in extent):
            if self.log_fn: self.log_fn("  No valid data available for viewport.")
            self._on_render_error("Waiting for valid data to be parsed...")
            return

        try:
            w, h = self.canvas.get_width_height()
            w = min(w, 1200)
            h = min(h, 800)
            xr = (float(extent[0]), float(extent[1]))
            yr = (float(extent[2]), float(extent[3]))
            cache_key = (self.target_view.get(), w, h, xr, yr)
            self._render_cache[cache_key] = (pil_img.copy(), extent)
        except Exception:
            pass

        self._format_axes()
        self.ax_image = self.ax.imshow(np.array(pil_img), extent=extent, origin='upper', aspect='auto')

        self.ax.set_xlim(extent[0], extent[1])
        self.ax.set_ylim(extent[2], extent[3])
        
        if hasattr(self.controller, 'extraction_service'):
            renderTargets = list(self.controller.extraction_service._dataframeCache.keys())
            
            if self.target_view.get() == "Combined":
                display_targets = renderTargets
            else:
                display_targets = [self.target_view.get()] if self.target_view.get() in renderTargets else []
                
            legend_elements = []
            for f_id in display_targets:
                try:
                    i = renderTargets.index(f_id)
                except ValueError:
                    i = 0
                color = self.color_cycle[i % len(self.color_cycle)]
                legend_elements.append(Line2D([0], [0], color=color, lw=2, label=f_id))
                
            if legend_elements:
                self.legend = self.ax.legend(handles=legend_elements, loc='upper right', bbox_to_anchor=(0.99, 0.98),
                               fontsize=7, facecolor=self.plot_bg_color, edgecolor=self.grid_color, 
                               labelcolor=self.text_color, framealpha=0.8, title_fontsize=7)
                self.legend.get_title().set_color(self.text_color)
            else:
                self.legend = None
        
        self._current_xlim = self.ax.get_xlim()
        self._current_ylim = self.ax.get_ylim()

        if self._push_on_render:
            self._push_view()
        self._push_on_render = True 

        self.canvas.draw_idle()
        if self.log_fn: self.log_fn("  Dashboard updated.")

        try:
            debug_enabled = getattr(_UiCofigurationPage, 'DEBUG_GRAPH', False)
            if hasattr(self.controller, 'state') and hasattr(self.controller.state, 'debug_mode'):
                debug_enabled = debug_enabled or self.controller.state.debug_mode

            if debug_enabled:
                out_dir = getattr(_UiCofigurationPage, 'DEBUG_EXPORT_DIR', 'debug_exports')
                os.makedirs(out_dir, exist_ok=True)
                ts = time.strftime('%Y%m%d_%H%M%S')
                
                if hasattr(self.controller, 'extraction_service'):
                    df_cache = self.controller.extraction_service._dataframeCache
                    target = self.target_view.get()
                    
                    files_to_export = list(df_cache.keys()) if target == "Combined" else [target]
                        
                    for f_id in files_to_export:
                        if f_id in df_cache:
                            df = df_cache[f_id].copy()
                            
                            df['Readable_Time'] = df['Time'].apply(
                                lambda x: datetime.datetime.fromtimestamp(x).strftime('%Y-%m-%d %H:%M:%S')
                            )
                            
                            cols = ['Readable_Time', 'Time', 'Value']
                            cols += [c for c in df.columns if c not in cols]
                            df = df[cols]
                            
                            safe_f_id = f_id.replace('.', '_')
                            csv_path = os.path.join(out_dir, f"data_export_{safe_f_id}_{ts}.csv")
                            df.to_csv(csv_path, index=False)
                            if self.log_fn: self.log_fn(f"[DEBUG] CSV data exported to: {csv_path}")

        except Exception as e:
            if self.log_fn: self.log_fn(f"[DEBUG] Export failed: {e}")

    def _on_render_error(self, err_msg: str) -> None:
        self._is_rendering = False
        self.controller.progress.remove_job("plot_render")
        if self.log_fn: self.log_fn(f"  Render error: {err_msg}")
        
        if self.loading_anim:
            self.loading_anim.stop()

        try:
            self.ax.clear()
            self.ax.set_facecolor(self.plot_bg_color)
            self.fig.patch.set_facecolor(self.plot_bg_color)
            self.ax.set_xticks([])
            self.ax.set_yticks([])
            self.ax.text(0.5, 0.5, f"{err_msg}", 
                         color=self.text_color, 
                         ha='center', va='center', wrap=True, fontsize=10,
                         transform=self.ax.transAxes)
            self.canvas.draw_idle()
        except Exception:
            pass

    def _update_dropdown_options(self) -> None:
        cache_keys = []
        if hasattr(self.controller, 'extraction_service') and hasattr(self.controller.extraction_service, '_dataframeCache'):
            cache_keys = list(self.controller.extraction_service._dataframeCache.keys())
            
        options = ["Combined"] + cache_keys if len(cache_keys) > 1 else cache_keys
            
        if options and self.target_view.get() not in options:
            self.target_view.set(options[0])


class MessageBox:
    """A static class for showing standard tkinter message boxes."""
    
    @staticmethod
    def show_info(title: str, message: str, **kwargs: Any) -> None:
        """Show an informational dialog."""
        messagebox.showinfo(title, message, **kwargs)

    @staticmethod
    def show_warning(title: str, message: str, **kwargs: Any) -> None:
        """Show a warning dialog."""
        messagebox.showwarning(title, message, **kwargs)

    @staticmethod
    def show_error(title: str, message: str, **kwargs: Any) -> None:
        """Show an error dialog."""
        messagebox.showerror(title, message, **kwargs)

    @staticmethod
    def ask_yes_no(title: str, message: str, **kwargs: Any) -> bool:
        """Show a yes/no confirmation dialog."""
        return messagebox.askyesno(title, message, **kwargs)


class FileDialog:
    """A static class for showing file and directory dialogs."""
    
    @staticmethod
    def ask_open_file(title: str = "Select File", filetypes: Optional[List[Tuple[str, str]]] = None, **kwargs: Any) -> str:
        """Show a dialog to open a single file."""
        if filetypes is None:
            filetypes = [("All Files", "*.*")]
        return filedialog.askopenfilename(title=title, filetypes=filetypes, **kwargs)

    @staticmethod
    def ask_open_files(title: str = "Select Files", filetypes: Optional[List[Tuple[str, str]]] = None, **kwargs: Any) -> Tuple[str, ...]:
        """Show a dialog to open multiple files."""
        if filetypes is None:
            filetypes = [("All Files", "*.*")]
        return filedialog.askopenfilenames(title=title, filetypes=filetypes, **kwargs)

    @staticmethod
    def ask_save_as_file(title: str = "Save As", defaultextension: str = "", filetypes: Optional[List[Tuple[str, str]]] = None, **kwargs: Any) -> str:
        """Show a dialog to save a file."""
        if filetypes is None:
            filetypes = [("All Files", "*.*")]
        return filedialog.asksaveasfilename(title=title, defaultextension=defaultextension, filetypes=filetypes, **kwargs)


class ColorChooser:
    """A static class for using the color chooser dialog."""
    
    @staticmethod
    def ask_color(initialcolor: Optional[str] = None, title: Optional[str] = "Select Color", **kwargs: Any) -> Tuple[Optional[Tuple[int, int, int]], Optional[str]]:
        """Show a dialog to choose a color."""
        return colorchooser.askcolor(initialcolor, title=title, **kwargs)