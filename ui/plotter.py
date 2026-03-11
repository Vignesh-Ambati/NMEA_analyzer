# accord_analyser/plotter.py
"""Plotting backends: matplotlib and plotly wrappers."""

import tkinter as tk
import numpy as np
from .constants import COLORS
from .utils import extract_plot_data

# Optional imports
try:
    import matplotlib
    matplotlib.use('TkAgg')
    from matplotlib.figure import Figure
    from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg, NavigationToolbar2Tk
    MATPLOTLIB_AVAILABLE = True
except ImportError:
    MATPLOTLIB_AVAILABLE = False

try:
    import plotly.graph_objs as go
    import plotly.io as pio
    PLOTLY_AVAILABLE = True
except ImportError:
    PLOTLY_AVAILABLE = False

try:
    from tkinterweb import HtmlFrame
    TKINTERWEB_AVAILABLE = True
except ImportError:
    TKINTERWEB_AVAILABLE = False


class Plotter:
    """Handles creation and embedding of plots using available backends."""

    def __init__(self, cache, plot_idx):
        self.cache = cache
        self.plot_idx = plot_idx  # 0 for C/N0, others for future tasks
        self.fig = None
        self.ax = None
        self.canvas = None
        self.grid_visible = True

    def embed_in_frame(self, parent):
        """Embed the plot into the given tkinter frame. Returns True on success."""
        if PLOTLY_AVAILABLE and TKINTERWEB_AVAILABLE:
            return self._embed_plotly(parent)
        elif MATPLOTLIB_AVAILABLE:
            return self._embed_matplotlib(parent)
        else:
            self._show_no_backend_message(parent)
            return False

    def _embed_matplotlib(self, parent):
        try:
            self.fig = Figure(figsize=(8, 6), dpi=100, facecolor=COLORS['bg_card'])
            self.ax = self.fig.add_subplot(111, facecolor=COLORS['bg_card_light'])
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
            return True
        except Exception as e:
            print(f"❌ Matplotlib error: {e}")
            self._show_error_message(parent, str(e))
            return False

    def _draw_matplotlib_plot(self):
        self.ax.clear()
        if self.plot_idx == 0:
            time_data, cno_data = extract_plot_data(self.cache)
            if time_data is not None and cno_data is not None:
                self.ax.plot(time_data, cno_data, color=COLORS['accent'], linewidth=1.5,
                             marker='o', markersize=3, alpha=0.8)
                self.ax.set_title("C/N0 vs Time", color=COLORS['text_primary'], fontsize=14, fontweight='bold', pad=15)
                self.ax.set_xlabel("Time", color=COLORS['text_secondary'], fontsize=10)
                self.ax.set_ylabel("C/N0 (dB-Hz)", color=COLORS['text_secondary'], fontsize=10)
            else:
                # Sample data
                x = np.linspace(0, 200, 200)
                y = 40 + 4 * np.sin(x / 12.0) + np.random.normal(scale=1.2, size=len(x))
                self.ax.plot(x, y, color=COLORS['accent'], linewidth=1.5, marker='o', markersize=3, alpha=0.8)
                self.ax.set_title("Sample C/N0 Data", color=COLORS['text_primary'], fontsize=14, fontweight='bold', pad=15)
                self.ax.set_xlabel("Sample Index", color=COLORS['text_secondary'], fontsize=10)
                self.ax.set_ylabel("C/N0 (dB-Hz)", color=COLORS['text_secondary'], fontsize=10)
                print("⚠️ Using sample data (no cache data found)")
        else:
            # Placeholder for other tasks
            x = np.linspace(0, 100, 100)
            y = np.cumsum(np.random.randn(100))
            self.ax.plot(x, y, color=COLORS['accent'], linewidth=2)
            self.ax.set_title("Placeholder Plot", color=COLORS['text_primary'], fontsize=14, fontweight='bold')
            self.ax.set_xlabel("Index", color=COLORS['text_secondary'])
            self.ax.set_ylabel("Value", color=COLORS['text_secondary'])

        self.ax.tick_params(colors=COLORS['text_secondary'], labelsize=9)
        self.ax.grid(self.grid_visible, linestyle='--', alpha=0.3, color=COLORS['text_muted'])
        for spine in self.ax.spines.values():
            spine.set_color(COLORS['border'])
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

    def _embed_plotly(self, parent):
        try:
            fig = self._create_plotly_figure()
            if TKINTERWEB_AVAILABLE:
                html = pio.to_html(fig, include_plotlyjs='cdn', full_html=True)
                html_frame = HtmlFrame(parent, horizontal_scrollbar='auto')
                html_frame.set_content(html)
                html_frame.pack(fill='both', expand=True)
                print("✅ Interactive plot rendered (Plotly)")
                return True
            else:
                # Fallback: open in browser
                import webbrowser
                import tempfile
                html = pio.to_html(fig, include_plotlyjs='cdn', full_html=True)
                with tempfile.NamedTemporaryFile(delete=False, suffix='.html', mode='w') as tmp:
                    tmp.write(html)
                    tmp_path = tmp.name
                webbrowser.open(f'file://{tmp_path}')
                print("✅ Plot opened in browser")
                # Show message in parent
                label = tk.Label(parent, text="Plot opened in your browser",
                                 fg=COLORS['accent'], bg=COLORS['bg_card'], font=("Segoe UI", 12))
                label.pack(expand=True)
                return True
        except Exception as e:
            print(f"❌ Plotly error: {e}")
            self._show_error_message(parent, str(e))
            return False

    def _create_plotly_figure(self):
        time_data, cno_data = extract_plot_data(self.cache)
        if time_data is not None and cno_data is not None:
            trace = go.Scatter(x=time_data, y=cno_data, mode='lines+markers', name='C/N0',
                               line=dict(color=COLORS['accent'], width=2), marker=dict(size=4))
            title = 'C/N0 vs Time'
            xlabel = 'Time'
            ylabel = 'C/N0 (dB-Hz)'
        else:
            x = np.linspace(0, 200, 200)
            y = 40 + 4 * np.sin(x / 12.0) + np.random.normal(scale=1.2, size=len(x))
            trace = go.Scatter(x=x, y=y, mode='lines+markers', name='Sample',
                               line=dict(color=COLORS['accent'], width=2), marker=dict(size=4))
            title = 'Sample C/N0 Data'
            xlabel = 'Sample Index'
            ylabel = 'C/N0 (dB-Hz)'
        layout = go.Layout(title=title,
                           xaxis=dict(title=xlabel, gridcolor=COLORS['border']),
                           yaxis=dict(title=ylabel, gridcolor=COLORS['border']),
                           paper_bgcolor=COLORS['bg_card'],
                           plot_bgcolor=COLORS['bg_card_light'],
                           font=dict(color=COLORS['text_primary']),
                           hovermode='closest')
        return go.Figure(data=[trace], layout=layout)

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

    # Controls for matplotlib
    def toggle_grid(self):
        if self.ax:
            self.grid_visible = not self.grid_visible
            self.ax.grid(self.grid_visible, linestyle='--', alpha=0.3)
            if self.canvas:
                self.canvas.draw_idle()
            return self.grid_visible
        return None

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