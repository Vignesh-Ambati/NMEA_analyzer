import datetime
import threading
import json
import os
import time
import numpy as np
import tkinter as tk
from tkinter import ttk
from PIL import Image
from typing import Any, Dict, Optional, Callable, Tuple, List
from matplotlib.figure import Figure
from matplotlib.ticker import FuncFormatter, StrMethodFormatter
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg, NavigationToolbar2Tk
from . import config as ui_config

from . import style
from . import dialogs

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
        # Bind the mousewheel to the canvas only while the mouse is over it.
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
            # Widget may have been destroyed; ignore
            pass

class ProgressIndicator(tk.Frame):
    def __init__(self, parent):
        super().__init__(parent, bg=style.COLORS['bg_dark'])
        
        # State tracking for round-robin rotation
        self.active_jobs: Dict[str, Dict[str, Any]] = {}
        self.display_keys: List[str] = []
        self.current_idx: int = 0
        self.rotation_timer: Optional[str] = None
        
        # The Single UI Row
        self.container = tk.Frame(self, bg=style.COLORS['bg_dark'])
        self.container.pack(fill='x', expand=True, pady=5)
        
        self.label = tk.Label(self.container, text="Ready", fg=style.COLORS['text_secondary'],
                              bg=style.COLORS['bg_dark'], font=('Segoe UI', 9), width=45, anchor='w')
        self.label.pack(side='left', padx=10)
        
        self.progress = ttk.Progressbar(self.container, mode='determinate', maximum=100, style='TProgressbar')
        self.progress.pack(side='left', fill='x', expand=True, padx=10)

    def add_job(self, job_id: str, filename: str) -> None:
        """Registers a new file process and starts the rotation if needed."""
        if job_id not in self.active_jobs:
            self.active_jobs[job_id] = {"filename": filename, "pct": 0}
            self.display_keys.append(job_id)
            
            # If this is the only job, show it instantly
            if len(self.display_keys) == 1:
                self._update_ui_for_current()
            # If we now have multiple jobs and aren't rotating yet, start the carousel
            elif not self.rotation_timer:
                self._rotate_display()

    def set_job_progress(self, job_id: str, percentage: float, filename: str) -> None:
        """Updates the internal percentage. Updates the UI immediately if it's the currently focused job."""
        if job_id in self.active_jobs:
            pct = int(percentage * 100)
            self.active_jobs[job_id]["pct"] = pct
            
            # Instant UI feedback if this job is currently in the display spotlight
            if self.display_keys and self.display_keys[self.current_idx] == job_id:
                self._update_ui_for_current()

    def remove_job(self, job_id: str) -> None:
        """Removes a finished job and adjusts the carousel."""
        if job_id in self.active_jobs:
            del self.active_jobs[job_id]
            self.display_keys.remove(job_id)
            
            if not self.display_keys:
                self._stop_rotation()
                self.label.config(text="Ready")
                self.progress['value'] = 0
            else:
                # Ensure index stays in bounds
                self.current_idx %= len(self.display_keys)
                self._update_ui_for_current()
                # Stop carousel if only 1 job remains
                if len(self.display_keys) == 1:
                    self._stop_rotation()

    def _rotate_display(self) -> None:
        """The 2-second ticker loop to switch the visible progress bar."""
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
        """Paints the currently selected job data to the single Tkinter progress bar."""
        if not self.display_keys: return
        job_id = self.display_keys[self.current_idx]
        job_data = self.active_jobs[job_id]
        
        queue_text = f" (File {self.current_idx + 1}/{len(self.display_keys)})" if len(self.display_keys) > 1 else ""
        self.label.config(text=f"Parsing {job_data['filename']}{queue_text} ... {job_data['pct']}%")
        self.progress['value'] = job_data['pct']

    # --- Legacy Methods to prevent App crashes before Phase 2 ---
    def set_text(self, t): 
        if not self.active_jobs: self.label.config(text=t)
    def start(self): pass
    def stop(self): pass
    def set_value(self, val): pass
    
    def update_theme(self):
        self.configure(bg=style.COLORS['bg_dark'])
        self.container.configure(bg=style.COLORS['bg_dark'])
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
        self._min_height = 70 #30
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
    def __init__(self, parent: tk.Misc, controller: Any, task_index: int, log_fn: Optional[Callable[[str], None]] = None, **kwargs: Any) -> None:
        super().__init__(parent, bg=style.COLORS['bg_card'], **kwargs)
        self.controller = controller
        self.task_index = task_index
        self.log_fn = log_fn
        
        self.target_view = tk.StringVar(value="Combined")
        self.target_view.trace_add("write", lambda *args: self.request_lod_data(initial_load=True))
        
        self._is_rendering = False
        
        # Current Axis Bounds tracking for Datashader updates
        self._current_xlim = None
        self._current_ylim = None
        
        self.plot_bg_color = style.COLORS['bg_card']
        self.text_color = style.COLORS['text_primary']
        self.grid_color = style.COLORS['border']
        self.grid_visible = True
        self.color_cycle = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd']

        self._initialize_canvas()

    def _initialize_canvas(self) -> None:
        self.top_control_frame = tk.Frame(self, bg=style.COLORS['bg_card'])
        self.top_control_frame.pack(fill='x', padx=5, pady=5)
        
        self.dropdown_combo = ttk.Combobox(self.top_control_frame, textvariable=self.target_view, state="readonly", width=25)
        self.dropdown_combo.pack(side='right')

        # 1. Matplotlib Native Figure Setup
        self.fig = Figure(figsize=(6, 4), dpi=getattr(ui_config, 'PLOT_DPI', 100))
        self.fig.patch.set_facecolor(self.plot_bg_color)
        self.ax = self.fig.add_subplot(111)
        self._format_axes()

        # 2. Tkinter Integration
        self.canvas = FigureCanvasTkAgg(self.fig, master=self)
        self.canvas.get_tk_widget().pack(fill='both', expand=True)

        # 3. HIDDEN NATIVE TOOLBAR
        # We instantiate it to use its logic, but we DO NOT pack() it into the UI.
        self.hidden_toolbar_frame = tk.Frame(self) 
        self.toolbar = NavigationToolbar2Tk(self.canvas, self.hidden_toolbar_frame)
        self.toolbar.update()

        # 4. Bind Mouse Release to trigger Datashader updates after panning/zooming
        self.canvas.mpl_connect('button_release_event', self._on_mouse_release)
        self.ax_image = None

        # Lightweight in-memory render cache to avoid unnecessary recompute
        # key: (target_view, width, height, x0, x1, y0, y1)
        self._render_cache: Dict[Tuple, Tuple[Image.Image, Tuple[float,float,float,float]]] = {}

    def _format_axes(self) -> None:
        self.ax.clear()
        self.ax.set_facecolor(self.plot_bg_color)
        self.ax.tick_params(colors=self.text_color)
        for spine in self.ax.spines.values():
            spine.set_color(self.grid_color)
            
        self.ax.set_title(f"Dashboard: {self.target_view.get()}", color=self.text_color)
        self.ax.set_ylabel("Altitude (meters)" if self.task_index == 3 else "Value", color=self.text_color)
        self.ax.set_xlabel("Date & Time", color=self.text_color)

        if self.grid_visible:
            self.ax.grid(True, linestyle='--', color=self.grid_color, alpha=0.5)

        self.ax.yaxis.set_major_formatter(StrMethodFormatter('{x:,.0f}'))

        def format_date(x, pos):
            try: return datetime.datetime.fromtimestamp(x).strftime('%Y-%m-%d\n%H:%M:%S')
            except: return ""
        self.ax.xaxis.set_major_formatter(FuncFormatter(format_date))
        # Improve spacing to avoid cramped x-axis labels
        try:
            self.fig.tight_layout()
        except Exception:
            # fallback to manual adjustment
            self.fig.subplots_adjust(bottom=0.18, left=0.1, right=0.98, top=0.92)
        for label in self.ax.get_xticklabels():
            label.set_rotation(25)
            label.set_ha('right')

    def _on_mouse_release(self, event):
        """Catches when the user finishes zooming or panning using the toolbar."""
        if self.toolbar.mode != '': 
            self._refresh_datashader_bounds()

    # ──────────────────────────────────────────────────────────
    # SIDEBAR TOOLBAR HIJACKING METHODS
    # ──────────────────────────────────────────────────────────
    def set_interaction_mode(self, mode: str) -> None:
        """Programmatically triggers the hidden Matplotlib toolbar modes."""
        if mode == 'pan':
            if self.toolbar.mode == 'zoom rect':
                self.toolbar.zoom() # Toggle off zoom
            if self.toolbar.mode != 'pan/zoom':
                self.toolbar.pan()  # Toggle on pan
            if self.log_fn: self.log_fn("✋ Drag-Pan mode activated.")
                
        elif mode == 'zoom':
            if self.toolbar.mode == 'pan/zoom':
                self.toolbar.pan() # Toggle off pan
            if self.toolbar.mode != 'zoom rect':
                self.toolbar.zoom() # Toggle on zoom
            if self.log_fn: self.log_fn("🔍 Box-Zoom mode activated. Draw a box on the graph.")

    def reset_scale(self) -> None:
        self.request_lod_data(initial_load=True)

    def history_back(self) -> None:
        """Step backwards through zoom states and update Datashader."""
        self.toolbar.back()
        self._refresh_datashader_bounds()

    def history_forward(self) -> None:
        """Step forwards through zoom states and update Datashader."""
        self.toolbar.forward()
        self._refresh_datashader_bounds()

    def export_to_file(self, target_path: str) -> bool:
        """Uses Matplotlib's native high-res save function."""
        try:
            self.fig.savefig(target_path, bbox_inches='tight', dpi=300)
            if self.log_fn: self.log_fn(f"[✓] Canvas snapshot saved to: {target_path}")
            return True
        except Exception as err:
            if self.log_fn: self.log_fn(f"[!] Export failed: {err}")
            return False

    def _refresh_datashader_bounds(self):
        new_xlim = self.ax.get_xlim()
        new_ylim = self.ax.get_ylim()
        if self._current_xlim != new_xlim or self._current_ylim != new_ylim:
            self.request_lod_data(initial_load=False, x_range=new_xlim, y_range=new_ylim)
            
    # ──────────────────────────────────────────────────────────

    def request_lod_data(self, initial_load: bool = False, x_range=None, y_range=None) -> None:
        # State Safety Check
        if hasattr(self.controller, 'state') and getattr(self.controller.state, 'is_parsing', getattr(self.controller.state, 'is_processing', False)):
            if initial_load:
                dialogs.show_info("Parsing in Progress", "Files are currently being processed.\nPlease wait.", parent=self.controller.root)
            return

        if self._is_rendering: return
        self._is_rendering = True
        
        self.controller.progress.add_job("plot_render", "Datashader Engine")

        w, h = self.canvas.get_width_height()

        # Normalize ranges for caching key
        xr = None if x_range is None else (float(x_range[0]), float(x_range[1]))
        yr = None if y_range is None else (float(y_range[0]), float(y_range[1]))
        cache_key = (self.target_view.get(), w, h, xr, yr)

        # Serve from cache if available and initial_load is False (fresh loads prefer recompute)
        if not initial_load and cache_key in self._render_cache:
            pil_img, extent = self._render_cache[cache_key]
            if self.log_fn: self.log_fn('ℹ️ Using cached render for viewport.')
            self._on_render_complete(pil_img, extent, initial_load)
            return

        def _progress_cb(pct: float, msg: str):
            self.after(0, lambda: self.controller.progress.set_job_progress("plot_render", pct, "Matplotlib Engine"))

        def _worker_thread():
            try:
                if hasattr(self.controller, 'extraction_service'):
                    pil_img, extent = self.controller.extraction_service.get_datashader_image(
                        state=self.controller.state, controller=self.controller, task_id=self.task_index,
                        target_view=self.target_view.get(), canvas_width=w, canvas_height=h,
                        color_cycle=self.color_cycle, x_range=x_range, y_range=y_range,
                        progress_callback=_progress_cb
                    )
                    self.after(0, lambda: self._on_render_complete(pil_img, extent, initial_load))
                else:
                    self.after(0, lambda: self._on_render_error("Service unavailable."))
            except Exception as e:
                self.after(0, lambda: self._on_render_error(str(e)))

        threading.Thread(target=_worker_thread, daemon=True).start()

    def _on_render_complete(self, pil_img: Optional[Image.Image], extent: Tuple[float,float,float,float], initial_load: bool) -> None:
        self._is_rendering = False
        self.controller.progress.set_job_progress("plot_render", 1.0, "Done")
        self.after(1000, lambda: self.controller.progress.remove_job("plot_render"))
        
        self._update_dropdown_options()
        
        if pil_img is None:
            if self.log_fn: self.log_fn("ℹ️ No data available for viewport.")
            return
        # Cache the result to speed up repeated views
        try:
            xr = (float(extent[0]), float(extent[1]))
            yr = (float(extent[2]), float(extent[3]))
            w, h = self.canvas.get_width_height()
            cache_key = (self.target_view.get(), w, h, xr, yr)
            self._render_cache[cache_key] = (pil_img.copy(), extent)
        except Exception:
            pass

        self._format_axes()
        # Use imshow to paint the datashader output
        self.ax_image = self.ax.imshow(np.array(pil_img), extent=extent, origin='lower', aspect='auto')
        self.ax.set_xlim(extent[0], extent[1])
        self.ax.set_ylim(extent[2], extent[3])
        
        self._current_xlim = self.ax.get_xlim()
        self._current_ylim = self.ax.get_ylim()

        self.canvas.draw_idle()
        if self.log_fn: self.log_fn("✓ Dashboard updated.")
        # Optional debug export of the rendered image and extent
        try:
            if getattr(ui_config, 'GUI_DEBUG', False):
                out_dir = getattr(ui_config, 'DEBUG_EXPORT_DIR', 'debug_exports')
                os.makedirs(out_dir, exist_ok=True)
                ts = time.strftime('%Y%m%d_%H%M%S')
                img_path = os.path.join(out_dir, f"render_task{self.task_index}_{self.target_view.get()}_{ts}.png")
                pil_img.save(img_path)
                meta = {'task_index': self.task_index, 'target_view': self.target_view.get(), 'extent': extent, 'timestamp': ts}
                with open(os.path.join(out_dir, f"render_task{self.task_index}_{ts}.json"), 'w', encoding='utf-8') as mf:
                    json.dump(meta, mf, indent=2)
                if self.log_fn: self.log_fn(f"[DEBUG] Render exported: {img_path}")
        except Exception as e:
            if self.log_fn: self.log_fn(f"[DEBUG] Export failed: {e}")

    def _on_render_error(self, err_msg: str) -> None:
        self._is_rendering = False
        self.controller.progress.remove_job("plot_render")
        if self.log_fn: self.log_fn(f"❌ Render error: {err_msg}")

    def _update_dropdown_options(self) -> None:
        options = ["Combined"]
        if hasattr(self.controller, 'extraction_service') and hasattr(self.controller.extraction_service, '_dataframeCache'):
            cache_keys = list(self.controller.extraction_service._dataframeCache.keys())
            if cache_keys: options += cache_keys

        # Guard against combobox being destroyed while async render completes
        try:
            if getattr(self, 'dropdown_combo', None) and self.dropdown_combo.winfo_exists():
                self.dropdown_combo['values'] = options
                if self.target_view.get() not in options:
                    self.target_view.set("Combined")
        except Exception:
            # Widget no longer available
            if self.log_fn: self.log_fn('[WARN] Dropdown update skipped; widget not available.')
            
