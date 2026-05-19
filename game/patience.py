"""Dynamic Patience System — bilateral patience with signal-driven changes.

Each side (HR, Candidate) has a patience level that rises and falls based on
the opponent's actions and revealed signals. Patience is the core game mechanic
that replaces fixed round limits — a negotiation ends when one side's patience
runs out, not when a timer expires.

Design principle: every patience change has a *reason* drawn from the
actual negotiation context. These reasons become part of the agent's
deliberation narrative, showing that the AI is genuinely evaluating evidence.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class PatienceEvent:
    """A single patience change with full provenance."""
    round: int
    delta: float
    reason: str          # Human-readable explanation
    trigger: str          # Machine-readable trigger key
    source: str           # Which agent/action caused it


@dataclass
class PatienceState:
    """Bilateral patience levels — both HR and Candidate have independent patience."""
    hr_patience: float = 1.0
    candidate_patience: float = 1.0
    hr_patience_history: list[PatienceEvent] = field(default_factory=list)
    candidate_patience_history: list[PatienceEvent] = field(default_factory=list)

    @property
    def hr_patience_pct(self) -> float:
        return max(0.0, min(1.0, self.hr_patience))

    @property
    def candidate_patience_pct(self) -> float:
        return max(0.0, min(1.0, self.candidate_patience))

    @property
    def hr_is_exhausted(self) -> bool:
        return self.hr_patience <= 0.15

    @property
    def candidate_is_exhausted(self) -> bool:
        return self.candidate_patience <= 0.15


# ═══════════════════════════════════════════════════════════════════════════════
# Patience Delta Rules
# ═══════════════════════════════════════════════════════════════════════════════


def compute_hr_patience_deltas(
    candidate_action_type: str,
    candidate_params: dict,
    hr_budget: int,
    market_condition: str,
    resume_signals: dict,
    interviewer_recommendation: str,
    round_num: int,
) -> list[PatienceEvent]:
    """Compute HR patience changes based on candidate's behaviour and signals.

    Positive deltas = HR becomes MORE patient (candidate impresses them).
    Negative deltas = HR becomes LESS patient (candidate annoys them).
    Returns multiple events when multiple factors apply.
    """
    events: list[PatienceEvent] = []

    # ── Negative deltas (patience decreases) ──

    # Candidate asks far above budget band
    salary_ask = candidate_params.get("salary_ask") or candidate_params.get("salary_amount") or 0
    if salary_ask > 0 and hr_budget > 0:
        ratio = salary_ask / hr_budget
        if ratio > 1.3:
            events.append(PatienceEvent(
                round=round_num, delta=-0.25,
                reason=f"候选人要价{salary_ask}K超出预算{hr_budget}K的130%，HR认为对方不了解市场或不诚心",
                trigger="salary_ask_far_above_band", source="candidate",
            ))
        elif ratio > 1.1:
            events.append(PatienceEvent(
                round=round_num, delta=-0.10,
                reason=f"候选人要价{salary_ask}K略超预算，HR认为仍在谈判空间内",
                trigger="salary_ask_above_band", source="candidate",
            ))

    # Candidate rejected without conceding (stubborn)
    if candidate_action_type == "reject":
        events.append(PatienceEvent(
            round=round_num, delta=-0.15,
            reason="候选人拒绝报价且未做出让步，HR怀疑其谈判诚意",
            trigger="reject_without_concession", source="candidate",
        ))

    # Market cooling (HR knows candidate has fewer options)
    if market_condition == "cool":
        events.append(PatienceEvent(
            round=round_num, delta=-0.05,
            reason="市场降温，雇主方议价能力增强，HR不急",
            trigger="market_cooling", source="market",
        ))

    # ── Positive deltas (patience increases) ──

    # Strong school signal
    school_tier = resume_signals.get("school_tier", "")
    if school_tier in ("C9", "QS100"):
        events.append(PatienceEvent(
            round=round_num, delta=+0.08,
            reason=f"候选人{school_tier}学历，高潜力信号，值得多给耐心",
            trigger="strong_school_signal", source="resume",
        ))

    # Strong competition signal
    comp_tier = resume_signals.get("competition_tier", "")
    if comp_tier in ("S", "A"):
        events.append(PatienceEvent(
            round=round_num, delta=+0.10,
            reason=f"候选人{comp_tier}级竞赛经历，稀缺人才，溢价合理",
            trigger="strong_competition_signal", source="resume",
        ))

    # T1 company pedigree
    company_tier = resume_signals.get("company_tier", "")
    if company_tier in ("T1", "foreign"):
        events.append(PatienceEvent(
            round=round_num, delta=+0.08,
            reason="候选人大厂出身，质量有背书，值得多谈几轮",
            trigger="strong_company_signal", source="resume",
        ))

    # Candidate made a reasonable concession (>5%)
    if candidate_action_type == "counter_offer":
        prev_ask = candidate_params.get("previous_offer", 0)
        curr_ask = salary_ask
        if prev_ask > 0 and curr_ask > 0 and curr_ask < prev_ask:
            concession = (prev_ask - curr_ask) / prev_ask
            if concession > 0.05:
                events.append(PatienceEvent(
                    round=round_num, delta=+0.06,
                    reason=f"候选人主动让步{concession:.0%}，显示谈判诚意",
                    trigger="reasonable_concession", source="candidate",
                ))

    # Hot market (HR fears losing candidate)
    if market_condition == "hot":
        events.append(PatienceEvent(
            round=round_num, delta=+0.08,
            reason="市场火热，候选人选择多，HR怕被抢走",
            trigger="market_heating", source="market",
        ))

    # Strong interviewer recommendation
    if interviewer_recommendation == "strong_hire":
        events.append(PatienceEvent(
            round=round_num, delta=+0.10,
            reason="面试官强烈推荐，内部验证了候选人价值",
            trigger="strong_interviewer_rec", source="interviewer",
        ))

    return events


def compute_candidate_patience_deltas(
    hr_action_type: str,
    hr_params: dict,
    candidate_reservation: int,
    market_condition: str,
    round_num: int,
) -> list[PatienceEvent]:
    """Compute Candidate patience changes based on HR's behavior."""
    events: list[PatienceEvent] = []

    # ── Negative deltas ──

    # HR's offer far below candidate's reservation
    hr_offer = hr_params.get("salary_offer") or hr_params.get("final_salary") or 0
    if hr_offer > 0 and candidate_reservation > 0:
        ratio = hr_offer / candidate_reservation
        if ratio < 0.75:
            events.append(PatienceEvent(
                round=round_num, delta=-0.20,
                reason=f"HR报价{hr_offer}K远低于底线{candidate_reservation}K，候选人感到不受尊重",
                trigger="offer_far_below_reservation", source="hr",
            ))
        elif ratio < 0.90:
            events.append(PatienceEvent(
                round=round_num, delta=-0.08,
                reason=f"HR报价{hr_offer}K低于预期，但仍在可谈判范围",
                trigger="offer_below_reservation", source="hr",
            ))

    # HR rejects without improving
    if hr_action_type == "reject":
        events.append(PatienceEvent(
            round=round_num, delta=-0.15,
            reason="HR直接拒绝，未给出改进方案，候选人感到谈判无望",
            trigger="hr_reject_without_improvement", source="hr",
        ))

    # HR labels offer as "best and final" — pressure tactic
    if hr_params.get("best_and_final"):
        events.append(PatienceEvent(
            round=round_num, delta=-0.10,
            reason="HR声称这是最终报价，施加压力",
            trigger="best_and_final_pressure", source="hr",
        ))

    # ── Positive deltas ──

    # HR improved offer
    if hr_action_type == "counter_offer" or hr_params.get("improved"):
        events.append(PatienceEvent(
            round=round_num, delta=+0.08,
            reason="HR主动改进报价，显示诚意和灵活性",
            trigger="hr_improved_offer", source="hr",
        ))

    # Hot market — candidate has leverage
    if market_condition == "hot":
        events.append(PatienceEvent(
            round=round_num, delta=+0.06,
            reason="市场火热，候选人知道自己有更多选择",
            trigger="market_heating_candidate", source="market",
        ))

    # HR accepted candidate's ask directly
    if hr_params.get("accepted_candidate_ask") or hr_params.get("accepted_directly"):
        events.append(PatienceEvent(
            round=round_num, delta=+0.12,
            reason="HR直接接受了候选人的要价，显示强烈诚意",
            trigger="hr_direct_accept", source="hr",
        ))

    return events


def apply_patience_deltas(
    state_patience: PatienceState,
    hr_events: list[PatienceEvent],
    candidate_events: list[PatienceEvent],
) -> PatienceState:
    """Apply computed deltas and clamp to [0, 1]."""
    for evt in hr_events:
        state_patience.hr_patience = max(0.0, min(1.0, state_patience.hr_patience + evt.delta))
        state_patience.hr_patience_history.append(evt)

    for evt in candidate_events:
        state_patience.candidate_patience = max(0.0, min(1.0, state_patience.candidate_patience + evt.delta))
        state_patience.candidate_patience_history.append(evt)

    return state_patience


# ═══════════════════════════════════════════════════════════════════════════════
# Termination Check
# ═══════════════════════════════════════════════════════════════════════════════


def check_termination(
    patience: PatienceState,
    public_status: str,
    round_num: int,
    max_rounds: int = 8,
) -> tuple[bool, str | None]:
    """Check if the negotiation should end.

    Returns:
        (should_terminate, termination_reason)
        termination_reason is None if negotiation should continue.
    """
    # Condition 1: deal already reached or rejected
    if public_status in ("accepted", "rejected"):
        return True, public_status

    # Condition 2: HR patience exhausted
    if patience.hr_is_exhausted:
        return True, "hr_patience_exhausted"

    # Condition 3: Candidate patience exhausted
    if patience.candidate_is_exhausted:
        return True, "candidate_patience_exhausted"

    # Condition 4: hard cap at max_rounds (1-indexed)
    if round_num >= max_rounds:
        return True, "timeout"

    return False, None


def patience_exhaustion_message(who: str, persona_name: str = "") -> str:
    """Generate a natural-language message when one side's patience runs out."""
    if who == "hr":
        messages = [
            "对不起，这个薪资要求超出了我们能承受的范围。祝你找到更合适的机会。",
            "我们已经给出了最好的条件。如果你不能接受，那这次就先到这里吧。",
            "我尊重你的期望，但我们的预算确实有限。希望以后还有合作机会。",
        ]
    else:
        messages = [
            "我觉得贵公司的诚意不足。经过慎重考虑，我决定接受其他 offer。",
            "感谢你的时间。目前的条件下我无法接受，我们各自再看看吧。",
            "这个薪资与我的期望差距太大。我选择退出谈判。",
        ]
    import random
    return random.choice(messages)
