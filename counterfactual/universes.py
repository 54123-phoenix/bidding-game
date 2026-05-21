"""Parallel Universe Generator — counterfactual career timeline visualization.

Generates alternative career trajectories based on different negotiation
outcomes, enabling the "what if" visualization in the frontend.
"""

from __future__ import annotations

import random
import uuid
from datetime import datetime

from models.schemas import (
    GameResult,
    GameState,
    ParallelUniverseReport,
    TimelineEvent,
    UniverseTimeline,
)


def generate_parallel_universes(
    result: GameResult,
    state: GameState,
    rng: random.Random | None = None,
) -> ParallelUniverseReport | None:
    """Generate parallel universe career timelines from a game result.

    Creates 3 alternative universes:
      1. "接受更低" — accepted a lower offer, faster growth but lower ceiling
      2. "坚持更高" — held out for more, riskier but higher potential
      3. "选择放弃" — rejected and switched companies

    Returns None if the game didn't reach a terminal state.
    """
    if result.outcome not in ("accepted", "rejected"):
        return None

    rng = rng or random.Random()
    base_seed = hash(result.game_id) % (2**31)
    rng.seed(base_seed)

    final_salary = result.final_salary or 0
    job_level = state.job.level or "P6"
    company = state.job.company or "目标公司"

    # Base universe (what actually happened)
    base = _build_universe(
        universe_id="universe-base",
        label="本宇宙",
        emoji="🌍",
        color="#22d3ee",
        trigger="实际决策",
        final_salary=final_salary,
        job_level=job_level,
        company=company,
        outcome=result.outcome,
        rng=rng,
    )

    alternatives: list[UniverseTimeline] = []

    # Alt 1: Accepted lower
    if result.outcome == "accepted":
        lower_salary = int(final_salary * 0.85)
        alt1 = _build_universe(
            universe_id="universe-lower",
            label="接受更低",
            emoji="📉",
            color="#f59e0b",
            trigger="提前接受低15%的offer",
            final_salary=lower_salary,
            job_level=job_level,
            company=company,
            outcome="accepted",
            rng=rng,
            growth_mult=1.15,
            satisfaction_offset=0.1,
            risk_offset=-0.1,
        )
        alternatives.append(alt1)

    # Alt 2: Held out for more
    if result.outcome == "accepted":
        higher_salary = int(final_salary * 1.12)
        alt2 = _build_universe(
            universe_id="universe-higher",
            label="坚持更高",
            emoji="📈",
            color="#ef4444",
            trigger="多轮谈判争取高12%的offer",
            final_salary=higher_salary,
            job_level=_bump_level(job_level),
            company=company,
            outcome="accepted",
            rng=rng,
            growth_mult=0.9,
            satisfaction_offset=-0.05,
            risk_offset=0.15,
        )
        alternatives.append(alt2)

    # Alt 3: Rejected / switched
    alt3 = _build_universe(
        universe_id="universe-switch",
        label="选择放弃",
        emoji="🚪",
        color="#8b5cf6",
        trigger="拒绝offer，跳槽到其他公司",
        final_salary=int(final_salary * 0.95) if result.outcome == "accepted" else int(final_salary * 1.05),
        job_level=job_level,
        company=f"其他公司（{company}竞品）",
        outcome="accepted",
        rng=rng,
        growth_mult=1.05,
        satisfaction_offset=0.05,
        risk_offset=0.1,
    )
    alternatives.append(alt3)

    # Compute regret scores
    for u in alternatives:
        u.regret_score = _compute_regret(base, u)

    # Comparison summary
    salary_diffs = [u.final_salary - base.final_salary for u in alternatives]
    best_idx = max(range(len(alternatives)), key=lambda i: alternatives[i].final_salary)
    best = alternatives[best_idx]

    comparison = (
        f"在本宇宙中你获得了 {base.final_salary}K 的薪资。"
        f"如果{best.trigger_decision}，"
        f"最终薪资可能是 {best.final_salary}K（{'+' if best.final_salary > base.final_salary else ''}{best.final_salary - base.final_salary}K）。"
    )

    key_insight = _generate_insight(base, alternatives)

    return ParallelUniverseReport(
        base_universe=base,
        alternative_universes=alternatives,
        comparison_summary=comparison,
        key_insight=key_insight,
    )


def _build_universe(
    universe_id: str,
    label: str,
    emoji: str,
    color: str,
    trigger: str,
    final_salary: int,
    job_level: str,
    company: str,
    outcome: str,
    rng: random.Random,
    growth_mult: float = 1.0,
    satisfaction_offset: float = 0.0,
    risk_offset: float = 0.0,
) -> UniverseTimeline:
    """Build a single universe timeline with career events."""
    timeline: list[TimelineEvent] = []

    # Year 0: Hire
    timeline.append(TimelineEvent(
        year=0.0,
        month=0,
        event_type="salary_change",
        title="入职",
        description=f"加入{company}，担任{job_level}",
        salary=final_salary,
        level=job_level,
        satisfaction=0.6 + satisfaction_offset,
        triggered_by=trigger,
        icon="🎉",
    ))

    # Year 0.5: First review
    review_sat = min(1.0, max(0.2, 0.6 + satisfaction_offset + rng.uniform(-0.1, 0.15)))
    timeline.append(TimelineEvent(
        year=0.5,
        month=6,
        event_type="satisfaction",
        title="半年度评估",
        description="适应期结束，对工作环境有了初步判断",
        salary=final_salary,
        level=job_level,
        satisfaction=review_sat,
        triggered_by=trigger,
        icon="📋",
    ))

    # Year 1: Promotion or salary adjustment
    if rng.random() < 0.6 * growth_mult:
        new_level = _bump_level(job_level) if rng.random() < 0.3 else job_level
        new_salary = int(final_salary * (1.08 + rng.uniform(0, 0.07)))
        timeline.append(TimelineEvent(
            year=1.0,
            month=12,
            event_type="promotion" if new_level != job_level else "salary_change",
            title="年度调薪" if new_level == job_level else "晋升",
            description=f"薪资调整至 {new_salary}K" + (f"，晋升至{new_level}" if new_level != job_level else ""),
            salary=new_salary,
            level=new_level,
            satisfaction=min(1.0, review_sat + 0.1),
            triggered_by=trigger,
            icon="📈" if new_level != job_level else "💰",
        ))
        current_salary = new_salary
        current_level = new_level
    else:
        current_salary = final_salary
        current_level = job_level

    # Year 2: Key inflection
    if rng.random() < 0.4 + risk_offset:
        # IPO or major event
        if rng.random() < 0.2:
            timeline.append(TimelineEvent(
                year=2.0,
                month=24,
                event_type="ipo",
                title="公司上市",
                description="公司成功IPO，期权价值大幅提升",
                salary=int(current_salary * 1.15),
                level=current_level,
                satisfaction=min(1.0, 0.7 + satisfaction_offset),
                triggered_by=trigger,
                icon="🚀",
            ))
            current_salary = int(current_salary * 1.15)
        else:
            # Team change or skill growth
            timeline.append(TimelineEvent(
                year=2.0,
                month=24,
                event_type="skill_growth",
                title="技能突破",
                description="掌握了新的核心技术栈，市场价值提升",
                salary=int(current_salary * 1.1),
                level=current_level,
                satisfaction=min(1.0, 0.65 + satisfaction_offset),
                triggered_by=trigger,
                icon="🧠",
            ))
            current_salary = int(current_salary * 1.1)
    else:
        # Regret moment
        timeline.append(TimelineEvent(
            year=2.0,
            month=24,
            event_type="regret_moment",
            title="职业瓶颈",
            description="感觉成长停滞，开始怀疑当初的选择",
            salary=current_salary,
            level=current_level,
            satisfaction=max(0.2, 0.45 + satisfaction_offset - 0.15),
            triggered_by=trigger,
            icon="😔",
        ))

    # Year 3: Switch or stay
    if rng.random() < 0.3 + risk_offset:
        switch_salary = int(current_salary * (1.2 + rng.uniform(0, 0.15)))
        timeline.append(TimelineEvent(
            year=3.0,
            month=36,
            event_type="switch_company",
            title="跳槽",
            description=f"跳槽至新公司，薪资涨幅至 {switch_salary}K",
            salary=switch_salary,
            level=_bump_level(current_level),
            satisfaction=min(1.0, 0.7 + satisfaction_offset),
            triggered_by=trigger,
            icon="🔄",
        ))
        current_salary = switch_salary
        current_level = _bump_level(current_level)
    else:
        # Stay and grow
        stay_salary = int(current_salary * (1.05 + rng.uniform(0, 0.08)))
        timeline.append(TimelineEvent(
            year=3.0,
            month=36,
            event_type="salary_change",
            title="稳步发展",
            description=f"继续深耕，薪资调整至 {stay_salary}K",
            salary=stay_salary,
            level=current_level,
            satisfaction=min(1.0, 0.6 + satisfaction_offset),
            triggered_by=trigger,
            icon="🌱",
        ))
        current_salary = stay_salary

    # Year 5: Final state
    final_sat = min(1.0, max(0.2, 0.6 + satisfaction_offset + rng.uniform(-0.15, 0.2)))
    timeline.append(TimelineEvent(
        year=5.0,
        month=60,
        event_type="satisfaction",
        title="五年回顾",
        description="五年职业生涯的总结与反思",
        salary=current_salary,
        level=current_level,
        satisfaction=final_sat,
        triggered_by=trigger,
        icon="🔮",
    ))

    # Assessment
    if current_salary > final_salary * 1.3:
        assessment = "这个选择带来了显著的职业增长，薪资在五年内实现了大幅提升。"
    elif current_salary > final_salary * 1.1:
        assessment = "这个选择带来了稳定的职业发展，薪资稳步增长。"
    elif current_salary >= final_salary:
        assessment = "这个选择的结果中规中矩，职业发展较为平稳。"
    else:
        assessment = "这个选择似乎不太理想，职业发展遇到了一些阻碍。"

    return UniverseTimeline(
        universe_id=universe_id,
        universe_label=label,
        universe_emoji=emoji,
        trigger_decision=trigger,
        color=color,
        timeline=timeline,
        final_assessment=assessment,
        regret_score=0.0,
        final_salary=current_salary,
        final_satisfaction=final_sat,
    )


def _bump_level(level: str) -> str:
    """Bump a job level (e.g., P6 -> P7)."""
    mapping = {
        "P5": "P6", "P6": "P7", "P7": "P8", "P8": "P9",
        "T5": "T6", "T6": "T7", "T7": "T8", "T8": "T9",
        "L5": "L6", "L6": "L7", "L7": "L8", "L8": "L9",
    }
    return mapping.get(level, level)


def _compute_regret(base: UniverseTimeline, alt: UniverseTimeline) -> float:
    """Compute regret score: how much worse is alt compared to base."""
    salary_ratio = base.final_salary / max(alt.final_salary, 1)
    sat_ratio = base.final_satisfaction / max(alt.final_satisfaction, 0.1)
    # Regret is high if alt is better than base
    regret = max(0.0, 1.0 - (salary_ratio + sat_ratio) / 2)
    return round(min(regret, 1.0), 2)


def _generate_insight(base: UniverseTimeline, alternatives: list[UniverseTimeline]) -> str:
    """Generate a key insight from comparing universes."""
    best = max(alternatives, key=lambda u: u.final_salary)
    worst = min(alternatives, key=lambda u: u.final_salary)

    if best.final_salary > base.final_salary * 1.2:
        return f"{best.trigger_decision}可能带来显著更高的长期收益，但也伴随着更高的风险。"
    if worst.final_salary < base.final_salary * 0.9:
        return f"{worst.trigger_decision}可能导致职业发展不如预期，需要谨慎考虑。"
    return "不同的选择会带来不同的职业轨迹，但长期来看差异可能不如想象中大。"
