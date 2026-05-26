import tkinter as tk
import numpy as np
import matplotlib
matplotlib.use('TkAgg')
from matplotlib.figure import Figure
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg, NavigationToolbar2Tk
from . import style
# from .utils import extract_plot_data

class Plotter:
    def __init__(self, cache, plot_idx):
        self.cache = cache
        self.plot_idx = plot_idx
        self.fig = None
        self.ax = None
        self.canvas = None
        self.grid_visible = True
        self._dragging = False
        self._last_mouse_pos = None
        self.plot_bg_color = style.COLORS['graph_bg']
        self.line_color = style.COLORS['accent']
        self.text_color = style.COLORS['graph_text']
        self.grid_color = style.COLORS['border']
        self.spine_color = style.COLORS['border']

    def embed_in_frame(self, parent):
        try:
            self.fig = Figure(figsize=(8,6), dpi=100, facecolor=self.plot_bg_color)
            self.ax = self.fig.add_subplot(111, facecolor=self.plot_bg_color)
            self._draw_plot()
            self.canvas = FigureCanvasTkAgg(self.fig, master=parent)
            self.canvas.draw()
            self.canvas.get_tk_widget().pack(fill='both', expand=True)

            toolbar_frame = tk.Frame(parent, bg=style.COLORS['bg_card_light'], height=35)
            toolbar_frame.pack(fill='x')
            NavigationToolbar2Tk(self.canvas, toolbar_frame).update()

            self.canvas.mpl_connect("scroll_event", self._on_scroll)
            self.canvas.mpl_connect("button_press_event", self._on_press)
            self.canvas.mpl_connect("button_release_event", self._on_release)
            self.canvas.mpl_connect("motion_notify_event", self._on_move)
            self.canvas.mpl_connect("button_press_event", self._on_double)
            return True
        except Exception as e:
            print(f"Plot error: {e}")
            return False

    def _draw_plot(self):
        self.ax.clear()
        def extract_plot_data(a, b):
            return None, None
        time_data, cno_data = extract_plot_data(self.cache, self.plot_idx)
        if time_data is not None and cno_data is not None and len(time_data) > 0:
            self.ax.plot(time_data, cno_data, color=self.line_color, linewidth=1.5, marker='o', markersize=2, alpha=0.7)
            self.ax.set_title("C/N0 vs Time", color=self.text_color, fontsize=12)
            self.ax.set_xlabel("Time (s)", color=self.text_color, fontsize=10)
            self.ax.set_ylabel("C/N0 (dB-Hz)", color=self.text_color, fontsize=10)
        else:
            # sample data fallback
            x = np.linspace(0,200,200)
            y = 40 + 4*np.sin(x/12) + np.random.normal(0,1.2,200)
            self.ax.plot(x, y, color=self.line_color, linewidth=1.5)
            self.ax.set_title("Sample C/N0 (No data)", color=self.text_color)
            self.ax.set_xlabel("Sample", color=self.text_color)
            self.ax.set_ylabel("dB-Hz", color=self.text_color)
        self._apply_theme()
        self.fig.tight_layout()

    def _apply_theme(self):
        self.fig.patch.set_facecolor(self.plot_bg_color)
        self.ax.set_facecolor(self.plot_bg_color)
        self.ax.tick_params(colors=self.text_color)
        self.ax.title.set_color(self.text_color)
        self.ax.xaxis.label.set_color(self.text_color)
        self.ax.yaxis.label.set_color(self.text_color)
        for spine in self.ax.spines.values():
            spine.set_color(self.spine_color)
        if self.grid_visible:
            self.ax.grid(True, linestyle='--', alpha=0.3, color=self.grid_color)
        else:
            self.ax.grid(False)

    def _on_scroll(self, event):
        if not event.inaxes: return
        scale = 1/1.2 if event.button == 'up' else 1.2 if event.button == 'down' else None
        if not scale: return
        xl, yl = self.ax.get_xlim(), self.ax.get_ylim()
        xc, yc = event.xdata or (xl[0]+xl[1])/2, event.ydata or (yl[0]+yl[1])/2
        self.ax.set_xlim([xc - (xc-xl[0])*scale, xc + (xl[1]-xc)*scale])
        self.ax.set_ylim([yc - (yc-yl[0])*scale, yc + (yl[1]-yc)*scale])
        self.canvas.draw_idle()

    def _on_press(self, event):
        if event.inaxes and event.button == 1:
            self._dragging = True
            self._last_mouse_pos = (event.x, event.y)
    def _on_release(self, event):
        self._dragging = False
        self._last_mouse_pos = None
    def _on_move(self, event):
        if not self._dragging or not event.inaxes or not self._last_mouse_pos: return
        xl, yl = self.ax.get_xlim(), self.ax.get_ylim()
        bbox = self.ax.get_window_extent()
        dx = (event.x - self._last_mouse_pos[0]) * (xl[1]-xl[0]) / bbox.width
        dy = (event.y - self._last_mouse_pos[1]) * (yl[1]-yl[0]) / bbox.height
        self.ax.set_xlim(xl[0]-dx, xl[1]-dx)
        self.ax.set_ylim(yl[0]-dy, yl[1]-dy)
        self._last_mouse_pos = (event.x, event.y)
        self.canvas.draw_idle()
    def _on_double(self, event):
        if not event.dblclick or not event.inaxes: return
        scale = 0.5 if event.button == 1 else 2.0 if event.button == 3 else None
        if not scale: return
        xl, yl = self.ax.get_xlim(), self.ax.get_ylim()
        self.ax.set_xlim([event.xdata - (event.xdata-xl[0])*scale, event.xdata + (xl[1]-event.xdata)*scale])
        self.ax.set_ylim([event.ydata - (event.ydata-yl[0])*scale, event.ydata + (yl[1]-event.ydata)*scale])
        self.canvas.draw_idle()

    def toggle_grid(self):
        self.grid_visible = not self.grid_visible
        self._apply_theme()
        self.canvas.draw_idle()
        return self.grid_visible
    def autoscale(self):
        self.ax.relim()
        self.ax.autoscale()
        self.canvas.draw_idle()
    def save_figure(self, filename):
        if self.fig:
            self.fig.savefig(filename, dpi=300, bbox_inches='tight', facecolor=self.plot_bg_color)
            return True
        return False
    def set_plot_bg_color(self, c): self.plot_bg_color = c; self._apply_theme(); self.canvas.draw_idle()
    def set_line_color(self, c): self.line_color = c; self._draw_plot(); self.canvas.draw_idle()
    def set_text_color(self, c): self.text_color = c; self._apply_theme(); self.canvas.draw_idle()
    def set_grid_color(self, c): self.grid_color = c; self._apply_theme(); self.canvas.draw_idle()
    def set_spine_color(self, c): self.spine_color = c; self._apply_theme(); self.canvas.draw_idle()