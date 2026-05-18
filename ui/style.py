from tkinter import ttk

DARK_COLORS = {
    'bg_dark': '#0A0E17',
    'bg_card': '#11161F',
    'bg_card_light': '#1A202C',
    'bg_input': '#0F1419',
    'bg_console': '#1E2433',          # darker, modern console background
    'accent': "#FF4400",
    'accent_light': "#C03F0C",
    'accent_dark': "#A7330C",
    'success': '#10B981',
    'warning': '#F59E0B',
    'error': '#EF4444',
    'text_primary': '#FFFFFF',        # pure white on dark
    'text_secondary': '#D1D5DB',
    'text_muted': '#9CA3AF',
    'border': '#374151',              # visible grey border
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
    'bg_console': '#E5E7EB',          # light grey console
    'accent': "#F0490C",
    'accent_light': "#C03F0C",
    'accent_dark': '#A7330C',
    'success': '#10B981',
    'warning': '#F59E0B',
    'error': '#EF4444',
    'text_primary': "#000000",        # near black
    'text_secondary': "#060F1D",
    'text_muted': "#2B2323",
    'border': '#D1D5DB',
    'border_light': '#E5E7EB',
    'hover': '#E5E7EB',
    'graph_bg': '#FFFFFF',
    'graph_text': '#1F2937',
}

COLORS = DARK_COLORS.copy()
_current_theme = 'dark'

def get_color(name, fallback=None):
    return COLORS.get(name, fallback or COLORS['text_primary'])

def set_theme(theme):
    global COLORS, _current_theme
    if theme == 'light':
        COLORS.update(LIGHT_COLORS)
        _current_theme = 'light'
    else:
        COLORS.update(DARK_COLORS)
        _current_theme = 'dark'

def get_current_theme():
    return _current_theme

def setup_ttk_style():
    style = ttk.Style()
    style.theme_use('clam')
    style.configure('TProgressbar',
                    background=COLORS['accent'],
                    troughcolor=COLORS['bg_input'],
                    bordercolor=COLORS['border'],
                    lightcolor=COLORS['accent_light'],
                    darkcolor=COLORS['accent_dark'],
                    thickness=12)               # thicker bar
    return style

def get_button_style(is_primary=False):
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

def get_label_style(style_type='normal'):
    styles = {
        'normal': {'bg': COLORS['bg_card'], 'fg': COLORS['text_primary'], 'font': ('Segoe UI', 10)},
        'heading': {'bg': COLORS['bg_card'], 'fg': COLORS['text_primary'], 'font': ('Segoe UI', 14, 'bold')},
        'muted': {'bg': COLORS['bg_card'], 'fg': COLORS['text_muted'], 'font': ('Segoe UI', 9)},
        'error': {'bg': COLORS['bg_card'], 'fg': COLORS['error'], 'font': ('Segoe UI', 10, 'bold')},
    }
    return styles.get(style_type, styles['normal'])