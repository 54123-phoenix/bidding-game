"""Tests for task-aware LLM model routing."""

from __future__ import annotations

from llm.router import resolve_model


def test_explicit_model_wins(monkeypatch):
    monkeypatch.setenv("LLM_MODEL_PARSE", "custom-parse")
    assert resolve_model("manual-model", "parse") == "manual-model"


def test_task_env_override_wins_over_default(monkeypatch):
    monkeypatch.setenv("LLM_MODEL_PARSE", "custom-parse")
    assert resolve_model(task_type="parse") == "custom-parse"


def test_task_default_used_without_env(monkeypatch):
    monkeypatch.delenv("LLM_MODEL_REALTIME", raising=False)
    assert resolve_model(task_type="realtime") == "qwen-turbo"


def test_global_model_used_for_unknown_task(monkeypatch):
    monkeypatch.setenv("LLM_MODEL", "global-model")
    assert resolve_model(task_type="unknown") == "global-model"
