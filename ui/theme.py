# ui/theme.py - Re-export colors from style for backward compatibility

"""Theme exports - centralized design tokens for ACCORD."""

from .style import COLORS, get_color, set_theme, get_current_theme, setup_ttk_style

__all__ = ['COLORS', 'get_color', 'set_theme', 'get_current_theme', 'setup_ttk_style']