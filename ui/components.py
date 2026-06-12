import datetime
import math
import queue
import threading
import tkinter as tk
from tkinter import ttk
from PIL import Image, ImageTk
from typing import Any, Dict, Optional, Callable, Tuple, List
from . import style


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
    """
    Pure Tkinter + Async Datashader Engine.
    Flawlessly replicates Matplotlib's aesthetic while handling 100 million+ rows without freezing.
    """
    def __init__(self, parent: tk.Misc, controller: Any, task_index: int, log_fn: Optional[Callable[[str], None]] = None, **kwargs: Any) -> None:
        super().__init__(parent, bg='#FFFFFF', **kwargs)
        self.controller = controller
        self.task_index = task_index
        self.log_fn = log_fn
        
        self.target_view = tk.StringVar(value="Combined")
        self.target_view.trace_add("write", lambda *args: self.reset_scale())
        
        self._tk_img: Optional[ImageTk.PhotoImage] = None
        self._x_bounds: Optional[Tuple[float, float]] = None
        self._y_bounds: Optional[Tuple[float, float]] = None
        
        self._view_history: List[Tuple[Tuple[float, float], Tuple[float, float]]] = []
        self._view_index: int = -1
        self._dragging: bool = False
        self._is_drawing_zoom_box: bool = False
        self._last_mouse_pos: Optional[Tuple[int, int]] = None 
        self._zoom_rect_id: Optional[int] = None
        self._debounce_job: Optional[str] = None
        self._is_rendering: bool = False
        self.interaction_mode = 'pan'
        
        # White Image Replica Style Definitions
        self.plot_bg_color = '#FFFFFF'
        self.text_color = '#000000'
        self.spine_color = '#000000'
        self.grid_color = '#E5E7EB'
        self.grid_visible = False
        self.color_cycle = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728']

        self._initialize_canvas()

    def _initialize_canvas(self) -> None:
        self.canvas = tk.Canvas(self, bg=self.plot_bg_color, highlightthickness=0, cursor="fleur")
        self.canvas.pack(fill='both', expand=True, padx=5, pady=5)
        
        self.dropdown_combo = ttk.Combobox(self.canvas, textvariable=self.target_view, state="readonly", width=18)
        
        self.canvas.bind("<Configure>", lambda e: self._schedule_lod_update())
        self.canvas.bind("<MouseWheel>", self._on_scroll)
        self.canvas.bind("<ButtonPress-1>", self._on_press)
        self.canvas.bind("<B1-Motion>", self._on_move)
        self.canvas.bind("<ButtonRelease-1>", self._on_release)

    def set_interaction_mode(self, mode: str) -> None:
        self.interaction_mode = mode
        self.canvas.config(cursor="crosshair" if mode == 'zoom' else "fleur")

    def _push_view(self) -> None:
        if not self._x_bounds or not self._y_bounds: return
        self._view_history = self._view_history[:self._view_index + 1]
        self._view_history.append((self._x_bounds, self._y_bounds))
        self._view_index += 1

    def history_back(self) -> None:
        if self._view_index > 0:
            self._view_index -= 1
            self._x_bounds, self._y_bounds = self._view_history[self._view_index]
            self.request_lod_data(initial_load=False)

    def history_forward(self) -> None:
        if self._view_index < len(self._view_history) - 1:
            self._view_index += 1
            self._x_bounds, self._y_bounds = self._view_history[self._view_index]
            self.request_lod_data(initial_load=False)

    def reset_scale(self) -> None:
        self._x_bounds = self._y_bounds = None
        self.request_lod_data(initial_load=True)

    def _get_plot_geometry(self) -> Tuple[int, int, int, int]:
        w, h = self.canvas.winfo_width(), self.canvas.winfo_height()
        if w < 100 or h < 100: return 60, 30, 10, 10
        pad_left, pad_top, pad_right, pad_bottom = 80, 40, 20, 70 
        return pad_left, pad_top, w - pad_left - pad_right, h - pad_top - pad_bottom

    def _px_to_data(self, px_x: float, px_y: float) -> Tuple[float, float]:
        pad_left, pad_top, plot_w, plot_h = self._get_plot_geometry()
        x_min, x_max = self._x_bounds or (0, 1)
        y_min, y_max = self._y_bounds or (0, 1)
        data_x = x_min + ((px_x - pad_left) / plot_w) * (x_max - x_min)
        data_y = y_max - ((px_y - pad_top) / plot_h) * (y_max - y_min)
        return data_x, data_y

    def _on_scroll(self, event: Any) -> None:
        if not self._x_bounds or not self._y_bounds: return
        pad_left, pad_top, plot_w, plot_h = self._get_plot_geometry()
        if not (pad_left <= event.x <= pad_left + plot_w and pad_top <= event.y <= pad_top + plot_h): return

        data_x, data_y = self._px_to_data(event.x, event.y)
        zoom_factor = 0.85 if event.delta > 0 else 1.15
        
        x_min, x_max = self._x_bounds; y_min, y_max = self._y_bounds
        self._x_bounds = (data_x - (data_x - x_min) * zoom_factor, data_x + (x_max - data_x) * zoom_factor)
        self._y_bounds = (data_y - (data_y - y_min) * zoom_factor, data_y + (y_max - data_y) * zoom_factor)
        self._schedule_lod_update()

    def _on_press(self, event: Any) -> None:
        pad_left, pad_top, plot_w, plot_h = self._get_plot_geometry()
        if not (pad_left <= event.x <= pad_left + plot_w and pad_top <= event.y <= pad_top + plot_h): return
        
        self._dragging = True
        self._last_mouse_pos = (event.x, event.y)
        
        if self.interaction_mode == 'zoom':
            self._is_drawing_zoom_box = True
            self._zoom_rect_id = self.canvas.create_rectangle(event.x, event.y, event.x, event.y, outline=style.COLORS['accent'], dash=(4, 4), width=1.5)
        else:
            self._is_drawing_zoom_box = False

    def _on_move(self, event: Any) -> None:
        if not self._dragging or not self._last_mouse_pos or not self._x_bounds: return
        
        if self._is_drawing_zoom_box and self._zoom_rect_id:
            self.canvas.coords(self._zoom_rect_id, self._last_mouse_pos[0], self._last_mouse_pos[1], event.x, event.y)
        else:
            pad_left, pad_top, plot_w, plot_h = self._get_plot_geometry()
            dx_data = ((event.x - self._last_mouse_pos[0]) / plot_w) * (self._x_bounds[1] - self._x_bounds[0])
            dy_data = ((event.y - self._last_mouse_pos[1]) / plot_h) * (self._y_bounds[1] - self._y_bounds[0])
            self._last_mouse_pos = (event.x, event.y)
            
            self._x_bounds = (self._x_bounds[0] - dx_data, self._x_bounds[1] - dx_data)
            self._y_bounds = (self._y_bounds[0] + dy_data, self._y_bounds[1] + dy_data)
            self._schedule_lod_update()

    def _on_release(self, event: Any) -> None:
        if not self._dragging: return
        self._dragging = False
        
        if self._is_drawing_zoom_box and self._zoom_rect_id and self._x_bounds:
            self.canvas.delete(self._zoom_rect_id)
            self._zoom_rect_id = None
            x0, y0 = self._px_to_data(*self._last_mouse_pos)
            x1, y1 = self._px_to_data(event.x, event.y)
            if abs(x1 - x0) > 1e-5 and abs(y1 - y0) > 1e-5:
                self._x_bounds = (min(x0, x1), max(x0, x1))
                self._y_bounds = (min(y0, y1), max(y0, y1))
                self.request_lod_data(initial_load=False)
        elif not self._is_drawing_zoom_box:
            self._push_view()

    # --- ASYNC DATASHADER PIPELINE ---
    def request_lod_data(self, initial_load: bool = False) -> None:
        if not hasattr(self.controller, 'extraction_service'): return
        pad_left, pad_top, plot_w, plot_h = self._get_plot_geometry()
        if plot_w < 10 or plot_h < 10 or self._is_rendering: return
        
        self._is_rendering = True
        
        self.canvas.delete("loading")
        self.canvas.create_text(
            pad_left + plot_w/2, pad_top + plot_h/2, 
            text="⏳ Rendering Viewport...", 
            fill=style.COLORS['accent'], font=('Segoe UI', 12, 'bold'), tags="loading"
        )
        self.canvas.update_idletasks()

        def _worker_thread():
            try:
                pil_img, bounds = self.controller.extraction_service._getRasterizedFrame(
                    state=self.controller.state, controller=self.controller, task_id=self.task_index,
                    target_view=self.target_view.get(), canvas_width=plot_w, canvas_height=plot_h,
                    x_range=None if initial_load else self._x_bounds, y_range=None if initial_load else self._y_bounds,
                    color_cycle=self.color_cycle
                )
                self.after(0, lambda: self._on_render_complete(pil_img, bounds, initial_load))
            except Exception as e:
                self.after(0, lambda: print(f"Render error: {e}"))
                self._is_rendering = False

        threading.Thread(target=_worker_thread, daemon=True).start()

    def _on_render_complete(self, pil_img, bounds, initial_load):
        self._is_rendering = False
        if initial_load and bounds:
            self._x_bounds = (bounds[0], bounds[1])
            self._y_bounds = (bounds[2], bounds[3])
            self._push_view()
            
        self._update_dropdown_options()
        self._draw_canvas_overlay(pil_img)

    def _update_dropdown_options(self) -> None:
        if hasattr(self.controller.extraction_service, '_dataframeCache'):
            cache_keys = list(self.controller.extraction_service._dataframeCache.keys())
            if len(cache_keys) > 1:
                options = ["Combined"] + cache_keys
                self.dropdown_combo['values'] = options
                if self.target_view.get() not in options: self.target_view.set("Combined")
                self.dropdown_combo.place(relx=0.98, rely=0.02, anchor='ne')
            elif len(cache_keys) == 1:
                self.target_view.set(cache_keys[0])
                self.dropdown_combo.place_forget()
            else:
                self.dropdown_combo.place_forget()

    def _calculate_nice_ticks(self, min_val: float, max_val: float, num_ticks: int = 5) -> List[float]:
        span = max_val - min_val
        if span == 0: return [min_val]
        rough_step = span / (num_ticks - 1)
        if rough_step <= 0: rough_step = 1e-9
        
        magnitude = 10 ** math.floor(math.log10(rough_step))
        rel = rough_step / magnitude
        
        if rel <= 1.5: step = 1 * magnitude
        elif rel <= 3: step = 2 * magnitude
        elif rel <= 7: step = 5 * magnitude
        else: step = 10 * magnitude
        
        start = math.ceil(min_val / step) * step
        ticks, val = [], start
        while val <= max_val + (step * 0.1):
            ticks.append(val); val += step
        return ticks

    def _draw_canvas_overlay(self, pil_img: Optional[Image.Image]) -> None:
        self.canvas.delete("all")
        self.canvas.configure(bg=self.plot_bg_color)
        pad_left, pad_top, plot_w, plot_h = self._get_plot_geometry()

        if pil_img:
            self._tk_img = ImageTk.PhotoImage(pil_img)
            self.canvas.create_image(pad_left, pad_top, image=self._tk_img, anchor='nw')
        
        self.canvas.create_rectangle(pad_left, pad_top, pad_left + plot_w, pad_top + plot_h, outline=self.spine_color, width=1.0)

        # Exact White Image Replica Labels
        self.canvas.create_text(pad_left + plot_w/2, pad_top - 15, text="altitude plot", fill=self.text_color, font=('Segoe UI', 12))
        self.canvas.create_text(pad_left + plot_w/2, pad_top + plot_h + 50, text="time", fill=self.text_color, font=('Segoe UI', 10))
        self.canvas.create_text(pad_left - 60, pad_top + plot_h/2, text="altitude - meters", fill=self.text_color, font=('Segoe UI', 10), angle=90)

        if self._x_bounds and self._y_bounds:
            y_ticks = self._calculate_nice_ticks(self._y_bounds[0], self._y_bounds[1], 6)
            span_y = self._y_bounds[1] - self._y_bounds[0]
            
            for y_val in y_ticks:
                px_y = pad_top + plot_h - ((y_val - self._y_bounds[0]) / span_y) * plot_h
                if px_y < pad_top or px_y > pad_top + plot_h: continue
                
                if self.grid_visible: self.canvas.create_line(pad_left, px_y, pad_left + plot_w, px_y, fill=self.grid_color, dash=(2, 4))
                self.canvas.create_line(pad_left, px_y, pad_left - 4, px_y, fill=self.spine_color)
                
                fmt_y = f"{int(y_val)}" if y_val.is_integer() else f"{y_val:.1f}"
                self.canvas.create_text(pad_left - 8, px_y, text=fmt_y, fill=self.text_color, font=('Segoe UI', 9), anchor='e')

            x_span = self._x_bounds[1] - self._x_bounds[0]
            for i in range(1, 6):
                x_val = self._x_bounds[0] + (x_span * i / 6.0)
                px_x = pad_left + (plot_w * i / 6.0)
                if self.grid_visible: self.canvas.create_line(px_x, pad_top, px_x, pad_top + plot_h, fill=self.grid_color, dash=(2, 4))
                self.canvas.create_line(px_x, pad_top + plot_h, px_x, pad_top + plot_h + 4, fill=self.spine_color)
                
                try: dt_label = datetime.datetime.fromtimestamp(x_val).strftime("%m-%d %H:%M")
                except: dt_label = f"{x_val:.1f}"
                self.canvas.create_text(px_x, pad_top + plot_h + 10, text=dt_label, fill=self.text_color, font=('Segoe UI', 9), angle=25, anchor='ne')

    def _schedule_lod_update(self) -> None:
        if self._debounce_job: self.after_cancel(self._debounce_job)
        self._debounce_job = self.after(50, lambda: self.request_lod_data(initial_load=False))

    def export_to_file(self, target_path: str) -> bool:
        try:
            from PIL import ImageGrab
            self.canvas.update_idletasks()

            x0 = self.canvas.winfo_rootx()
            y0 = self.canvas.winfo_rooty()
            x1 = x0 + self.canvas.winfo_width()
            y1 = y0 + self.canvas.winfo_height()
            
            if x1 <= x0 or y1 <= y0:
                print("[!] Export failed: Canvas geometry measurements are invalid.")
                return False
            screenshot = ImageGrab.grab(bbox=(x0, y0, x1, y1))
            screenshot.save(target_path, "PNG")
            
            print(f"[✓] Canvas snapshot successfully saved directly to: {target_path}")
            return True
        except Exception as err:
            print(f"[!] Native canvas export pipeline failed: {err}")
            return False

class NoBackendDisplay(tk.Frame): 
    def __init__(self, parent, **kwargs):
        super().__init__(parent, bg=style.COLORS['bg_card'], **kwargs)
        tk.Label(
            self, text="Backend not available.", 
            fg=style.COLORS['text_muted'], bg=style.COLORS['bg_card']
        ).pack(expand=True)

class PlotErrorDisplay(tk.Frame): 
    def __init__(self, parent, error_msg, **kwargs):
        super().__init__(parent, bg=style.COLORS['bg_card'], **kwargs)
        tk.Label(
            self, text=f"❌ Error rendering plot:\n{error_msg}", 
            fg=style.COLORS['error'], bg=style.COLORS['bg_card']
        ).pack(expand=True)
        