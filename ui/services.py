"""
ui/services.py
──────────────
Backend integration layer for NMEA processing.
"""

import threading
from typing import Optional, Callable, Any
from pathlib import Path

try:
    from core import NmeaProcessor, CacheManager, query_file
    CORE_AVAILABLE = True
except ImportError:
    CORE_AVAILABLE = False


class ProcessingService:
    """
    Service for coordinating NMEA file processing.
    """
    
    def __init__(self):
        """Initialize the processing service."""
        self.is_processing = False
        self.current_thread: Optional[threading.Thread] = None
    
    def process_file(
        self,
        file_path: str,
        on_complete: Optional[Callable[[Any], None]] = None,
        on_error: Optional[Callable[[str], None]] = None,
    ) -> bool:
        """
        Process a NMEA log file asynchronously.
        
        Args:
            file_path: Path to the log file
            on_complete: Callback when processing completes (receives cache)
            on_error: Callback if processing fails (receives error message)
            
        Returns:
            True if processing started, False otherwise
        """
        if not CORE_AVAILABLE:
            if on_error:
                on_error("Core module not available")
            return False
        
        if self.is_processing:
            if on_error:
                on_error("Processing already in progress")
            return False
        
        file_path_obj = Path(file_path)
        if not file_path_obj.exists():
            if on_error:
                on_error(f"File not found: {file_path}")
            return False
        
        self.is_processing = True
        self.current_thread = threading.Thread(
            target=self._process_file_thread,
            args=(file_path, on_complete, on_error),
            daemon=True,
        )
        self.current_thread.start()
        return True
    
    def _process_file_thread(
        self,
        file_path: str,
        on_complete: Optional[Callable] = None,
        on_error: Optional[Callable] = None,
    ):
        """Process file in background thread."""
        try:
            processor = NmeaProcessor(file_path)
            processor.process_file()
            cache = CacheManager()
            
            self.is_processing = False
            if on_complete:
                on_complete(cache)
        except Exception as e:
            self.is_processing = False
            if on_error:
                on_error(f"Processing error: {str(e)}")
    
    def query_data(
        self,
        cache: Any,
        message_type: str,
        start_time: float,
        end_time: float,
    ) -> Optional[list]:
        """
        Query cached data for a time range.
        
        Args:
            cache: DataCache object
            message_type: Message type to query (e.g., 'GGA', 'RMC')
            start_time: Start time in seconds
            end_time: End time in seconds
            
        Returns:
            List of query results or None if error
        """
        try:
            if not CORE_AVAILABLE:
                return None
            
            results = query_file(cache, message_type, start_time, end_time)
            return results
        except Exception as e:
            print(f"Query error: {str(e)}")
            return None


class DialogService:
    """Service for user dialogs and notifications."""
    
    @staticmethod
    def format_file_size(size_bytes: int) -> str:
        """
        Format bytes to human-readable size.
        
        Args:
            size_bytes: Size in bytes
            
        Returns:
            Formatted size string
        """
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024:
                return f"{size_bytes:.2f} {unit}"
            size_bytes /= 1024
        return f"{size_bytes:.2f} TB"
    
    @staticmethod
    def format_duration(seconds: float) -> str:
        """
        Format seconds to human-readable duration.
        
        Args:
            seconds: Duration in seconds
            
        Returns:
            Formatted duration string
        """
        if seconds < 60:
            return f"{seconds:.1f}s"
        elif seconds < 3600:
            minutes = seconds / 60
            return f"{minutes:.1f}m"
        else:
            hours = seconds / 3600
            return f"{hours:.1f}h"
