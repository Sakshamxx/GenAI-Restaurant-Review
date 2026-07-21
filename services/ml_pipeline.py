"""
ML Pipeline singleton loader

This module exposes a single `load_models()` function that initialises all models
once at application startup and helper functions for health checks and access.
"""
import logging
from typing import Dict

from . import ml_service

logger = logging.getLogger(__name__)

_loaded = False


def load_models() -> None:
    """Initialise ML models once. Safe to call multiple times (idempotent)."""
    global _loaded
    if _loaded:
        logger.info("[ml_pipeline] Models already loaded")
        return

    logger.info("[ml_pipeline] Loading ML models...")
    try:
        # Delegate to the existing loader in ml_service
        ml_service._load_models()
        _loaded = True
        logger.info("[ml_pipeline] Models loaded successfully")
    except Exception as e:
        logger.exception(f"[ml_pipeline] Failed to load models: {e}")
        _loaded = False


def get_models() -> Dict:
    """Return handles to loaded model objects (delegates to ml_service internals)."""
    return {
        "sentiment_model": getattr(ml_service, "_sentiment_model", None),
        "sentiment_vocab": getattr(ml_service, "_sentiment_vocab", None),
        "sentiment_le": getattr(ml_service, "_sentiment_le", None),
    }


def get_model_health() -> Dict[str, str]:
    """Return a simple health dict for each model component."""
    models = get_models()
    def status_label(obj):
        return "loaded" if obj is not None else "unavailable"

    return {
        "sentiment_model": status_label(models.get("sentiment_model")),
    }
