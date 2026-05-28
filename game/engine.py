"""BiddingGameEngine — multi-round Bayesian hiring game orchestrator.

Runs a 4-player (Candidate, HR, Interviewer, Market) alternating-offer
negotiation game with incomplete information.

Each round:
  1. Market emits macro signals (supply/demand, competition, trends)
  2. Interviewer evaluates candidate (if at interview stage)
  3. Candidate and HR negotiate salary/level
  4. State updates, beliefs update, check termination

Terminal conditions:
  - Both Candidate and HR accept → outcome: accepted
  - Either party rejects → outcome: rejected
  - Max rounds reached → outcome: timeout

Design references:
  - NegMAS SAOP (Sequential Alternating Offer Protocol) — offer/counter pattern
  - Bayesian Game theory — each player has private type + beliefs about others
"""

from __future__ import annotations

import asyncio
import uuid
from copy import deepcopy
from datetime import datetime

from game.players.base import BayesianPlayer
from game.players.candidate import CandidatePlayer
from game.players.hr import HRPlayer
from game.players.interviewer import InterviewerPlayer
from game.players.market import MarketPlayer
from game.infowar import InfoWarEngine
from game.payoff import candidate_payoff, hr_payoff
from game.type_inferrer import TypeInferrer
from models.schemas import (
    AgentAction,
    BeliefState,
    GameResult,
    GameState,
    StructuredJob,
    StructuredResume,
)


class BiddingGameEngine:
    """Complete multi-round Bayesian hiring game.

    Usage:
        engine = BiddingGameEngine()
        result = await engine.run(resume, job)

    The engine creates all 4 players with inferred private types,
    runs the multi-round game, and returns a GameResult with full analysis.
    """

    def __init__(self, max_rounds: int = 8, seed: int | None = None):
        self.max_rounds = max_rounds
        if seed is not None:
            import random
            random.seed(seed)
        self._type_inferrer = TypeInferrer()
        # Runtime references set during run()
        self._persona: Any = None
        self._patience: Any = None
        self._players: dict[str, Any] = {}
        self._info_engine: InfoWarEngine | None = None
        self._info_results: list = []

    # ── Public API ──────────────────────────────────────────────────────

    async def run(
        self,
        resume: StructuredResume,
        job: StructuredJob,
        *,
        market_condition: str = "normal",
        strategy: str = "balanced",
        use_llm: bool = True,
    ) -> GameResult:
        """Run a complete bidding game simulation.

        Args:
            resume: Parsed candidate resume
            job: Target job description
            market_condition: "hot" | "normal" | "cool"
            strategy: Candidate strategy preset

        Returns:
            GameResult with full negotiation history, payoffs, and analysis.
        """
        # 1. Infer private types from observable data
        candidate_type = self._type_inferrer.infer_candidate_type(resume, strategy)
        hr_type = self._type_inferrer.infer_hr_type(job, market_condition)
        interviewer_type = self._type_inferrer.infer_interviewer_type()
        market_type = self._type_inferrer.infer_market_type(market_condition, job)

        # 1.5 Generate HR persona and patience state
        from game.persona import generate_random_persona
        from game.patience import PatienceState
        self._persona = generate_random_persona(seed=None)
        self._patience = PatienceState(hr_patience=self._persona.patience_baseline)

        # 2. Create players
        from game.players.base import PlayerConfig
        candidate = CandidatePlayer(candidate_type, config=PlayerConfig(use_llm=use_llm))
        hr = HRPlayer(hr_type, config=PlayerConfig(use_llm=use_llm))
        interviewer = InterviewerPlayer(interviewer_type, config=PlayerConfig(use_llm=use_llm))
        market = MarketPlayer(market_type, config=PlayerConfig(use_llm=use_llm))

        # Inject persona into HR player
        hr.set_persona(self._persona)

        self._players = {"hr": hr, "candidate": candidate, "interviewer": interviewer, "market": market}

        # 3. Initialize game state
        game_id = f"game-{uuid.uuid4().hex[:8]}"
        state = GameState(
            game_id=game_id,
            resume=resume,
            job=job,
            round=0,
            max_rounds=self.max_rounds,
            candidate_type=candidate_type,
            hr_type=hr_type,
            interviewer_type=interviewer_type,
            market_type=market_type,
            public_status="negotiating",
            candidate_beliefs={
                "hr": BeliefState(about_player="hr"),
                "interviewer": BeliefState(about_player="interviewer"),
                "market": BeliefState(about_player="market"),
            },
            hr_beliefs={
                "candidate": BeliefState(about_player="candidate"),
                "interviewer": BeliefState(about_player="interviewer"),
                "market": BeliefState(about_player="market"),
            },
            interviewer_beliefs={
                "candidate": BeliefState(about_player="candidate"),
                "hr": BeliefState(about_player="hr"),
            },
        )

        # 3.5 Initialize InfoWar engine and deal hand
        self._info_engine = InfoWarEngine()
        self._info_engine.deal_hand(state)
        self._info_results = []

        # 4. Run rounds
        for round_num in range(self.max_rounds):
            state.round = round_num

            # 4a+4b. Market emits signals + Interviewer evaluates (round 0)
            # These two are independent — run in parallel to cut latency
            if round_num == 0:
                market_action, interviewer_action = await asyncio.gather(
                    market.act(state, market.get_private_view(state, "market")),
                    interviewer.act(state, interviewer.get_private_view(state, "interviewer")),
                )
                state.action_history.append(market_action)
                self._apply_market_signal(state, market_action)
                state.action_history.append(interviewer_action)
                state.scores = interviewer_action.params.get("sub_scores", {})
            else:
                market_action = await market.act(state, market.get_private_view(state, "market"))
                state.action_history.append(market_action)
                self._apply_market_signal(state, market_action)

            # 4c. InfoWar phase (NEW v3.0)
            if state.info_war_enabled and self._info_engine:
                info_result = self._info_engine.run_phase(state)
                self._info_results.append(info_result)

            # 4d. Candidate acts (salary negotiation)
            candidate_action = await candidate.act(
                state, candidate.get_private_view(state, "candidate")
            )
            state.action_history.append(candidate_action)

            # 4e. HR responds
            hr_action = await hr.act(state, hr.get_private_view(state, "hr"))
            state.action_history.append(hr_action)

            # 4f. Resolve round
            self._resolve_round(state, candidate_action, hr_action)

            # 4g. Update beliefs
            self._update_all_beliefs(state, candidate_action, hr_action, market_action)

            # 4h. Update patience
            self._update_patience(state, candidate_action, hr_action, resume, market_condition)

            # 4i. Snapshot
            state.round_snapshots.append(self._snapshot(state))

            # 4j. Check termination
            if self._check_termination(state):
                break

        # 5. Build result
        result = self._build_result(state, game_id)
        result.hr_persona = {
            "name": self._persona.name,
            "archetype": self._persona.archetype,
            "tagline": self._persona.tagline,
            "avatar_expression": self._persona.avatar_expression,
            "avatar_color": self._persona.avatar_color,
        }

        # 5.5 Attach InfoWar results
        if self._info_results:
            result.info_war_summary = self._info_results[-1]
            result.trust_final = state.trust_state

        return result

    # ── Belief update ──────────────────────────────────────────────────

    @staticmethod
    def _update_all_beliefs(
        state: GameState,
        candidate_action: AgentAction,
        hr_action: AgentAction,
        market_action: AgentAction,
    ) -> None:
        """Update all players' beliefs after observing each other's actions."""
        from game.beliefs import (
            update_candidate_beliefs,
            update_hr_beliefs,
        )

        # Candidate updates beliefs about HR based on HR's action
        hr_observed = {
            "action_type": hr_action.action_type,
            "params": hr_action.params,
        }
        for opp in ["hr"]:
            if opp in state.candidate_beliefs:
                state.candidate_beliefs[opp] = update_candidate_beliefs(
                    state.candidate_beliefs[opp], hr_observed
                )

        # HR updates beliefs about Candidate based on candidate's action
        candidate_observed = {
            "action_type": candidate_action.action_type,
            "params": candidate_action.params,
        }
        for opp in ["candidate"]:
            if opp in state.hr_beliefs:
                state.hr_beliefs[opp] = update_hr_beliefs(
                    state.hr_beliefs[opp], candidate_observed
                )

    # ── Round resolution ────────────────────────────────────────────────

    def _apply_market_signal(self, state: GameState, action: AgentAction) -> None:
        """Extract and apply market signals to game state."""
        state.market_adjustment = action.params.get("market_adjustment", 1.0)
        state.competition_intensity = action.params.get("competition_intensity", 0.5)

    def _resolve_round(
        self,
        state: GameState,
        candidate_action: AgentAction,
        hr_action: AgentAction,
    ) -> None:
        """Determine the outcome of a negotiation round."""
        c_type = candidate_action.action_type
        h_type = hr_action.action_type

        # Extract salary offers (check multiple param keys)
        c_salary = (
            candidate_action.params.get("salary_ask")
            or candidate_action.params.get("accepted_salary")
        )
        h_salary = (
            hr_action.params.get("salary_offer")
            or hr_action.params.get("final_salary")
            or hr_action.params.get("accepted_salary")
        )

        # Update public offer to the latest proposed salary
        if h_salary is not None:
            state.public_offer = h_salary
        elif c_salary is not None:
            state.public_offer = c_salary

        # Both accept → deal
        if c_type == "accept" and h_type in ("accept", "offer"):
            state.public_status = "accepted"
            # Final salary: prefer HR's number, then candidate's, then existing offer
            state.public_offer = h_salary or c_salary or state.public_offer

        # Either rejects → broken
        elif c_type == "reject" or h_type == "reject":
            state.public_status = "rejected"

        # Both counter → convergence possible
        elif c_type in ("counter_offer", "offer") and h_type in ("counter_offer", "offer"):
            # If offers are within 8%, auto-accept at midpoint
            if c_salary and h_salary:
                gap = abs(c_salary - h_salary) / max(c_salary, h_salary, 1)
                if gap <= 0.08:
                    midpoint = int((c_salary + h_salary) / 2)
                    midpoint = (midpoint // 5) * 5
                    state.public_offer = midpoint
                    state.public_status = "accepted"

    # ── Patience update ──────────────────────────────────────────────────

    def _update_patience(
        self,
        state: GameState,
        candidate_action: AgentAction,
        hr_action: AgentAction,
        resume: StructuredResume,
        market_condition: str,
    ) -> None:
        """Update bilateral patience based on this round's actions and signals."""
        from game.patience import (
            compute_hr_patience_deltas,
            compute_candidate_patience_deltas,
            apply_patience_deltas,
        )

        # Extract resume signals
        resume_signals = self._extract_resume_signals_for_patience(resume, state)

        # Get interviewer recommendation from state
        interviewer_rec = ""
        for a in reversed(state.action_history):
            if a.player == "interviewer":
                interviewer_rec = a.params.get("recommendation", "")
                break

        # HR patience deltas
        hr_events = compute_hr_patience_deltas(
            candidate_action_type=candidate_action.action_type,
            candidate_params=candidate_action.params,
            hr_budget=state.hr_type.true_budget,
            market_condition=market_condition,
            resume_signals=resume_signals,
            interviewer_recommendation=interviewer_rec,
            round_num=state.round,
        )

        # Candidate patience deltas
        candidate_events = compute_candidate_patience_deltas(
            hr_action_type=hr_action.action_type,
            hr_params=hr_action.params,
            candidate_reservation=state.candidate_type.reservation_wage,
            market_condition=market_condition,
            round_num=state.round,
        )

        # Apply
        self._patience = apply_patience_deltas(self._patience, hr_events, candidate_events)

        # Attach patience to state for API serialization
        state.hr_patience = self._patience.hr_patience
        state.candidate_patience = self._patience.candidate_patience
        if not hasattr(state, 'patience_events'):
            state.patience_events = []
        state.patience_events = [
            {"round": e.round, "delta": e.delta, "reason": e.reason, "trigger": e.trigger, "source": e.source}
            for e in (hr_events + candidate_events)
        ]

    @staticmethod
    def _extract_resume_signals_for_patience(resume: StructuredResume, state: GameState) -> dict:
        """Extract resume quality signals for patience computation."""
        signals = {"school_tier": "", "competition_tier": "", "company_tier": ""}

        # School tier
        from core.knowledge.knowledge_base import classify_school
        best_school = ""
        for edu in resume.education:
            tier, _, _ = classify_school(edu.school)
            if tier in ("C9", "QS100") or (tier == "985" and best_school not in ("C9", "QS100")) or (tier == "211" and not best_school):
                best_school = tier
        signals["school_tier"] = best_school

        # Competition tier
        if resume.competitions:
            from core.knowledge.knowledge_base import classify_competition
            best_comp = ""
            for comp in resume.competitions:
                level, _, _ = classify_competition(comp.name, comp.award)
                if level in ("S", "A") or (level == "B" and best_comp not in ("S", "A")):
                    best_comp = level
            signals["competition_tier"] = best_comp

        # Company tier
        from core.knowledge.knowledge_base import classify_company
        best_co = ""
        for exp in resume.experience:
            tier, _, _ = classify_company(exp.company)
            if tier in ("T1", "foreign") or (tier == "T2" and best_co not in ("T1", "foreign")):
                best_co = tier
        signals["company_tier"] = best_co

        return signals

    # ── Termination ─────────────────────────────────────────────────────

    def _check_termination(self, state: GameState) -> bool:
        """Check if the negotiation should end.

        Uses dynamic patience-based termination instead of fixed round limits.
        """
        from game.patience import check_termination as patience_check

        should_end, reason = patience_check(
            self._patience, state.public_status, state.round, self.max_rounds
        )

        if should_end:
            if reason == "hr_patience_exhausted":
                state.public_status = "rejected"
                state.termination_reason = "hr_patience_exhausted"
            elif reason == "candidate_patience_exhausted":
                state.public_status = "rejected"
                state.termination_reason = "candidate_patience_exhausted"
            elif reason == "timeout":
                state.public_status = "timeout"
                state.termination_reason = "timeout"

            # Check for stalemate
            if state.public_status == "negotiating" and self._detect_stalemate(state):
                state.public_status = "rejected"
                state.termination_reason = "stalemate"
                return True

        return should_end

    @staticmethod
    def _detect_stalemate(state: GameState) -> bool:
        """Detect if negotiation is deadlocked.

        Returns True if the last 2 rounds show no progress in closing the gap.
        """
        if len(state.round_snapshots) < 2:
            return False

        # Check if offer hasn't moved much in last 2 rounds
        recent_offers = []
        for a in state.action_history[-6:]:
            salary = a.params.get("salary_offer") or a.params.get("salary_ask") or a.params.get("salary_amount")
            if salary:
                recent_offers.append(salary)

        if len(recent_offers) >= 4:
            # Check if the gap between min and max in last 4 offers is < 3%
            recent = recent_offers[-4:]
            gap = (max(recent) - min(recent)) / max(max(recent), 1)
            if gap < 0.03:
                return True

        return False

    # ── Result construction ─────────────────────────────────────────────

    def _build_result(self, state: GameState, game_id: str) -> GameResult:
        """Construct the final GameResult from terminal state."""
        outcome = state.public_status
        if outcome not in ("accepted", "rejected"):
            outcome = "timeout"

        final_salary = state.public_offer
        if final_salary is None and outcome == "accepted":
            # Fallback: if deal closed without explicit salary discussion,
            # use HR budget midpoint as reasonable estimate
            final_salary = int(state.hr_type.true_budget * 0.82)
            final_salary = (final_salary // 5) * 5
        final_level = state.public_level or state.job.level

        negotiation_rounds = state.round + 1

        # Compute success probability
        success_prob = self._estimate_success_probability(state)

        # Find key turning points
        key_turning_points = self._identify_turning_points(state)

        # Compute information asymmetry cost
        info_cost = self._compute_information_cost(state, outcome)

        # Determine winning strategy
        winning_strategy = self._determine_winning_strategy(state, outcome)

        # Build recommendation
        recommendation = self._build_recommendation(state, outcome, success_prob)

        # Partial result for payoff computation
        result = GameResult(
            game_id=game_id,
            outcome=outcome,
            final_state=state,
            final_salary=final_salary,
            final_level=final_level,
            negotiation_rounds=negotiation_rounds,
            success_probability=success_prob,
            key_turning_points=key_turning_points,
            information_asymmetry_cost=info_cost,
            winning_strategy=winning_strategy,
            recommendation=recommendation,
        )

        # Compute payoffs
        result.candidate_payoff = candidate_payoff(result, state.candidate_type)
        result.hr_payoff = hr_payoff(result, state.hr_type)

        # Generate parallel universes
        from counterfactual.universes import generate_parallel_universes
        result.parallel_universes = generate_parallel_universes(result, state)

        return result

    # ── Analysis methods ────────────────────────────────────────────────

    @staticmethod
    def _estimate_success_probability(state: GameState) -> float:
        """Data-driven success probability estimation.

        Combines interview evaluation, skill match, and market context
        into a realistic P(offer) estimate.
        """
        scores = getattr(state, 'scores', {}) or {}

        # Interview evaluation — support both old and new score key names
        iv_score = (
            scores.get("overall")
            or scores.get("skill")
            or (sum(scores.values()) / max(len(scores), 1) if scores else 0.5)
        )

        # Market context
        market = getattr(state, 'market_adjustment', 1.0)
        competition = getattr(state, 'competition_intensity', 0.5)

        # Skill match
        req = {s.lower() for s in state.job.required_skills}
        cand = {s.lower() for s in state.resume.skills}
        skill_match = len(req & cand) / max(len(req), 1) if req else 0.5

        # Experience adequacy
        from core.china_market_model import LEVEL_YEARS
        from datetime import date
        expected = LEVEL_YEARS.get(state.job.level, 3)
        total_years = 0.0
        today = date.today()
        for exp in state.resume.experience:
            if exp.start_date:
                end = exp.end_date or today
                total_years += (end - exp.start_date).days / 365.0
        exp_ratio = min(total_years / max(expected, 1), 1.5)

        # Composite with realistic weights
        base = (
            iv_score * 0.35
            + skill_match * 0.35
            + min(exp_ratio, 1.0) * 0.15
            + (1 - competition) * 0.15
        )
        adjusted = base * market

        # Hard floor/ceiling based on skill match
        if skill_match < 0.15:
            adjusted = min(adjusted, 0.25)  # Very low skill match caps success
        if skill_match < 0.05:
            adjusted = min(adjusted, 0.10)

        return round(min(max(adjusted, 0.03), 0.98), 3)

    @staticmethod
    def _identify_turning_points(state: GameState) -> list[AgentAction]:
        """Identify key actions that changed the negotiation trajectory."""
        turning_points = []
        for i, action in enumerate(state.action_history):
            # First offer sets the anchor
            if action.action_type in ("offer", "counter_offer") and action.params.get("salary_offer") or action.params.get("salary_ask"):
                if not turning_points:
                    turning_points.append(action)
                # Large concession (>15% change) is a turning point
                elif i > 0:
                    prev = state.action_history[i - 1]
                    prev_amt = prev.params.get("salary_offer") or prev.params.get("salary_ask") or 0
                    curr_amt = action.params.get("salary_offer") or action.params.get("salary_ask") or 0
                    if prev_amt > 0:
                        change = abs(curr_amt - prev_amt) / prev_amt
                        if change > 0.15:
                            turning_points.append(action)

            # Rejections are turning points
            if action.action_type == "reject":
                turning_points.append(action)

        return turning_points[-5:]  # Top 5

    @staticmethod
    def _compute_information_cost(state: GameState, outcome: str) -> float:
        """Estimate how much payoff was lost due to imperfect information.

        If information were perfect, would the outcome have been different?
        """
        if outcome == "accepted":
            # Check if HR significantly overpaid due to candidate bluffing
            c_type = state.candidate_type
            h_type = state.hr_type
            if state.public_offer and c_type.reservation_wage:
                overpayment = (state.public_offer - c_type.reservation_wage) / max(state.public_offer, 1)
                return round(min(overpayment * 0.3, 0.3), 3)

        if outcome == "rejected":
            # Check if rejection was due to information asymmetry
            c_type = state.candidate_type
            h_type = state.hr_type
            if state.public_offer and c_type.reservation_wage:
                gap = (c_type.reservation_wage - state.public_offer) / max(state.public_offer, 1)
                if gap < 0.15:  # Close to agreement
                    return round(gap * 1.5, 3)

        return 0.0

    @staticmethod
    def _determine_winning_strategy(state: GameState, outcome: str) -> str:
        """Identify what worked (or would have worked)."""
        if outcome == "accepted":
            # Which strategy led to success?
            c_actions = [a for a in state.action_history if a.player == "candidate"]
            if c_actions:
                first = c_actions[0]
                if first.params.get("opening_position") == "firm":
                    return "firm_opening"
                return "flexible_opening"

        # What would have worked?
        c_type = state.candidate_type
        if c_type.career_ambition > 0.7:
            return "should_emphasize_growth"
        return "should_adjust_salary_expectations"

    @staticmethod
    def _build_recommendation(state: GameState, outcome: str, prob: float) -> str:
        """Build a human-readable recommendation from game results."""
        if outcome == "accepted":
            return (
                f"Negotiation successful. Final salary: {state.public_offer}K/yr. "
                f"Success probability: {prob:.0%}. "
                "Strategy worked — the candidate's opening position and HR's flexibility aligned."
            )

        if outcome == "rejected":
            # Analyze why
            c_type = state.candidate_type
            h_type = state.hr_type
            if state.public_offer and c_type.reservation_wage > state.public_offer:
                return (
                    f"Negotiation failed. Gap: {c_type.reservation_wage - state.public_offer}K. "
                    f"Candidate bottom line ({c_type.reservation_wage}K) exceeds HR's best offer ({state.public_offer}K). "
                    "Consider: lower expectations, target a different company, or wait for market improvement."
                )
            return (
                f"Negotiation failed. HR budget ({h_type.true_budget}K) insufficient for candidate's expectations. "
                "Consider alternative roles or companies."
            )

        return (
            "Negotiation timed out without agreement. "
            f"Success probability was {prob:.0%}. Consider a more direct approach in the next negotiation."
        )

    @staticmethod
    def _snapshot(state: GameState) -> dict:
        """Create a lightweight round snapshot."""
        return {
            "round": state.round,
            "status": state.public_status,
            "offer": state.public_offer,
            "num_actions": len(state.action_history),
            "timestamp": datetime.now().isoformat(),
        }
