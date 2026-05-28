"""Centralized configuration with multi-environment support.

Environment selection via APP_ENV env var:
  dev     — local development, in-memory stores, debug logging
  staging — pre-production, Redis + Qdrant, info logging
  prod    — production, full external services, warning logging
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field


@dataclass
class ServerConfig:
    host: str = "0.0.0.0"
    port: int = 8001
    cors_origins: list[str] = field(default_factory=lambda: ["*"])
    debug: bool = False


@dataclass
class LLMConfig:
    api_key: str = ""
    api_base: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    model: str = "qwen-plus"
    fallback_model: str = "qwen-turbo"
    max_retries: int = 2
    timeout: int = 30


@dataclass
class QdrantConfig:
    url: str = "http://localhost:6333"
    in_memory: bool = True


@dataclass
class RedisConfig:
    url: str = ""
    host: str = ""
    port: int = 6379
    session_ttl: int = 14400  # 4 hours


@dataclass
class GameConfig:
    max_rounds: int = 8
    bootstrap_samples: int = 1000
    equilibrium_max_iter: int = 20


@dataclass
class AppConfig:
    env: str = "dev"
    server: ServerConfig = field(default_factory=ServerConfig)
    llm: LLMConfig = field(default_factory=LLMConfig)
    qdrant: QdrantConfig = field(default_factory=QdrantConfig)
    redis: RedisConfig = field(default_factory=RedisConfig)
    game: GameConfig = field(default_factory=GameConfig)


def _load_env() -> AppConfig:
    """Build config from environment variables."""
    env = os.getenv("APP_ENV", "dev").lower()
    cfg = AppConfig(env=env)

    # Server
    cfg.server.host = os.getenv("SERVER_HOST", cfg.server.host)
    cfg.server.port = int(os.getenv("SERVER_PORT", str(cfg.server.port)))
    cors = os.getenv("CORS_ORIGINS", "")
    if cors:
        cfg.server.cors_origins = [c.strip() for c in cors.split(",")]
    cfg.server.debug = os.getenv("DEBUG", "false").lower() == "true"

    # LLM
    cfg.llm.api_key = os.getenv("DASHSCOPE_API_KEY", cfg.llm.api_key)
    cfg.llm.api_base = os.getenv("LLM_API_BASE", cfg.llm.api_base)
    cfg.llm.model = os.getenv("LLM_MODEL", cfg.llm.model)
    cfg.llm.fallback_model = os.getenv("LLM_FALLBACK_MODEL", cfg.llm.fallback_model)

    # Qdrant
    cfg.qdrant.url = os.getenv("QDRANT_URL", cfg.qdrant.url)
    cfg.qdrant.in_memory = os.getenv("QDRANT_MEMORY", "true" if cfg.qdrant.in_memory else "false").lower() == "true"

    # Redis
    cfg.redis.url = os.getenv("REDIS_URL", cfg.redis.url)
    cfg.redis.host = os.getenv("REDIS_HOST", cfg.redis.host)
    cfg.redis.port = int(os.getenv("REDIS_PORT", str(cfg.redis.port)))
    cfg.redis.session_ttl = int(os.getenv("SESSION_TTL", str(cfg.redis.session_ttl)))

    # Game
    cfg.game.max_rounds = int(os.getenv("GAME_MAX_ROUNDS", str(cfg.game.max_rounds)))
    cfg.game.bootstrap_samples = int(os.getenv("BOOTSTRAP_SAMPLES", str(cfg.game.bootstrap_samples)))
    cfg.game.equilibrium_max_iter = int(os.getenv("EQUILIBRIUM_MAX_ITER", str(cfg.game.equilibrium_max_iter)))

    return cfg


# Global singleton
app_config = _load_env()


def setup_logging():
    import logging
    level = {"dev": logging.DEBUG, "staging": logging.INFO, "prod": logging.WARNING}.get(app_config.env, logging.INFO)
    logging.basicConfig(level=level, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
