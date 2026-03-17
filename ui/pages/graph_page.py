# accord_analyser/pages/graph_page.py
"""Graph display page with controls and scrollable sidebar."""

import tkinter as tk
from tkinter import filedialog, messagebox, colorchooser

from .base_page import BasePage
from ..constants import COLORS
from ..plotter import Plotter


class GraphPage(BasePage):
    """Page for displaying and interacting with the generated plot."""

    SIDEBAR_WIDTH = 220

    def setup_ui(self):
        """Set up the main UI components: plot area and scrollable control sidebar."""
        main_container = tk.Frame(self, bg=COLORS['bg_card'])
        main_container.pack(fill="both", expand=True)

        content = tk.Frame(main_container, bg=COLORS['bg_card'])
        content.pack(fill="both", expand=True, padx=10, pady=(0, 5))

        # Left: plot container
        plot_container = tk.Frame(content, bg=COLORS['bg_card'])
        plot_container.pack(side="left", fill="both", expand=True, padx=(0, 10))

        # Right: sidebar container (fixed width)
        sidebar_container = tk.Frame(content, bg=COLORS['bg_card_light'], width=self.SIDEBAR_WIDTH)
        sidebar_container.pack(side="right", fill="y")
        sidebar_container.pack_propagate(False)

        # Build the scrollable sidebar
        self._build_scrollable_sidebar(sidebar_container)

        # Create and embed the plotter
        self.plotter = Plotter(self.controller.cache, self.controller.current_plot_idx)
        success = self.plotter.embed_in_frame(plot_container)
        if not success:
            # Plotter already shows an error message
            pass

    # ----------------------------------------------------------------------
    # Scrollable sidebar construction
    # ----------------------------------------------------------------------
    def _build_scrollable_sidebar(self, parent):
        """Create a canvas + scrollbar + inner frame, and populate it with controls."""
        # Canvas that will hold the inner frame
        self.sidebar_canvas = tk.Canvas(
            parent,
            bg=COLORS['bg_card_light'],
            highlightthickness=0
        )
        self.sidebar_canvas.pack(side="left", fill="both", expand=True)

        # Vertical scrollbar
        scrollbar = tk.Scrollbar(parent, orient="vertical", command=self.sidebar_canvas.yview)
        scrollbar.pack(side="right", fill="y")
        self.sidebar_canvas.configure(yscrollcommand=scrollbar.set)

        # Inner frame that will contain all the sidebar widgets
        self.sidebar_inner = tk.Frame(self.sidebar_canvas, bg=COLORS['bg_card_light'])

        # Place inner frame as a canvas window with fixed width
        self.canvas_window = self.sidebar_canvas.create_window(
            (0, 0),
            window=self.sidebar_inner,
            anchor="nw",
            width=self.SIDEBAR_WIDTH
        )

        # Update scrollregion when inner frame changes size
        self.sidebar_inner.bind("<Configure>", self._on_frame_configure)

        # Keep inner frame width equal to canvas width
        self.sidebar_canvas.bind("<Configure>", self._on_canvas_configure)

        # Populate the inner frame with actual controls
        self._populate_sidebar(self.sidebar_inner)

        # Bind mouse wheel to EVERY widget in the sidebar (including inner frame and its children)
        self._bind_mousewheel_recursively(self.sidebar_inner)

    def _on_frame_configure(self, event):
        """Update canvas scroll region when inner frame resizes."""
        self.sidebar_canvas.configure(scrollregion=self.sidebar_canvas.bbox("all"))

    def _on_canvas_configure(self, event):
        """Keep inner frame width in sync with canvas width."""
        try:
            self.sidebar_canvas.itemconfigure(self.canvas_window, width=event.width)
        except Exception:
            pass

    def _bind_mousewheel_recursively(self, widget):
        """Bind mouse wheel events to widget and all its descendants."""
        # Bind to this widget
        self._bind_mousewheel(widget)

        # Recurse into children
        for child in widget.winfo_children():
            self._bind_mousewheel_recursively(child)

    def _bind_mousewheel(self, widget):
        """Bind mouse wheel events (cross-platform) to the given widget."""
        widget.bind("<MouseWheel>", self._on_mousewheel)      # Windows/macOS
        widget.bind("<Button-4>", self._on_mousewheel)        # Linux scroll up
        widget.bind("<Button-5>", self._on_mousewheel)        # Linux scroll down

    def _on_mousewheel(self, event):
        """Handle mouse wheel event: scroll the sidebar canvas."""
        # Determine scroll direction and amount
        try:
            if event.num == 4:          # Linux scroll up
                scroll_amount = -1
            elif event.num == 5:        # Linux scroll down
                scroll_amount = 1
            elif hasattr(event, "delta"):
                # Windows/macOS: delta positive = up, negative = down
                # Divide by 120 to get number of notches
                scroll_amount = -int(event.delta / 120)
            else:
                scroll_amount = 0
        except Exception:
            scroll_amount = 0

        if scroll_amount == 0:
            return

        # Scroll the canvas (2 "units" per notch for smoother feel)
        self.sidebar_canvas.yview_scroll(scroll_amount * 2, "units")

    # ----------------------------------------------------------------------
    # Sidebar content
    # ----------------------------------------------------------------------
    def _populate_sidebar(self, parent):
        """Add all control widgets to the sidebar inner frame."""
        # Title
        tk.Label(
            parent,
            text="⚙️ Controls",
            fg=COLORS['text_primary'],
            bg=COLORS['bg_card_light'],
            font=("Segoe UI", 11, "bold")
        ).pack(pady=(15, 10), padx=15, anchor="w")

        # Separator
        tk.Frame(parent, bg=COLORS['border'], height=1).pack(fill="x", padx=15, pady=5)

        # Control buttons
        buttons = [
            ("💾 Save Image", self._save_image),
            ("⊞ Toggle Grid", self._toggle_grid),
            ("↔ Auto Scale", self._autoscale),
            ("🖊 Plot Color", self._change_line_color),
            ("🎨 Background", self._change_bg_color),
            ("🖊 Text Color", self._change_text_color),
            ("# Grid Color", self._change_grid_color),
            ("🧱 Axis Color", self._change_spine_color),
        ]

        for text, command in buttons:
            self._create_sidebar_button(parent, text, command).pack(fill="x", padx=15, pady=5)

        # Separator
        tk.Frame(parent, bg=COLORS['border'], height=1).pack(fill="x", padx=15, pady=(15, 10))

        # Tips section
        tk.Label(
            parent,
            text="💡 Tips",
            fg=COLORS['text_primary'],
            bg=COLORS['bg_card_light'],
            font=("Segoe UI", 10, "bold")
        ).pack(pady=(0, 5), padx=15, anchor="w")

        tips_text = (
            "• Scroll to zoom\n"
            "• Click & drag to pan\n"
            "• Use toolbar buttons\n"
            "  for more options"
        )
        tk.Label(
            parent,
            text=tips_text,
            fg=COLORS['text_secondary'],
            bg=COLORS['bg_card_light'],
            font=("Segoe UI", 8),
            justify="left"
        ).pack(padx=15, pady=5, anchor="w")

    def _create_sidebar_button(self, parent, text, command):
        """Create a styled button for the sidebar."""
        btn = tk.Button(
            parent,
            text=text,
            command=command,
            bg=COLORS['bg_card'],
            fg=COLORS['text_secondary'],
            activebackground=COLORS['accent'],
            activeforeground='white',
            font=("Segoe UI", 9),
            relief=tk.FLAT,
            anchor="w",
            padx=10,
            pady=8,
            cursor="hand2",
            bd=0,
            highlightthickness=1,
            highlightbackground=COLORS['border']
        )

        btn.bind("<Enter>", lambda e: btn.configure(bg=COLORS['accent'], fg='white'))
        btn.bind("<Leave>", lambda e: btn.configure(bg=COLORS['bg_card'], fg=COLORS['text_secondary']))

        return btn

    def _toggle_grid(self):
        if hasattr(self, 'plotter'):
            state = self.plotter.toggle_grid()
            if state is not None:
                self.controller.log_message(f"Grid {'enabled' if state else 'disabled'}")

    def _autoscale(self):
        if hasattr(self, 'plotter'):
            self.plotter.autoscale()
            self.controller.log_message("✅ Plot auto-scaled")

    def _save_image(self):
        filename = filedialog.asksaveasfilename(
            defaultextension=".png",
            filetypes=[
                ("PNG image", "*.png"),
                ("JPEG image", "*.jpg"),
                ("JPEG image", "*.jpeg"),
                ("GIF image", "*.gif"),
                ("BMP image", "*.bmp"),
                ("TIFF image", "*.tiff"),
                ("SVG vector", "*.svg")
            ]
        )
        if not filename:
            return

        if hasattr(self, 'plotter') and self.plotter.save_figure(filename):
            self.controller.log_message(f"💾 Saved to {filename}")
            messagebox.showinfo("Success", f"Figure saved to:\n{filename}", parent=self.controller.root)
        else:
            self.controller.log_message("⚠️ No figure to save")

    def _change_bg_color(self):
        color = colorchooser.askcolor(title="Choose Plot Background Color")[1]
        if color and hasattr(self, 'plotter'):
            self.plotter.set_plot_bg_color(color)
            self.controller.log_message(f"🎨 Background color changed to {color}")

    def _change_line_color(self):
        color = colorchooser.askcolor(title="Choose Line Color")[1]
        if color and hasattr(self, 'plotter'):
            self.plotter.set_line_color(color)
            self.controller.log_message(f"🖊 Line color changed to {color}")

    def _change_text_color(self):
        color = colorchooser.askcolor(title="Choose Text Color")[1]
        if color and hasattr(self, 'plotter'):
            self.plotter.set_text_color(color)
            self.controller.log_message(f"🖊 Text color changed to {color}")

    def _change_grid_color(self):
        color = colorchooser.askcolor(title="Choose Grid Color")[1]
        if color and hasattr(self, 'plotter'):
            self.plotter.set_grid_color(color)
            self.controller.log_message(f"#️⃣ Grid color changed to {color}")

    def _change_spine_color(self):
        color = colorchooser.askcolor(title="Choose Axis Color")[1]
        if color and hasattr(self, 'plotter'):
            self.plotter.set_spine_color(color)
            self.controller.log_message(f"🧱 Axis color changed to {color}")