"""FastAPI Application factory and configuration for VERITY."""

from __future__ import annotations

from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.api.routes import router


def create_app() -> FastAPI:
    """Creates and configures the FastAPI application instance."""
    app = FastAPI(
        title="VERITY — Financial Truth, Reconstructed",
        description="Multimodal Financial Reconciliation Engine & AI Finance Controller API (Razorpay AI Buildathon 2026)",
        version="0.1.0-day11",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include API Routes
    app.include_router(router)

    # Mount Frontend Static Assets if frontend directory exists
    frontend_dir = Path("frontend")
    if frontend_dir.exists() and (frontend_dir / "index.html").exists():
        app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")

    return app


app = create_app()
