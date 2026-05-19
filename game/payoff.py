"""Payoff functions for all 4 players in the hiring game.

Each player's utility depends on the final outcome (accepted/rejected),
the negotiated terms (salary, level), and their private type.

Reference: NegMAS SAOP utility function pattern — modular, composable utilities.
"""

from __future__ import annotations

import math

from models.schemas import (
    CandidatePrivateType,
    GameResult,
    HRPrivateType,
    InterviewerPrivateType,
    MarketPrivateType,
)


def candidate_payoff(result: GameResult, ctype: CandidatePrivateType) -> float:
    """Candidate's utility from a hiring game outcome.

    Utility = salary_utility + growth_utility + stability_utility
    where each component is weighted by career_ambition.

    career_ambition = 1.0 → pure growth seeker (cares about level + learning)
    career_ambition = 0.0 → pure salary seeker
    """
    if result.outcome == "rejected" or result.outcome == "timeout":
        # Fallback to outside options — normalized to 0-1
        if ctype.outside_options:
            best_outside = max(
                (opt.get("salary", 0) for opt in ctype.outside_options),
                default=0,
            )
            return round(best_outside / max(ctype.reservation_wage, 1) * 0.5, 3)
        return 0.15  # Baseline: no offer, some baseline utility from staying put

    # Salary utility (normalized to 0-1)
    final_salary = result.final_salary or ctype.reservation_wage
    salary_utility = _salary_satisfaction(final_salary, ctype.reservation_wage)

    # Growth utility: level + skill alignment
    growth_utility = 0.5  # baseline
    if result.final_level:
        level_values = {"P5": 0.3, "P6": 0.5, "P7": 0.7, "P8": 0.85, "P9": 1.0}
        growth_utility = level_values.get(result.final_level, 0.5)

    # Composite
    ambition = ctype.career_ambition
    total = salary_utility * (1 - ambition) * 0.7 + growth_utility * ambition * 0.3
    return round(min(max(total, 0.0), 1.0), 3)


def hr_payoff(result: GameResult, hrtype: HRPrivateType) -> float:
    """HR's utility from a hiring outcome.

    Utility = candidate_quality - cost_overrun_penalty + urgency_satisfaction
    """
    if result.outcome == "rejected" or result.outcome == "timeout":
        # Failed to hire — penalty proportional to urgency
        return -0.3 * hrtype.urgency

    # Quality = success probability from simulation
    quality = result.success_probability

    # Cost penalty: how much over ideal budget?
    final_salary = result.final_salary or 0
    cost_ratio = final_salary / max(hrtype.true_budget, 1)
    if cost_ratio <= 0.8:
        cost_penalty = 0.0  # Under budget — great
    elif cost_ratio <= 1.0:
        cost_penalty = (cost_ratio - 0.8) * 0.3
    elif cost_ratio <= 1.2:
        cost_penalty = 0.06 + (cost_ratio - 1.0) * 0.5
    else:
        cost_penalty = 0.16 + (cost_ratio - 1.2) * 0.8

    # Internal equity: overshooting equity constraint is bad
    equity_penalty = 0.0
    if hrtype.internal_equity_constraint > 0 and final_salary > hrtype.internal_equity_constraint:
        overage = (final_salary - hrtype.internal_equity_constraint) / max(hrtype.internal_equity_constraint, 1)
        equity_penalty = min(overage * 0.4, 0.3)

    total = quality * 0.6 - cost_penalty * 0.25 - equity_penalty * 0.15
    return round(min(max(total, -0.5), 1.0), 3)


def interviewer_payoff(
    result: GameResult,
    itype: InterviewerPrivateType,
    candidate_resume: dict | None = None,
) -> float:
    """Interviewer's utility — accuracy of assessment + team fit.

    The interviewer "wins" when their evaluation accurately predicts
    on-the-job performance. Bias reduces accuracy.
    """
    if result.outcome == "timeout":
        return 0.3  # Neutral — no decision to evaluate

    # Base: decision quality
    if result.outcome == "accepted":
        # Was this a good hire? Use success_prob as proxy
        base = result.success_probability
    else:
        # Was this a correct rejection?
        base = 1.0 - result.success_probability

    # Bias penalty: more biased interviewers get lower accuracy reward
    bias_magnitude = sum(abs(b) for b in itype.bias_vector.values()) / max(len(itype.bias_vector), 1)
    bias_penalty = bias_magnitude * 0.3

    # Strictness alignment: very strict or very lenient both reduce utility
    strictness_deviation = abs(itype.strictness - 0.5)
    strictness_penalty = strictness_deviation * 0.2

    total = base * 0.7 - bias_penalty - strictness_penalty
    return round(min(max(total, 0.0), 1.0), 3)


def market_payoff(result: GameResult, mtype: MarketPrivateType) -> float:
    """Market utility — how efficient was the match?

    Market "wins" when talent goes to the right place efficiently.
    """
    if result.outcome == "timeout":
        return 0.1  # Inefficient — no match happened

    if result.outcome == "rejected":
        # Was the rejection efficient? (i.e., truly a bad match)
        if result.success_probability < 0.3:
            return 0.6  # Correctly avoided a bad match
        return 0.3  # Potentially missed a good match

    # Accepted: reward efficient matching
    efficiency = result.success_probability
    speed_bonus = max(0, 1.0 - result.negotiation_rounds / result.final_state.max_rounds) * 0.2

    # Market balance: if supply >> demand, accepted offers are more valuable
    balance_factor = min(mtype.supply_demand_ratio, 2.0) / 2.0

    total = efficiency * 0.6 + speed_bonus + balance_factor * 0.2
    return round(min(max(total, 0.0), 1.0), 3)


def _salary_satisfaction(actual: int, reservation: int) -> float:
    """How satisfied is the candidate with the salary outcome?

    0.0 = exactly at reservation wage (just acceptable)
    1.0 = 2x+ reservation (extremely happy)
    """
    if actual <= reservation:
        return 0.1  # Barely acceptable
    ratio = actual / max(reservation, 1)
    if ratio >= 2.0:
        return 1.0
    # Logarithmic satisfaction (diminishing returns)
    return round(math.log(ratio, 2), 3)  # log2: 2x = 1.0, 1.5x = 0.58
