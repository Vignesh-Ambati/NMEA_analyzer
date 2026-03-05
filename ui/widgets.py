"""
ui/widgets.py
─────────────
Reusable, themed Tkinter button factory functions.

All button variants share the ACCORD colour palette (imported from
ui.theme.COLORS) and attach consistent hover-state bindings so that the
caller never has to repeat the enter/leave logic.

Public helpers
──────────────
  create_nav_button      — small ←/→ header navigation arrow buttons.
  create_action_button   — larger call-to-action buttons (primary / secondary).
  create_toolbar_button  — flat buttons used in the graph-page top toolbar.
  create_sidebar_button  — left-anchored control buttons in the graph sidebar.
"""

import tkinter as tk
from .theme import COLORS


# ── Navigation (header) ──────────────────────────────────────────────────────

def create_nav_button(parent, text: str, command) -> tk.Button:
    btn = tk.Button(
        parent,
        text=text,
        command=command,
        bg=COLORS['bg_card_light'],
        fg=COLORS['text_primary'],
        activebackground=COLORS['accent'],
        activeforeground='white',
        font=("Segoe UI", 14, "bold"),
        relief=tk.FLAT,
        padx=15,
        pady=5,
        cursor="hand2",
        bd=0,
        highlightthickness=1,
        highlightbackground=COLORS['border'],
    )

    def on_enter(e): btn.configure(bg=COLORS['accent'])
    def on_leave(e): btn.configure(bg=COLORS['bg_card_light'])

    btn.bind("<Enter>", on_enter)
    btn.bind("<Leave>", on_leave)
    return btn


# ── Action (primary / secondary) ─────────────────────────────────────────────

def create_action_button(parent, text: str, command, is_primary: bool = False) -> tk.Button:
    bg_color    = COLORS['accent']         if is_primary else COLORS['bg_card_light']
    hover_color = COLORS['accent_light']   if is_primary else COLORS['accent']

    btn = tk.Button(
        parent,
        text=text,
        command=command,
        bg=bg_color,
        fg='white',
        activebackground=hover_color,
        activeforeground='white',
        font=("Segoe UI", 10, "bold"),
        relief=tk.FLAT,
        padx=20,
        pady=12,
        cursor="hand2",
        bd=0,
        highlightthickness=1,
        highlightbackground=COLORS['border'],
    )

    def on_enter(e): btn.configure(bg=hover_color)
    def on_leave(e): btn.configure(bg=bg_color)

    btn.bind("<Enter>", on_enter)
    btn.bind("<Leave>", on_leave)
    return btn


# ── Toolbar (graph page top bar) ─────────────────────────────────────────────

def create_toolbar_button(parent, text: str, command) -> tk.Button:
    btn = tk.Button(
        parent,
        text=text,
        command=command,
        bg=COLORS['bg_card'],
        fg=COLORS['text_primary'],
        activebackground=COLORS['hover'],
        activeforeground='white',
        font=("Segoe UI", 9, "bold"),
        relief=tk.FLAT,
        padx=12,
        pady=6,
        cursor="hand2",
        bd=0,
        highlightthickness=1,
        highlightbackground=COLORS['border'],
    )

    def on_enter(e): btn.configure(bg=COLORS['hover'])
    def on_leave(e): btn.configure(bg=COLORS['bg_card'])

    btn.bind("<Enter>", on_enter)
    btn.bind("<Leave>", on_leave)
    return btn


# ── Sidebar (graph page right panel) ─────────────────────────────────────────

def create_sidebar_button(parent, text: str, command) -> tk.Button:
    btn = tk.Button(
        parent,
        text=text,
        command=command,
        bg=COLORS['bg_card'],
        fg=COLORS['text_secondary'],
        activebackground=COLORS['accent'],
        activeforeground='white',
        font=("Segoe UI", 9),
        relief=tk.FLAT,
        anchor="w",
        padx=10,
        pady=8,
        cursor="hand2",
        bd=0,
        highlightthickness=1,
        highlightbackground=COLORS['border'],
    )

    def on_enter(e): btn.configure(bg=COLORS['accent'], fg='white')
    def on_leave(e): btn.configure(bg=COLORS['bg_card'], fg=COLORS['text_secondary'])

    btn.bind("<Enter>", on_enter)
    btn.bind("<Leave>", on_leave)
    return btn