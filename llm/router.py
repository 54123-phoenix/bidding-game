"""Task-aware model routing for LLM calls.

Explicit model overrides still win. When callers provide only a task type,
this module chooses a sensible default model for latency/quality trade-offs.
"""

from __future__ import annotations

import os
from typing import Literal


LLMTaskType = Literal[
    "parse",
    "realtime",
    "deliberation",
    "debrief",
    "belief",
    "quality",
]


DEFAULT_TASK_MODELS: dict[str, str] = {
    "parse": "qwen-turbo",
    "realtime": "qwen-turbo",
    "deliberation": "qwen-turbo",
    "debrief": "qwen-turbo",
    "belief": "qwen-turbo",
    "quality": "qwen-plus",
}


def resolve_model(model: str | None = None, task_type: str | None = None) -> str | None:
    """Resolve the model for a call.

    Priority:
    1. Explicit call-site model
    2. LLM_MODEL_<TASK_TYPE>
    3. Built-in task default
    4. Global LLM_MODEL / provider default
    """
    if model:
        return model

    if task_type:
        env_key = f"LLM_MODEL_{task_type.upper()}"
        env_model = os.getenv(env_key)
        if env_model:
            return env_model
        if task_type in DEFAULT_TASK_MODELS:
            return DEFAULT_TASK_MODELS[task_type]

    return os.getenv("LLM_MODEL") or None
