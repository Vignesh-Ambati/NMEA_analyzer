# Thread-safe rotating log handler

import os
import logging
from logging.handlers import RotatingFileHandler

os.makedirs("logs", exist_ok=True)
logger = logging.getLogger("CORE_API")
logger.setLevel(logging.INFO)

_handler = RotatingFileHandler("logs/system.log", maxBytes=5000000, backupCount=3)
_formatter = logging.Formatter('[%(asctime)s] [%(levelname)s] [%(filename)s:%(lineno)d] %(message)s')
_handler.setFormatter(_formatter)
logger.addHandler(_handler)




