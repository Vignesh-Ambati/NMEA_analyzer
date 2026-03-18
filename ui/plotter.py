# accord_analyser/plotter.py
"""Plotting backends: matplotlib and plotly wrappers."""

import tkinter as tk
import numpy as np
from .constants import COLORS
from .utils import extract_plot_data


import matplotlib
matplotlib.use('TkAgg')
from matplotlib.figure import Figure
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg, NavigationToolbar2Tk
MATPLOTLIB_AVAILABLE = True

class Plotter:

    def __init__(self, cache, plot_idx):
        self.cache = cache
        self.plot_idx = plot_idx  # 0 for C/N0, others for future tasks
        self.fig = None
        self.ax = None
        self.canvas = None
        self.grid_visible = True
        self._dragging = False
        self._last_mouse_pos = None
        self.plot_bg_color = COLORS['graph_bg']
        self.line_color = COLORS['accent']
        self.text_color = COLORS['graph_font']
        self.grid_color = COLORS['border']
        self.spine_color = COLORS['border']

    def embed_in_frame(self, parent):
        """Embed the plot into the given tkinter frame. Returns True on success."""
        return self._embed_matplotlib(parent)

    def _embed_matplotlib(self, parent):
        try:
            self.fig = Figure(figsize=(8, 6), dpi=100, facecolor=self.plot_bg_color)
            self.ax = self.fig.add_subplot(111, facecolor=self.plot_bg_color)
            self._draw_matplotlib_plot()
            self.canvas = FigureCanvasTkAgg(self.fig, master=parent)
            self.canvas.draw()
            self.canvas.get_tk_widget().pack(fill="both", expand=True)
            # Toolbar
            toolbar_frame = tk.Frame(parent, bg=COLORS['bg_card_light'], height=40)
            toolbar_frame.pack(fill="x")
            NavigationToolbar2Tk(self.canvas, toolbar_frame).update()
            # Bind events
            self.canvas.mpl_connect("scroll_event", self._on_scroll_zoom)
            parent.bind("<Configure>", self._on_resize)
            self.canvas.mpl_connect("button_press_event", self._on_mouse_press)
            self.canvas.mpl_connect("button_release_event", self._on_mouse_release)
            self.canvas.mpl_connect("motion_notify_event", self._on_mouse_move)
            self.canvas.mpl_connect("button_press_event", self._on_double_click)
            return True
        except Exception as e:
            print(f"❌ Matplotlib error: {e}")
            self._show_error_message(parent, str(e))
            return False

    def _draw_matplotlib_plot(self):
        self.ax.clear()
        if self.plot_idx == 0:
            time_data, cno_data = extract_plot_data(self.cache, plot_idx=0)

            if time_data is not None and cno_data is not None:
                # Plot the C/N0 data
                self.ax.plot(time_data, cno_data, color=self.line_color, linewidth=1.5,
                             marker='o', markersize=3, alpha=0.8, label='C/N0')
                
                # Add mean line
                mean_cno = np.mean(cno_data)
                self.ax.axhline(y=mean_cno, color=self.line_color, linestyle='--', 
                               alpha=0.5, linewidth=1, label=f'Mean: {mean_cno:.1f} dB-Hz')
                
                # Set labels and title
                self.ax.set_title("C/N0 vs Time", color=self.text_color, 
                                 fontsize=14, fontweight='bold', pad=15)
                self.ax.set_xlabel("Time (seconds)", color=self.text_color, fontsize=12)
                self.ax.set_ylabel("C/N0 (dB-Hz)", color=self.text_color, fontsize=12)
                
                # Add legend
                self.ax.legend(loc='upper right', framealpha=0.9, fontsize=10)
                
                # Add statistics as text
                min_cno = np.min(cno_data)
                max_cno = np.max(cno_data)
                std_cno = np.std(cno_data)
                stats_text = f"Min: {min_cno:.1f}\nMax: {max_cno:.1f}\nStd: {std_cno:.2f}\nN: {len(cno_data)}"
                self.ax.text(0.02, 0.98, stats_text, transform=self.ax.transAxes,
                           fontsize=9, verticalalignment='top',
                           bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5),
                           color=self.text_color)
                
                print(f"✅ Plotted {len(time_data)} C/N0 data points")
            else:
                # Sample data fallback
                x = np.linspace(0, 200, 200)
                y = 40 + 4 * np.sin(x / 12.0) + np.random.normal(scale=1.2, size=len(x))
                self.ax.plot(x, y, color=self.line_color, linewidth=1.5, marker='o', 
                           markersize=3, alpha=0.8, label='Sample Data')
                
                mean_y = np.mean(y)
                self.ax.axhline(y=mean_y, color=self.line_color, linestyle='--',
                               alpha=0.5, linewidth=1, label=f'Mean: {mean_y:.1f}')
                
                self.ax.set_title("Sample C/N0 Data", color=self.text_color, 
                                 fontsize=14, fontweight='bold', pad=15)
                self.ax.set_xlabel("Sample Index", color=self.text_color, fontsize=12)
                self.ax.set_ylabel("C/N0 (dB-Hz)", color=self.text_color, fontsize=12)
                
                self.ax.legend(loc='upper right', framealpha=0.9, fontsize=10)
                
                print("⚠️ Using sample data (no cache data found)")
        else:
            # Placeholder for future plot types
            x = np.linspace(0, 100, 100)
            y = np.cumsum(np.random.randn(100))
            self.ax.plot(x, y, color=self.line_color, linewidth=2, label='Plot Data')
            self.ax.set_title("Placeholder Plot", color=self.text_color, 
                             fontsize=14, fontweight='bold', pad=15)
            self.ax.set_xlabel("Index", color=self.text_color, fontsize=12)
            self.ax.set_ylabel("Value", color=self.text_color, fontsize=12)
            self.ax.legend(loc='upper right', framealpha=0.9, fontsize=10)

        self._apply_plot_theme()
        self.fig.tight_layout()

    def _on_scroll_zoom(self, event):
        try:
            if not event.inaxes:
                return
            scale = (1 / 1.2) if event.button == 'up' else 1.2 if event.button == 'down' else None
            if scale is None:
                return
            xlim = self.ax.get_xlim()
            ylim = self.ax.get_ylim()
            xdata = event.xdata if event.xdata else (xlim[0] + xlim[1]) / 2
            ydata = event.ydata if event.ydata else (ylim[0] + ylim[1]) / 2
            self.ax.set_xlim([xdata - (xdata - xlim[0]) * scale, xdata + (xlim[1] - xdata) * scale])
            self.ax.set_ylim([ydata - (ydata - ylim[0]) * scale, ydata + (ylim[1] - ydata) * scale])
            self.canvas.draw_idle()
        except Exception as e:
            print(f"Scroll zoom error: {e}")

    def _on_resize(self, event):
        try:
            if self.fig and self.canvas:
                self.fig.tight_layout()
                self.canvas.draw_idle()
        except Exception as e:
            print(f"Resize error: {e}")

    def _show_no_backend_message(self, parent):
        frame = tk.Frame(parent, bg=COLORS['bg_card'])
        frame.pack(expand=True)
        tk.Label(frame, text="📊", fg=COLORS['error'], bg=COLORS['bg_card'],
                 font=("Segoe UI", 48)).pack(pady=(20, 10))
        tk.Label(frame, text="No Plotting Backend Available", fg=COLORS['error'],
                 bg=COLORS['bg_card'], font=("Segoe UI", 14, "bold")).pack(pady=5)
        tk.Label(frame,
                 text="Please install matplotlib or plotly:\n\npip install matplotlib\nor\npip install plotly",
                 fg=COLORS['text_secondary'], bg=COLORS['bg_card'],
                 font=("Segoe UI", 10), justify="center").pack(pady=10)
    def _show_error_message(self, parent, error_msg):
        frame = tk.Frame(parent, bg=COLORS['bg_card'])
        frame.pack(expand=True)
        tk.Label(frame, text="⚠️", fg=COLORS['error'], bg=COLORS['bg_card'],
                 font=("Segoe UI", 48)).pack(pady=(20, 10))
        tk.Label(frame, text="Error Rendering Plot", fg=COLORS['error'],
                 bg=COLORS['bg_card'], font=("Segoe UI", 14, "bold")).pack(pady=5)
        tk.Label(frame, text=f"Details: {error_msg}", fg=COLORS['text_secondary'],
                 bg=COLORS['bg_card'], font=("Segoe UI", 9), wraplength=400).pack(pady=10)

    def toggle_grid(self):
        if self.ax:
            self.grid_visible = not self.grid_visible
            if self.grid_visible:
                self.ax.grid(True, linestyle='--', alpha=0.3, color=COLORS['text_muted'])
            else:
                self.ax.grid(False)
            if self.canvas:
                self.canvas.draw_idle()
        return self.grid_visible   # ✅ return state
    def autoscale(self):
        if self.ax:
            self.ax.relim()
            self.ax.autoscale()
            if self.canvas:
                self.canvas.draw_idle()
    def save_figure(self, filename):
        if self.fig and MATPLOTLIB_AVAILABLE:
            self.fig.savefig(filename, dpi=300, bbox_inches='tight', facecolor=COLORS['bg_card'])
            return True
        return False
    def _on_mouse_press(self, event):
        if event.inaxes and event.button == 1:
            self._dragging = True
            self._last_mouse_pos = (event.x, event.y)
    def _on_mouse_release(self, event):
        self._dragging = False
        self._last_mouse_pos = None
    def _on_mouse_move(self, event):
        if not self._dragging or not event.inaxes or not self._last_mouse_pos:
            return
        x_prev, y_prev = self._last_mouse_pos
        dx_pixels = event.x - x_prev
        dy_pixels = event.y - y_prev

        xlim = self.ax.get_xlim()
        ylim = self.ax.get_ylim()

        bbox = self.ax.get_window_extent()
        width = bbox.width
        height = bbox.height

        dx_data = dx_pixels * (xlim[1] - xlim[0]) / width
        dy_data = dy_pixels * (ylim[1] - ylim[0]) / height

        self.ax.set_xlim(xlim[0] - dx_data, xlim[1] - dx_data)
        self.ax.set_ylim(ylim[0] - dy_data, ylim[1] - dy_data)

        self._last_mouse_pos = (event.x, event.y)
        self.canvas.draw_idle()
    def _on_double_click(self, event):
        if not event.dblclick or not event.inaxes:
            return
        scale = None
        if event.button == 1:       # Double left click → Zoom IN
            scale = 0.5
        elif event.button == 3:     # Double right click → Zoom OUT
            scale = 2.0
        if scale is None:
            return

        xlim = self.ax.get_xlim()
        ylim = self.ax.get_ylim()
        
        xdata = event.xdata
        ydata = event.ydata
        
        self.ax.set_xlim([
            xdata - (xdata - xlim[0]) * scale,
            xdata + (xlim[1] - xdata) * scale
        ])
        self.ax.set_ylim([
            ydata - (ydata - ylim[0]) * scale,
            ydata + (ylim[1] - ydata) * scale
        ])
        self.canvas.draw_idle()

    def set_plot_bg_color(self, color):
        self.plot_bg_color = color
        if self.fig and self.ax:
            self._apply_plot_theme()
            self.canvas.draw_idle()

    def set_line_color(self, color):
        self.line_color = color
        self._draw_matplotlib_plot()
        self.canvas.draw_idle()

    def set_text_color(self, color):
        self.text_color = color
        if self.ax:
            self._apply_plot_theme()
            self.canvas.draw_idle()

    def set_grid_color(self, color):
        self.grid_color = color
        if self.ax:
            self._apply_plot_theme()
            self.canvas.draw_idle()

    def set_spine_color(self, color):
        self.spine_color = color
        if self.ax:
            self._apply_plot_theme()
            self.canvas.draw_idle()

    def _apply_plot_theme(self):
        text_color = self.text_color
        grid_color = getattr(self, "grid_color", COLORS['text_muted'])
        spine_color = getattr(self, "spine_color", COLORS['border'])

        self.fig.patch.set_facecolor(self.plot_bg_color)
        self.ax.set_facecolor(self.plot_bg_color)

        self.ax.tick_params(colors=text_color)
        self.ax.title.set_color(text_color)
        self.ax.xaxis.label.set_color(text_color)
        self.ax.yaxis.label.set_color(text_color)

        for spine in self.ax.spines.values():
            spine.set_color(spine_color)

        if self.grid_visible:
            self.ax.grid(True, linestyle='--', alpha=0.3, color=grid_color)
        else:
            self.ax.grid(False)