"""CandidatePlayer — the job seeker in the Bayesian hiring game.

Private type: true_ability, reservation_wage, outside_options, career_ambition
Observable:    public offer, market signals, job description
Hidden from:   HR's budget, interviewer's bias, market's true state

Strategy: choose salary ask, decide accept/reject, choose to reveal/hide outside options
"""

from __future__ import annotations

from datetime import datetime

from game.players.base import BayesianPlayer, PlayerConfig
from models.schemas import AgentAction, CandidatePrivateType, GameState


class CandidatePlayer(BayesianPlayer):
    player_role = "candidate"

    def __init__(self, private_type: CandidatePrivateType, config: PlayerConfig | None = None):
        super().__init__(config)
        self.private_type = private_type

    def get_private_view(self, state: GameState, role: str) -> dict:
        return {
            "role": "candidate",
            "private": {
                "true_ability": self.private_type.true_ability,
                "reservation_wage": self.private_type.reservation_wage,
                "outside_options": self.private_type.outside_options,
                "career_ambition": self.private_type.career_ambition,
            },
            "public": {
                "round": state.round,
                "offer": state.public_offer,
                "level": state.public_level,
                "status": state.public_status,
                "job_title": state.job.title,
                "job_company": state.job.company,
                "salary_range": list(state.job.salary_range) if state.job.salary_range else None,
            },
            "beliefs": {
                k: b.model_dump() for k, b in state.candidate_beliefs.items()
            },
            "history": [
                {"player": a.player, "action": a.action_type, "params": a.params}
                for a in state.action_history[-3:]
            ],
        }

    # ── Rule-based decisions ────────────────────────────────────────────

    def _act_rules(self, state: GameState, private_view: dict) -> AgentAction:
        pt = self.private_type

        # Initial round: make opening salary demand
        if state.round == 0 or state.public_offer is None:
            return self._make_opening_offer(state, pt, private_view)

        # Negotiating: respond to HR's offer
        if state.public_status == "negotiating":
            return self._negotiate(state, pt, private_view)

        # Terminal
        return AgentAction(
            player="candidate", action_type="wait",
            params={}, reasoning="Terminal state.", confidence=0.5,
            round=state.round, timestamp=datetime.now().isoformat(),
        )

    def _make_opening_offer(
        self, state: GameState, pt: CandidatePrivateType, private_view: dict | None = None
    ) -> AgentAction:
        """First-move salary demand based on private type + market signals.

        Anchors to the candidate's own market value (reservation + ability premium),
        NOT the job's salary band. A P5 shouldn't ask for P8 salary just because
        that's the band.
        """
        # Base demand from outside options or reservation
        best_outside = pt.reservation_wage
        if pt.outside_options:
            best_outside = max(
                (opt.get("salary", pt.reservation_wage) for opt in pt.outside_options),
                default=pt.reservation_wage,
            )

        # Add premium based on ability and ambition
        ability_premium = pt.true_ability * 0.20  # Up to 20% above baseline
        ambition_discount = pt.career_ambition * 0.08  # Growth-seekers ask less

        # Anchor to own value, but if job band is LOWER than that, cap at band top
        ask = int(best_outside * (1 + ability_premium - ambition_discount))

        # Belief-driven adjustment: if HR is likely high-budget, raise ask up to 8%
        belief_note = ""
        if private_view:
            beliefs = private_view.get("beliefs", {})
            hr_belief = beliefs.get("hr", {})
            hr_dist = hr_belief.get("belief_distribution", {})
            high_budget_prob = (
                hr_dist.get("high_budget_high_urgency", 0)
                + hr_dist.get("high_budget_low_urgency", 0)
            )
            if high_budget_prob > 0.6:
                ask = int(ask * 1.08)
                belief_note = f" Belief: HR high-budget prob={high_budget_prob:.0%} -> ask +8%."
            elif high_budget_prob < 0.2:
                ask = int(ask * 0.95)
                belief_note = f" Belief: HR high-budget prob={high_budget_prob:.0%} -> ask -5%."

        # If job's salary band is significantly above our ask (level mismatch),
        # cap at the candidate's realistic ceiling, not the job's band
        if state.job.salary_range:
            band_low = state.job.salary_range[0]
            band_high = state.job.salary_range[1]
            # Only use band as ceiling if our own value is close to the band
            if ask >= band_low * 0.7:
                ask = min(ask, int(band_high * 1.05))
            # If we're far below the band (level mismatch), stick to our own value + 10%
            else:
                ask = min(ask, int(best_outside * 1.15))

        # Round to nice numbers
        ask = (ask // 5) * 5

        return AgentAction(
            player="candidate", action_type="offer",
            params={
                "salary_ask": ask,
                "level_ask": state.job.level,
                "opening_position": "firm" if pt.true_ability > 0.7 else "negotiable",
            },
            reasoning=(
                f"Opening salary demand: {ask}K/yr. "
                f"Based on ability={pt.true_ability:.0%}, reservation={pt.reservation_wage}K, "
                f"best outside={best_outside}K. "
                f"Strategy: {'growth-first' if pt.career_ambition > 0.7 else 'balanced' if pt.career_ambition > 0.3 else 'salary-first'}."
                + belief_note
            ),
            confidence=pt.true_ability,
            round=state.round, timestamp=datetime.now().isoformat(),
        )

    def _negotiate(
        self, state: GameState, pt: CandidatePrivateType, private_view: dict | None = None
    ) -> AgentAction:
        """Respond to HR's offer during negotiation."""
        offer = state.public_offer or 0
        offered_level = state.public_level or state.job.level

        # Accept if offer meets reservation + ambition-adjusted threshold
        accept_threshold = pt.reservation_wage
        if pt.career_ambition < 0.4:  # Salary-focused
            accept_threshold = int(pt.reservation_wage * 1.05)
        elif pt.career_ambition > 0.7:  # Growth-focused, more flexible
            accept_threshold = int(pt.reservation_wage * 0.90)

        # Belief-driven adjustment: if HR likely low-budget, lower threshold to close deal
        belief_note = ""
        if private_view:
            beliefs = private_view.get("beliefs", {})
            hr_belief = beliefs.get("hr", {})
            hr_dist = hr_belief.get("belief_distribution", {})
            low_budget_prob = (
                hr_dist.get("low_budget_low_urgency", 0)
                + hr_dist.get("low_budget_high_urgency", 0)
            )
            if low_budget_prob > 0.6:
                accept_threshold = int(accept_threshold * 0.95)
                belief_note = f" Belief: HR low-budget prob={low_budget_prob:.0%} -> threshold -5%."

        if offer >= accept_threshold:
            return AgentAction(
                player="candidate", action_type="accept",
                params={"accepted_salary": offer, "accepted_level": offered_level},
                reasoning=f"Offer {offer}K meets threshold {accept_threshold}K. Accepting." + belief_note,
                confidence=0.85, round=state.round,
                timestamp=datetime.now().isoformat(),
            )

        # Counter-offer: move toward middle ground
        if state.round < 3:
            best_outside = max(
                (o.get("salary", pt.reservation_wage) for o in pt.outside_options),
                default=pt.reservation_wage,
            )
            counter = int(offer + (best_outside - offer) * 0.4)
            counter = max(counter, int(best_outside * 0.9))
            counter = (counter // 5) * 5

            return AgentAction(
                player="candidate", action_type="counter_offer",
                params={"salary_ask": counter, "previous_offer": offer},
                reasoning=(
                    f"Counter: {counter}K (from {offer}K). "
                    f"Target: {best_outside}K. Conceding {(best_outside - counter) / max(best_outside - offer, 1):.0%}."
                ),
                confidence=round(pt.true_ability * 0.7, 2),
                round=state.round, timestamp=datetime.now().isoformat(),
            )

        # Late rounds: concede further but never below reservation
        final_offer = max(offer, pt.reservation_wage)
        if abs(offer - pt.reservation_wage) / max(pt.reservation_wage, 1) <= 0.10:
            return AgentAction(
                player="candidate", action_type="accept",
                params={"accepted_salary": offer},
                reasoning=f"Offer {offer}K close to reservation {pt.reservation_wage}K. Accepting.",
                confidence=0.6, round=state.round,
                timestamp=datetime.now().isoformat(),
            )

        # Walk away
        return AgentAction(
            player="candidate", action_type="reject",
            params={"final_offer": offer, "reservation": pt.reservation_wage},
            reasoning=f"Offer {offer}K below reservation {pt.reservation_wage}K. Walking away.",
            confidence=0.9, round=state.round,
            timestamp=datetime.now().isoformat(),
        )

    # ── Deliberation-powered decisions ──────────────────────────────────
    # The old _act_llm single-prompt approach is replaced by the two-phase
    # deliberation engine in base.py's _deliberate_and_act().
    # Candidate-specific prompt building is in game/deliberation.py:_candidate_phase1()
