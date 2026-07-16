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
        "sentiment_vect": getattr(ml_service, "_sentiment_vect", None),
        "sentiment_model": getattr(ml_service, "_sentiment_model", None),
        "sentiment_le": getattr(ml_service, "_sentiment_le", None),
        "severity_vect": getattr(ml_service, "_severity_vect", None),
        "severity_model": getattr(ml_service, "_severity_model", None),
        "severity_le": getattr(ml_service, "_severity_le", None),
        "complaint_model": getattr(ml_service, "_complaint_model", None),
        "complaint_vocab": getattr(ml_service, "_complaint_vocab", None),
        "complaint_le": getattr(ml_service, "_complaint_le", None),
    }


def get_model_health() -> Dict[str, str]:
    """Return a simple health dict for each model component."""
    models = get_models()
    def status_label(obj):
        return "loaded" if obj is not None else "unavailable"

    return {
        "sentiment_model": status_label(models.get("sentiment_model")),
        "complaint_model": status_label(models.get("complaint_model")),
        "severity_model": status_label(models.get("severity_model")),
    }
