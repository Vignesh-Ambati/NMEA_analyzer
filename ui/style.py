"""
ui/style.py
───────────
Centralized theme definitions, colors, and TTK style configurations.
"""
from tkinter import ttk

DARK_COLORS = {
    'bg_dark': '#0A0E17',
    'bg_card': '#11161F',
    'bg_card_light': '#1A202C',
    'bg_input': '#0F1419',
    'bg_console': '#1E2433',          
    'accent': "#FF4400",
    'accent_light': "#C03F0C",
    'accent_dark': "#A7330C",
    'success': '#10B981',
    'warning': '#F59E0B',
    'error': '#EF4444',
    'text_primary': '#FFFFFF',        
    'text_secondary': '#D1D5DB',
    'text_muted': '#9CA3AF',
    'border': '#374151',              
    'border_light': '#4B5563',
    'hover': '#2D3748',
    'graph_bg': '#FFFFFF',
    'graph_text': '#1F2937',
}

LIGHT_COLORS = {
    'bg_dark': '#F9FAFB',
    'bg_card': '#FFFFFF',
    'bg_card_light': '#F3F4F6',
    'bg_input': '#F3F4F6',
    'bg_console': '#E5E7EB',
    'accent': "#FF4400",
    'accent_light': "#FF6A33",
    'accent_dark': "#C03F0C",
    'success': '#059669',
    'warning': '#D97706',
    'error': '#DC2626',
    'text_primary': '#111827',
    'text_secondary': '#374151',
    'text_muted': '#6B7280',
    'border': '#E5E7EB',
    'border_light': '#D1D5DB',
    'hover': '#F3F4F6',
    'graph_bg': '#FFFFFF',
    'graph_text': '#111827',
}

# Active color palette (Default to Dark Mode)
COLORS = DARK_COLORS.copy()
_current_theme = 'dark'

def set_theme(theme_name: str) -> None:
    """Switches the global color palette between 'dark' and 'light'."""
    global _current_theme
    if theme_name == 'light':
        COLORS.update(LIGHT_COLORS)
        _current_theme = 'light'
    else:
        COLORS.update(DARK_COLORS)
        _current_theme = 'dark'

def get_current_theme():
    return _current_theme

def setup_ttk_style() -> ttk.Style:
    """Configures modern styles for native TTK widgets like Progressbars and Comboboxes."""
    style = ttk.Style()
    style.theme_use('clam')
    
    # Progress Bar Styling
    style.configure('TProgressbar',
                    background=COLORS['accent'],
                    troughcolor=COLORS['bg_input'],
                    bordercolor=COLORS['border'],
                    lightcolor=COLORS['accent_light'],
                    darkcolor=COLORS['accent_dark'],
                    thickness=12)
                    
    # Combobox Styling (Used in Graph dropdowns)
    style.configure('TCombobox', 
                    fieldbackground=COLORS['bg_input'], 
                    background=COLORS['bg_card_light'], 
                    foreground=COLORS['text_primary'],
                    bordercolor=COLORS['border'],
                    arrowcolor=COLORS['text_primary'])
                    
    return style

def get_button_style(is_primary: bool = False) -> dict:
    """Returns the unified dictionary kwargs for Tkinter buttons."""
    return {
        'bg': COLORS['accent'] if is_primary else COLORS['bg_card_light'],
        'fg': COLORS['text_primary'],
        'activebackground': COLORS['accent_light'] if is_primary else COLORS['accent'],
        'activeforeground': COLORS['text_primary'],
        'relief': 'flat',
        'bd': 0,
        'cursor': 'hand2',
        'font': ('Segoe UI', 10, 'bold'),
        'padx': 20,
        'pady': 10,
    }

def get_label_style(style_type: str = 'normal') -> dict:
    """Returns the unified dictionary kwargs for Tkinter labels."""
    styles = {
        'normal': {'bg': COLORS['bg_card'], 'fg': COLORS['text_primary'], 'font': ('Segoe UI', 10)},
        'heading': {'bg': COLORS['bg_card'], 'fg': COLORS['text_primary'], 'font': ('Segoe UI', 14, 'bold')},
        'title': {'bg': COLORS['bg_dark'], 'fg': COLORS['text_primary'], 'font': ('Segoe UI', 24, 'bold')},
        'muted': {'bg': COLORS['bg_card'], 'fg': COLORS['text_muted'], 'font': ('Segoe UI', 9)},
        'error': {'bg': COLORS['bg_card'], 'fg': COLORS['error'], 'font': ('Segoe UI', 10, 'bold')},
    }
    return styles.get(style_type, styles['normal'])