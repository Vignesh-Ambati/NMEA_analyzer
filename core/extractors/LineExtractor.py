# Polymorphic regex line extraction implementation

import os
import re
from pathlib import Path
from typing import Callable, Optional
from .BaseTextExtractor import BaseTextProcessor

class RegexLineExtractor(BaseTextProcessor):
    def __init__(self, input_path: str, output_path: str, expression: str, 
                 search_mode: str = "normal", match_case: bool = False, match_whole_word: bool = False):
        self._in_path = Path(input_path.strip())
        self._out_path = Path(output_path.strip())
        self._expression = expression
        self._search_mode = search_mode
        self._match_case = match_case
        self._match_whole_word = match_whole_word
        
        self._validate_paths()
        self._pattern = self._compile_pattern()

    def _validate_paths(self) -> None:
        if not self._in_path.exists() or not self._in_path.is_file():
            raise FileNotFoundError(f"Source file missing: {self._in_path}")
        if os.path.getsize(self._in_path) == 0:
            raise ValueError("Source file is empty.")
        os.makedirs(self._out_path.parent, exist_ok=True)

    def _compile_pattern(self) -> re.Pattern:
        target_str = self._expression
        if self._search_mode == "extended":
            target_str = target_str.encode('utf-8').decode('unicode_escape')
        elif self._search_mode == "normal":
            target_str = re.escape(target_str)
            
        if self._match_whole_word:
            target_str = rf"\b{target_str}\b"

        flags = 0 if self._match_case else re.IGNORECASE
        return re.compile(target_str.encode('utf-8'), flags)

    def process(self, progress_callback: Optional[Callable[[int, int], None]] = None) -> int:
        file_size = os.path.getsize(self._in_path)
        bytes_processed = 0
        lines_found = 0
        update_threshold = 1024 * 1024 * 5 
        chunk_bytes = 0

        with open(self._in_path, 'rb', buffering=16777216) as infile, \
             open(self._out_path, 'wb', buffering=16777216) as outfile:
            
            for line in infile:
                line_len = len(line)
                bytes_processed += line_len
                chunk_bytes += line_len
                
                if self._pattern.search(line):
                    outfile.write(line)
                    lines_found += 1
                    
                if progress_callback and chunk_bytes >= update_threshold:
                    progress_pct = int((bytes_processed / file_size) * 100)
                    progress_callback(progress_pct, lines_found)
                    chunk_bytes = 0

        if progress_callback:
            progress_callback(100, lines_found)
            
        return lines_found