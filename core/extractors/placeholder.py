"""
core/extractors/placeholder.py
──────────────────────────────
A safe fallback for unimplemented analytical tasks.
"""
import numpy as np
from pathlib import Path
from typing import Tuple, Optional
from .base_extractor import BaseExtractor

class PlaceholderExtractor(BaseExtractor):
    def _extract(self, parquet_path: Path) -> Tuple[Optional[np.ndarray], Optional[np.ndarray]]:
        # Safely returns None, prompting the UI Canvas to draw its fallback "No Data" state
        return None, None