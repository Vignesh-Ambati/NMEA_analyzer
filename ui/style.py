"""
ui/style.py
───────────
Centralized theming and style management.
"""

from tkinter import ttk

# Color Palette - Modern, Vibrant Design
COLORS = {
    # Backgrounds
    'bg_dark': '#0F1117',
    'bg_card': '#161B22',
    'bg_card_light': '#1C2128',
    'bg_input': '#0D1117',
    
    # Primary accent - vibrant orange/red
    'accent': '#FF6B35',
    'accent_light': '#FF8A5B',
    'accent_dark': '#E55A2B',
    
    # Secondary accent - teal
    'secondary': '#00D4FF',
    'secondary_light': '#33E0FF',
    'secondary_dark': '#00B8D4',
    
    # Status colors
    'success': '#34C759',
    'success_light': '#5DD37F',
    'warning': '#FF9500',
    'error': '#FF3B30',
    
    # Text
    'text_primary': '#F0F6FC',
    'text_secondary': '#C9D1D9',
    'text_muted': '#8B949E',
    
    # UI elements
    'border': '#30363D',
    'hover': '#21262D',
    'disabled': '#444C56',
    
    # Graphs
    'graph_bg': '#F8F9FA',
    'graph_text': '#24292E',
}


def get_color(name: str, fallback: str = None) -> str:
    """
    Get a color from the palette.
    
    Args:
        name: Color name (key in COLORS dict)
        fallback: Fallback color if name not found
        
    Returns:
        Color hex value
    """
    return COLORS.get(name, fallback or COLORS['text_primary'])


def setup_ttk_style() -> ttk.Style:
    """
    Configure ttk widget styling for the application.
    
    Returns:
        Configured ttk.Style instance
    """
    style = ttk.Style()
    style.theme_use('clam')
    
    # Configure Progressbar
    style.configure(
        'Accent.Horizontal.TProgressbar',
        background=COLORS['accent'],
        troughcolor=COLORS['bg_card_light'],
        bordercolor=COLORS['border'],
        lightcolor=COLORS['accent_light'],
        darkcolor=COLORS['accent_dark'],
    )
    
    return style


def get_button_style(is_primary: bool = False) -> dict:
    """
    Get button styling configuration.
    
    Args:
        is_primary: True for primary button, False for secondary
        
    Returns:
        Dictionary of button style parameters
    """
    return {
        'bg': COLORS['accent'] if is_primary else COLORS['bg_card_light'],
        'fg': COLORS['text_primary'],
        'activebackground': COLORS['accent_light'] if is_primary else COLORS['accent'],
        'activeforeground': COLORS['text_primary'],
        'relief': 'flat',
        'bd': 0,
        'highlightthickness': 1,
        'highlightbackground': COLORS['border'],
        'cursor': 'hand2',
    }


def get_label_style(style: str = 'normal') -> dict:
    """
    Get label styling configuration.
    
    Args:
        style: 'normal', 'heading', 'muted', or 'error'
        
    Returns:
        Dictionary of label style parameters
    """
    styles = {
        'normal': {
            'bg': COLORS['bg_card'],
            'fg': COLORS['text_primary'],
            'font': ('Segoe UI', 10),
        },
        'heading': {
            'bg': COLORS['bg_card'],
            'fg': COLORS['text_primary'],
            'font': ('Segoe UI', 14, 'bold'),
        },
        'muted': {
            'bg': COLORS['bg_card'],
            'fg': COLORS['text_muted'],
            'font': ('Segoe UI', 9),
        },
        'error': {
            'bg': COLORS['bg_card'],
            'fg': COLORS['error'],
            'font': ('Segoe UI', 10, 'bold'),
        },
    }
    return styles.get(style, styles['normal'])
