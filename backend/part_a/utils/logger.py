import logging
import sys
from backend.core.config import settings

def setup_logger(name: str = "part_a") -> logging.Logger:
    """Configures structured logger with consistent formatting."""
    logger = logging.getLogger(name)
    level_name = settings.LOG_LEVEL.upper()
    level = getattr(logging, level_name, logging.INFO)
    logger.setLevel(level)

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(level)
        formatter = logging.Formatter(settings.LOG_FORMAT)
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    logger.propagate = False
    return logger

logger = setup_logger("part_a")
