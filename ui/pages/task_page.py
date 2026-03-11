# accord_analyser/pages/task_page.py
"""Task selection page with responsive grid."""

import tkinter as tk
import threading
from .base_page import BasePage
from ..constants import COLORS, TASKS
from ..pages.graph_page import GraphPage

class TaskPage(BasePage):
    def setup_ui(self):
        # Header
        header = tk.Frame(self, bg=COLORS['bg_card'])
        header.pack(fill="x", padx=20, pady=(15, 10))
        tk.Label(header, text="Select Analysis Task", fg=COLORS['text_primary'],
                 bg=COLORS['bg_card'], font=("Segoe UI", 14, "bold")).pack(side="left")
        tk.Label(header, text=f"  •  {len(TASKS)} tasks available",
                 fg=COLORS['text_muted'], bg=COLORS['bg_card'],
                 font=("Segoe UI", 10)).pack(side="left")

        # Scrollable frame for tasks
        analysis_frame = tk.Frame(self, bg=COLORS['bg_card'])
        analysis_frame.pack(fill="both", expand=True, padx=10, pady=(0, 10))
        task_card = tk.Frame(analysis_frame, bg=COLORS['bg_card_light'],
                             highlightbackground=COLORS['border'],
                             highlightthickness=1)
        task_card.pack(fill="both", expand=True)

        canvas = tk.Canvas(task_card, bg=COLORS['bg_card_light'], highlightthickness=0)
        scrollable_frame = tk.Frame(canvas, bg=COLORS['bg_card_light'])
        canvas_window = canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")

        def update_scroll_region(event=None):
            canvas.update_idletasks()
            canvas.configure(scrollregion=canvas.bbox("all"))
        scrollable_frame.bind("<Configure>", update_scroll_region)
        canvas.bind("<Configure>", lambda e: canvas.itemconfig(canvas_window, width=e.width))

        # Mouse wheel scrolling
        def _on_mousewheel(event):
            canvas.yview_scroll(int(-1 * (event.delta / 60)), "units")
        canvas.bind("<Enter>", lambda e: canvas.bind_all("<MouseWheel>", _on_mousewheel))
        canvas.bind("<Leave>", lambda e: canvas.unbind_all("<MouseWheel>"))

        # Create task cards
        cards_data = []
        for i, task in enumerate(TASKS):
            icon_text = task.split()[0]
            task_name = " ".join(task.split()[1:])
            card = tk.Frame(scrollable_frame, bg=COLORS['bg_input'],
                            highlightbackground=COLORS['border'],
                            highlightthickness=1)
            inner = tk.Frame(card, bg=COLORS['bg_input'], padx=12, pady=10)
            inner.pack(fill="both", expand=True)

            top_row = tk.Frame(inner, bg=COLORS['bg_input'])
            top_row.pack(fill="x", pady=(0, 8))
            tk.Label(top_row, text=icon_text, fg=COLORS['accent'],
                     bg=COLORS['bg_input'], font=("Segoe UI", 18)).pack(side="left", padx=(0, 8))
            name_label = tk.Label(top_row, text=task_name, fg=COLORS['text_secondary'],
                                  bg=COLORS['bg_input'], font=("Segoe UI", 11, 'bold'),
                                  anchor="w", justify="left")
            name_label.pack(side="left", fill="x", expand=True)

            tk.Frame(inner, bg=COLORS['border'], height=1).pack(fill="x", pady=(0, 8))

            execute_btn = tk.Button(inner, text="▶ Run Analysis",
                                    command=lambda idx=i: self._run_task(idx),
                                    bg=COLORS['accent'], fg='white',
                                    activebackground=COLORS['accent_light'],
                                    activeforeground='white',
                                    font=("Segoe UI", 9, "bold"), relief=tk.FLAT,
                                    padx=12, pady=7, cursor="hand2", bd=0)
            execute_btn.pack(fill="x")
            execute_btn.bind("<Enter>", lambda e, b=execute_btn: b.configure(bg=COLORS['accent_light']))
            execute_btn.bind("<Leave>", lambda e, b=execute_btn: b.configure(bg=COLORS['accent']))

            # Hover effect on card
            card.bind("<Enter>", lambda e, c=card: c.configure(
                highlightbackground=COLORS['accent'], highlightthickness=2))
            card.bind("<Leave>", lambda e, c=card: c.configure(
                highlightbackground=COLORS['border'], highlightthickness=1))

            cards_data.append((card, name_label))

        # Layout parameters
        MIN_CARD_WIDTH = 220
        MIN_CARD_HEIGHT = 100
        PADDING = 4
        MIN_COLS = 4
        MAX_COLS = 6
        layout_state = {"current_cols": 0, "current_width": 0,
                        "resize_timer": None, "last_layout_time": 0}

        def calculate_columns(available_width):
            if available_width <= 1:
                return MIN_COLS
            usable_width = available_width - (2 * PADDING)
            return max(MIN_COLS, min(MAX_COLS, int(usable_width / (MIN_CARD_WIDTH + PADDING))))

        def perform_relayout(width, force=False):
            import time
            current_time = time.time()
            if not force and (current_time - layout_state["last_layout_time"]) < 0.05:
                return
            layout_state["last_layout_time"] = current_time
            cols = calculate_columns(width)
            if not force and cols == layout_state["current_cols"] and width == layout_state["current_width"]:
                return
            layout_state["current_cols"] = cols
            layout_state["current_width"] = width

            # Forget all grid placements
            for widget, _ in cards_data:
                widget.grid_forget()

            # Configure columns
            for c in range(MAX_COLS + 2):
                scrollable_frame.grid_columnconfigure(c, weight=0, uniform="", minsize=0)

            card_width = max(MIN_CARD_WIDTH, (width - (cols + 1) * PADDING) // cols)

            for i, (widget, name_lbl) in enumerate(cards_data):
                widget.grid(row=i // cols, column=i % cols,
                            padx=PADDING // 2, pady=PADDING // 2,
                            sticky="nsew")

            for c in range(cols):
                scrollable_frame.grid_columnconfigure(c, weight=1, uniform="col", minsize=card_width)

            num_rows = (len(cards_data) + cols - 1) // cols
            for r in range(num_rows):
                scrollable_frame.grid_rowconfigure(r, minsize=MIN_CARD_HEIGHT)

            # Adjust label wrapping
            label_wrap = max(MIN_CARD_WIDTH - 80, card_width - 80)
            for _, name_lbl in cards_data:
                name_lbl.configure(wraplength=label_wrap)

            scrollable_frame.update_idletasks()
            canvas.update_idletasks()
            update_scroll_region()

        def relayout(force=False):
            canvas.update_idletasks()
            task_card.update_idletasks()
            width = canvas.winfo_width()
            if width <= 1:
                width = task_card.winfo_width()
                if width <= 1:
                    return
            perform_relayout(width, force)

        def debounced_relayout(event=None, force=False):
            if layout_state["resize_timer"] is not None:
                try:
                    self.after_cancel(layout_state["resize_timer"])
                except:
                    pass
            layout_state["resize_timer"] = self.after(30, lambda: relayout(force=force))

        def on_resize(event):
            canvas.itemconfig(canvas_window, width=event.width)
            debounced_relayout(event, force=False)

        canvas.bind("<Configure>", on_resize)
        self.bind("<Configure>", lambda e: debounced_relayout(force=True))

        canvas.pack(side="left", fill="both", expand=True)

        # Initial layout
        self.after(10, lambda: relayout(force=True))
        for delay in (50, 150, 300):
            self.after(delay, lambda: relayout(force=True))

    def _run_task(self, idx):
        self.controller.log_message(f"🚀 Starting: {TASKS[idx]}")
        self.controller.set_status("Running task...", 'warning')
        threading.Thread(target=self._execute_task, args=(idx,), daemon=True).start()

    def _execute_task(self, idx):
        try:
            # For now, only task 0 (Plot CByN0 from a log) is implemented
            if idx == 0:
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

# Standalone test
if __name__ == "__main__":
    class DummyApp:
        def __init__(self):
            self.root = tk.Tk()
            self.cache = {"time": list(range(100)), "cno": [40 + i%10 for i in range(100)]}
            self.current_plot_idx = 0
        def log_message(self, msg): print(msg)
        def set_status(self, text, color): pass
        def _navigate(self, page_class):
            for w in self.root.winfo_children():
                w.destroy()
            page = page_class(self.root, self)
            page.pack(fill="both", expand=True)
            self.root.update()

    app = DummyApp()
    app.root.geometry("1000x600")
    page = TaskPage(app.root, app)
    page.pack(fill="both", expand=True)
    app.root.mainloop()