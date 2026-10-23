# ABC contract for text/regex extraction

from abc import ABC, abstractmethod
from typing import Callable, Optional

class BaseTextProcessor(ABC):
    """Abstract base contract for all text processing utilities."""
    
    @abstractmethod
    def process(self, progress_callback: Optional[Callable[[int, int], None]] = None) -> int:
        """Executes the processing task and returns the operation count."""
        pass