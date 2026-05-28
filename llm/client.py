"""LLM client layer — all game agents call LLM through this module.

Ported from ai-career-intelligence backend/shared/llm_client.py.
Extended with belief_estimator interface for Bayesian game.
"""

from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import Callable, Generator
from llm.router import resolve_model

logger = logging.getLogger("llm.client")

_llm_callable: Callable[[str], str] | None = None
_chat_callable: Callable[[list[dict[str, str]], float], str] | None = None
_chat_stream_callable: Callable[[list[dict[str, str]], float], Generator[str, None, None]] | None = None


def register_llm(fn: Callable[[str], str]) -> None:
    global _llm_callable
    _llm_callable = fn
    logger.info("LLM single-prompt provider registered: %s", getattr(fn, "__name__", fn.__class__.__name__))


def register_chat_llm(fn: Callable[[list[dict[str, str]], float], str]) -> None:
    global _chat_callable
    _chat_callable = fn
    logger.info("LLM chat provider registered: %s", getattr(fn, "__name__", fn.__class__.__name__))


def register_chat_stream_llm(fn: Callable[[list[dict[str, str]], float], Generator[str, None, None]]) -> None:
    global _chat_stream_callable
    _chat_stream_callable = fn
    logger.info("LLM chat stream provider registered: %s", getattr(fn, "__name__", fn.__class__.__name__))


async def call_llm(
    prompt: str,
    *,
    temperature: float = 0.3,
    max_retries: int = 2,
    model: str | None = None,
    task_type: str | None = None,
) -> str:
    """Call LLM with a single prompt string. Non-blocking — runs in thread pool."""
    if _llm_callable is None:
        raise RuntimeError("LLM not registered. Call register_llm() first.")

    last_exc: Exception | None = None
    for attempt in range(max_retries + 1):
        try:
            return await asyncio.wait_for(
                asyncio.to_thread(_llm_callable, prompt, resolve_model(model, task_type)),
                timeout=90,
            )
        except asyncio.TimeoutError:
            last_exc = TimeoutError(f"LLM call timed out after 90s (attempt {attempt + 1})")
            logger.warning("LLM call attempt %d/%d timed out after 90s", attempt + 1, max_retries + 1)
        except Exception as exc:
            last_exc = exc
            logger.warning("LLM call attempt %d/%d failed: %s", attempt + 1, max_retries + 1, exc)
        if attempt < max_retries:
            await asyncio.sleep(0.5 * (attempt + 1))
    raise RuntimeError(f"LLM call failed after {max_retries + 1} attempts") from last_exc


async def call_llm_chat(
    messages: list[dict[str, str]],
    *,
    temperature: float = 0.3,
    max_retries: int = 2,
    response_format: dict | None = None,
    model: str | None = None,
    task_type: str | None = None,
) -> str:
    """Chat-style LLM call. Prefers chat provider, falls back to single-prompt."""
    if _chat_callable is not None:
        resolved_model = resolve_model(model, task_type)
        last_exc: Exception | None = None
        for attempt in range(max_retries + 1):
            try:
                return await asyncio.wait_for(
                    asyncio.to_thread(_chat_callable, messages, temperature, resolved_model),
                    timeout=90,
                )
            except asyncio.TimeoutError:
                last_exc = TimeoutError(f"LLM chat timed out after 90s (attempt {attempt + 1})")
                logger.warning("LLM chat attempt %d/%d timed out after 90s", attempt + 1, max_retries + 1)
            except Exception as exc:
                last_exc = exc
                logger.warning("LLM chat attempt %d/%d failed: %s", attempt + 1, max_retries + 1, exc)
            if attempt < max_retries:
                await asyncio.sleep(0.5 * (attempt + 1))
        raise RuntimeError(f"LLM chat failed after {max_retries + 1} attempts") from last_exc

    # Fallback: flatten messages into a single prompt
    if _llm_callable is not None:
        prompt_parts = [f"[{m.get('role', 'user')}]: {m.get('content', '')}" for m in messages]
        flat = "\n\n".join(prompt_parts)
        if response_format:
            flat += f"\n\nRespond ONLY with valid JSON conforming to: {json.dumps(response_format)}"
        return await call_llm(flat, temperature=temperature, max_retries=max_retries, model=model, task_type=task_type)

    raise RuntimeError("No LLM provider registered.")


async def call_llm_chat_stream(
    messages: list[dict[str, str]],
    *,
    temperature: float = 0.3,
    model: str | None = None,
    task_type: str | None = None,
):
    """Real SSE streaming chat — yields text chunks as they arrive."""
    if _chat_stream_callable is None:
        answer = await call_llm_chat(messages, temperature=temperature, max_retries=1, model=model, task_type=task_type)
        yield answer
        return

    loop = asyncio.get_event_loop()
    queue: asyncio.Queue[str | None] = asyncio.Queue()

    resolved_model = resolve_model(model, task_type)

    def _run():
        try:
            for chunk in _chat_stream_callable(messages, temperature, resolved_model):
                loop.call_soon_threadsafe(queue.put_nowait, chunk)
        except Exception:
            pass
        finally:
            loop.call_soon_threadsafe(queue.put_nowait, None)

    loop.run_in_executor(None, _run)

    while True:
        chunk = await queue.get()
        if chunk is None:
            break
        yield chunk


def is_llm_available() -> bool:
    return _llm_callable is not None or _chat_callable is not None


# ═══════════════════════════════════════════════════════════════════════════════
# Belief Estimator (new — for Bayesian game opponent modeling)
# ═══════════════════════════════════════════════════════════════════════════════


async def estimate_opponent_type(
    player_role: str,
    opponent_role: str,
    observed_actions: list[dict],
    context: dict,
) -> dict:
    """Use LLM to update beliefs about an opponent's private type.

    Given the history of observed actions and context, estimate the probability
    distribution over the opponent's possible types.

    Args:
        player_role: "candidate" | "hr" | "interviewer" — who is doing the inferring
        opponent_role: "candidate" | "hr" | "interviewer" | "market" — who they're inferring about
        observed_actions: List of actions observed so far
        context: Game context (job, resume, market signals, etc.)

    Returns:
        {"type_distribution": {...}, "reasoning": "...", "confidence": 0.0-1.0}
    """
    if not is_llm_available():
        return _rule_based_type_estimate(player_role, opponent_role, observed_actions, context)

    messages = _build_belief_prompt(player_role, opponent_role, observed_actions, context)

    try:
        raw = await call_llm_chat(messages, temperature=0.3, max_retries=2, task_type="belief")
        parsed = _parse_json_response(raw)
        return {
            "type_distribution": parsed.get("type_distribution", {}),
            "reasoning": parsed.get("reasoning", ""),
            "confidence": float(parsed.get("confidence", 0.5)),
        }
    except Exception:
        return _rule_based_type_estimate(player_role, opponent_role, observed_actions, context)


def _build_belief_prompt(
    player_role: str, opponent_role: str, observed_actions: list[dict], context: dict
) -> list[dict[str, str]]:
    """Build the LLM prompt for opponent type inference."""
    action_history = "\n".join(
        f"Round {a.get('round', '?')}: {a.get('action_type', '?')} — {a.get('reasoning', '')[:200]}"
        for a in observed_actions[-5:]
    )

    return [
        {
            "role": "system",
            "content": (
                "You are a Bayesian game theorist. Given observed actions in a hiring negotiation, "
                "infer the most likely private type of the opponent. "
                "Consider: budget constraints, urgency, outside options, skill level, risk tolerance.\n"
                "Respond ONLY with valid JSON: "
                '{"type_distribution": {"type1": probability, ...}, '
                '"reasoning": "<Chinese>", "confidence": <0.0-1.0>}'
            ),
        },
        {
            "role": "user",
            "content": f"""## Your Role
You are the **{player_role}** trying to infer the **{opponent_role}'s** private type.

## Observed Actions
{action_history if action_history else 'No actions yet — this is the prior.'}

## Context
{json.dumps(context, ensure_ascii=False, indent=2)[:2000]}

## Task
Based on the observed actions, estimate the probability distribution over the {opponent_role}'s possible types.
Update your beliefs: what type of {opponent_role} would have taken these actions?""",
        },
    ]


def _rule_based_type_estimate(
    player_role: str, opponent_role: str, observed_actions: list[dict], context: dict
) -> dict:
    """Simple heuristic for opponent type inference when LLM is unavailable."""
    # Default uniform prior
    if opponent_role == "hr":
        return {
            "type_distribution": {"high_budget": 0.33, "medium_budget": 0.34, "low_budget": 0.33},
            "reasoning": "Uniform prior — no LLM available for inference.",
            "confidence": 0.3,
        }
    elif opponent_role == "candidate":
        return {
            "type_distribution": {"strong": 0.33, "average": 0.34, "weak": 0.33},
            "reasoning": "Uniform prior — no LLM available for inference.",
            "confidence": 0.3,
        }
    return {
        "type_distribution": {"default": 1.0},
        "reasoning": "Default prior.",
        "confidence": 0.3,
    }


def _parse_json_response(raw: str) -> dict:
    """Extract JSON from LLM output, tolerating markdown fences."""
    raw = raw.strip()
    if "```json" in raw:
        raw = raw.split("```json")[1].split("```")[0].strip()
    elif "```" in raw:
        raw = raw.split("```")[1].split("```")[0].strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        import re
        m = re.search(r'\{.*\}', raw, re.DOTALL)
        if m:
            return json.loads(m.group(0))
        return {}
