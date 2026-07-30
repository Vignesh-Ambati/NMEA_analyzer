"""
ui/config.py
────────────
Centralized configuration and constants for the UI.
"""

# Application dimensions
WINDOW_WIDTH = 1000
WINDOW_HEIGHT = 600
WINDOW_MIN_WIDTH = 1000
WINDOW_MIN_HEIGHT = 600

# Spacing constants (pixels)
SPACING = {
    'xs': 4,
    'sm': 8,
    'md': 12,
    'lg': 16,
    'xl': 24,
    'xxl': 32,
}

# Font sizes
FONT_SIZES = {
    'xs': 8,
    'sm': 9,
    'md': 10,
    'lg': 12,
    'xl': 14,
    'xxl': 16,
    'heading': 18,
    'title': 24,
}

# Font families
FONTS = {
    'default': 'Segoe UI',
    'mono': 'Consolas',
}

# Tasks list
TASKS = [
    "📈 Plot C/N0 graph",
    "⚙️ Analyze MIPS",
    "📍 Check for position losses",
    "🏔️ Plot altitude graph",
    "🎯 Plot DOP graph",
    "🔢 Plot SV count for fix graph",
    "🔄 Number of times reset Count",
    "🛰️ SBAS use in the log",
    "📐 Plot statistics vs true values",
    "💨 Velocity Plot Graph"
]

# Implemented tasks (task indices that are ready)
IMPLEMENTED_TASKS = {0, 1, 3, 4}

# File extensions
SUPPORTED_EXTENSIONS = [
    ("All Files", "*.*"),
    ("Log Files", "*.log"),
    ("Text Files", "*.txt"),
    ("NMEA Files", "*.nmea"),
]

# Debug / developer helpers
# When True, various UI components will emit intermediate files (images, csvs)
# to help with debugging rendering and data pipeline problems.
_Graph_Debug = False
DEBUG_EXPORT_DIR = "debug_exports"
PLOT_DPI = 100
