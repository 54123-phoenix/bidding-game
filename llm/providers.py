"""LLM provider callables — ported from ai-career-intelligence.

Injected via llm/client.py register functions.
DashScope (primary) → Ollama (local) → mock (last resort).

All callables accept an optional `model` kwarg for dynamic model switching.
"""

from __future__ import annotations

import json
import logging
import os

logger = logging.getLogger("llm.providers")

# Cache for dynamically created provider callables keyed by model name.
# When a model change is requested, we reuse cached callables instead of
# re-registering the provider chain.
_model_cache: dict[str, object] = {}


# ── Mock (last-resort fallback) ──────────────────────────────────────────


def create_mock_provider():
    def mock_call(prompt: str, model: str | None = None) -> str:
        return json.dumps({
            "name": "", "email": None, "phone": None, "summary": "",
            "skills": [], "projects": [], "education": [], "experience": [],
            "certifications": [],
        })
    return mock_call


# ── DashScope (primary — 阿里云通义千问) ────────────────────────────────


def _build_dashscope_callable(api_key: str, api_base: str, default_model: str, timeout: int = 120):
    """Create sync callables for DashScope OpenAI-compatible endpoint.

    Each callable accepts an optional `model` parameter to override the
    default model at call time, enabling dynamic model switching per request.
    """
    import httpx

    def call_single(prompt: str, model: str | None = None) -> str:
        with httpx.Client(timeout=timeout) as client:
            resp = client.post(
                f"{api_base}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model or default_model,
                    "messages": [
                        {"role": "system", "content": "You are a resume parser. Output ONLY valid JSON."},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.1,
                    "max_tokens": 2048,
                },
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]

    def call_chat(messages: list[dict[str, str]], temperature: float = 0.3, model: str | None = None) -> str:
        with httpx.Client(timeout=timeout) as client:
            resp = client.post(
                f"{api_base}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model or default_model,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": 2048,
                },
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]

    def call_chat_stream(messages: list[dict[str, str]], temperature: float = 0.3, model: str | None = None):
        """Generator yielding SSE text chunks from DashScope."""
        with httpx.Client(timeout=timeout) as client:
            with client.stream(
                "POST", f"{api_base}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model or default_model, "messages": messages,
                    "temperature": temperature, "max_tokens": 2048, "stream": True,
                },
            ) as resp:
                resp.raise_for_status()
                for line in resp.iter_lines():
                    if not line or not line.startswith("data: "):
                        continue
                    data_str = line[6:]
                    if data_str == "[DONE]":
                        break
                    try:
                        obj = json.loads(data_str)
                        content = obj["choices"][0].get("delta", {}).get("content", "")
                        if content:
                            yield content
                    except Exception as exc:
                        logger.debug("SSE chunk parse error: %s | data: %.100s", exc, data_str)

    return call_single, call_chat, call_chat_stream


# ── Ollama (local fallback) ─────────────────────────────────────────────


def _build_ollama_callable(model: str, base_url: str = "http://localhost:11434", timeout: int = 120):
    import httpx

    def call_ollama(prompt: str, model: str | None = None) -> str:
        with httpx.Client(timeout=timeout) as client:
            resp = client.post(
                f"{base_url}/api/generate",
                json={"model": model or model, "prompt": prompt, "stream": False},
            )
            resp.raise_for_status()
            return resp.json()["response"]

    return call_ollama


# ── Registration chain ──────────────────────────────────────────────────


def register_default_provider():
    """Fallback chain: DashScope → Ollama → mock. Called once at startup."""
    from llm.client import register_llm, register_chat_llm, register_chat_stream_llm

    # 1. DashScope (阿里云通义千问) — primary
    api_key = os.getenv("DASHSCOPE_API_KEY", "") or os.getenv("LLM_API_KEY", "")
    if not api_key:
        logger.warning("No LLM API key found (DASHSCOPE_API_KEY / LLM_API_KEY). "
                       "LLM features will be unavailable — agents will use rule-based fallback only.")
    if api_key and len(api_key) > 10:
        api_base = os.getenv("LLM_API_BASE", "https://dashscope.aliyuncs.com/compatible-mode/v1")
        model = os.getenv("LLM_MODEL", "qwen-plus")
        try:
            single_fn, chat_fn, stream_fn = _build_dashscope_callable(api_key, api_base, model)
            register_llm(single_fn)
            register_chat_llm(chat_fn)
            register_chat_stream_llm(stream_fn)
            logger.info("LLM provider: DashScope (model=%s, base=%s)", model, api_base)
            return
        except Exception as exc:
            logger.warning("DashScope init failed: %s", exc)

    # 2. Ollama (local)
    try:
        import httpx
        with httpx.Client(timeout=3) as client:
            resp = client.get("http://localhost:11434/api/tags")
            if resp.status_code == 200:
                fn = _build_ollama_callable("qwen2.5:7b")
                register_llm(fn)
                logger.info("LLM provider: Ollama (qwen2.5:7b)")
                return
    except Exception as exc:
        logger.debug("Ollama not available: %s", exc)

    # 3. Mock — last resort
    register_llm(create_mock_provider())
    logger.warning("LLM provider: MOCK (rule-based fallback only)")


def get_available_models() -> list[dict]:
    """Return available models for the frontend model selector."""
    models = [
        {"id": "qwen-turbo", "name": "Qwen Turbo", "description": "最快，适合游戏实时交互"},
        {"id": "qwen-plus", "name": "Qwen Plus", "description": "平衡速度与质量（默认）"},
        {"id": "qwen-max", "name": "Qwen Max", "description": "最强推理能力，较慢"},
    ]
    return models
