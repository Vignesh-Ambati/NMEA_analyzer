# accord_analyser/pages/graph_page.py
"""Graph display page with controls."""

import tkinter as tk
from tkinter import filedialog, messagebox
from .base_page import BasePage
from ..constants import COLORS, TASKS
from ..plotter import Plotter

class GraphPage(BasePage):
    def setup_ui(self):
        # Main container
        main_container = tk.Frame(self, bg=COLORS['bg_card'])
        main_container.pack(fill="both", expand=True)

        # Toolbar
        toolbar = tk.Frame(main_container, bg=COLORS['bg_card_light'], height=60)
        toolbar.pack(fill="x", padx=10, pady=10)
        toolbar.pack_propagate(False)

        # Title area
        title_frame = tk.Frame(toolbar, bg=COLORS['bg_card_light'])
        title_frame.pack(side="left", fill="y", padx=15)
        plot_idx = self.controller.current_plot_idx
        task_name = TASKS[plot_idx] if plot_idx is not None and plot_idx < len(TASKS) else "Graph View"
        tk.Label(title_frame, text=f"📊 {task_name}",
                 fg=COLORS['text_primary'], bg=COLORS['bg_card_light'],
                 font=("Segoe UI", 12, "bold")).pack(anchor="w")
        tk.Label(title_frame, text="Interactive visualization with zoom and pan controls",
                 fg=COLORS['text_secondary'], bg=COLORS['bg_card_light'],
                 font=("Segoe UI", 9)).pack(anchor="w")

        # Back button
        btn_frame = tk.Frame(toolbar, bg=COLORS['bg_card_light'])
        btn_frame.pack(side="right", padx=15)
        self._create_toolbar_button(btn_frame, "← Back",
                                    self.controller._go_back).pack(side="left", padx=3)

        # Content area: plot on left, sidebar on right
        content = tk.Frame(main_container, bg=COLORS['bg_card'])
        content.pack(fill="both", expand=True, padx=10, pady=(0, 10))

        plot_container = tk.Frame(content, bg=COLORS['bg_card'])
        plot_container.pack(side="left", fill="both", expand=True, padx=(0, 10))

        sidebar = tk.Frame(content, bg=COLORS['bg_card_light'], width=200)
        sidebar.pack(side="right", fill="y")
        sidebar.pack_propagate(False)
        self._setup_sidebar(sidebar)

        # Create plotter and embed
        self.plotter = Plotter(self.controller.cache, self.controller.current_plot_idx)
        success = self.plotter.embed_in_frame(plot_container)
        if not success:
            # Error message already shown
            pass

    def _create_toolbar_button(self, parent, text, command):
        btn = tk.Button(parent, text=text, command=command,
                        bg=COLORS['bg_card'], fg=COLORS['text_primary'],
                        activebackground=COLORS['hover'], activeforeground='white',
                        font=("Segoe UI", 9, "bold"), relief=tk.FLAT,
                        padx=12, pady=6, cursor="hand2", bd=0,
                        highlightthickness=1, highlightbackground=COLORS['border'])
        btn.bind("<Enter>", lambda e: btn.configure(bg=COLORS['hover']))
        btn.bind("<Leave>", lambda e: btn.configure(bg=COLORS['bg_card']))
        return btn

    def _setup_sidebar(self, sidebar):
        tk.Label(sidebar, text="⚙️ Controls", fg=COLORS['text_primary'],
                 bg=COLORS['bg_card_light'], font=("Segoe UI", 11, "bold")).pack(pady=(15, 10), padx=15, anchor="w")
        tk.Frame(sidebar, bg=COLORS['border'], height=1).pack(fill="x", padx=15, pady=5)

        # Control buttons
        buttons = [
            ("💾 Save Image", self._save_figure),
            ("⊞ Toggle Grid", self._toggle_grid),
            ("↔ Auto Scale", self._autoscale),
            ("📤 Export CSV", self._export_csv),
            ("🔄 Refresh", lambda: self.controller._navigate(GraphPage))
        ]
        for text, cmd in buttons:
            self._create_sidebar_button(sidebar, text, cmd).pack(fill="x", padx=15, pady=5)

        tk.Frame(sidebar, bg=COLORS['border'], height=1).pack(fill="x", padx=15, pady=(15, 10))
        tk.Label(sidebar, text="💡 Tips", fg=COLORS['text_primary'],
                 bg=COLORS['bg_card_light'], font=("Segoe UI", 10, "bold")).pack(pady=(0, 5), padx=15, anchor="w")
        tk.Label(sidebar,
                 text="• Scroll to zoom\n• Click & drag to pan\n• Use toolbar buttons\n  for more options",
                 fg=COLORS['text_secondary'], bg=COLORS['bg_card_light'],
                 font=("Segoe UI", 8), justify="left").pack(padx=15, pady=5, anchor="w")

    def _create_sidebar_button(self, parent, text, command):
        btn = tk.Button(parent, text=text, command=command,
                        bg=COLORS['bg_card'], fg=COLORS['text_secondary'],
                        activebackground=COLORS['accent'], activeforeground='white',
                        font=("Segoe UI", 9), relief=tk.FLAT,
                        anchor="w", padx=10, pady=8, cursor="hand2", bd=0,
                        highlightthickness=1, highlightbackground=COLORS['border'])
        btn.bind("<Enter>", lambda e: btn.configure(bg=COLORS['accent'], fg='white'))
        btn.bind("<Leave>", lambda e: btn.configure(bg=COLORS['bg_card'], fg=COLORS['text_secondary']))
        return btn

    # Control actions
    def _toggle_grid(self):
        if hasattr(self, 'plotter'):
            state = self.plotter.toggle_grid()
            if state is not None:
                self.controller.log_message(f"Grid {'enabled' if state else 'disabled'}")

    def _autoscale(self):
        if hasattr(self, 'plotter'):
            self.plotter.autoscale()
            self.controller.log_message("✅ Plot auto-scaled")

    def _save_figure(self):
        fname = filedialog.asksaveasfilename(
            defaultextension=".png",
            filetypes=[("PNG image", "*.png"), ("PDF document", "*.pdf"),
                       ("SVG vector", "*.svg"), ("All files", "*.*")])
        if not fname:
            return
        if hasattr(self, 'plotter') and self.plotter.save_figure(fname):
            self.controller.log_message(f"💾 Saved to {fname}")
            messagebox.showinfo("Success", f"Figure saved to:\n{fname}",
                                parent=self.controller.root)
        else:
            self.controller.log_message("⚠️ No figure to save")

    def _export_csv(self):
        if self.controller.cache is None:
            messagebox.showwarning("Warning", "No data to export",
                                   parent=self.controller.root)
            return
        fname = filedialog.asksaveasfilename(
            defaultextension=".csv",
            filetypes=[("CSV file", "*.csv"), ("All files", "*.*")])
        if not fname:
            return
        try:
            from ..utils import extract_plot_data
            time_data, cno_data = extract_plot_data(self.controller.cache)
            if time_data is not None and cno_data is not None:
                import csv
                with open(fname, 'w', newline='') as f:
                    writer = csv.writer(f)
                    writer.writerow(['time', 'cno'])
                    for t, c in zip(time_data, cno_data):
                        writer.writerow([t, c])
                self.controller.log_message(f"📤 Data exported to {fname}")
                messagebox.showinfo("Success", f"Data exported to:\n{fname}",
                                    parent=self.controller.root)
            else:
                self.controller.log_message("⚠️ No data to export")
        except Exception as e:
            self.controller.log_message(f"❌ Export error: {e}")
            messagebox.showerror("Error", f"Failed to export data:\n{e}",
                                 parent=self.controller.root)

# Standalone test
if __name__ == "__main__":
    class DummyApp:
        def __init__(self):
            self.root = tk.Tk()
            self.cache = {"time": list(range(100)), "cno": [40 + i%10 for i in range(100)]}
            self.current_plot_idx = 0
        def log_message(self, msg): print(msg)
        def set_status(self, text, color): pass
        def _go_back(self): print("Back")

    app = DummyApp()
    app.root.geometry("1000x600")
    page = GraphPage(app.root, app)
    page.pack(fill="both", expand=True)
    app.root.mainloop()