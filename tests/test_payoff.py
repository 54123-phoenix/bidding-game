"""Unit tests for payoff functions — the core utility calculations of the game."""

from __future__ import annotations

from datetime import date

import pytest

from game.payoff import candidate_payoff, hr_payoff, interviewer_payoff, market_payoff
from models.schemas import (
    CandidatePrivateType,
    GameResult,
    GameState,
    HRPrivateType,
    InterviewerPrivateType,
    MarketPrivateType,
    StructuredJob,
    StructuredResume,
)


def make_state(**overrides) -> GameState:
    resume = StructuredResume(resume_id="test", name="T")
    job = StructuredJob(job_id="j1", title="SE", company="ACME")
    defaults = {
        "game_id": "g1", "resume": resume, "job": job, "round": 0, "max_rounds": 5,
        "candidate_type": CandidatePrivateType(true_ability=0.6, reservation_wage=30, career_ambition=0.5),
        "hr_type": HRPrivateType(true_budget=50, urgency=0.5, internal_equity_constraint=40),
        "interviewer_type": InterviewerPrivateType(strictness=0.5, bias_vector={}),
        "market_type": MarketPrivateType(supply_demand_ratio=1.0, salary_trend="stable", hot_skills=[]),
    }
    defaults.update(overrides)
    return GameState(**defaults)


def make_result(outcome: str, final_salary: int | None = None, success_prob: float = 0.5,
                rounds: int = 3, state: GameState | None = None) -> GameResult:
    return GameResult(
        game_id="g1", outcome=outcome, final_state=state or make_state(),
        final_salary=final_salary, final_level="P7", negotiation_rounds=rounds,
        success_probability=success_prob, key_turning_points=[],
        information_asymmetry_cost=0.0, winning_strategy="",
        recommendation="",
    )


class TestCandidatePayoff:
    def test_accepted_good_offer(self):
        ct = CandidatePrivateType(true_ability=0.7, reservation_wage=30, career_ambition=0.5)
        result = make_result("accepted", final_salary=50, success_prob=0.8)
        payoff = candidate_payoff(result, ct)
        assert 0.3 < payoff < 0.9, f"Expected reasonable payoff, got {payoff}"

    def test_accepted_salary_at_reservation(self):
        ct = CandidatePrivateType(true_ability=0.5, reservation_wage=30, career_ambition=0.5)
        result = make_result("accepted", final_salary=30, success_prob=0.5)
        payoff = candidate_payoff(result, ct)
        assert payoff < 0.3, f"Barely-at-reservation should be low, got {payoff}"

    def test_rejected_has_outside_options(self):
        ct = CandidatePrivateType(
            true_ability=0.5, reservation_wage=30, career_ambition=0.5,
            outside_options=[{"salary": 35}, {"salary": 28}],
        )
        result = make_result("rejected", final_salary=None, success_prob=0.2)
        payoff = candidate_payoff(result, ct)
        assert 0.1 < payoff < 0.7, f"Expected outside-option payoff, got {payoff}"

    def test_rejected_no_outside_options(self):
        ct = CandidatePrivateType(true_ability=0.5, reservation_wage=30, career_ambition=0.5)
        result = make_result("rejected", final_salary=None, success_prob=0.2)
        payoff = candidate_payoff(result, ct)
        assert payoff == 0.15, f"Expected baseline 0.15, got {payoff}"

    def test_high_ambition_values_growth(self):
        ct_ambitious = CandidatePrivateType(true_ability=0.5, reservation_wage=30, career_ambition=0.9)
        ct_salary = CandidatePrivateType(true_ability=0.5, reservation_wage=30, career_ambition=0.1)
        result = make_result("accepted", final_salary=50, success_prob=0.8)
        result.final_level = "P9"

        payoff_amb = candidate_payoff(result, ct_ambitious)
        payoff_sal = candidate_payoff(result, ct_salary)
        assert payoff_amb != payoff_sal, "Ambition should change payoff composition"


class TestHRPayoff:
    def test_accepted_under_budget(self):
        ht = HRPrivateType(true_budget=50, urgency=0.5, internal_equity_constraint=40)
        result = make_result("accepted", final_salary=35, success_prob=0.9)
        payoff = hr_payoff(result, ht)
        assert payoff > 0.4, f"Under-budget good hire should score well, got {payoff}"

    def test_accepted_over_budget(self):
        ht = HRPrivateType(true_budget=50, urgency=0.5, internal_equity_constraint=40)
        result = make_result("accepted", final_salary=65, success_prob=0.5)
        payoff = hr_payoff(result, ht)
        assert payoff < 0.35, f"Over-budget should reduce payoff, got {payoff}"

    def test_rejected_urgent_role(self):
        ht = HRPrivateType(true_budget=50, urgency=0.9, internal_equity_constraint=40)
        result = make_result("rejected", final_salary=None, success_prob=0.3)
        payoff = hr_payoff(result, ht)
        assert payoff < 0, "Rejected urgent role should have negative payoff"

    def test_equity_constraint_penalty(self):
        ht = HRPrivateType(true_budget=80, urgency=0.3, internal_equity_constraint=60)
        result = make_result("accepted", final_salary=75, success_prob=0.8)
        payoff = hr_payoff(result, ht)
        assert payoff < 0.5, f"Overshooting equity constraint should apply penalty, got {payoff}"


class TestInterviewerPayoff:
    def test_accurate_assessment(self):
        it = InterviewerPrivateType(strictness=0.5, bias_vector={"school_prestige": 0.0})
        result = make_result("accepted", final_salary=50, success_prob=0.9)
        payoff = interviewer_payoff(result, it)
        assert payoff > 0.5, f"Accurate assessment should score well, got {payoff}"

    def test_biased_interviewer(self):
        it = InterviewerPrivateType(
            strictness=0.5,
            bias_vector={"school_prestige": 0.5, "big_company": 0.4, "youth": 0.3},
        )
        it_unbiased = InterviewerPrivateType(strictness=0.5, bias_vector={"school_prestige": 0.0})
        result = make_result("accepted", final_salary=50, success_prob=0.9)
        payoff_biased = interviewer_payoff(result, it)
        payoff_unbiased = interviewer_payoff(result, it_unbiased)
        assert payoff_biased < payoff_unbiased, (
            f"Biased ({payoff_biased}) should be lower than unbiased ({payoff_unbiased})"
        )

    def test_correct_rejection(self):
        it = InterviewerPrivateType(strictness=0.5, bias_vector={})
        result = make_result("rejected", final_salary=None, success_prob=0.1)
        payoff = interviewer_payoff(result, it)
        assert payoff > 0.5, f"Correct rejection should score well, got {payoff}"


class TestMarketPayoff:
    def test_efficient_match(self):
        mt = MarketPrivateType(supply_demand_ratio=1.0, salary_trend="stable", hot_skills=[])
        result = make_result("accepted", final_salary=50, success_prob=0.9, rounds=2)
        payoff = market_payoff(result, mt)
        assert payoff > 0.5, f"Efficient match should score well, got {payoff}"

    def test_correct_avoidance(self):
        mt = MarketPrivateType(supply_demand_ratio=1.0, salary_trend="stable", hot_skills=[])
        result = make_result("rejected", final_salary=None, success_prob=0.1)
        payoff = market_payoff(result, mt)
        assert payoff > 0.4, "Correctly avoiding bad match should score OK"

    def test_timeout_inefficient(self):
        mt = MarketPrivateType(supply_demand_ratio=1.0, salary_trend="stable", hot_skills=[])
        result = make_result("timeout", final_salary=None, success_prob=0.5)
        payoff = market_payoff(result, mt)
        assert payoff <= 0.1, f"Timeout should be inefficient, got {payoff}"
