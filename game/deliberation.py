"""Adversarial Deliberation Engine — the thinking layer behind every agent action.

Every agent action is now the output of a two-phase deliberation process:
  Phase 1: Analyze — situation, options, opponent projection, future projection
  Phase 2: Decide — select the best option based on the analysis

The deliberation result is attached to every AgentAction so the frontend
can render the agent's internal reasoning as part of the game experience.

Two dimensions of projection:
  Dimension 1 — Adversarial: "If I do X, how will the opponent respond?"
  Dimension 2 — Future Self:  "If I choose this path, what does my career look like in 2 years?"
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from typing import Any


# ═══════════════════════════════════════════════════════════════════════════════
# Data Structures
# ═══════════════════════════════════════════════════════════════════════════════


@dataclass
class DeliberationOption:
    """A single candidate action the agent is considering."""
    action_type: str          # "offer" | "counter_offer" | "accept" | "reject" | "signal"
    params: dict = field(default_factory=dict)
    label: str = ""           # Human-readable label, e.g. "要价 82K（激进）"


@dataclass
class ProjectedResponse:
    """Predicted opponent response to a candidate action (Dimension 1)."""
    opponent_action_type: str
    opponent_params: dict = field(default_factory=dict)
    probability: float = 0.5
    reasoning: str = ""       # Why the opponent would respond this way


@dataclass
class FutureProjection:
    """Long-term career projection for a given choice (Dimension 2)."""
    promotion_timeline: str = ""
    expected_salary_trajectory: str = ""
    skill_acquisition_value: str = ""
    exit_value_2yr: str = ""
    opportunity_cost: str = ""
    risk_of_overpay: str = ""


@dataclass
class EvaluatedOption:
    """A fully evaluated option with both projection dimensions."""
    option: DeliberationOption
    opponent_projections: list[ProjectedResponse] = field(default_factory=list)
    future_projection: FutureProjection | None = None
    expected_utility: float = 0.5
    risk_level: str = "medium"    # "low" | "medium" | "high"
    best_case: str = ""
    worst_case: str = ""


@dataclass
class DeliberationResult:
    """The complete output of a deliberation cycle."""
    situation_assessment: str = ""
    beliefs_summary: str = ""
    evaluated_options: list[EvaluatedOption] = field(default_factory=list)
    selected_index: int = 0
    confidence: float = 0.5


# ═══════════════════════════════════════════════════════════════════════════════
# Deliberation Cache — avoids repeated LLM calls for identical inputs
# ═══════════════════════════════════════════════════════════════════════════════

_deliberation_cache: dict[tuple, DeliberationResult] = {}
_MAX_CACHE_SIZE = 200


def _cache_key(
    agent_role: str,
    state: Any,
    private_view: dict,
    persona: Any | None,
    model: str | None,
) -> tuple:
    """Build a hashable cache key from the deliberation inputs.

    Intentionally coarse: same agent, same round, same offer, same budget
    → same decision. Different resumes or jobs are handled by their levels
    and salary ranges, not full text.
    """
    pv = private_view.get("private") or {}
    pub = private_view.get("public") or {}
    return (
        agent_role,
        state.round,
        state.public_offer,
        state.public_status,
        getattr(state.job, "level", "") if hasattr(state, "job") else "",
        getattr(state.job, "company", "") if hasattr(state, "job") else "",
        getattr(state, "market_adjustment", 1.0),
        getattr(state, "competition_intensity", 0.5),
        getattr(persona, "archetype", "") if persona else "",
        model or "",
        # Key private-type fields that actually change decisions
        pv.get("true_budget", 0) if isinstance(pv, dict) else 0,
        round(pv.get("urgency", 0.5), 2) if isinstance(pv, dict) else 0.5,
        pv.get("reservation_wage", 0) if isinstance(pv, dict) else 0,
        pub.get("offer", 0) if isinstance(pub, dict) else 0,
    )


def _get_cached(key: tuple) -> DeliberationResult | None:
    return _deliberation_cache.get(key)


def _set_cached(key: tuple, result: DeliberationResult) -> None:
    if len(_deliberation_cache) >= _MAX_CACHE_SIZE:
        # Evict oldest ~25% — simple FIFO via pop of arbitrary key
        for _ in range(_MAX_CACHE_SIZE // 4):
            if _deliberation_cache:
                _deliberation_cache.pop(next(iter(_deliberation_cache)))
    _deliberation_cache[key] = result


# ═══════════════════════════════════════════════════════════════════════════════
# Top-Level Deliberation Orchestrator
# ═══════════════════════════════════════════════════════════════════════════════


async def deliberate(
    agent_role: str,
    state: Any,                # GameState
    private_view: dict,
    persona: Any | None = None,  # HRPersona (only for HR agent)
    model: str | None = None,    # LLM model override
) -> DeliberationResult:
    """Run a full two-phase deliberation for the given agent.

    Cached: identical inputs return instantly without LLM round-trip.
    Tries LLM-based deliberation first; falls back to rule-based on failure.
    """
    key = _cache_key(agent_role, state, private_view, persona, model)
    cached = _get_cached(key)
    if cached is not None:
        return cached

    from llm.client import is_llm_available

    if is_llm_available():
        try:
            result = await _deliberate_llm(agent_role, state, private_view, persona, model=model)
            if result is not None and result.evaluated_options:
                _set_cached(key, result)
                return result
        except Exception:
            pass

    result = _deliberate_rules(agent_role, state, private_view, persona)
    _set_cached(key, result)
    return result


# ═══════════════════════════════════════════════════════════════════════════════
# LLM Deliberation (two-phase)
# ═══════════════════════════════════════════════════════════════════════════════


async def _deliberate_llm(
    agent_role: str,
    state: Any,
    private_view: dict,
    persona: Any | None = None,
    model: str | None = None,
) -> DeliberationResult | None:
    """Single-call LLM deliberation: analyze + decide in one shot.

    Previously two-phase (analyze → decide) with 2 separate LLM calls.
    Now merged into one call to cut round-trip latency by ~50%.
    """
    from llm.client import call_llm_chat

    messages = _build_phase1_prompt(agent_role, state, private_view, persona)

    # Append decision requirement so LLM outputs analysis + final decision in one go
    decision_instruction = (
        "\n\n在完成上述分析后，你必须在输出末尾附加一个最终决策（JSON格式，不要markdown代码块）：\n"
        '{"action": "accept|counter_offer|offer|reject|signal", '
        '"salary_amount": <int or null>, '
        '"reasoning": "<基于分析选择最优行动的理由>", '
        '"confidence": <0.0-1.0>}'
    )
    messages[0]["content"] += decision_instruction

    raw = await call_llm_chat(messages, temperature=0.3, max_retries=2, model=model, task_type="deliberation")
    if not raw:
        return None

    # Parse structured output
    options_data = _extract_options_from_text(raw)
    decision_data = _parse_json_response(raw)

    if not options_data:
        return None

    # Build DeliberationResult
    evaluated = []
    for i, opt_data in enumerate(options_data):
        evaluated.append(EvaluatedOption(
            option=DeliberationOption(
                action_type=opt_data.get("action", "counter_offer"),
                params={k: v for k, v in opt_data.items() if k not in ("action", "label")},
                label=opt_data.get("label", f"Option {i+1}"),
            ),
            opponent_projections=_parse_projections(opt_data.get("opponent_projections", [])),
            expected_utility=float(opt_data.get("expected_utility", 0.5)),
            risk_level=opt_data.get("risk_level", "medium"),
            best_case=opt_data.get("best_case", ""),
            worst_case=opt_data.get("worst_case", ""),
            future_projection=FutureProjection(
                promotion_timeline=opt_data.get("promotion_timeline", ""),
                expected_salary_trajectory=opt_data.get("salary_trajectory", ""),
                skill_acquisition_value=opt_data.get("skill_acquisition", ""),
                exit_value_2yr=opt_data.get("exit_value", ""),
                opportunity_cost=opt_data.get("opportunity_cost", ""),
                risk_of_overpay=opt_data.get("risk_of_overpay", ""),
            ) if opt_data.get("promotion_timeline") else None,
        ))

    # Sort by expected utility descending
    evaluated.sort(key=lambda o: -o.expected_utility)

    # Determine selected index from Phase 2 decision
    selected_action = decision_data.get("action", "counter_offer")
    selected_salary = decision_data.get("salary_amount")

    selected_index = 0
    for i, opt in enumerate(evaluated):
        if opt.option.action_type == selected_action:
            opt_salary = opt.option.params.get("salary_amount") or opt.option.params.get("salary_offer")
            if selected_salary is None or opt_salary == selected_salary or abs((opt_salary or 0) - (selected_salary or 0)) <= 5:
                selected_index = i
                break

    # Extract situation assessment from raw text (first 3 paragraphs)
    paragraphs = [p.strip() for p in raw.split("\n\n") if p.strip()]
    situation = paragraphs[0] if paragraphs else ""
    beliefs_part = paragraphs[1] if len(paragraphs) > 1 else ""

    return DeliberationResult(
        situation_assessment=situation,
        beliefs_summary=beliefs_part,
        evaluated_options=evaluated,
        selected_index=selected_index,
        confidence=float(decision_data.get("confidence", 0.6)),
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Streaming Deliberation (SSE — real-time thinking display)
# ═══════════════════════════════════════════════════════════════════════════════


async def deliberate_stream(
    agent_role: str,
    state: Any,
    private_view: dict,
    persona: Any | None = None,
    model: str | None = None,
):
    """Stream the deliberation process as SSE events.

    Single-call design: analysis + decision in one LLM call, halving latency.
    The decision is auto-selected from the top-ranked option by expected_utility.

    Yields dicts representing SSE events:
      {"type": "phase", "phase": "analyze"|"decide"}
      {"type": "chunk", "text": "..."}
      {"type": "options", "options": [...]}
      {"type": "done", "result": {...}}
      {"type": "error", "message": "..."}
    """
    from llm.client import call_llm_chat_stream, is_llm_available

    if not is_llm_available():
        result = _deliberate_rules(agent_role, state, private_view, persona)
        yield {"type": "done", "result": deliberation_to_dict(result)}
        return

    try:
        # ── Build combined prompt (analysis + decision in one call) ──
        messages = _build_phase1_prompt(agent_role, state, private_view, persona)
        decision_instruction = (
            "\n\n在完成上述分析后，输出最终决策（JSON格式）：\n"
            '{"action": "accept|counter_offer|offer|reject|signal", '
            '"salary_amount": <int>, '
            '"reasoning": "<选择理由>", '
            '"confidence": <0.0-1.0>}'
        )
        messages[0]["content"] += decision_instruction

        yield {"type": "phase", "phase": "analyze"}

        raw = ""
        async for chunk in call_llm_chat_stream(messages, temperature=0.4, model=model, task_type="realtime"):
            raw += chunk
            yield {"type": "chunk", "text": chunk}

        if not raw.strip():
            yield {"type": "error", "message": "LLM未产生输出"}
            result = _deliberate_rules(agent_role, state, private_view, persona)
            yield {"type": "done", "result": deliberation_to_dict(result)}
            return

        # Parse options and decision from the single response
        options_data = _extract_options_from_text(raw)
        decision_data = _parse_json_response(raw)

        if options_data:
            simplified_options = []
            for opt in options_data:
                simplified_options.append({
                    "action": opt.get("action", "counter_offer"),
                    "salary": opt.get("salary_amount") or opt.get("salary_offer"),
                    "label": opt.get("label", ""),
                    "expected_utility": opt.get("expected_utility", 0.5),
                    "risk_level": opt.get("risk_level", "medium"),
                    "best_case": opt.get("best_case", ""),
                    "worst_case": opt.get("worst_case", ""),
                })
            yield {"type": "options", "options": simplified_options}

        # Brief "decide" phase — picked from options (no second LLM call)
        yield {"type": "phase", "phase": "decide"}

        if options_data:
            evaluated = []
            for i, opt_data in enumerate(options_data):
                evaluated.append(EvaluatedOption(
                    option=DeliberationOption(
                        action_type=opt_data.get("action", "counter_offer"),
                        params={k: v for k, v in opt_data.items() if k not in ("action", "label")},
                        label=opt_data.get("label", f"Option {i+1}"),
                    ),
                    opponent_projections=_parse_projections(opt_data.get("opponent_projections", [])),
                    expected_utility=float(opt_data.get("expected_utility", 0.5)),
                    risk_level=opt_data.get("risk_level", "medium"),
                    best_case=opt_data.get("best_case", ""),
                    worst_case=opt_data.get("worst_case", ""),
                    future_projection=FutureProjection(
                        promotion_timeline=opt_data.get("promotion_timeline", ""),
                        expected_salary_trajectory=opt_data.get("salary_trajectory", ""),
                        skill_acquisition_value=opt_data.get("skill_acquisition", ""),
                        exit_value_2yr=opt_data.get("exit_value", ""),
                        opportunity_cost=opt_data.get("opportunity_cost", ""),
                        risk_of_overpay=opt_data.get("risk_of_overpay", ""),
                    ) if opt_data.get("promotion_timeline") else None,
                ))
            evaluated.sort(key=lambda o: -o.expected_utility)

            # Select top-ranked option (or match with decision data if available)
            selected_action = decision_data.get("action") if decision_data else None
            selected_salary = decision_data.get("salary_amount") if decision_data else None
            selected_index = 0
            if selected_action:
                for i, opt in enumerate(evaluated):
                    if opt.option.action_type == selected_action:
                        opt_salary = opt.option.params.get("salary_amount") or opt.option.params.get("salary_offer")
                        if selected_salary is None or opt_salary == selected_salary or abs((opt_salary or 0) - (selected_salary or 0)) <= 5:
                            selected_index = i
                            break

            paragraphs = [p.strip() for p in raw.split("\n\n") if p.strip()]
            situation = paragraphs[0] if paragraphs else ""
            beliefs_part = paragraphs[1] if len(paragraphs) > 1 else ""

            result = DeliberationResult(
                situation_assessment=situation,
                beliefs_summary=beliefs_part,
                evaluated_options=evaluated,
                selected_index=selected_index,
                confidence=float(decision_data.get("confidence", 0.6)) if decision_data else 0.6,
            )
        else:
            result = _deliberate_rules(agent_role, state, private_view, persona)

        yield {"type": "done", "result": deliberation_to_dict(result)}

    except Exception as exc:
        logger = __import__("logging").getLogger("game.deliberation")
        logger.warning("Streaming deliberation failed: %s", exc)
        result = _deliberate_rules(agent_role, state, private_view, persona)
        yield {"type": "error", "message": str(exc)}
        yield {"type": "done", "result": deliberation_to_dict(result)}


# ═══════════════════════════════════════════════════════════════════════════════
# Rule-Based Deliberation (fallback — deterministic)
# ═══════════════════════════════════════════════════════════════════════════════


def _deliberate_rules(
    agent_role: str,
    state: Any,
    private_view: dict,
    persona: Any | None = None,
) -> DeliberationResult:
    """Deterministic rule-based deliberation when LLM is unavailable."""
    options = _generate_options_rules(agent_role, state, private_view)

    evaluated = []
    for opt in options:
        evaluated.append(EvaluatedOption(
            option=opt,
            expected_utility=0.5,
            risk_level="medium",
            best_case="达成协议",
            worst_case="谈判破裂",
        ))

    return DeliberationResult(
        situation_assessment=f"第{state.round + 1}轮谈判。当前报价{state.public_offer or '无'}K。",
        beliefs_summary="使用规则推演（LLM不可用）",
        evaluated_options=evaluated,
        selected_index=0,
        confidence=0.4,
    )


def _generate_options_rules(agent_role: str, state: Any, private_view: dict) -> list[DeliberationOption]:
    """Generate reasonable default options based on current state."""
    offer = state.public_offer or 0

    if agent_role == "candidate":
        reserve = private_view.get("private", {}).get("reservation_wage", 30)
        options = [
            DeliberationOption(action_type="accept", label=f"接受报价 {offer}K"),
        ]
        if offer < reserve * 1.3 and offer > 0:
            target = max(offer + 5, int(offer * 1.08))
            options.append(DeliberationOption(
                action_type="counter_offer",
                params={"salary_amount": (target // 5) * 5},
                label=f"要价 {(target // 5) * 5}K（小幅还价）",
            ))
            target2 = max(offer + 12, int(offer * 1.15))
            options.append(DeliberationOption(
                action_type="counter_offer",
                params={"salary_amount": (target2 // 5) * 5},
                label=f"要价 {(target2 // 5) * 5}K（进取还价）",
            ))
        elif offer == 0:
            target = max(reserve + 10, int(offer * 1.15)) if offer else (reserve + 10)
            options = [
                DeliberationOption(
                    action_type="offer",
                    params={"salary_amount": (target // 5) * 5},
                    label=f"开价 {(target // 5) * 5}K",
                ),
            ]
        options.append(DeliberationOption(action_type="reject", label="拒绝报价，退出谈判"))
        return options

    elif agent_role == "hr":
        pt = state.hr_type if state else None
        budget = pt.true_budget if pt else 50
        options = [
            DeliberationOption(
                action_type="counter_offer",
                params={"salary_offer": int(budget * 0.78)},
                label=f"还价 {int(budget * 0.78)}K",
            ),
            DeliberationOption(
                action_type="counter_offer",
                params={"salary_offer": int(budget * 0.88)},
                label=f"还价 {int(budget * 0.88)}K（让步）",
            ),
        ]
        if offer > 0 and offer <= budget:
            options.insert(0, DeliberationOption(
                action_type="accept", label=f"接受候选人要价 {offer}K",
            ))
        options.append(DeliberationOption(action_type="reject", label="拒绝，退出谈判"))
        return options

    elif agent_role == "market":
        return [
            DeliberationOption(action_type="signal", label="发布市场信号",
                               params={"signal_type": "update"}),
        ]

    elif agent_role == "interviewer":
        return [
            DeliberationOption(action_type="evaluate", label="评估候选人"),
        ]

    return [DeliberationOption(action_type="wait", label="等待")]


# ═══════════════════════════════════════════════════════════════════════════════
# Prompt Builders
# ═══════════════════════════════════════════════════════════════════════════════


def _build_phase1_prompt(
    agent_role: str,
    state: Any,
    private_view: dict,
    persona: Any | None = None,
) -> list[dict[str, str]]:
    """Build Phase 1 (analysis) messages for the given agent role."""
    if agent_role == "candidate":
        return _candidate_phase1(state, private_view)
    elif agent_role == "hr":
        return _hr_phase1(state, private_view, persona)
    elif agent_role == "interviewer":
        return _interviewer_phase1(state, private_view)
    elif agent_role == "market":
        return _market_phase1(state, private_view)
    return [{"role": "system", "content": "Analyze the situation."}]


def _build_phase2_prompt(
    agent_role: str,
    phase1_output: str,
    state: Any,
    private_view: dict,
) -> list[dict[str, str]]:
    """Build Phase 2 (decision) messages."""
    return [
        {
            "role": "system",
            "content": (
                "你是一个谈判 Agent。你的分析已经完成了，现在需要做出最终决策。"
                "基于你的分析选择最优行动。你的 reasoning 必须引用你在 Phase 1 中的具体分析。"
                "Respond ONLY with valid JSON: "
                '{"action": "accept|counter_offer|offer|reject|signal", '
                '"salary_amount": <int, in K/yr>, '
                '"reasoning": "<引用你的分析，说明为什么选这个>", '
                '"confidence": <0.0-1.0>}'
            ),
        },
        {
            "role": "user",
            "content": f"""## 你的完整分析
{phase1_output}

## 当前状态回顾
第{state.round + 1}轮，当前报价{state.public_offer}K

## 决策
基于你的分析，选择最优行动。""",
        },
    ]


# ═══════════════════════════════════════════════════════════════════════════════
# Candidate Phase 1 Prompt
# ═══════════════════════════════════════════════════════════════════════════════


def _candidate_phase1(state: Any, private_view: dict) -> list[dict[str, str]]:
    priv = private_view.get("private", {})
    pub = private_view.get("public", {})
    beliefs = private_view.get("beliefs", {})

    true_ability = priv.get("true_ability", 0.7)
    reservation_wage = priv.get("reservation_wage", 30)
    outside_options = priv.get("outside_options", [])
    career_ambition = priv.get("career_ambition", 0.5)
    offer = pub.get("offer") or state.public_offer or 0
    job_title = pub.get("job_title", state.job.title)
    job_company = pub.get("job_company", state.job.company)
    salary_range = pub.get("salary_range") or (state.job.salary_range or [0, 0])
    job_level = pub.get("level") or state.job.level

    # Compute total years
    from datetime import date as _date
    total_years = 0.0
    for exp in state.resume.experience:
        if exp.start_date:
            end = exp.end_date or _date.today()
            total_years += (end - exp.start_date).days / 365.0

    # Company tier
    company_tt = "一线大厂"
    for exp in state.resume.experience:
        c = exp.company.lower()
        if any(kw in c for kw in ("阿里", "字节", "腾讯", "百度", "google", "amazon", "microsoft")):
            company_tt = "T1大厂"
            break

    # School tier
    school_tier = "普通"
    for edu in state.resume.education:
        s = edu.school.lower()
        if any(kw in s for kw in ("清华", "北大", "浙大", "上交", "复旦", "中科大", "南大", "哈工大", "西安交大")):
            school_tier = "C9"
            break
        elif any(kw in s for kw in ("985",)):
            school_tier = "985"
        elif any(kw in s for kw in ("211",)):
            if school_tier == "普通":
                school_tier = "211"

    # Promotion cycle
    from core.china_market_model import LEVEL_YEARS
    expected_years = LEVEL_YEARS.get(job_level, 3)

    # Market
    market_label = (
        "候选人市场（对你有利）" if getattr(state, "market_adjustment", 1.0) > 1.05
        else "雇主市场（对企业有利）" if getattr(state, "market_adjustment", 1.0) < 0.95
        else "供需平衡"
    )

    # Interviewer recommendation
    interviewer_rec = "待评估"
    for a in reversed(state.action_history):
        if a.player == "interviewer":
            rec = a.params.get("recommendation", "")
            mapping = {"strong_hire": "强烈推荐", "hire": "推荐录用", "weak_hire": "勉强推荐", "no_hire": "不推荐"}
            interviewer_rec = mapping.get(rec, rec)
            break

    # Belief distribution
    hr_belief = beliefs.get("hr", {})
    belief_dist = hr_belief.get("belief_distribution", {}) if isinstance(hr_belief, dict) else {}
    p_hh = belief_dist.get("high_budget_low_urgency", 0.25)
    p_hl = belief_dist.get("high_budget_high_urgency", 0.25)
    p_lh = belief_dist.get("low_budget_low_urgency", 0.25)
    p_ll = belief_dist.get("low_budget_high_urgency", 0.25)
    total_b = p_hh + p_hl + p_lh + p_ll
    if total_b > 0:
        p_hh = int(p_hh / total_b * 100)
        p_hl = int(p_hl / total_b * 100)
        p_lh = int(p_lh / total_b * 100)
        p_ll = int(p_ll / total_b * 100)
    else:
        p_hh = p_hl = p_lh = p_ll = 25

    # History
    last_actions = []
    for a in state.action_history[-3:]:
        action_zh = {"accept": "接受", "reject": "拒绝", "offer": "出价", "counter_offer": "还价", "evaluate": "评估", "signal": "信号"}
        player_zh = {"candidate": "你", "hr": "HR", "interviewer": "面试官", "market": "市场"}
        salary = a.params.get("salary_offer") or a.params.get("salary_ask") or a.params.get("salary_amount", "")
        salary_str = f" {salary}K" if salary else ""
        last_actions.append(
            f"第{a.round + 1}轮 {player_zh.get(a.player, a.player)}：{action_zh.get(a.action_type, a.action_type)}{salary_str} — {a.reasoning[:120]}"
        )

    # Next level
    level_nums = {"P5": "P6", "P6": "P7", "P7": "P8", "P8": "P9", "P9": "P10"}
    next_level = level_nums.get(job_level, "下一级")

    system_content = (
        "你是候选人，正在薪资谈判。简洁分析局势，直接给出行动选项。"
        "最后用 <OPTIONS>...</OPTIONS> 包裹JSON数组格式的选项列表。"
    )

    user_content = f"""## 你的底牌
- 能力：{true_ability:.0%} | 底线：{reservation_wage}K/年 | 经验：{total_years:.0f}年
- 职业偏好：{career_ambition:.0%}（1.0=成长优先） | 外部机会：{json.dumps(outside_options, ensure_ascii=False) if outside_options else '无'}

## HR信念分布
高预算高紧：{p_hh}% | 高预算低紧：{p_hl}% | 低预算高紧：{p_lh}% | 低预算低紧：{p_ll}%

## 当前局面
第{state.round + 1}轮 | {job_company}（{company_tt}）{job_level} | 晋升{next_level}约{expected_years * 0.8:.1f}-{expected_years * 1.2:.1f}年
市场带：{salary_range[0]}-{salary_range[1]}K | HR报价：{offer}K | 市场：{market_label} | 面试：{interviewer_rec}

## 历史
{chr(10).join(last_actions) if last_actions else '（首轮）'}

## 分析（简洁，每项2-3句）

1. 局面：HR报价在市场带的什么位置？谈判权在谁手里？
2. 生成3-4个行动方案（含保守/折中/激进），每个给出薪资数字
3. 对抗推演：每个方案下HR（高/低预算类型）的可能回应
4. 风险：要价太高→破裂 vs 接受低薪→长期跑输，哪个更不能接受？

<OPTIONS>格式：{{"action": "counter_offer", "salary_amount": 数字, "label": "标签", "expected_utility": 0.0-1.0, "risk_level": "low/medium/high", "best_case": "", "worst_case": "", "opponent_projections": [{{"action": "accept/counter_offer/reject", "probability": 0.0-1.0, "reasoning": ""}}], "promotion_timeline": "", "salary_trajectory": "", "exit_value": "", "opportunity_cost": "", "risk_of_overpay": ""}}"""

    return [
        {"role": "system", "content": system_content},
        {"role": "user", "content": user_content},
    ]


# ═══════════════════════════════════════════════════════════════════════════════
# HR Phase 1 Prompt
# ═══════════════════════════════════════════════════════════════════════════════


def _hr_phase1(state: Any, private_view: dict, persona: Any | None = None) -> list[dict[str, str]]:
    priv = private_view.get("private", {})
    pub = private_view.get("public", {})

    true_budget = priv.get("true_budget", 80)
    urgency = priv.get("urgency", 0.5)
    equity = priv.get("internal_equity_constraint", 0)
    pool_quality = priv.get("candidate_pool_quality", 0.5)

    offer = pub.get("offer") or state.public_offer or 0
    candidate_name = pub.get("candidate_name", state.resume.name)
    candidate_skills = pub.get("candidate_skills", state.resume.skills)

    # HR beliefs about candidate
    beliefs = private_view.get("beliefs", {})
    cand_belief = beliefs.get("candidate", {})
    belief_dist = cand_belief.get("belief_distribution", {}) if isinstance(cand_belief, dict) else {}
    p_strong = int((belief_dist.get("strong_candidate", 0.33)) * 100)
    p_avg = int((belief_dist.get("average_candidate", 0.34)) * 100)
    p_weak = int((belief_dist.get("weak_candidate", 0.33)) * 100)

    # Last candidate action
    last_candidate = "（尚无）"
    for a in reversed(state.action_history):
        if a.player == "candidate":
            action_zh = {"accept": "接受", "reject": "拒绝", "offer": "开价", "counter_offer": "还价"}
            salary = a.params.get("salary_ask") or a.params.get("salary_amount", "")
            last_candidate = f"{action_zh.get(a.action_type, a.action_type)} {salary}K — {a.reasoning[:100]}"
            break

    # Market label
    market_label = "供需平衡"
    if getattr(state, "market_adjustment", 1.0) > 1.05:
        market_label = "候选人市场"
    elif getattr(state, "market_adjustment", 1.0) < 0.95:
        market_label = "雇主市场"

    # Persona section
    persona_section = ""
    if persona is not None:
        from game.persona import get_persona_deliberation_prompt
        persona_section = get_persona_deliberation_prompt(persona)

    # Patience
    hr_patience = getattr(state, "patience", None)
    patience_val = hr_patience.hr_patience if hr_patience else 0.65

    system_content = (
        "你是HR，正在进行薪资谈判。简洁分析，直接给出选项。"
        "最后用 <OPTIONS>...</OPTIONS> 包裹JSON数组格式的选项列表。"
    )

    user_content = f"""{persona_section}

## 私有信息
预算：{true_budget}K/年 | 内部公平约束：{equity}K | 紧急：{urgency:.0%}
候选人池质量：{pool_quality:.0%} | 耐心：{patience_val:.0%}

## 对候选人的信念
强：{p_strong}% | 平均：{p_avg}% | 弱：{p_weak}%

## 当前局面
第{state.round + 1}轮 | 报价：{offer}K | 市场：{market_label}
候选人行动：{last_candidate}
候选人：{candidate_name}，技能：{', '.join(candidate_skills[:8])}

## 分析（简洁完成，每项2-3句话即可）

1. 局面解读：候选人要价透露了什么信号？在预算带什么位置？
2. 生成3-4个可行行动方案，每个给出薪资数字（K/年）
3. 对每个方案，简要推演候选人可能的回应
4. 综合评分（考虑紧急度、内部公平、谈崩风险）

<OPTIONS>数组格式：{{"action": "counter_offer", "salary_amount": 数字, "label": "标签", "expected_utility": 0.0-1.0, "risk_level": "low/medium/high", "best_case": "", "worst_case": "", "opponent_projections": [{{"action": "accept/counter_offer/reject", "probability": 0.0-1.0, "reasoning": ""}}], "promotion_timeline": "", "salary_trajectory": "", "exit_value": "", "opportunity_cost": "", "risk_of_overpay": ""}}"""


    return [
        {"role": "system", "content": system_content},
        {"role": "user", "content": user_content},
    ]


# ═══════════════════════════════════════════════════════════════════════════════
# Interviewer Phase 1 Prompt
# ═══════════════════════════════════════════════════════════════════════════════


def _interviewer_phase1(state: Any, private_view: dict) -> list[dict[str, str]]:
    pub = private_view.get("public", {})
    itype = state.interviewer_type

    system_content = (
        "你是技术面试官。简洁评估候选人，用 <OPTIONS> 包裹选项。"
    )

    user_content = f"""## 候选人
技能：{', '.join(state.resume.skills[:12])}
经验：{len(state.resume.experience)}段 | 教育：{', '.join(f'{e.school} {e.degree}' for e in state.resume.education)}

## 岗位
{state.job.title} @ {state.job.company} ({state.job.level}) | 要求：{', '.join(state.job.required_skills[:10])}

## 你的风格
严格度：{itype.strictness:.0%} | 偏好：{itype.preferred_skill_style} | 风险容忍：{itype.risk_tolerance:.0%}

## 评估（简洁）
1. 评分：编码/架构/领域/软技能/潜力（0-1分）
2. 风险：技能缺口、跳槽频率
3. 推荐：strong_hire / hire / weak_hire / no_hire"""

    return [
        {"role": "system", "content": system_content},
        {"role": "user", "content": user_content},
    ]


# ═══════════════════════════════════════════════════════════════════════════════
# Market Phase 1 Prompt
# ═══════════════════════════════════════════════════════════════════════════════


def _market_phase1(state: Any, private_view: dict) -> list[dict[str, str]]:
    mt = state.market_type

    system_content = (
        "你是市场环境Agent。分析市场状态并决定释放什么信号。"
        "用 <OPTIONS> 包裹选项。"
    )

    user_content = f"""## 市场状态
供需比：{mt.supply_demand_ratio}（<1=候选人市场，>1=雇主市场）
薪资趋势：{mt.salary_trend}
热门技能：{', '.join(mt.hot_skills[:5]) if mt.hot_skills else '无'}
行业增速：{mt.industry_growth:.0%}

## 谈判进展
第{state.round + 1}轮 | 报价：{state.public_offer}K | 状态：{state.public_status}

## 分析与决策
1. 当前节奏适合什么信号？
2. 僵持→'竞争加剧'？接近成交→'稳定'？"""

    return [
        {"role": "system", "content": system_content},
        {"role": "user", "content": user_content},
    ]


# ═══════════════════════════════════════════════════════════════════════════════
# Parsing Utilities
# ═══════════════════════════════════════════════════════════════════════════════


def _extract_options_from_text(text: str) -> list[dict]:
    """Extract the <OPTIONS> JSON from deliberation text. Handles both array and single object."""
    m = re.search(r'<OPTIONS>\s*([\s\S]*?)\s*</OPTIONS>', text)
    if not m:
        return []
    try:
        data = json.loads(m.group(1))
        if isinstance(data, dict):
            return [data]
        if isinstance(data, list):
            return [item for item in data if isinstance(item, dict)]
        return []
    except json.JSONDecodeError:
        return []


def _parse_json_response(raw: str) -> dict:
    """Extract a JSON object from LLM output, tolerating markdown fences."""
    raw = raw.strip()
    if "```json" in raw:
        raw = raw.split("```json")[1].split("```")[0].strip()
    elif "```" in raw:
        raw = raw.split("```")[1].split("```")[0].strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        m = re.search(r'\{[\s\S]*\}', raw)
        if m:
            try:
                return json.loads(m.group(0))
            except json.JSONDecodeError:
                pass
        return {}


def _parse_projections(raw_projections: list[dict]) -> list[ProjectedResponse]:
    """Parse projection data from LLM output."""
    projections = []
    for p in raw_projections:
        projections.append(ProjectedResponse(
            opponent_action_type=p.get("action", "counter_offer"),
            probability=float(p.get("probability", 0.5)),
            reasoning=p.get("reasoning", ""),
        ))
    return projections


# ═══════════════════════════════════════════════════════════════════════════════
# Serialization (for API responses)
# ═══════════════════════════════════════════════════════════════════════════════


def deliberation_to_dict(result: DeliberationResult) -> dict:
    """Serialize a DeliberationResult to a JSON-safe dict for frontend display."""
    return {
        "situation": result.situation_assessment,
        "beliefs_summary": result.beliefs_summary,
        "options": [
            {
                "action": opt.option.action_type,
                "salary": opt.option.params.get("salary_amount")
                          or opt.option.params.get("salary_offer")
                          or opt.option.params.get("salary_ask"),
                "label": opt.option.label,
                "expected_utility": round(opt.expected_utility, 3),
                "risk_level": opt.risk_level,
                "best_case": opt.best_case,
                "worst_case": opt.worst_case,
                "opponent_projections": [
                    {
                        "action": p.opponent_action_type,
                        "probability": round(p.probability, 2),
                        "reasoning": p.reasoning,
                    }
                    for p in opt.opponent_projections
                ],
                "future": {
                    "promotion": opt.future_projection.promotion_timeline,
                    "salary_trajectory": opt.future_projection.expected_salary_trajectory,
                    "exit_value": opt.future_projection.exit_value_2yr,
                    "opportunity_cost": opt.future_projection.opportunity_cost,
                    "risk": opt.future_projection.risk_of_overpay,
                } if opt.future_projection else None,
            }
            for opt in result.evaluated_options
        ],
        "selected_index": result.selected_index,
        "confidence": round(result.confidence, 2),
    }
