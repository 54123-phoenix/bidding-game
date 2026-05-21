"""Session store abstraction — in-memory fallback or Redis persistence.

Supports:
  - get(session_id) → session dict or None
  - set(session_id, data, ttl_seconds)
  - delete(session_id)
  - exists(session_id) → bool

Redis is used when REDIS_URL is set; otherwise falls back to in-memory dict.
All data is JSON-serialized via Pydantic model_dump_json for cross-process safety.
"""

from __future__ import annotations

import json
import os
from typing import Any


def _get_redis_client():
    try:
        import redis
        url = os.getenv("REDIS_URL", "")
        if url:
            return redis.from_url(url, decode_responses=True)
        host = os.getenv("REDIS_HOST", "")
        port = int(os.getenv("REDIS_PORT", "6379"))
        if host:
            return redis.Redis(host=host, port=port, decode_responses=True)
    except Exception:
        pass
    return None


class _InMemoryStore:
    """Fallback store for local dev / testing."""

    def __init__(self):
        self._data: dict[str, str] = {}

    def get(self, key: str) -> dict[str, Any] | None:
        raw = self._data.get(key)
        if raw is None:
            return None
        try:
            return json.loads(raw)
        except Exception:
            return None

    def set(self, key: str, value: dict[str, Any], ttl: int = 3600) -> None:
        self._data[key] = json.dumps(value, ensure_ascii=False, default=str)

    def delete(self, key: str) -> None:
        self._data.pop(key, None)

    def exists(self, key: str) -> bool:
        return key in self._data

    def list_keys(self, pattern: str = "*") -> list[str]:
        """Return keys matching fnmatch-style pattern."""
        import fnmatch
        return [k for k in self._data.keys() if fnmatch.fnmatch(k, pattern)]


class _RedisStore:
    """Production store backed by Redis with TTL."""

    def __init__(self, client):
        self._client = client

    def get(self, key: str) -> dict[str, Any] | None:
        raw = self._client.get(key)
        if raw is None:
            return None
        try:
            return json.loads(raw)
        except Exception:
            return None

    def set(self, key: str, value: dict[str, Any], ttl: int = 3600) -> None:
        self._client.setex(key, ttl, json.dumps(value, ensure_ascii=False, default=str))

    def delete(self, key: str) -> None:
        self._client.delete(key)

    def exists(self, key: str) -> bool:
        return bool(self._client.exists(key))

    def list_keys(self, pattern: str = "*") -> list[str]:
        """Return keys matching pattern using SCAN (non-blocking)."""
        keys = []
        for key in self._client.scan_iter(match=pattern, count=100):
            keys.append(key.decode() if isinstance(key, bytes) else key)
        return keys


# Global singleton — initialized on first import, not on module load
_store: _InMemoryStore | _RedisStore | None = None


def get_store() -> _InMemoryStore | _RedisStore:
    """Return the configured session store singleton."""
    global _store
    if _store is not None:
        return _store

    client = _get_redis_client()
    if client is not None:
        _store = _RedisStore(client)
    else:
        _store = _InMemoryStore()
    return _store


def reset_store() -> None:
    """Reset the singleton (useful for testing)."""
    global _store
    _store = None
