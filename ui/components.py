"""
ui/components.py
────────────────
Reusable, themeable UI components.
"""

import tkinter as tk
from tkinter import ttk
from . import style, config


class ThemedButton(tk.Button):
    """A themed button with consistent styling."""
    
    def __init__(self, parent, text: str, command=None, is_primary: bool = False, **kwargs):
        """
        Create a themed button.
        
        Args:
            parent: Parent widget
            text: Button text
            command: Command to execute on click
            is_primary: True for primary styling, False for secondary
            **kwargs: Additional button parameters
        """
        style_config = style.get_button_style(is_primary)
        style_config.update(kwargs)
        
        super().__init__(parent, text=text, command=command, **style_config)
        
        self.is_primary = is_primary
        self.default_bg = style_config['bg']
        self.hover_bg = style_config['activebackground']
        
        self.bind('<Enter>', self._on_enter)
        self.bind('<Leave>', self._on_leave)
    
    def _on_enter(self, event):
        self.configure(bg=self.hover_bg)
    
    def _on_leave(self, event):
        self.configure(bg=self.default_bg)


class ThemedLabel(tk.Label):
    """A themed label with predefined styles."""
    
    def __init__(self, parent, text: str = "", style_type: str = 'normal', **kwargs):
        """
        Create a themed label.
        
        Args:
            parent: Parent widget
            text: Label text
            style_type: 'normal', 'heading', 'muted', or 'error'
            **kwargs: Additional label parameters
        """
        style_config = style.get_label_style(style_type)
        style_config.update(kwargs)
        
        super().__init__(parent, text=text, **style_config)


class ThemedFrame(tk.Frame):
    """A themed frame with consistent styling."""
    
    def __init__(self, parent, frame_type: str = 'default', **kwargs):
        """
        Create a themed frame.
        
        Args:
            parent: Parent widget
            frame_type: 'default', 'card', or 'input'
            **kwargs: Additional frame parameters
        """
        frame_styles = {
            'default': {
                'bg': style.COLORS['bg_card'],
                'highlightthickness': 0,
            },
            'card': {
                'bg': style.COLORS['bg_card_light'],
                'highlightbackground': style.COLORS['border'],
                'highlightthickness': 1,
            },
            'input': {
                'bg': style.COLORS['bg_input'],
                'highlightbackground': style.COLORS['border'],
                'highlightthickness': 1,
            },
        }
        
        frame_config = frame_styles.get(frame_type, frame_styles['default'])
        frame_config.update(kwargs)
        
        super().__init__(parent, **frame_config)


class FileInputFrame(tk.Frame):
    """A file input component with browse button."""
    
    def __init__(self, parent, on_browse=None, placeholder: str = "Select file...", **kwargs):
        """
        Create a file input component.
        
        Args:
            parent: Parent widget
            on_browse: Callback when browse button is clicked
            placeholder: Placeholder text for empty state
            **kwargs: Additional frame parameters
        """
        super().__init__(parent, bg=style.COLORS['bg_input'], **kwargs)
        
        self.on_browse = on_browse
        self.placeholder = placeholder
        
        # Input frame
        input_container = tk.Frame(self, bg=style.COLORS['bg_input'])
        input_container.pack(fill='x', expand=True)
        
        # Text entry
        self.entry = tk.Entry(
            input_container,
            bg=style.COLORS['bg_card'],
            fg=style.COLORS['text_primary'],
            insertbackground=style.COLORS['accent'],
            relief='flat',
            borderwidth=0,
            font=('Segoe UI', 10),
        )
        self.entry.pack(side='left', fill='both', expand=True, padx=config.SPACING['md'])
        self.entry.insert(0, placeholder)
        
        # Browse button
        browse_btn = ThemedButton(
            input_container,
            text="📁 Browse",
            command=self._on_browse_click,
            padx=config.SPACING['lg'],
            pady=config.SPACING['sm'],
        )
        browse_btn.pack(side='right', padx=config.SPACING['md'])
    
    def _on_browse_click(self):
        if self.on_browse:
            self.on_browse()
    
    def set_value(self, value: str):
        """Set the input value."""
        self.entry.delete(0, tk.END)
        self.entry.insert(0, value)
    
    def get_value(self) -> str:
        """Get the input value."""
        value = self.entry.get()
        return value if value != self.placeholder else ""


class ScrollableFrame(tk.Frame):
    """A scrollable frame container."""
    
    def __init__(self, parent, **kwargs):
        """
        Create a scrollable frame.
        
        Args:
            parent: Parent widget
            **kwargs: Additional frame parameters
        """
        super().__init__(parent, **kwargs)
        
        # Create canvas and scrollbar
        self.canvas = tk.Canvas(
            self,
            bg=style.COLORS['bg_card_light'],
            highlightthickness=0,
        )
        scrollbar = tk.Scrollbar(
            self,
            bg=style.COLORS['bg_card_light'],
            troughcolor=style.COLORS['bg_input'],
            activebackground=style.COLORS['accent'],
            orient='vertical',
        )
        scrollbar.pack(side='right', fill='y')
        self.canvas.pack(side='left', fill='both', expand=True)
        self.canvas.config(yscrollcommand=scrollbar.set)
        scrollbar.config(command=self.canvas.yview)
        
        # Create frame inside canvas
        self.content_frame = tk.Frame(
            self.canvas,
            bg=style.COLORS['bg_card_light'],
        )
        self.canvas_window = self.canvas.create_window(
            (0, 0),
            window=self.content_frame,
            anchor='nw',
        )
        
        # Bindings
        self.content_frame.bind('<Configure>', self._on_content_configure)
        self.canvas.bind('<Configure>', self._on_canvas_configure)
        
        # Mouse wheel binding
        self.canvas.bind('<Enter>', self._on_canvas_enter)
        self.canvas.bind('<Leave>', self._on_canvas_leave)
    
    def _on_content_configure(self, event):
        """Update scroll region when content changes."""
        self.canvas.configure(scrollregion=self.canvas.bbox('all'))
    
    def _on_canvas_configure(self, event):
        """Update content frame width when canvas is resized."""
        self.canvas.itemconfig(self.canvas_window, width=event.width)
    
    def _on_canvas_enter(self, event):
        """Bind mouse wheel when entering canvas."""
        self.canvas.bind_all('<MouseWheel>', self._on_mousewheel)
    
    def _on_canvas_leave(self, event):
        """Unbind mouse wheel when leaving canvas."""
        self.canvas.unbind_all('<MouseWheel>')
    
    def _on_mousewheel(self, event):
        """Handle mouse wheel scroll."""
        self.canvas.yview_scroll(int(-1 * (event.delta / 120)), 'units')


class ProgressIndicator(tk.Frame):
    """A progress indicator with label."""
    
    def __init__(self, parent, **kwargs):
        """
        Create a progress indicator.
        
        Args:
            parent: Parent widget
            **kwargs: Additional frame parameters
        """
        super().__init__(parent, bg=style.COLORS['bg_dark'], **kwargs)
        
        # Label
        self.label = tk.Label(
            self,
            text="Ready",
            fg=style.COLORS['text_secondary'],
            bg=style.COLORS['bg_dark'],
            font=('Segoe UI', 8),
        )
        self.label.pack(side='left', padx=config.SPACING['md'])
        
        # Progress bar
        self.progress = ttk.Progressbar(
            self,
            mode='indeterminate',
            length=200,
        )
        self.progress.pack(side='left', padx=config.SPACING['md'])
    
    def set_text(self, text: str):
        """Update progress label."""
        self.label.configure(text=text)
    
    def start(self):
        """Start progress animation."""
        self.progress.start()
    
    def stop(self):
        """Stop progress animation."""
        self.progress.stop()


class TaskCard(tk.Frame):
    """A clickable task card."""
    
    def __init__(self, parent, icon: str, name: str, on_execute=None, is_implemented: bool = True, **kwargs):
        """
        Create a task card.
        
        Args:
            parent: Parent widget
            icon: Task icon/emoji
            name: Task name
            on_execute: Callback when card is clicked
            is_implemented: Whether the task is implemented
            **kwargs: Additional frame parameters
        """
        super().__init__(parent, bg=style.COLORS['bg_card_light'], **kwargs)
        
        self.is_implemented = is_implemented
        self.on_execute = on_execute
        
        # Configure grid
        self.grid_propagate(False)
        self.configure(height=140, width=160)
        
        # Main content
        content = tk.Frame(self, bg=style.COLORS['bg_card_light'])
        content.pack(fill='both', expand=True, padx=config.SPACING['md'], pady=config.SPACING['md'])
        
        # Icon
        icon_label = tk.Label(
            content,
            text=icon,
            font=('Segoe UI', 28),
            bg=style.COLORS['bg_card_light'],
        )
        icon_label.pack(pady=config.SPACING['sm'])
        
        # Name
        name_label = tk.Label(
            content,
            text=name,
            font=('Segoe UI', 9),
            fg=style.COLORS['text_primary'],
            bg=style.COLORS['bg_card_light'],
            wraplength=140,
            justify='center',
        )
        name_label.pack()
        
        # Status
        if not is_implemented:
            status = tk.Label(
                content,
                text="Coming Soon",
                font=('Segoe UI', 7, 'italic'),
                fg=style.COLORS['text_muted'],
                bg=style.COLORS['bg_card_light'],
            )
            status.pack(pady=config.SPACING['sm'])
        
        # Bindings
        if is_implemented:
            self.bind('<Button-1>', self._on_click)
            content.bind('<Button-1>', self._on_click)
            icon_label.bind('<Button-1>', self._on_click)
            name_label.bind('<Button-1>', self._on_click)
            
            self.bind('<Enter>', self._on_enter)
            self.bind('<Leave>', self._on_leave)
            content.bind('<Enter>', self._on_enter)
            icon_label.bind('<Enter>', self._on_enter)
            name_label.bind('<Enter>', self._on_enter)
    
    def _on_enter(self, event):
        """Handle mouse enter."""
        if self.is_implemented:
            self.configure(bg=style.COLORS['hover'])
            for widget in self.winfo_children():
                if isinstance(widget, tk.Frame):
                    widget.configure(bg=style.COLORS['hover'])
                    for child in widget.winfo_children():
                        if isinstance(child, tk.Label):
                            child.configure(bg=style.COLORS['hover'])
    
    def _on_leave(self, event):
        """Handle mouse leave."""
        if self.is_implemented:
            self.configure(bg=style.COLORS['bg_card_light'])
            for widget in self.winfo_children():
                if isinstance(widget, tk.Frame):
                    widget.configure(bg=style.COLORS['bg_card_light'])
                    for child in widget.winfo_children():
                        if isinstance(child, tk.Label):
                            child.configure(bg=style.COLORS['bg_card_light'])
    
    def _on_click(self, event):
        """Handle card click."""
        if self.is_implemented and self.on_execute:
            self.on_execute()


class ConsoleOutput(tk.Frame):
    """A console output display."""
    
    def __init__(self, parent, **kwargs):
        """
        Create a console output widget.
        
        Args:
            parent: Parent widget
            **kwargs: Additional frame parameters
        """
        super().__init__(parent, bg=style.COLORS['bg_input'], **kwargs)
        
        # Header
        header = tk.Frame(self, bg=style.COLORS['bg_card_light'], height=22)
        header.pack(fill='x')
        header.pack_propagate(False)
        
        tk.Label(
            header,
            text="⚡ CONSOLE OUTPUT",
            fg=style.COLORS['accent_light'],
            bg=style.COLORS['bg_card_light'],
            font=('Segoe UI', 8, 'bold'),
        ).pack(side='left', padx=config.SPACING['lg'], pady=config.SPACING['sm'])
        
        # Text area with scrollbar
        text_frame = tk.Frame(self, bg=style.COLORS['bg_input'])
        text_frame.pack(fill='both', expand=True)
        
        scrollbar = tk.Scrollbar(
            text_frame,
            bg=style.COLORS['bg_card_light'],
            troughcolor=style.COLORS['bg_input'],
            activebackground=style.COLORS['accent'],
        )
        scrollbar.pack(side='right', fill='y')
        
        self.text = tk.Text(
            text_frame,
            bg=style.COLORS['bg_input'],
            fg='#E5E9F0',
            font=('Consolas', 8),
            wrap=tk.WORD,
            relief=tk.FLAT,
            borderwidth=0,
            padx=config.SPACING['lg'],
            pady=config.SPACING['md'],
            yscrollcommand=scrollbar.set,
        )
        self.text.pack(fill='both', expand=True)
        
        scrollbar.config(command=self.text.yview)
        self.text.config(state=tk.DISABLED)
    
    def write(self, message: str):
        """Write a message to console."""
        self.text.config(state=tk.NORMAL)
        self.text.insert(tk.END, message + '\n')
        self.text.see(tk.END)
        self.text.config(state=tk.DISABLED)
    
    def clear(self):
        """Clear console output."""
        self.text.config(state=tk.NORMAL)
        self.text.delete(1.0, tk.END)
        self.text.config(state=tk.DISABLED)
