"""
ui/plot_helpers.py
──────────────────
Matplotlib and Plotly rendering helpers used by the graph page.

These functions are intentionally dependency-optional: if a backend is
unavailable its corresponding helpers simply will not be called (the caller
checks MATPLOTLIB_AVAILABLE / PLOTLY_AVAILABLE before dispatch).

Public functions
────────────────
  extract_plot_data      — resolves time and C/N0 arrays from a cache dict.
  draw_plot_on_axis      — renders the correct plot type onto a matplotlib Axes.
  embed_matplotlib       — creates Figure/Canvas and packs them into a tk Frame.
  create_plotly_figure   — builds and returns a go.Figure ready for export or
                           embedding.
  embed_plotly           — renders a Plotly figure inside a tk Frame (via
                           tkinterweb or falling back to the system browser).
  show_no_backend_message — displays an informational label when neither
                            matplotlib nor plotly is importable.
  show_error_message     — displays a styled error panel inside a tk Frame.
"""

import tkinter as tk
import numpy as np
from .theme import COLORS

# ── Optional backends ────────────────────────────────────────────────────────

try:
    import matplotlib
    matplotlib.use('TkAgg')
    from matplotlib.figure import Figure
    from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg, NavigationToolbar2Tk
    MATPLOTLIB_AVAILABLE = True
except Exception:
    MATPLOTLIB_AVAILABLE = False

try:
    import plotly.graph_objs as go
    import plotly.io as pio
    PLOTLY_AVAILABLE = True
except Exception:
    PLOTLY_AVAILABLE = False

try:
    from tkinterweb import HtmlFrame
    TKINTERWEB_AVAILABLE = True
except Exception:
    TKINTERWEB_AVAILABLE = False


# ── Data extraction ──────────────────────────────────────────────────────────

def extract_plot_data(cache, log_fn=None):
    """Return (time_array, cno_array) from *cache*, or (None, None) on failure.

    *log_fn* is an optional callable used to surface warnings to the UI log.
    """
    time_data = None
    cno_data  = None

    def _warn(msg):
        if log_fn:
            log_fn(msg)

    try:
        for key in ['time', 'timestamp', 'times', 'Time', 'TIMESTAMP']:
            if key in cache:
                time_data = np.asarray(cache[key])
                break

        for key in ['cno', 'cn0', 'CByN0', 'c_by_n0', 'cbyn0', 'CNO', 'CN0']:
            if key in cache:
                cno_data = np.asarray(cache[key])
                break

        if cno_data is None:
            for key, value in cache.items():
                try:
                    arr = np.asarray(value)
                    if (arr.ndim == 1 and arr.size > 10
                            and np.issubdtype(arr.dtype, np.number)):
                        if time_data is None or arr.size == time_data.size:
                            cno_data = arr
                            break
                except Exception:
                    continue

        if time_data is not None and cno_data is not None:
            if len(time_data) != len(cno_data):
                min_len   = min(len(time_data), len(cno_data))
                time_data = time_data[:min_len]
                cno_data  = cno_data[:min_len]

    except Exception as exc:
        _warn(f"⚠️ Error extracting data: {exc}")
        return None, None

    return time_data, cno_data


# ── Matplotlib helpers ────────────────────────────────────────────────────────

def draw_plot_on_axis(fig, ax, cache, current_plot_idx, log_fn=None):
    """Render the appropriate plot onto *ax* based on *current_plot_idx*."""

    def _warn(msg):
        if log_fn:
            log_fn(msg)

    try:
        ax.clear()

        if current_plot_idx == 0:  # Plot CByN0
            time_data, cno_data = extract_plot_data(cache or {}, log_fn)

            if time_data is not None and cno_data is not None:
                ax.plot(time_data, cno_data,
                        color=COLORS['accent'],
                        linewidth=1.5,
                        marker='o',
                        markersize=3,
                        alpha=0.8)
                ax.set_title("C/N0 vs Time",
                             color=COLORS['text_primary'],
                             fontsize=14, fontweight='bold', pad=15)
                ax.set_xlabel("Time",       color=COLORS['text_secondary'], fontsize=10)
                ax.set_ylabel("C/N0 (dB-Hz)", color=COLORS['text_secondary'], fontsize=10)
            else:
                x = np.linspace(0, 200, 200)
                y = 40 + 4 * np.sin(x / 12.0) + np.random.normal(scale=1.2, size=len(x))
                ax.plot(x, y,
                        color=COLORS['accent'],
                        linewidth=1.5, marker='o', markersize=3, alpha=0.8)
                ax.set_title("Sample C/N0 Data",
                             color=COLORS['text_primary'],
                             fontsize=14, fontweight='bold', pad=15)
                ax.set_xlabel("Sample Index",  color=COLORS['text_secondary'], fontsize=10)
                ax.set_ylabel("C/N0 (dB-Hz)", color=COLORS['text_secondary'], fontsize=10)
                _warn("⚠️ Using sample data (no cache data found)")
        else:
            x = np.linspace(0, 100, 100)
            y = np.cumsum(np.random.randn(100))
            ax.plot(x, y, color=COLORS['accent'], linewidth=2)
            ax.set_title("Placeholder Plot",
                         color=COLORS['text_primary'],
                         fontsize=14, fontweight='bold')
            ax.set_xlabel("Index", color=COLORS['text_secondary'])
            ax.set_ylabel("Value", color=COLORS['text_secondary'])

        # Common styling
        ax.tick_params(colors=COLORS['text_secondary'], labelsize=9)
        ax.grid(True, linestyle='--', alpha=0.3, color=COLORS['text_muted'])
        for spine in ax.spines.values():
            spine.set_color(COLORS['border'])

        fig.tight_layout()

    except Exception as exc:
        _warn(f"❌ Error drawing plot: {exc}")
        ax.clear()
        ax.text(0.5, 0.5, f"Error: {str(exc)}",
                transform=ax.transAxes,
                ha='center', va='center',
                color=COLORS['error'])


def embed_matplotlib(parent, fig_holder, cache, current_plot_idx, log_fn=None):
    """Create a matplotlib Figure, render the plot, and embed in *parent*.

    *fig_holder* is a dict used to return the created Figure, Axes, and Canvas
    back to the caller::

        holder = {}
        embed_matplotlib(frame, holder, cache, idx, log_fn)
        fig    = holder['fig']
        ax     = holder['ax']
        canvas = holder['canvas']
    """
    try:
        fig = Figure(figsize=(8, 6), dpi=100, facecolor=COLORS['bg_card'])
        ax  = fig.add_subplot(111, facecolor=COLORS['bg_card_light'])

        draw_plot_on_axis(fig, ax, cache, current_plot_idx, log_fn)

        canvas = FigureCanvasTkAgg(fig, master=parent)
        canvas.draw()
        canvas.get_tk_widget().pack(fill="both", expand=True)

        toolbar_frame = tk.Frame(parent, bg=COLORS['bg_card_light'], height=40)
        toolbar_frame.pack(fill="x")
        toolbar = NavigationToolbar2Tk(canvas, toolbar_frame)
        toolbar.update()

        fig_holder['fig']    = fig
        fig_holder['ax']     = ax
        fig_holder['canvas'] = canvas

        if log_fn:
            log_fn("✅ Plot rendered successfully")

    except Exception as exc:
        if log_fn:
            log_fn(f"❌ Error rendering matplotlib plot: {exc}")
        show_error_message(parent, str(exc))


# ── Plotly helpers ────────────────────────────────────────────────────────────

def create_plotly_figure(cache, current_plot_idx):
    """Build and return a Plotly Figure from *cache* data."""
    time_data, cno_data = extract_plot_data(cache or {})

    if time_data is not None and cno_data is not None:
        trace  = go.Scatter(x=time_data, y=cno_data,
                            mode='lines+markers', name='C/N0',
                            line=dict(color=COLORS['accent'], width=2),
                            marker=dict(size=4))
        title  = 'C/N0 vs Time'
        xlabel = 'Time'
        ylabel = 'C/N0 (dB-Hz)'
    else:
        x      = np.linspace(0, 200, 200)
        y      = 40 + 4 * np.sin(x / 12.0) + np.random.normal(scale=1.2, size=len(x))
        trace  = go.Scatter(x=x, y=y,
                            mode='lines+markers', name='Sample',
                            line=dict(color=COLORS['accent'], width=2),
                            marker=dict(size=4))
        title  = 'Sample C/N0 Data'
        xlabel = 'Sample Index'
        ylabel = 'C/N0 (dB-Hz)'

    layout = go.Layout(
        title=title,
        xaxis=dict(title=xlabel, gridcolor=COLORS['border']),
        yaxis=dict(title=ylabel, gridcolor=COLORS['border']),
        paper_bgcolor=COLORS['bg_card'],
        plot_bgcolor=COLORS['bg_card_light'],
        font=dict(color=COLORS['text_primary']),
        hovermode='closest',
    )

    return go.Figure(data=[trace], layout=layout)


def embed_plotly(parent, cache, current_plot_idx, log_fn=None):
    """Render a Plotly figure inside *parent* (inline or browser fallback)."""
    try:
        fig = create_plotly_figure(cache, current_plot_idx)

        if TKINTERWEB_AVAILABLE:
            html = pio.to_html(fig, include_plotlyjs='cdn', full_html=True)
            html_frame = HtmlFrame(parent, horizontal_scrollbar='auto')
            html_frame.set_content(html)
            html_frame.pack(fill='both', expand=True)
            if log_fn:
                log_fn("✅ Interactive plot rendered (Plotly)")
        else:
            import webbrowser
            import tempfile
            html = pio.to_html(fig, include_plotlyjs='cdn', full_html=True)
            tmp  = tempfile.NamedTemporaryFile(delete=False, suffix='.html', mode='w')
            tmp.write(html)
            tmp.close()
            webbrowser.open(f'file://{tmp.name}')
            if log_fn:
                log_fn("✅ Plot opened in browser")

            tk.Label(parent,
                     text="Plot opened in your browser",
                     fg=COLORS['accent'],
                     bg=COLORS['bg_card'],
                     font=("Segoe UI", 12)).pack(expand=True)

    except Exception as exc:
        if log_fn:
            log_fn(f"❌ Plotly error: {exc}")
        show_error_message(parent, str(exc))


# ── Fallback panels ───────────────────────────────────────────────────────────

def show_no_backend_message(parent):
    """Render an informational panel when no plotting backend is available."""
    frame = tk.Frame(parent, bg=COLORS['bg_card'])
    frame.pack(expand=True)

    tk.Label(frame, text="📊",
             fg=COLORS['error'], bg=COLORS['bg_card'],
             font=("Segoe UI", 48)).pack(pady=(20, 10))

    tk.Label(frame, text="No Plotting Backend Available",
             fg=COLORS['error'], bg=COLORS['bg_card'],
             font=("Segoe UI", 14, "bold")).pack(pady=5)

    tk.Label(frame,
             text="Please install matplotlib or plotly:\n\npip install matplotlib\nor\npip install plotly",
             fg=COLORS['text_secondary'], bg=COLORS['bg_card'],
             font=("Segoe UI", 10), justify="center").pack(pady=10)


def show_error_message(parent, error_msg: str):
    """Render a styled error panel inside *parent*."""
    frame = tk.Frame(parent, bg=COLORS['bg_card'])
    frame.pack(expand=True)

    tk.Label(frame, text="⚠️",
             fg=COLORS['error'], bg=COLORS['bg_card'],
             font=("Segoe UI", 48)).pack(pady=(20, 10))

    tk.Label(frame, text="Error Rendering Plot",
             fg=COLORS['error'], bg=COLORS['bg_card'],
             font=("Segoe UI", 14, "bold")).pack(pady=5)

    tk.Label(frame, text=f"Details: {error_msg}",
             fg=COLORS['text_secondary'], bg=COLORS['bg_card'],
             font=("Segoe UI", 9), wraplength=400).pack(pady=10)