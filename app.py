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
import logging
import time
import uuid
from fastapi import Request
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi import HTTPException

from backend.routes import (
    auth_router,
    reviews_router,
    qr_router,
    feedback_router,
    activity_router,
)
from services.ml_pipeline import load_models, get_model_health

# Load environment variables from repo env files so local dev and deployment share the same values.
for env_file in [Path(__file__).resolve().parent / '.env', Path(__file__).resolve().parent / 'frontend.env']:
    if env_file.exists():
        load_dotenv(env_file, override=False)

app = FastAPI(
    title="ReviewFlow AI Backend",
    description="Backend API for the ReviewFlow AI restaurant review platform.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Basic structured logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(name)s %(message)s')
logger = logging.getLogger("reviewflow")


@app.middleware("http")
async def add_request_id_and_log(request: Request, call_next):
    request_id = str(uuid.uuid4())
    start = time.time()
    response = await call_next(request)
    duration = round((time.time() - start) * 1000, 2)
    logger.info("%s %s %s %sms", request.method, request.url.path, request_id, duration)
    response.headers["x-request-id"] = request_id
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse({"detail": "Internal server error"}, status_code=500)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse({"detail": exc.errors()}, status_code=422)

# CORS — allow the React dev server and production frontend
raw_frontend_origins = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
frontend_origins = [origin.strip() for origin in raw_frontend_origins.split(",") if origin.strip()]
frontend_origins.extend([
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:4173",
])
allow_origins = list(dict.fromkeys(frontend_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all routers
app.include_router(auth_router)
app.include_router(reviews_router)
app.include_router(qr_router)
app.include_router(feedback_router)
app.include_router(activity_router)


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


@app.on_event("startup")
async def _startup_models():
    """Load ML models once at application startup."""
    try:
        load_models()
    except Exception:
        # load_models handles logging and exceptions; ensure startup does not crash
        pass


@app.get("/health/models")
async def models_health():
    """Return per-model health status."""
    return get_model_health()


if __name__ == "__main__":
    import uvicorn

    HOST = "0.0.0.0"
    PORT = 8000

    banner = f"""
╔══════════════════════════════════════════════════════╗
║          ReviewFlow AI — Backend Starting            ║
╠══════════════════════════════════════════════════════╣
║  Backend :  http://localhost:{PORT}                    ║
║  Swagger :  http://localhost:{PORT}/docs               ║
║  ReDoc   :  http://localhost:{PORT}/redoc              ║
║  Health  :  http://localhost:{PORT}/health             ║
╚══════════════════════════════════════════════════════╝
"""
    print(banner)

    uvicorn.run(
        "app:app",
        host=HOST,
        port=PORT,
        reload=True,
        log_level="info",
    )

# If a built frontend exists in `dist/`, serve it as static files (single deployment)
if Path(__file__).parent.joinpath("dist").exists():
    app.mount("/", StaticFiles(directory=str(Path(__file__).parent.joinpath("dist")), html=True), name="frontend")
