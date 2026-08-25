"""
ui/style.py
───────────
Centralized theme definitions, colors, and TTK style configurations.
"""
from tkinter import ttk

DARK_COLORS = {
    # Base page surfaces
    'bg_dark': '#0A0E17',
    'bg_surface': '#0F1724',
    'bg_panel': '#121B28',
    'bg_card': '#151E2A',
    'bg_card_light': '#1B2635',
    'bg_card_elevated': '#212E3D',
    'bg_input': '#0F1724',
    'bg_input_alt': '#111C2A',
    'bg_console': '#1B2330',
    'bg_console_alt': '#202B3C',
    'bg_overlay': '#101A26',
    'bg_soft': '#182332',
    'bg_muted': '#233247',

    # Accent system
    'accent': '#FF5A1F',
    'accent_light': '#FF7A3D',
    'accent_hover': '#FF7A3D',
    'accent_pressed': '#D94E18',
    'accent_soft': '#FFDFC8',
    'accent_glow': '#FFB388',
    'accent_ghost': '#2F1A12',

    # Status colors
    'success': '#10B981',
    'warning': '#F59E0B',
    'error': '#EF4444',
    'info': '#60A5FA',

    # Typography
    'text_primary': '#F8FAFC',
    'text_secondary': '#D4DEE9',
    'text_muted': '#8FA3B8',
    'text_on_accent': '#111827',

    # Borders and separators
    'border': '#2F3E52',
    'border_strong': '#45607E',
    'border_light': '#40546D',
    'border_soft': '#1A2533',

    # State / interaction colors
    'hover': '#FF7A3D',      # same as graph debug hover in dark mode
    'hover_soft': '#2C3A4D',
    'hover_ghost': '#243447',
    'selection': '#1F2D3D',
    'shadow': '#050A11',

    # Graph / charting
    'graph_bg': '#FFFFFF',
    'graph_text': '#1F2937',
    'graph_grid': '#E5E7EB',

    # Button tokens
    'button_primary_bg': '#FF5A1F',
    'button_primary_hover': '#FF7A3D',
    'button_primary_text': '#111827',
    'button_secondary_bg': '#1B2635',
    'button_secondary_hover': '#FF7A3D',
    'button_secondary_text': '#F8FAFC',
}

LIGHT_COLORS = {
    # Base page surfaces
    'bg_dark': '#F3F6FB',
    'bg_surface': '#FFFFFF',
    'bg_panel': '#F8FAFC',
    'bg_card': '#FFFFFF',
    'bg_card_light': '#F3F6FA',
    'bg_card_elevated': '#F8FBFF',
    'bg_input': '#EEF3F8',
    'bg_input_alt': '#F2F6FB',
    'bg_console': '#EAF0F6',
    'bg_console_alt': '#F0F5FA',
    'bg_overlay': '#F1F5F9',
    'bg_soft': '#EDF3F9',
    'bg_muted': '#E2E8F0',

    # Accent system
    'accent': '#FF5A1F',
    'accent_light': '#FF7A3D',
    'accent_hover': '#FF7A3D',
    'accent_pressed': '#D94E18',
    'accent_soft': '#FFE8DC',
    'accent_glow': '#FFD7BE',
    'accent_ghost': '#FFF4EE',

    # Status colors
    'success': '#059669',
    'warning': '#D97706',
    'error': '#DC2626',
    'info': '#2563EB',

    # Typography
    'text_primary': '#111827',
    'text_secondary': '#334155',
    'text_muted': '#64748B',
    'text_on_accent': '#FFFFFF',

    # Borders and separators
    'border': '#D9E2EC',
    'border_strong': '#B7C4D2',
    'border_light': '#E6EDF5',
    'border_soft': '#EEF3F8',

    # State / interaction colors
    'hover': '#FFE8DC',
    'hover_soft': '#E9F1F9',
    'hover_ghost': '#F4F8FC',
    'selection': '#EAF2FF',
    'shadow': '#C6D2E1',

    # Graph / charting
    'graph_bg': '#FFFFFF',
    'graph_text': '#111827',
    'graph_grid': '#CBD5E1',

    # Button tokens
    'button_primary_bg': '#FF5A1F',
    'button_primary_hover': '#FF7A3D',
    'button_primary_text': '#FFFFFF',
    'button_secondary_bg': '#F3F6FA',
    'button_secondary_hover': '#FFE8DC',
    'button_secondary_text': '#111827',
}

# Active color palette (Default to Dark Mode)
COLORS = DARK_COLORS.copy()
_current_theme = 'dark'

THEMES = {
    'dark': DARK_COLORS,
    'light': LIGHT_COLORS,
}

# Safe cross-platform Tk font family avoids Tcl parsing issues on Windows with space-containing names.
FONT_FAMILY = 'Arial'
FONT_MONO = 'Consolas'


def set_theme(theme_name: str) -> None:
    """Switches the global color palette between 'dark' and 'light'."""
    global _current_theme
    palette = THEMES.get(theme_name.lower(), DARK_COLORS)
    COLORS.clear()
    COLORS.update(palette)
    _current_theme = theme_name.lower() if theme_name.lower() in THEMES else 'dark'


def get_current_theme():
    return _current_theme


def setup_ttk_style() -> ttk.Style:
    """Configures modern styles for native TTK widgets like Progressbars and Comboboxes."""
    style = ttk.Style()
    style.theme_use('clam')

    style.configure('TProgressbar',
                    background=COLORS['accent'],
                    troughcolor=COLORS['bg_input'],
                    bordercolor=COLORS['border'],
                    lightcolor=COLORS['accent_light'],
                    darkcolor=COLORS['accent_pressed'],
                    thickness=12)

    style.configure('TCombobox',
                    fieldbackground=COLORS['bg_input'],
                    background=COLORS['bg_card_light'],
                    foreground=COLORS['text_primary'],
                    bordercolor=COLORS['border'],
                    arrowcolor=COLORS['text_primary'])

    return style


def get_button_style(is_primary: bool = False) -> dict:
    """Returns the unified dictionary kwargs for Tkinter buttons."""
    if is_primary:
        return {
            'bg': COLORS['button_primary_bg'],
            'fg': COLORS['button_primary_text'],
            'activebackground': COLORS['button_primary_hover'],
            'activeforeground': COLORS['button_primary_text'],
            'relief': 'flat',
            'bd': 0,
            'cursor': 'hand2',
            'font': get_font(10, 'bold'),
            'padx': 20,
            'pady': 10,
        }

    return {
        'bg': COLORS['button_secondary_bg'],
        'fg': COLORS['button_secondary_text'],
        'activebackground': COLORS['button_secondary_hover'],
        'activeforeground': COLORS['button_secondary_text'],
        'relief': 'flat',
        'bd': 0,
        'cursor': 'hand2',
        'font': get_font(10, 'bold'),
        'padx': 20,
        'pady': 10,
    }


def get_label_style(style_type: str = 'normal') -> dict:
    """Returns the unified dictionary kwargs for Tkinter labels."""
    styles = {
        'normal': {'bg': COLORS['bg_card'], 'fg': COLORS['text_primary'], 'font': get_font(10)},
        'heading': {'bg': COLORS['bg_card'], 'fg': COLORS['text_primary'], 'font': get_font(14, 'bold')},
        'title': {'bg': COLORS['bg_dark'], 'fg': COLORS['text_primary'], 'font': get_font(24, 'bold')},
        'muted': {'bg': COLORS['bg_card'], 'fg': COLORS['text_muted'], 'font': get_font(9)},
        'subtle': {'bg': COLORS['bg_card'], 'fg': COLORS['text_secondary'], 'font': get_font(9)},
        'error': {'bg': COLORS['bg_card'], 'fg': COLORS['error'], 'font': get_font(10, 'bold')},
        'success': {'bg': COLORS['bg_card'], 'fg': COLORS['success'], 'font': get_font(10, 'bold')},
    }
    return styles.get(style_type, styles['normal'])


def get_surface_tokens() -> dict:
    """Return the semantic surface tokens used across the app shell and cards."""
    return {
        'app_bg': COLORS['bg_dark'],
        'app_surface': COLORS['bg_surface'],
        'panel_bg': COLORS['bg_panel'],
        'card_bg': COLORS['bg_card'],
        'card_light': COLORS['bg_card_light'],
        'card_elevated': COLORS['bg_card_elevated'],
        'input_bg': COLORS['bg_input'],
        'console_bg': COLORS['bg_console'],
        'accent': COLORS['accent'],
        'accent_hover': COLORS['accent_hover'],
        'text_primary': COLORS['text_primary'],
        'text_secondary': COLORS['text_secondary'],
        'text_muted': COLORS['text_muted'],
        'border': COLORS['border'],
        'shadow': COLORS['shadow'],
    }


def get_theme_tokens() -> dict:
    """Expose a single, stable lookup for theme-aware app shell styling."""
    return {
        'dark': DARK_COLORS,
        'light': LIGHT_COLORS,
        'current': COLORS,
        'current_name': _current_theme,
    }


def get_font(size: int, weight: str = 'normal', italic: bool = False):
    """Return a Tk-safe font tuple for the active theme."""
    if weight == 'bold' and italic:
        return (FONT_FAMILY, size, 'bold italic')
    if weight == 'bold':
        return (FONT_FAMILY, size, 'bold')
    if italic:
        return (FONT_FAMILY, size, 'italic')
    return (FONT_FAMILY, size)