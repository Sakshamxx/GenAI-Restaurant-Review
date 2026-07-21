"""Backend routes re-export package.

This module re-exports existing top-level `routes.*` routers so we can
gradually migrate to `backend/` layout without breaking imports.
"""
from routes.auth import router as auth_router
from routes.reviews import router as reviews_router
from routes.qr import router as qr_router
from routes.feedback import router as feedback_router
from routes.activity import router as activity_router

__all__ = [
    "auth_router",
    "reviews_router",
    "qr_router",
    "feedback_router",
    "activity_router",
]