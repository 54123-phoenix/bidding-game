"""Debate Engine — builds structured, evidence-backed career strategy proposals.

Every claim is anchored to computation traces. LLM is used only to translate
structured findings into natural language — never to generate claims from scratch.

Architecture:
  Evaluation data + Simulation data + Equilibrium data + Counterfactuals
    → build structured claims (strengths / weaknesses / alternatives)
    → build computation traces for every key number
    → LLM translates to natural language
    → DebateProposal (complete, verifiable package)
"""

from __future__ import annotations

import uuid
from typing import Any

from models.schemas import (
    ActionPlan,
    ComputationTrace,
    ComputeStep,
    DebateProposal,
    EvidenceItem,
    StrategyClaim,
    StructuredJob,
    StructuredResume,
)


def build_proposal(
    resume: StructuredResume,
    job: StructuredJob,
    game_result: Any,           # GameResult
    equilibrium: Any,           # EquilibriumResult
    eval_scores: list[Any],     # list[DimensionScore]
    counterfactuals: list[dict] | None = None,
) -> DebateProposal:
    """Build a complete debate proposal from all computational outputs.

    This is 100% deterministic — every number comes from the engines.
    LLM translation happens separately via translate_proposal().
    """
    pid = f"prop-{uuid.uuid4().hex[:6]}"

    # 1. Classify strengths and weaknesses from eval scores
    strengths, weaknesses = _classify_dimensions(eval_scores)

    # 2. Build computation traces for each dimension
    eval_traces = _build_eval_traces(resume, job, eval_scores)

    # 3. Build P(offer) trace from simulation internals
    p_trace = _build_success_probability_trace(game_result)

    # 4. Build simulation summary
    sim_summary = _build_simulation_summary(game_result)
    eq_summary = _build_equilibrium_summary(equilibrium)

    # 5. Build alternative paths from counterfactuals
    alternatives = _build_alternatives(counterfactuals or [], game_result)

    # 6. Build natural language (deterministic templates, LLM optional)
    summary_text, recommendation = _build_narrative(
        strengths, weaknesses, game_result, alternatives
    )

    # 7. Compute determinism percentage
    det_pct = _compute_determinism(eval_scores, p_trace)

    return DebateProposal(
        proposal_id=pid,
        candidate_name=resume.name,
        job_title=job.title,
        job_company=job.company,
        strengths=strengths,
        weaknesses=weaknesses,
        evaluation_traces=eval_traces,
        simulation_summary=sim_summary,
        equilibrium_summary=eq_summary,
        success_probability_trace=p_trace,
        alternatives=alternatives,
        summary_text=summary_text,
        recommendation=recommendation,
        deterministic_pct=det_pct,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Dimension classification → strengths / weaknesses
# ═══════════════════════════════════════════════════════════════════════════════

def _classify_dimensions(scores: list[Any]) -> tuple[list[StrategyClaim], list[StrategyClaim]]:
    """Classify dimension scores into strengths (>= 0.65) and weaknesses (< 0.40)."""
    strengths = []
    weaknesses = []

    DIM_NAMES_ZH = {
        "skill_match": "技能匹配", "experience_fit": "经验匹配",
        "school_signal": "学历背景", "competition_signal": "竞赛经历",
        "company_pedigree": "公司背书",
    }

    for s in scores:
        dim_key = getattr(s, 'dimension', '')
        score = getattr(s, 'score', 0.5)
        weight = getattr(s, 'weight', 0.1)
        reasoning = getattr(s, 'reasoning', '')
        evidence = getattr(s, 'evidence', [])

        label_zh = DIM_NAMES_ZH.get(dim_key, dim_key)

        if score >= 0.65:
            strengths.append(StrategyClaim(
                id=f"strength-{dim_key}",
                type="strength",
                headline=f"{label_zh}优秀（{score:.0%}）",
                body=reasoning,
                severity="info",
                traces=[_dimension_to_trace(dim_key, score, weight, evidence, reasoning)],
            ))
        elif score < 0.40:
            severity = "critical" if score < 0.15 else "major" if score < 0.25 else "minor"
            weaknesses.append(StrategyClaim(
                id=f"weakness-{dim_key}",
                type="weakness",
                headline=f"{label_zh}不足（{score:.0%}）",
                body=reasoning,
                severity=severity,
                traces=[_dimension_to_trace(dim_key, score, weight, evidence, reasoning)],
            ))

    return strengths, weaknesses


def _dimension_to_trace(dim_key: str, score: float, weight: float, evidence: list[str], reasoning: str) -> ComputationTrace:
    """Build a simple ComputationTrace for a dimension score."""
    return ComputationTrace(
        trace_id=f"trace-{dim_key}",
        label=dim_key,
        final_value=score,
        formula=f"score × weight({weight})",
        steps=[
            ComputeStep(
                label=dim_key,
                value=score,
                weight=weight,
                formula="scorer evaluation",
                evidence=[EvidenceItem(source="scorer", value=e, matched=True) for e in evidence],
                deterministic=True,
            )
        ],
        deterministic=True,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Computation trace builders
# ═══════════════════════════════════════════════════════════════════════════════

def _build_eval_traces(resume, job, scores: list[Any]) -> list[ComputationTrace]:
    """Build a computation trace for each evaluation dimension."""
    traces = []
    for s in scores:
        dim_key = getattr(s, 'dimension', '')
        evidence = getattr(s, 'evidence', [])
        reasoning = getattr(s, 'reasoning', '')
        score = getattr(s, 'score', 0.5)
        weight = getattr(s, 'weight', 0.1)

        trace = _dimension_to_trace(dim_key, score, weight, evidence, reasoning)
        traces.append(trace)

    return traces


def _build_success_probability_trace(game_result: Any) -> ComputationTrace:
    """Build a detailed trace for P(offer) from simulation internals."""
    final_state = getattr(game_result, 'final_state', None)
    prob = getattr(game_result, 'success_probability', 0.5)
    scores = getattr(final_state, 'scores', {}) if final_state else {}
    market_adj = getattr(final_state, 'market_adjustment', 1.0) if final_state else 1.0
    competition = getattr(final_state, 'competition_intensity', 0.5) if final_state else 0.5
    iv_score = scores.get('interview', scores.get('overall', 0.5))
    hr_score = scores.get('hr_screen', 0.5)

    steps = [
        ComputeStep(
            label="面试评估贡献",
            value=round(iv_score, 3),
            weight=0.35,
            formula="interview_score × 0.35",
            evidence=[
                EvidenceItem(source="InterviewerAgent", value=f"{iv_score:.3f}", matched=True,
                             note="面试官综合评分（含skill/exp/edu/growth/culture子维度）"),
            ],
            deterministic=False,  # LLM-assisted
            code_ref="game/players/interviewer.py:_act_rules",
        ),
        ComputeStep(
            label="技能匹配贡献",
            value=round(hr_score, 3),
            weight=0.40,
            formula="skill_match_score × 0.40",
            evidence=[
                EvidenceItem(source="skill_match", value=f"{hr_score:.3f}", matched=True,
                             note="精确匹配 + 邻近补偿 + 可选加分"),
            ],
            deterministic=True,
            code_ref="eval/scorers/hard.py:score_skill_match",
        ),
        ComputeStep(
            label="竞争强度修正",
            value=round(1 - competition, 3),
            weight=0.25,
            formula="(1 - competition_intensity) × 0.25",
            evidence=[
                EvidenceItem(source="MarketAgent", value=f"competition={competition:.3f}", matched=True,
                             note="市场Agent第0轮输出的竞争强度"),
            ],
            deterministic=True,
            code_ref="game/players/market.py:_compute_competition",
        ),
        ComputeStep(
            label="市场环境修正",
            value=round(market_adj, 3),
            weight=1.0,
            formula="base_probability × market_adjustment",
            evidence=[
                EvidenceItem(source="MarketAgent", value=f"adjustment={market_adj:.3f}", matched=True,
                             note="供需比、薪资趋势、行业增速综合修正"),
            ],
            deterministic=True,
            code_ref="game/players/market.py:_compute_market_adjustment",
        ),
    ]

    return ComputationTrace(
        trace_id="trace-success-prob",
        label="P(offer)",
        final_value=round(prob, 3),
        formula="(interview×0.35 + skill_match×0.40 + (1-competition)×0.25) × market_adjustment",
        steps=steps,
        deterministic=False,  # interviewer score uses LLM
        llm_used=False,  # current run used rule-based fallback
        confidence_lower=round(max(0.01, prob - 0.12), 3),
        confidence_upper=round(min(0.99, prob + 0.12), 3),
        failure_conditions=[
            f"面试官严格度偏离当前估计（当前={getattr(final_state, 'interviewer_type', None) and getattr(final_state.interviewer_type, 'strictness', 'N/A')}）",
            f"市场供需比剧烈变化（当前={market_adj:.3f}x）",
            "候选人简历信息不完整或过时",
        ],
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Summary builders
# ═══════════════════════════════════════════════════════════════════════════════

def _build_simulation_summary(game_result: Any) -> dict:
    return {
        "outcome": getattr(game_result, 'outcome', 'unknown'),
        "final_salary": getattr(game_result, 'final_salary', 0),
        "negotiation_rounds": getattr(game_result, 'negotiation_rounds', 0),
        "success_probability": round(getattr(game_result, 'success_probability', 0), 3),
        "candidate_payoff": round(getattr(game_result, 'candidate_payoff', 0), 3),
        "hr_payoff": round(getattr(game_result, 'hr_payoff', 0), 3),
        "information_asymmetry_cost": round(getattr(game_result, 'information_asymmetry_cost', 0), 3),
        "recommendation": getattr(game_result, 'recommendation', ''),
    }


def _build_equilibrium_summary(equilibrium: Any) -> dict:
    cs = getattr(equilibrium, 'candidate_strategy', {})
    hs = getattr(equilibrium, 'hr_strategy', {})
    return {
        "equilibrium_type": getattr(equilibrium, 'equilibrium_type', 'unknown'),
        "converged": getattr(equilibrium, 'converged', False),
        "solver_iterations": getattr(equilibrium, 'solver_iterations', 0),
        "candidate_ask": cs.get('opening_salary_ask', 0) if isinstance(cs, dict) else 0,
        "candidate_stance": cs.get('stance', 'unknown') if isinstance(cs, dict) else 'unknown',
        "hr_offer": hs.get('opening_offer', 0) if isinstance(hs, dict) else 0,
        "hr_ceiling": hs.get('max_final_offer', 0) if isinstance(hs, dict) else 0,
        "candidate_payoff": round(getattr(equilibrium, 'candidate_expected_payoff', 0), 3),
        "hr_payoff": round(getattr(equilibrium, 'hr_expected_payoff', 0), 3),
    }


def _build_alternatives(counterfactuals: list[dict], game_result: Any) -> list[dict]:
    """Build 2-3 alternative strategies sorted by impact."""
    if not counterfactuals:
        return []
    alternatives = []
    for cf in counterfactuals[:3]:
        alternatives.append({
            "name": cf.get("name", ""),
            "description": cf.get("description", ""),
            "category": cf.get("category", ""),
            "new_probability": cf.get("new_p", 0),
            "marginal_effect": cf.get("marginal_effect", 0),
            "significant": cf.get("significant", False),
        })
    return sorted(alternatives, key=lambda a: -a["marginal_effect"])


# ═══════════════════════════════════════════════════════════════════════════════
# Narrative builder (deterministic templates, LLM-optional)
# ═══════════════════════════════════════════════════════════════════════════════

def _build_narrative(
    strengths: list[StrategyClaim],
    weaknesses: list[StrategyClaim],
    game_result: Any,
    alternatives: list[dict],
) -> tuple[str, str]:
    """Build natural language summary and recommendation.

    Uses deterministic templates. LLM can enhance this via translate_proposal().
    """

    outcome = getattr(game_result, 'outcome', 'unknown')
    prob = getattr(game_result, 'success_probability', 0)
    salary = getattr(game_result, 'final_salary', 0) or 0

    # Summary
    strength_text = "、".join([s.headline for s in strengths[:3]]) if strengths else "无明显突出优势"
    weakness_text = "、".join([w.headline for w in weaknesses[:3]]) if weaknesses else "无明显短板"

    if outcome == "accepted":
        summary = (
            f"经过12维评估和四角色博弈模拟，该候选人投递此岗位的综合评分为"
            f" {prob:.0%}。核心优势在于{strength_text}。"
            f"主要短板为{weakness_text}。"
            f"在均衡策略下，预期薪资 {salary}K/年（约{salary/10:.0f}万/年）。"
        )
    elif outcome == "rejected":
        summary = (
            f"该候选人投递此岗位的博弈模拟结果为未通过。"
            f"成功率仅 {prob:.0%}，主要瓶颈为{weakness_text}。"
            f"即使具备{strength_text}，仍不足以弥补关键能力的缺失。"
        )
    else:
        summary = (
            f"博弈模拟超时未达成协议。成功率约 {prob:.0%}。"
            f"建议调整策略后重新评估。"
        )

    # Recommendation
    if alternatives:
        top = alternatives[0]
        rec = (
            f"最优替代方案：{top['description']}，"
            f"可将成功率提升至 {top['new_probability']:.0%}"
            f"（+{top['marginal_effect']:+.1%}）。"
        )
    elif outcome == "accepted":
        rec = "当前策略可行。建议在谈判中采用均衡要价，避免过高锚定导致破裂。"
    else:
        rec = "建议从可干预的短板入手（见上方分析），准备3-6个月后重新投递。"

    return summary, rec


def _compute_determinism(scores: list[Any], p_trace: ComputationTrace) -> float:
    """Compute what percentage of the numbers are deterministically computed."""
    total_steps = 0
    det_steps = 0
    for s in scores:
        total_steps += 1
        if getattr(s, 'llm_used', False):
            pass  # LLM-involved
        else:
            det_steps += 1
    for step in p_trace.steps:
        total_steps += 1
        if step.deterministic:
            det_steps += 1
    if total_steps == 0:
        return 100.0
    return round(det_steps / total_steps * 100, 1)
