"""
ui/pages/task_page.py
─────────────────────
Task selection page.
"""

import tkinter as tk
from .base_page import BasePage
from .. import style, config
from ..components import ThemedLabel, ThemedFrame, TaskCard, ScrollableFrame


class TaskPage(BasePage):
    """Task selection page for choosing analysis operations."""
    
    def setup_ui(self):
        """Build the task selection UI."""
        # Header
        header = tk.Frame(self, bg=style.COLORS['bg_card'])
        header.pack(fill='x', padx=config.SPACING['lg'], pady=(config.SPACING['lg'], config.SPACING['md']))
        
        title = ThemedLabel(header, "Select Analysis Task", style_type='heading')
        title.pack(side='left')
        
        count = ThemedLabel(
            header,
            f"  •  {len(config.TASKS)} tasks available",
            style_type='muted'
        )
        count.pack(side='left', padx=(config.SPACING['md'], 0))
        
        # Content area with scrollable task grid
        scrollable = ScrollableFrame(self, bg=style.COLORS['bg_card_light'])
        scrollable.pack(fill='both', expand=True, padx=config.SPACING['md'], pady=config.SPACING['md'])
        
        # Create task grid
        COLS = 4
        for i, task in enumerate(config.TASKS):
            # Extract icon and name from task string
            parts = task.split(maxsplit=1)
            icon = parts[0]
            name = parts[1] if len(parts) > 1 else f"Task {i}"
            
            # Check if task is implemented
            is_implemented = i in config.IMPLEMENTED_TASKS
            
            # Create task card
            card = TaskCard(
                scrollable.content_frame,
                icon=icon,
                name=name,
                on_execute=lambda idx=i: self._on_task_selected(idx),
                is_implemented=is_implemented,
            )
            
            row = i // COLS
            col = i % COLS
            card.grid(row=row, column=col, padx=config.SPACING['sm'], pady=config.SPACING['sm'], sticky='nsew')
        
        # Configure grid columns
        for col in range(COLS):
            scrollable.content_frame.grid_columnconfigure(col, weight=1, minsize=180)
    
    def _on_task_selected(self, task_index: int):
        """Handle task selection."""
        self.controller.state.set_task(task_index)
        self.controller.navigate_to_graph_page(task_index)
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
