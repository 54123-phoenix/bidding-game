"""Bidding Game API — FastAPI application entry point.

Routes:
  POST /api/upload       — Upload & parse resume
  POST /api/simulate     — Run bidding game simulation
  POST /api/counterfactual — Run what-if analysis
  POST /api/report       — Full evaluation report
  GET  /api/demo         — Run demo with built-in data
  GET  /health           — Health check
"""

from __future__ import annotations

import time
from contextlib import asynccontextmanager
from collections import defaultdict

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from core.config import app_config, setup_logging

setup_logging()


# ── Simple in-memory rate limiter ──────────────────────────────────────────

class RateLimiter:
    def __init__(self, max_requests: int = 60, window_seconds: int = 60):
        self._max = max_requests
        self._window = window_seconds
        self._clients: dict[str, list[float]] = defaultdict(list)

    async def __call__(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        window_start = now - self._window

        # Prune old entries
        self._clients[client_ip] = [t for t in self._clients[client_ip] if t > window_start]

        if len(self._clients[client_ip]) >= self._max:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please wait before retrying."},
            )

        self._clients[client_ip].append(now)
        return await call_next(request)


@asynccontextmanager
async def lifespan(app: FastAPI):
    from llm.providers import register_default_provider
    register_default_provider()
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="Career Bidding Game",
        description="Multi-Agent Bayesian Hiring Game Simulation",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=app_config.server.cors_origins,
        allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
    )

    # Rate limiting: 60 requests per 60 seconds per client IP
    app.middleware("http")(RateLimiter(max_requests=60, window_seconds=60))

    @app.get("/health")
    async def health():
        return {"status": "ok", "version": app.version}

    from api.routes.upload import router as upload_router
    from api.routes.simulate import router as simulate_router
    from api.routes.counterfactual import router as cf_router
    from api.routes.report import router as report_router
    from api.routes.demo import router as demo_router
    from api.routes.debate import router as debate_router
    from api.routes.game import router as game_router
    from api.routes.debrief_chat import router as debrief_chat_router

    app.include_router(upload_router, prefix="/api")
    app.include_router(simulate_router, prefix="/api")
    app.include_router(cf_router, prefix="/api")
    app.include_router(report_router, prefix="/api")
    app.include_router(demo_router, prefix="/api")
    app.include_router(debate_router, prefix="/api")
    app.include_router(game_router)
    app.include_router(debrief_chat_router)

    return app


app = create_app()
