"""Demo readiness checks for the Bidding Game stack.

The script is intentionally dependency-light so it can run before a demo from
the project virtualenv or system Python.
"""

from __future__ import annotations

import json
import os
import socket
import sys
import urllib.error
import urllib.request


def _get_json(url: str, timeout: float = 3.0) -> tuple[bool, dict | str]:
    try:
        with urllib.request.urlopen(url, timeout=timeout) as response:
            body = response.read().decode("utf-8", errors="replace")
            try:
                return True, json.loads(body)
            except json.JSONDecodeError:
                return True, body[:500]
    except (TimeoutError, socket.timeout, urllib.error.URLError) as exc:
        return False, str(exc)


def _check_url(name: str, url: str) -> bool:
    ok, payload = _get_json(url)
    status = "OK" if ok else "FAIL"
    print(f"[{status}] {name}: {url}")
    if isinstance(payload, dict):
        print(f"      {json.dumps(payload, ensure_ascii=False)}")
    elif payload:
        print(f"      {payload}")
    return ok


def main() -> int:
    api_base = os.getenv("API_BASE", "http://localhost:8001").rstrip("/")
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    qdrant_url = os.getenv("QDRANT_URL", "http://localhost:6333").rstrip("/")

    print("Bidding Game demo readiness")
    print(f"API_BASE={api_base}")
    print(f"FRONTEND_URL={frontend_url}")
    print(f"QDRANT_URL={qdrant_url}")
    print("")

    checks = [
        _check_url("Backend health", f"{api_base}/health"),
        _check_url("Frontend", frontend_url),
        _check_url("Qdrant health", f"{qdrant_url}/healthz"),
    ]

    llm_key = os.getenv("DASHSCOPE_API_KEY") or os.getenv("LLM_API_KEY")
    if llm_key and len(llm_key) > 10:
        print("[OK] LLM key: configured")
    else:
        print("[WARN] LLM key: not configured; deterministic/mock fallback is expected")

    if all(checks):
        print("\nReadiness: PASS")
        return 0

    print("\nReadiness: DEGRADED")
    return 1


if __name__ == "__main__":
    sys.exit(main())
