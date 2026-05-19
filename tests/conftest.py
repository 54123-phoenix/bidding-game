"""Pytest configuration — shared fixtures and setup."""

from __future__ import annotations

import pytest


@pytest.fixture(autouse=True)
def _setup_logging():
    from core.config import setup_logging
    setup_logging()
