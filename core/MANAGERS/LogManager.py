import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Final

_LOG_DIR: Final[Path] = Path("OUTPUT/logs")
_LOG_DIR.mkdir(parents=True, exist_ok=True)

_LOG_FORMAT: Final[str] = ("[%(asctime)s] [%(levelname)s] [%(name)s] [%(filename)s:%(lineno)d] %(message)s")
_FORMATTER: Final[logging.Formatter] = logging.Formatter(_LOG_FORMAT)

system_logger: Final[logging.Logger] = logging.getLogger("CORE_API_SYSTEM")
system_logger.setLevel(logging.INFO)
system_logger.propagate = False

_system_handler: Final[RotatingFileHandler] = RotatingFileHandler(
    filename=_LOG_DIR / "system.log",
    maxBytes=10_000_000,
    backupCount=5,
    encoding="utf-8",
)
_system_handler.setFormatter(_FORMATTER)
system_logger.addHandler(_system_handler)

error_logger: Final[logging.Logger] = logging.getLogger("CORE_API_ERROR")
error_logger.setLevel(logging.WARNING)
error_logger.propagate = False

_error_handler: Final[RotatingFileHandler] = RotatingFileHandler(
    filename=_LOG_DIR / "error.log",
    maxBytes=10_000_000,
    backupCount=5,
    encoding="utf-8",
)
_error_handler.setFormatter(_FORMATTER)
error_logger.addHandler(_error_handler)

__all__ = ["system_logger", "error_logger"]