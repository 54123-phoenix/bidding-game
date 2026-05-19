"""Equilibrium solver for the Bayesian hiring game.

Implements discrete-strategy Pure Bayesian Nash Equilibrium (BNE) finding
via iterated best-response with belief integration.

Architecture allows upgrading to more sophisticated solvers:
  Current (v1): Iterated best response on discretized strategy space
  Future (v2): Counterfactual Regret Minimization (CFR) for mixed strategies
  Future (v3): MIP-based exact equilibrium for small games

Reference: OpenSpiel (google-deepmind/open_spiel) solver patterns.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from models.schemas import (
    CandidatePrivateType,
    EquilibriumResult,
    GameState,
    HRPrivateType,
)


@dataclass
class StrategyProfile:
    """A set of pure strategies for all players."""
    candidate_salary: int       # Salary ask in K/yr
    candidate_stance: str       # "firm" | "flexible"
    hr_offer: int               # Initial offer in K/yr
    hr_concession_rate: float   # How fast HR concedes
    hr_final_ceiling: int       # Highest HR will go


class EquilibriumSolver:
    """Find equilibrium strategies for the hiring game.

    v1: Discretized strategy space + iterated best response.
    The strategy space is small enough (5×5 for salary) that brute-force
    with best response iteration converges reliably.
    """

    def __init__(self, max_iterations: int = 20, convergence_threshold: float = 0.01):
        self.max_iterations = max_iterations
        self.convergence_threshold = convergence_threshold

    def solve(
        self,
        state: GameState,
    ) -> EquilibriumResult:
        """Find a Bayesian Nash Equilibrium for the current game state.

        Discretizes the continuous strategy space (salary offers) into
        a grid, then iterates best responses until convergence.
        """
        ctype = state.candidate_type
        htype = state.hr_type

        # Generate strategy grids
        candidate_strategies = self._candidate_salary_grid(ctype, state)
        hr_strategies = self._hr_offer_grid(htype, state)

        # Initialize with reasonable starting strategies
        c_best = candidate_strategies[len(candidate_strategies) // 2]  # middle
        h_best = hr_strategies[len(hr_strategies) // 2]                # middle

        converged = False
        for iteration in range(self.max_iterations):
            # Candidate's best response to HR's current strategy
            c_new = self._candidate_best_response(h_best, candidate_strategies, ctype, state)

            # HR's best response to Candidate's current strategy
            h_new = self._hr_best_response(c_new, hr_strategies, htype, state)

            # Check convergence
            c_changed = abs(c_new - c_best) / max(c_best, 1) > self.convergence_threshold
            h_changed = abs(h_new - h_best) / max(h_best, 1) > self.convergence_threshold

            if not c_changed and not h_changed:
                converged = True
                break

            c_best = c_new
            h_best = h_new

        # Build human-readable strategy profiles
        candidate_strategy = self._describe_candidate_strategy(c_best, ctype)
        hr_strategy = self._describe_hr_strategy(h_best, htype)

        # Compute expected payoffs under equilibrium
        c_payoff = self._compute_candidate_equilibrium_payoff(c_best, h_best, ctype, state)
        h_payoff = self._compute_hr_equilibrium_payoff(h_best, c_best, htype, state)

        # Alternative payoffs (counterfactuals)
        alternatives = self._compute_counterfactual_payoffs(
            c_best, h_best, candidate_strategies, hr_strategies, ctype, htype, state
        )

        return EquilibriumResult(
            equilibrium_type="pure_bne",
            candidate_strategy=candidate_strategy,
            hr_strategy=hr_strategy,
            candidate_expected_payoff=round(c_payoff, 3),
            hr_expected_payoff=round(h_payoff, 3),
            alternative_payoffs=alternatives,
            solver_iterations=iteration + 1,
            converged=converged,
        )

    # ── Strategy grid generators ────────────────────────────────────────

    @staticmethod
    def _candidate_salary_grid(ctype: CandidatePrivateType, state: GameState) -> list[int]:
        """Generate the discrete salary demands a candidate might make."""
        base = ctype.reservation_wage
        if state.job.salary_range:
            base = max(base, state.job.salary_range[0])

        ceiling = state.job.salary_range[1] * 1.3 if state.job.salary_range else base * 1.5

        # Generate 5-7 points between base and ceiling
        num_points = 7
        step = (ceiling - base) / (num_points - 1)
        return [int(base + i * step) for i in range(num_points)]

    @staticmethod
    def _hr_offer_grid(htype: HRPrivateType, state: GameState) -> list[int]:
        """Generate the discrete salary offers HR might make."""
        floor = int(htype.true_budget * 0.65)
        ceiling = int(min(htype.true_budget, htype.internal_equity_constraint) if htype.internal_equity_constraint > 0 else htype.true_budget)

        num_points = 7
        step = max((ceiling - floor) / (num_points - 1), 1)
        return [int(floor + i * step) for i in range(num_points)]

    # ── Best response functions ─────────────────────────────────────────

    @staticmethod
    def _candidate_best_response(
        hr_offer: int,
        candidate_options: list[int],
        ctype: CandidatePrivateType,
        state: GameState,
    ) -> int:
        """Find candidate's utility-maximizing salary demand given HR's expected offer."""
        best_ask = candidate_options[0]
        best_utility = -float("inf")

        for ask in candidate_options:
            utility = EquilibriumSolver._candidate_utility(ask, hr_offer, ctype)
            if utility > best_utility:
                best_utility = utility
                best_ask = ask

        return best_ask

    @staticmethod
    def _hr_best_response(
        candidate_ask: int,
        hr_options: list[int],
        htype: HRPrivateType,
        state: GameState,
    ) -> int:
        """Find HR's utility-maximizing offer given candidate's expected demand."""
        best_offer = hr_options[0]
        best_utility = -float("inf")

        for offer in hr_options:
            utility = EquilibriumSolver._hr_utility(offer, candidate_ask, htype)
            if utility > best_utility:
                best_utility = utility
                best_offer = offer

        return best_offer

    # ── Utility functions for equilibrium computation ────────────────────

    @staticmethod
    def _candidate_utility(ask: int, hr_offer: int, ctype: CandidatePrivateType) -> float:
        """Simplified candidate utility for equilibrium analysis."""
        if hr_offer >= ask:
            # Deal: utility from salary + growth
            salary_util = (hr_offer - ctype.reservation_wage) / max(ctype.reservation_wage, 1)
            growth_util = 0.5  # baseline
            return salary_util * (1 - ctype.career_ambition) + growth_util * ctype.career_ambition
        else:
            # No deal: fallback to outside options
            if ctype.outside_options:
                best = max(o.get("salary", ctype.reservation_wage) for o in ctype.outside_options)
                return (best - ctype.reservation_wage) / max(ctype.reservation_wage, 1) * 0.5
            return 0.0

    @staticmethod
    def _hr_utility(offer: int, candidate_ask: int, htype: HRPrivateType) -> float:
        """Simplified HR utility for equilibrium analysis."""
        budget = htype.true_budget
        if offer >= candidate_ask:
            # Deal
            quality_benefit = 0.7  # base quality
            cost_efficiency = (budget - offer) / max(budget, 1)
            urgency_bonus = htype.urgency * 0.2
            return quality_benefit * 0.5 + cost_efficiency * 0.3 + urgency_bonus
        else:
            # No deal — penalty
            return -0.2 * htype.urgency

    # ── Result construction helpers ─────────────────────────────────────

    @staticmethod
    def _describe_candidate_strategy(ask: int, ctype: CandidatePrivateType) -> dict:
        return {
            "opening_salary_ask": ask,
            "stance": "firm" if ask > ctype.reservation_wage * 1.3 else "flexible",
            "reservation_wage": ctype.reservation_wage,
            "willing_to_concede_to": max(ctype.reservation_wage, int(ask * 0.85)),
            "career_ambition": ctype.career_ambition,
        }

    @staticmethod
    def _describe_hr_strategy(offer: int, htype: HRPrivateType) -> dict:
        return {
            "opening_offer": offer,
            "budget_ceiling": htype.true_budget,
            "equity_constraint": htype.internal_equity_constraint,
            "urgency": htype.urgency,
            "max_final_offer": min(htype.true_budget, htype.internal_equity_constraint) if htype.internal_equity_constraint > 0 else htype.true_budget,
        }

    @staticmethod
    def _compute_candidate_equilibrium_payoff(
        c_ask: int, h_offer: int, ctype: CandidatePrivateType, state: GameState
    ) -> float:
        return EquilibriumSolver._candidate_utility(c_ask, h_offer, ctype)

    @staticmethod
    def _compute_hr_equilibrium_payoff(
        h_offer: int, c_ask: int, htype: HRPrivateType, state: GameState
    ) -> float:
        return EquilibriumSolver._hr_utility(h_offer, c_ask, htype)

    @staticmethod
    def _compute_counterfactual_payoffs(
        c_best: int, h_best: int,
        c_options: list[int], h_options: list[int],
        ctype: CandidatePrivateType, htype: HRPrivateType,
        state: GameState,
    ) -> dict[str, float]:
        """Compute payoffs for alternative strategies."""
        alternatives = {}

        try:
            c_idx = c_options.index(c_best)
        except ValueError:
            c_idx = -1

        if c_idx > 0:
            c_lower = c_options[c_idx - 1]
            alternatives["candidate_asks_lower"] = EquilibriumSolver._candidate_utility(c_lower, h_best, ctype)

        if c_idx >= 0 and c_idx < len(c_options) - 1:
            c_higher = c_options[c_idx + 1]
            alternatives["candidate_asks_higher"] = EquilibriumSolver._candidate_utility(c_higher, h_best, ctype)

        try:
            h_idx = h_options.index(h_best)
        except ValueError:
            h_idx = -1

        if h_idx >= 0 and h_idx < len(h_options) - 1:
            h_higher = h_options[h_idx + 1]
            alternatives["hr_offers_higher"] = EquilibriumSolver._candidate_utility(c_best, h_higher, ctype)

        if h_idx > 0:
            h_lower = h_options[h_idx - 1]
            alternatives["hr_offers_lower"] = EquilibriumSolver._candidate_utility(c_best, h_lower, ctype)

        return alternatives
