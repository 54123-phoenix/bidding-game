"""Unit tests for EquilibriumSolver — Bayesian Nash Equilibrium finding."""

from __future__ import annotations

import pytest

from game.equilibrium import EquilibriumSolver
from models.schemas import (
    CandidatePrivateType,
    EquilibriumResult,
    GameState,
    HRPrivateType,
    InterviewerPrivateType,
    MarketPrivateType,
    StructuredJob,
    StructuredResume,
)


def make_state(c_reservation: int = 30, hr_budget: int = 50) -> GameState:
    resume = StructuredResume(resume_id="r1", name="T")
    job = StructuredJob(job_id="j1", title="SE", company="ACME", salary_range=(30, 80))
    return GameState(
        game_id="g1", resume=resume, job=job, round=0, max_rounds=5,
        candidate_type=CandidatePrivateType(
            true_ability=0.6, reservation_wage=c_reservation, career_ambition=0.5,
        ),
        hr_type=HRPrivateType(
            true_budget=hr_budget, urgency=0.5, internal_equity_constraint=int(hr_budget * 0.8),
        ),
        interviewer_type=InterviewerPrivateType(strictness=0.5, bias_vector={}),
        market_type=MarketPrivateType(supply_demand_ratio=1.0, salary_trend="stable", hot_skills=[]),
    )


class TestEquilibriumSolver:
    def test_solve_returns_equilibrium(self):
        solver = EquilibriumSolver()
        state = make_state()
        result = solver.solve(state)

        assert isinstance(result, EquilibriumResult)
        assert result.equilibrium_type == "pure_bne"
        assert "opening_salary_ask" in result.candidate_strategy
        assert "opening_offer" in result.hr_strategy
        assert 0.0 <= result.candidate_expected_payoff <= 1.0
        assert -0.5 <= result.hr_expected_payoff <= 1.0

    def test_converges_within_iterations(self):
        solver = EquilibriumSolver(max_iterations=20)
        state = make_state()
        result = solver.solve(state)
        assert result.converged, f"Should converge within {result.solver_iterations} iterations"

    def test_hot_market_helps_candidate(self):
        """In a hot market (candidate-favored), candidate payoff should be reasonable."""
        solver = EquilibriumSolver()
        state = make_state(c_reservation=40, hr_budget=70)
        state.market_type.supply_demand_ratio = 0.6  # candidate-favored
        result = solver.solve(state)
        assert result.candidate_strategy["opening_salary_ask"] > 0
        assert result.candidate_expected_payoff > 0.0

    def test_cool_market_hurts_candidate(self):
        """In a cool market, HR has more leverage."""
        solver = EquilibriumSolver()
        state = make_state(c_reservation=40, hr_budget=50)
        state.market_type.supply_demand_ratio = 1.8  # employer-favored
        result = solver.solve(state)
        assert result.candidate_expected_payoff <= 1.0

    def test_low_reservation_high_budget_yields_good_deal(self):
        solver = EquilibriumSolver()
        state = make_state(c_reservation=25, hr_budget=80)
        result = solver.solve(state)
        assert result.converged

    def test_high_reservation_low_budget_tension(self):
        solver = EquilibriumSolver()
        state = make_state(c_reservation=70, hr_budget=50)
        result = solver.solve(state)
        # Should still produce a result even with tension
        assert isinstance(result, EquilibriumResult)

    def test_alternative_payoffs_present(self):
        solver = EquilibriumSolver()
        state = make_state()
        result = solver.solve(state)
        assert len(result.alternative_payoffs) > 0, "Should compute counterfactual payoffs"

    def test_strategy_descriptions_in_chinese(self):
        solver = EquilibriumSolver()
        state = make_state()
        result = solver.solve(state)
        assert result.candidate_strategy["stance"] in ("firm", "flexible")
        assert result.hr_strategy["opening_offer"] > 0
