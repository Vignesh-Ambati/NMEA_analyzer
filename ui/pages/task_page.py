# accord_analyser/pages/task_page.py
"""Task selection page with responsive grid."""

import tkinter as tk
import threading
from .base_page import BasePage
from ..constants import TASKS
from ..theme import Theme, SPACING, IMPLEMENTED_TASKS
from ..widgets import ThemedLabel, ThemedFrame, TaskCard
from ..pages.graph_page import GraphPage


class TaskPage(BasePage):
    """Task selection page with responsive grid layout."""

    def setup_ui(self):
        """Build the task selection UI with responsive grid."""
        # Header
        header = ThemedFrame(self, style='container')
        header.pack(fill="x", padx=SPACING['lg'], pady=(SPACING['lg'], SPACING['md']))

        ThemedLabel(header, "Select Analysis Task", style='heading').pack(side="left")
        ThemedLabel(header, f"  •  {len(TASKS)} tasks available", style='muted').pack(side="left")

        canvas_frame = ThemedFrame(self, style='card')
        canvas_frame.pack(fill="both", expand=True, padx=SPACING['md'], pady=(0, SPACING['md']))

        # Canvas + scrollbar
        canvas = tk.Canvas(canvas_frame, bg=Theme.get_color('bg_card_light'), highlightthickness=0)
        scrollbar = tk.Scrollbar(
            canvas_frame,
            bg=Theme.get_color('bg_card_light'),
            troughcolor=Theme.get_color('bg_input'),
            activebackground=Theme.get_color('accent'),
            orient="vertical"
        )
        scrollbar.pack(side="right", fill="y")
        canvas.pack(side="left", fill="both", expand=True)
        canvas.config(yscrollcommand=scrollbar.set)
        scrollbar.config(command=canvas.yview)

        # Grid frame inside canvas (this holds the task cards)
        grid_frame = tk.Frame(canvas, bg=Theme.get_color('bg_card_light'))
        canvas_window = canvas.create_window((0, 0), window=grid_frame, anchor="nw")

        # Create task cards (initial layout: 4 columns)
        COLS = 4
        for i, task in enumerate(TASKS):
            icon = task.split()[0]
            name = " ".join(task.split()[1:])
            is_implemented = i in IMPLEMENTED_TASKS

            card = TaskCard(
                grid_frame,
                icon=icon,
                name=name,
                on_execute=lambda idx=i: self._run_task(idx),
                is_implemented=is_implemented
            )
            row = i // COLS
            col = i % COLS
            card.grid(row=row, column=col, padx=4, pady=4, sticky="nsew")

        # Make columns expand evenly
        for c in range(COLS):
            grid_frame.grid_columnconfigure(c, weight=1, minsize=220)

        # Keep canvas window width in sync with the canvas (important for initial layout)
        def _update_canvas_window_width(event=None):
            # Use the canvas's real width (event.width when called from canvas Configure)
            width = event.width if (event and hasattr(event, "width")) else canvas.winfo_width()
            # Guard: when called very early width may be 1 — skip in that case
            if width <= 1:
                return
            try:
                canvas.itemconfig(canvas_window, width=width)
            except Exception:
                # itemconfig may occasionally fail if window not yet available — ignore and let later call fix it
                pass

        # Update scrollregion; ensure canvas window width updated as well
        def _update_scrollregion(event=None):
            canvas.update_idletasks()
            # Ensure canvas window width follows the canvas width so the grid wraps/wraplengths compute correctly
            _update_canvas_window_width(event)
            bbox = canvas.bbox("all")
            if bbox is not None:
                canvas.configure(scrollregion=bbox)

        # Bindings: when grid_frame size changes, update scrollregion;
        # when canvas size changes, ensure the canvas window uses the canvas width
        grid_frame.bind("<Configure>", _update_scrollregion)
        canvas.bind("<Configure>", lambda e: (_update_canvas_window_width(e), _update_scrollregion(e)))

        # Mouse wheel scrolling
        def on_mousewheel(event):
            if canvas.winfo_exists():
                canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")

        canvas.bind("<Enter>", lambda e: canvas.bind_all("<MouseWheel>", on_mousewheel))
        canvas.bind("<Leave>", lambda e: canvas.unbind_all("<MouseWheel>"))

        # --- Crucial initialisation: ensure sizes are correct after widget realization ---
        # Many layout problems happen because widget widths are 1 until the window is realized.
        # Force an initial update shortly after construction to set canvas window width and scrollregion.
        def _initial_layout_fix():
            canvas.update_idletasks()
            grid_frame.update_idletasks()
            # If canvas width is still tiny, re-schedule a short time later (but only a couple of times)
            width = canvas.winfo_width()
            if width <= 1:
                # try again once after a brief delay
                self.after(25, _initial_layout_fix)
                return
            try:
                canvas.itemconfig(canvas_window, width=width)
                canvas.configure(scrollregion=canvas.bbox("all"))
            except Exception:
                # ignore transient failure — the bound handlers will correct it on next configure
                pass

        # Schedule the initial fix after the main loop has a chance to realize geometry
        self.after(20, _initial_layout_fix)

    def _run_task(self, idx):
        """Handle task execution."""
        self.controller.log_message(f"🚀 Starting: {TASKS[idx]}")
        self.controller.set_status("Running task...", 'warning')
        threading.Thread(target=self._execute_task, args=(idx,), daemon=True).start()

    def _execute_task(self, idx):
        """Execute the selected task in a background thread."""
        try:
            if idx in IMPLEMENTED_TASKS:
                # Only task 0 (Plot CByN0 from a log) is implemented
                if self.controller.cache is None:
                    self.controller.log_message("⚠️ No data in cache — run analysis first.")
                    self.controller.set_status("Ready", 'success')
                    return
                self.controller.current_plot_idx = idx
                self.controller.root.after(0, lambda: self.controller._navigate(GraphPage))
                self.controller.log_message("✅ Rendering plot...")
                self.controller.set_status("Ready", 'success')
            else:
                self.controller.log_message(f"⚠️ Task '{TASKS[idx]}' not implemented yet.")
                self.controller.set_status("Ready", 'success')
        except Exception as e:
            self.controller.log_message(f"❌ Task failed: {str(e)}")
            self.controller.set_status("Error", 'error')
