from . import BasePage
from .. import (
    _UiCofigurationPage,
    _UiDialoguesPage,
    _UiStylingPage,
    ThemedFrame,
    ThemedLabel,
    ThemedButton,
    TaskCard,
    ScrollableFrame,
    LoadingAnimation,
)

class TaskPage(BasePage):
    def setup_ui(self):
        header = ThemedFrame(self, frame_type='default')
        header.pack(fill='x', padx=10, pady=(15,5))

        ThemedLabel(header, "Select Analysis Task", style_type='heading').pack(side='left')
        ThemedLabel(header, f"  •  {len(_UiCofigurationPage.TASKS)} tasks available", style_type='muted').pack(side='left', padx=10)
        
        add_file_btn = ThemedButton(
            header,
            text="➕ Add File",
            command= self.__addFileClicked,
            is_primary=False
        )
        add_file_btn.pack(side="right")

        self.content_container = ThemedFrame(self, bg=_UiStylingPage.COLORS['bg_card_light'])
        self.content_container.pack(fill='both', expand=True, padx=10, pady=10)
        self.content_container.pack_propagate(False)

        scroll = ScrollableFrame(self.content_container, bg=_UiStylingPage.COLORS['bg_card_light'])
        scroll.pack(fill='both', expand=True)

        COLS = 5
        for i, task in enumerate(_UiCofigurationPage.TASKS):
            parts = task.split(maxsplit=1)
            icon = parts[0]
            name = parts[1] if len(parts) > 1 else f"Task {i}"
            implemented = i in _UiCofigurationPage.IMPLEMENTED_TASKS

            card = TaskCard(scroll.content_frame, icon, name,
                            on_execute=lambda idx=i: self._on_task_selected(idx),
                            is_implemented=implemented)
            row, col = i // COLS, i % COLS
            card.grid(row=row, column=col, padx=6, pady=6, sticky='nsew')

        for col in range(COLS):
            scroll.content_frame.grid_columnconfigure(col, weight=1, minsize=140)

        self.after(10, lambda: scroll.canvas.configure(scrollregion=scroll.canvas.bbox('all')))

        # Loading animation overlay
        self.loading_animation = LoadingAnimation(self)

    def _on_task_selected(self, task_index):
        self.controller.state.set_task(task_index)
        self.controller.navigate_to_graph_page(task_index)
        
    def __addFileClicked(self):
        path = _UiDialoguesPage.ask_file(parent=self.controller.root)
        if path:
            filename = path.split("/")[-1].split("\\")[-1]
            self.loading_animation.start(f"Parsing {filename}...")
            self.controller.process_file(path)

    def stop_loading_animation(self):
        """Stop the loading animation (called by app controller when processing completes)."""
        self.loading_animation.stop()
