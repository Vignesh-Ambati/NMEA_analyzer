import tkinter as tk
from .base_page import BasePage
from .. import style, config
from ..components import ThemedLabel, TaskCard, ScrollableFrame

class TaskPage(BasePage):
    def setup_ui(self):
        header = tk.Frame(self, bg=style.COLORS['bg_card'])
        header.pack(fill='x', padx=15, pady=(15,5))
        ThemedLabel(header, "Select Analysis Task", style_type='heading').pack(side='left')
        ThemedLabel(header, f"  •  {len(config.TASKS)} tasks available", style_type='muted').pack(side='left', padx=10)

        scroll = ScrollableFrame(self, bg=style.COLORS['bg_card_light'])
        scroll.pack(fill='both', expand=True, padx=10, pady=10)

        COLS = 5
        for i, task in enumerate(config.TASKS):
            parts = task.split(maxsplit=1)
            icon = parts[0]
            name = parts[1] if len(parts) > 1 else f"Task {i}"
            implemented = i in config.IMPLEMENTED_TASKS
            card = TaskCard(scroll.content_frame, icon, name,
                            on_execute=lambda idx=i: self._on_task_selected(idx),
                            is_implemented=implemented)
            row, col = i // COLS, i % COLS
            card.grid(row=row, column=col, padx=6, pady=6, sticky='nsew')

        for col in range(COLS):
            scroll.content_frame.grid_columnconfigure(col, weight=1, minsize=140)

        self.after(10, lambda: scroll.canvas.configure(scrollregion=scroll.canvas.bbox('all')))

    def _on_task_selected(self, task_index):
        self.controller.state.set_task(task_index)
        self.controller.navigate_to_graph_page(task_index)