import tkinter as tk
from tkinter import filedialog, colorchooser, messagebox
from .base_page import BasePage
from .. import style, config
from ..plotter import Plotter

class GraphPage(BasePage):
    def setup_ui(self):
        main = tk.Frame(self, bg=style.COLORS['bg_card'])
        main.pack(fill='both', expand=True, padx=10, pady=10)

        # Plot area
        plot_frame = tk.Frame(main, bg=style.COLORS['bg_card_light'])
        plot_frame.pack(side='left', fill='both', expand=True)

        # Header inside plot area
        header = tk.Frame(plot_frame, bg=style.COLORS['bg_card_light'], height=40)
        header.pack(fill='x', pady=(0,5))
        header.pack_propagate(False)

        task_name = config.TASKS[self.controller.state.current_task] if self.controller.state.current_task is not None else "Analysis"
        tk.Label(header, text=task_name, fg=style.COLORS['text_primary'], bg=style.COLORS['bg_card_light'],
                 font=('Segoe UI', 12, 'bold')).pack(side='left', padx=10)

        nav = tk.Frame(header, bg=style.COLORS['bg_card_light'])
        nav.pack(side='right', padx=5)
        tk.Button(nav, text="← Back", command=self._go_back, bg=style.COLORS['bg_card'], fg=style.COLORS['text_primary'],
                  activebackground=style.COLORS['accent'], relief='flat', padx=10).pack(side='left', padx=2)
        tk.Button(nav, text="⌂ Home", command=self._go_home, bg=style.COLORS['bg_card'], fg=style.COLORS['text_primary'],
                  activebackground=style.COLORS['accent'], relief='flat', padx=10).pack(side='left', padx=2)

        # Plot container
        self.plot_container = tk.Frame(plot_frame, bg=style.COLORS['bg_card'])
        self.plot_container.pack(fill='both', expand=True)

        # Sidebar
        self._build_sidebar(main)

        # Create plot
        self.plotter = Plotter(self.controller.state.cache, self.controller.state.current_task or 0)
        self.plotter.embed_in_frame(self.plot_container)

    def _build_sidebar(self, parent):
        sidebar = tk.Frame(parent, bg=style.COLORS['bg_card_light'], width=200)
        sidebar.pack(side='right', fill='y', padx=(10,0))
        sidebar.pack_propagate(False)

        tk.Label(sidebar, text="⚙️ Controls", fg=style.COLORS['accent'], bg=style.COLORS['bg_card_light'],
                 font=('Segoe UI', 10, 'bold')).pack(pady=(10,5), padx=10, anchor='w')
        tk.Frame(sidebar, bg=style.COLORS['border'], height=1).pack(fill='x', padx=10, pady=5)

        controls = [
            ("💾 Save Image", self._save_image),
            ("⊞ Toggle Grid", self._toggle_grid),
            ("↔ Auto Scale", self._autoscale),
            ("🎨 Plot Background", self._change_bg_color),
            ("🖊 Line Color", self._change_line_color),
            ("📝 Text Color", self._change_text_color),
            ("🔲 Grid Color", self._change_grid_color),
            ("📐 Axis Color", self._change_spine_color),
        ]
        for text, cmd in controls:
            btn = tk.Button(sidebar, text=text, command=cmd,
                bg=style.COLORS['bg_card'], fg=style.COLORS['text_secondary'],
                activebackground=style.COLORS['accent'], activeforeground='white',
                relief='flat', anchor='w', padx=10, pady=6, cursor='hand2')
            btn.pack(fill='x', padx=10, pady=3)
            btn.bind("<Enter>", lambda e, b=btn: b.configure(bg=style.COLORS['accent'], fg='white'))
            btn.bind("<Leave>", lambda e, b=btn: b.configure(bg=style.COLORS['bg_card'], fg=style.COLORS['text_secondary']))

    def _go_back(self):
        self.controller.navigate_to_task_page()
    def _go_home(self):
        self.controller.navigate_to_file_page()
    def _toggle_grid(self):
        if self.plotter:
            state = self.plotter.toggle_grid()
            self.controller.console.write(f"Grid {'on' if state else 'off'}")
    def _autoscale(self):
        if self.plotter:
            self.plotter.autoscale()
            self.controller.console.write("Auto-scaled")
    def _save_image(self):
        f = filedialog.asksaveasfilename(defaultextension=".png", filetypes=[("PNG","*.png")])
        if f and self.plotter and self.plotter.save_figure(f):
            self.controller.console.write(f"Saved {f}")
            messagebox.showinfo("Success", f"Saved to {f}", parent=self.controller.root)
    def _change_bg_color(self):
        c = colorchooser.askcolor(title="Plot Background")[1]
        if c and self.plotter: self.plotter.set_plot_bg_color(c)
    def _change_line_color(self):
        c = colorchooser.askcolor(title="Line Color")[1]
        if c and self.plotter: self.plotter.set_line_color(c)
    def _change_text_color(self):
        c = colorchooser.askcolor(title="Text Color")[1]
        if c and self.plotter: self.plotter.set_text_color(c)
    def _change_grid_color(self):
        c = colorchooser.askcolor(title="Grid Color")[1]
        if c and self.plotter: self.plotter.set_grid_color(c)
    def _change_spine_color(self):
        c = colorchooser.askcolor(title="Axis Color")[1]
        if c and self.plotter: self.plotter.set_spine_color(c)