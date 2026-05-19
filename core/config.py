"""Centralized configuration for the Bidding Game application.

All settings are sourced from environment variables with sensible defaults.
No hardcoded values scattered across modules.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field


def setup_logging(level: int = logging.INFO) -> None:
    """Configure root logger once at application startup."""
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    # Keep noisy libraries quieter
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("qdrant_client").setLevel(logging.WARNING)
    logging.getLogger("sentence_transformers").setLevel(logging.WARNING)


@dataclass
class LLMConfig:
    api_key: str = field(default_factory=lambda: os.getenv("DASHSCOPE_API_KEY", "") or os.getenv("LLM_API_KEY", ""))
    api_base: str = field(default_factory=lambda: os.getenv("LLM_API_BASE", "https://dashscope.aliyuncs.com/compatible-mode/v1"))
    model: str = field(default_factory=lambda: os.getenv("LLM_MODEL", "qwen-plus"))
    timeout: int = 120


@dataclass
class ServerConfig:
    host: str = field(default_factory=lambda: os.getenv("SERVER_HOST", "0.0.0.0"))
    port: int = field(default_factory=lambda: int(os.getenv("SERVER_PORT", "8001")))
    cors_origins: list[str] = field(default_factory=lambda:
        os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
    )
    debug: bool = field(default_factory=lambda: os.getenv("DEBUG", "").lower() in ("1", "true", "yes"))


@dataclass
class QdrantConfig:
    url: str = field(default_factory=lambda: os.getenv("QDRANT_URL", ""))
    memory_mode: bool = field(default_factory=lambda: os.getenv("QDRANT_MEMORY", "").lower() == "true")


@dataclass
class GameConfig:
    max_rounds: int = field(default_factory=lambda: int(os.getenv("GAME_MAX_ROUNDS", "8")))
    bootstrap_samples: int = field(default_factory=lambda: int(os.getenv("BOOTSTRAP_SAMPLES", "50")))
    equilibrium_max_iterations: int = field(default_factory=lambda: int(os.getenv("EQUILIBRIUM_MAX_ITER", "20")))


@dataclass
class AppConfig:
    llm: LLMConfig = field(default_factory=LLMConfig)
    server: ServerConfig = field(default_factory=ServerConfig)
    qdrant: QdrantConfig = field(default_factory=QdrantConfig)
    game: GameConfig = field(default_factory=GameConfig)


app_config = AppConfig()
