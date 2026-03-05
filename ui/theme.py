"""
ui/theme.py
───────────
Centralised design tokens for the ACCORD application.

All colour values, font names, and size constants are defined here so that
every widget in the application shares a single source of truth.  Changing
the application's visual appearance only requires edits in this file.

Usage
─────
    from ui.theme import COLORS, setup_ttk_style

    colors = COLORS          # dict of colour tokens
    setup_ttk_style(style)   # call once after ttk.Style() is created
"""

from tkinter import ttk

# ── Colour palette ───────────────────────────────────────────────────────────
COLORS = {
    'bg_dark':        '#0A0F1E',
    'bg_card':        '#1A2535',
    'bg_card_light':  '#253241',
    'bg_input':       '#0E1322',
    'accent':         '#3B82F6',
    'accent_light':   '#60A5FA',
    'accent_dark':    '#2563EB',
    'success':        '#10B981',
    'warning':        '#F59E0B',
    'error':          '#EF4444',
    'text_primary':   '#FFFFFF',
    'text_secondary': '#CBD5E0',
    'text_muted':     '#94A3B8',
    'border':         '#2D3A4A',
    'hover':          '#334155',
}


# ── ttk widget theming ───────────────────────────────────────────────────────

def setup_ttk_style(style: ttk.Style) -> None:
    """Apply the ACCORD theme to ttk widgets.

    Call this once, immediately after creating the ttk.Style() instance.
    """
    style.theme_use('clam')

    style.configure(
        'Accent.Horizontal.TProgressbar',
        background=COLORS['accent'],
        troughcolor=COLORS['bg_input'],
        borderwidth=0,
        thickness=4,
    )