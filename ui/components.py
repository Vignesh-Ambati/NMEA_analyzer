import tkinter as tk
from tkinter import ttk
from . import style, config

class ThemedButton(tk.Button):
    def __init__(self, parent, text, command=None, is_primary=False, **kwargs):
        cfg = style.get_button_style(is_primary)
        cfg.update(kwargs)
        # Force a visible border that matches the current text color
        cfg['highlightthickness'] = 2
        cfg['highlightbackground'] = style.COLORS['text_primary']
        cfg['highlightcolor'] = style.COLORS['accent']
        super().__init__(parent, text=text, command=command, **cfg)
        self.default_bg = cfg['bg']
        self.hover_bg = cfg['activebackground']
        self.bind('<Enter>', self._on_enter)
        self.bind('<Leave>', self._on_leave)
    def _on_enter(self, e): self.configure(bg=self.hover_bg)
    def _on_leave(self, e): self.configure(bg=self.default_bg)
    
class ThemedLabel(tk.Label):
    def __init__(self, parent, text="", style_type='normal', **kwargs):
        cfg = style.get_label_style(style_type)
        cfg.update(kwargs)
        super().__init__(parent, text=text, **cfg)

class ThemedFrame(tk.Frame):
    def __init__(self, parent, frame_type='default', **kwargs):
        styles = {
            'default': {'bg': style.COLORS['bg_card'], 'highlightthickness': 0},
            'card': {'bg': style.COLORS['bg_card_light'], 'bd': 1, 'relief': 'solid', 'highlightthickness': 0},
            'input': {'bg': style.COLORS['bg_input'], 'bd': 1, 'relief': 'solid'},
        }
        cfg = styles.get(frame_type, styles['default'])
        cfg.update(kwargs)
        super().__init__(parent, **cfg)

class ThemedEntry(tk.Entry):
    def __init__(self, parent, placeholder="", **kwargs):
        super().__init__(parent, bg=style.COLORS['bg_input'], fg=style.COLORS['text_primary'],
                         insertbackground=style.COLORS['accent'], relief='solid', bd=1,
                         highlightthickness=0, font=('Segoe UI', 10), **kwargs)
        self.placeholder = placeholder
        self._insert_placeholder()
        self.bind('<FocusIn>', self._clear_placeholder)
        self.bind('<FocusOut>', self._insert_placeholder)
    def _insert_placeholder(self, event=None):
        if not self.get():
            self.config(fg=style.COLORS['text_muted'])
            self.insert(0, self.placeholder)
    def _clear_placeholder(self, event):
        if self.get() == self.placeholder:
            self.delete(0, tk.END)
            self.config(fg=style.COLORS['text_primary'])
    def get_value(self):
        val = self.get()
        return '' if val == self.placeholder else val

class FileInputFrame(tk.Frame):
    def __init__(self, parent, on_browse=None, placeholder="Select file..."):
        super().__init__(parent, bg=style.COLORS['bg_card'], bd=1, relief='solid')
        self.entry = ThemedEntry(self, placeholder=placeholder)
        self.entry.pack(side='left', fill='both', expand=True, padx=4, pady=4)
        self.browse_btn = ThemedButton(self, text="📁 Browse", command=on_browse, is_primary=False)
        self.browse_btn.pack(side='right', padx=4, pady=4)
    def set_value(self, val):
        self.entry.delete(0, tk.END)
        self.entry.insert(0, val)
        self.entry.config(fg=style.COLORS['text_primary'])
    def get_value(self):
        return self.entry.get_value()

class ScrollableFrame(tk.Frame):
    def __init__(self, parent, **kwargs):
        super().__init__(parent, **kwargs)
        self.canvas = tk.Canvas(self, bg=style.COLORS['bg_card_light'], highlightthickness=0)
        scrollbar = tk.Scrollbar(self, orient='vertical', command=self.canvas.yview)
        scrollbar.pack(side='right', fill='y')
        self.canvas.pack(side='left', fill='both', expand=True)
        self.canvas.config(yscrollcommand=scrollbar.set)
        self.content_frame = tk.Frame(self.canvas, bg=style.COLORS['bg_card_light'])
        self.canvas_window = self.canvas.create_window((0,0), window=self.content_frame, anchor='nw')
        self.content_frame.bind('<Configure>', self._on_configure)
        self.canvas.bind('<Configure>', self._on_canvas_configure)
        self.canvas.bind('<Enter>', lambda e: self.canvas.bind_all('<MouseWheel>', self._on_mousewheel))
        self.canvas.bind('<Leave>', lambda e: self.canvas.unbind_all('<MouseWheel>'))
    def _on_configure(self, e):
        self.canvas.configure(scrollregion=self.canvas.bbox('all'))
    def _on_canvas_configure(self, e):
        self.canvas.itemconfig(self.canvas_window, width=e.width)
    def _on_mousewheel(self, e):
        self.canvas.yview_scroll(int(-1*(e.delta/120)), 'units')

class ProgressIndicator(tk.Frame):
    def __init__(self, parent):
        super().__init__(parent, bg=style.COLORS['bg_dark'])
        self.label = tk.Label(self, text="Ready", fg=style.COLORS['text_secondary'],
                              bg=style.COLORS['bg_dark'], font=('Segoe UI', 9))
        self.label.pack(side='left', padx=10)
        self.progress = ttk.Progressbar(self, mode='indeterminate', length=200, style='TProgressbar')
        self.progress.pack(side='left', fill='x', expand=True, padx=10, pady=5)
    def set_text(self, t): self.label.config(text=t)
    def start(self): self.progress.start(10)
    def stop(self): self.progress.stop()
    def update_theme(self):
        self.configure(bg=style.COLORS['bg_dark'])
        self.label.configure(bg=style.COLORS['bg_dark'], fg=style.COLORS['text_secondary'])

class TaskCard(tk.Frame):
    def __init__(self, parent, icon, name, on_execute=None, is_implemented=True, **kwargs):
        super().__init__(parent, bg=style.COLORS['bg_card_light'], bd=1, relief='solid', **kwargs)
        self.is_implemented = is_implemented
        self.on_execute = on_execute
        self.grid_propagate(False)
        self.configure(height=120, width=140)
        
        if is_implemented:
            self.config(cursor="hand2")
        
        # Inner content frame – this will change on hover
        self.content = tk.Frame(self, bg=style.COLORS['bg_card_light'])
        self.content.pack(fill='both', expand=True, padx=6, pady=6)
        
        icon_lbl = tk.Label(self.content, text=icon, font=('Segoe UI', 24), bg=style.COLORS['bg_card_light'], fg=style.COLORS['text_primary'])
        icon_lbl.pack(pady=2)
        
        name_lbl = tk.Label(self.content, text=name, font=('Segoe UI', 8), fg=style.COLORS['text_primary'],
                            bg=style.COLORS['bg_card_light'], wraplength=120, justify='center')
        name_lbl.pack()
        
        if not is_implemented:
            tk.Label(self.content, text="Soon", font=('Segoe UI', 6, 'italic'),
                     fg=style.COLORS['text_muted'], bg=style.COLORS['bg_card_light']).pack(pady=2)
        
        if is_implemented:
            # Bind events to both the outer frame and inner content (to catch all areas)
            for w in (self, self.content, icon_lbl, name_lbl):
                w.bind('<Button-1>', self._on_click)
                w.bind('<Enter>', self._on_enter)
                w.bind('<Leave>', self._on_leave)
    
    def _on_enter(self, event):
        if self.is_implemented:
            # Only change inner content background – outer frame stays the same (border stable)
            self.content.configure(bg=style.COLORS['hover'])
            for child in self.content.winfo_children():
                if isinstance(child, tk.Label):
                    child.configure(bg=style.COLORS['hover'])
    
    def _on_leave(self, event):
        if self.is_implemented:
            self.content.configure(bg=style.COLORS['bg_card_light'])
            for child in self.content.winfo_children():
                if isinstance(child, tk.Label):
                    child.configure(bg=style.COLORS['bg_card_light'])
    
    def _on_click(self, event):
        if self.is_implemented and self.on_execute:
            self.on_execute()

class ConsoleOutput(tk.Frame):
    """Modern console with gradient-like header and clean borders."""
    def __init__(self, parent):
        super().__init__(parent, bg=style.COLORS['bg_console'], bd=1, relief='solid', highlightthickness=0)
        self._expanded = True
        self._min_height = 36
        self._max_height = 320

        # Header with accent border
        self.header = tk.Frame(self, bg=style.COLORS['bg_card_light'], height=36)
        self.header.pack(fill='x')
        self.header.pack_propagate(False)

        # Left accent line
        accent_line = tk.Frame(self.header, bg=style.COLORS['accent'], width=4)
        accent_line.pack(side='left', fill='y')

        tk.Label(self.header, text="⚡ CONSOLE OUTPUT", fg=style.COLORS['accent_light'],
                 bg=style.COLORS['bg_card_light'], font=('Segoe UI', 9, 'bold')).pack(side='left', padx=12)

        btn_frame = tk.Frame(self.header, bg=style.COLORS['bg_card_light'])
        btn_frame.pack(side='right', padx=8)

        self.clear_btn = tk.Button(btn_frame, text="🗑 Clear", command=self.clear,
            bg=style.COLORS['bg_card_light'], fg=style.COLORS['text_secondary'],
            activebackground=style.COLORS['hover'], relief='flat', cursor='hand2', padx=10, pady=4)
        self.clear_btn.pack(side='left', padx=4)

        self.toggle_btn = tk.Button(btn_frame, text="▼", command=self.toggle,
            bg=style.COLORS['bg_card_light'], fg=style.COLORS['text_secondary'],
            activebackground=style.COLORS['hover'], relief='flat', cursor='hand2', padx=10, pady=4)
        self.toggle_btn.pack(side='left', padx=4)

        # Text area with border
        self.text_frame = tk.Frame(self, bg=style.COLORS['bg_console'])
        self.text_frame.pack(fill='both', expand=True, padx=1, pady=1)

        scrollbar = tk.Scrollbar(self.text_frame)
        scrollbar.pack(side='right', fill='y')

        self.text = tk.Text(self.text_frame, bg=style.COLORS['bg_console'], fg=style.COLORS['text_secondary'],
                            font=('Consolas', 9), wrap=tk.WORD, relief='flat', bd=0,
                            yscrollcommand=scrollbar.set, padx=8, pady=6)
        self.text.pack(fill='both', expand=True)
        scrollbar.config(command=self.text.yview)
        self.text.config(state=tk.DISABLED)

    def toggle(self):
        if self._expanded:
            self.text_frame.pack_forget()
            self.configure(height=self._min_height)
            self.toggle_btn.config(text="▲")
        else:
            self.text_frame.pack(fill='both', expand=True, padx=1, pady=1)
            self.configure(height=self._max_height)
            self.toggle_btn.config(text="▼")
        self._expanded = not self._expanded

    def write(self, msg):
        self.text.config(state=tk.NORMAL)
        self.text.insert(tk.END, msg + '\n')
        self.text.see(tk.END)
        self.text.config(state=tk.DISABLED)

    def clear(self):
        self.text.config(state=tk.NORMAL)
        self.text.delete(1.0, tk.END)
        self.text.config(state=tk.DISABLED)

    def update_theme(self):
        self.configure(bg=style.COLORS['bg_console'])
        self.header.configure(bg=style.COLORS['bg_card_light'])
        for child in self.header.winfo_children():
            if isinstance(child, tk.Label):
                child.configure(bg=style.COLORS['bg_card_light'])
            elif isinstance(child, tk.Frame):
                child.configure(bg=style.COLORS['bg_card_light'])
                for btn in child.winfo_children():
                    btn.configure(bg=style.COLORS['bg_card_light'], fg=style.COLORS['text_secondary'])
        self.text_frame.configure(bg=style.COLORS['bg_console'])
        self.text.configure(bg=style.COLORS['bg_console'], fg=style.COLORS['text_secondary'])