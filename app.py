"""
ReviewFlow AI — FastAPI Backend Entry Point

Run with:
    uvicorn app:app --reload --port 8000

Or for production:
    gunicorn app:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routes.auth import router as auth_router
from routes.reviews import router as reviews_router
from routes.qr import router as qr_router
from routes.feedback import router as feedback_router

# Load environment variables from .env file
load_dotenv()

app = FastAPI(
    title="ReviewFlow AI Backend",
    description="Backend API for the ReviewFlow AI restaurant review platform.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allow the React dev server and production frontend
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "https://reviewflow.ai")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_ORIGIN,
        "http://localhost:5173",   # vite dev server (default)
        "http://localhost:3000",   # common alternative dev port
        "http://localhost:4173",   # vite preview
        "https://reviewflow.ai",   # production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all routers
app.include_router(auth_router)
app.include_router(reviews_router)
app.include_router(qr_router)
app.include_router(feedback_router)


@app.get("/")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "ReviewFlow AI Backend",
        "version": "1.0.0"
    }


@app.get("/health")
async def health():
    """Alias health check."""
    return {"status": "ok"}
