"""HRPlayer — the hiring manager in the Bayesian hiring game.

Private type: true_budget, candidate_pool_quality, urgency, internal_equity_constraint
Observable:    resume signals, candidate's salary demands, market conditions
Hidden from:   candidate's true ability, outside options, reservation wage

Strategy: make salary offers, decide to continue/terminate negotiation, manage budget
"""

from __future__ import annotations

from datetime import datetime

from game.players.base import BayesianPlayer, PlayerConfig
from models.schemas import AgentAction, GameState, HRPrivateType


class HRPlayer(BayesianPlayer):
    player_role = "hr"

    def __init__(self, private_type: HRPrivateType, config: PlayerConfig | None = None):
        super().__init__(config)
        self.private_type = private_type

    def get_private_view(self, state: GameState, role: str) -> dict:
        return {
            "role": "hr",
            "private": {
                "true_budget": self.private_type.true_budget,
                "candidate_pool_quality": self.private_type.candidate_pool_quality,
                "urgency": self.private_type.urgency,
                "internal_equity_constraint": self.private_type.internal_equity_constraint,
            },
            "public": {
                "round": state.round,
                "offer": state.public_offer,
                "level": state.public_level,
                "status": state.public_status,
                "candidate_name": state.resume.name,
                "candidate_skills": state.resume.skills,
            },
            "beliefs": {
                k: b.model_dump() for k, b in state.hr_beliefs.items()
            },
            "history": [
                {"player": a.player, "action": a.action_type, "params": a.params}
                for a in state.action_history[-3:]
            ],
        }

    # ── Rule-based decisions ────────────────────────────────────────────

    def _act_rules(self, state: GameState, private_view: dict) -> AgentAction:
        pt = self.private_type

        # Hard gate: reject immediately if candidate is clearly unqualified
        quality = self._estimate_candidate_quality(state)
        if quality < 0.20:
            return AgentAction(
                player="hr", action_type="reject",
                params={"reason": "low_quality", "estimated_quality": quality},
                reasoning=f"Candidate quality ({quality:.0%}) far below threshold. Immediate rejection.",
                confidence=0.95, round=state.round,
                timestamp=datetime.now().isoformat(),
            )

        # Initial round: wait for candidate to make first move
        # But if candidate has already acted, respond instead of waiting again
        candidate_has_acted = any(
            a.player == "candidate" for a in state.action_history
        )
        if state.round == 0 and state.public_offer is None and not candidate_has_acted:
            return AgentAction(
                player="hr", action_type="wait",
                params={},
                reasoning="Waiting for candidate's salary expectation.",
                confidence=0.5, round=state.round,
                timestamp=datetime.now().isoformat(),
            )

        # Evaluate the latest candidate action
        last_candidate_action = None
        for a in reversed(state.action_history):
            if a.player == "candidate":
                last_candidate_action = a
                break

        if last_candidate_action is None:
            return self._make_initial_offer(state, pt)

        action_type = last_candidate_action.action_type
        candidate_ask = last_candidate_action.params.get("salary_ask", 0)

        if action_type == "offer":
            return self._respond_to_opening(candidate_ask, state, pt, private_view)
        elif action_type == "counter_offer":
            return self._respond_to_counter(candidate_ask, state, pt, private_view)
        elif action_type == "accept":
            return self._confirm_accept(state, pt)
        elif action_type == "reject":
            return self._handle_rejection(state, pt)
        return self._make_initial_offer(state, pt)

    def _make_initial_offer(self, state: GameState, pt: HRPrivateType) -> AgentAction:
        """Make an opening offer based on budget and candidate quality signals."""
        # Estimate candidate quality from resume signals
        estimated_quality = self._estimate_candidate_quality(state)

        # Offer: start below budget with room to negotiate
        budget = pt.true_budget
        equity_limit = pt.internal_equity_constraint if pt.internal_equity_constraint > 0 else budget

        # If candidate quality is too low, reject immediately
        if estimated_quality < 0.25:
            return AgentAction(
                player="hr", action_type="reject",
                params={"reason": "low_quality", "estimated_quality": estimated_quality},
                reasoning=f"Candidate quality ({estimated_quality:.0%}) too low. Immediate rejection.",
                confidence=0.9, round=state.round,
                timestamp=datetime.now().isoformat(),
            )

        # Opening offer: 75-85% of budget depending on quality
        quality_discount = (1.0 - estimated_quality) * 0.15
        offer_pct = 0.75 + quality_discount + pt.urgency * 0.10
        offer = int(budget * offer_pct)

        # Apply resume screening multiplier (tier B gets lower opening offer)
        screening_mul = getattr(state, "screening_multiplier", 1.0)
        if screening_mul < 1.0:
            offer = int(offer * screening_mul)

        # Cap at equity constraint
        offer = min(offer, int(equity_limit * 0.95))
        offer = (offer // 5) * 5

        return AgentAction(
            player="hr", action_type="offer",
            params={
                "salary_offer": offer,
                "level_offer": state.job.level,
                "budget_remaining_pct": round((budget - offer) / max(budget, 1), 2),
            },
            reasoning=(
                f"Initial offer: {offer}K/yr ({(offer/budget):.0%} of budget). "
                f"Candidate est. quality: {estimated_quality:.0%}. "
                f"Urgency: {pt.urgency:.0%}. Pool quality: {pt.candidate_pool_quality:.0%}."
                + (f" Screening adjustment: {screening_mul:.0%}." if screening_mul < 1.0 else "")
            ),
            confidence=estimated_quality,
            round=state.round, timestamp=datetime.now().isoformat(),
        )

    def _respond_to_opening(
        self, candidate_ask: int, state: GameState, pt: HRPrivateType, private_view: dict | None = None
    ) -> AgentAction:
        """Respond to candidate's opening salary demand."""
        budget = pt.true_budget
        equity_limit = pt.internal_equity_constraint if pt.internal_equity_constraint > 0 else budget
        quality = self._estimate_candidate_quality(state)

        # Reject if candidate quality is too low
        if quality < 0.25:
            return AgentAction(
                player="hr", action_type="reject",
                params={"reason": "low_quality", "estimated_quality": quality},
                reasoning=f"Candidate quality ({quality:.0%}) too low for this role. Rejecting.",
                confidence=0.9, round=state.round,
                timestamp=datetime.now().isoformat(),
            )

        # Belief-driven adjustment: if candidate likely strong, be more generous
        belief_note = ""
        discount_pct = 0.92
        if private_view:
            beliefs = private_view.get("beliefs", {})
            cand_belief = beliefs.get("candidate", {})
            cand_dist = cand_belief.get("belief_distribution", {})
            strong_prob = cand_dist.get("strong_candidate", 0)
            if strong_prob > 0.6:
                discount_pct = 0.96
                belief_note = f" Belief: strong candidate prob={strong_prob:.0%} -> less aggressive counter."
            elif strong_prob < 0.2:
                discount_pct = 0.88
                belief_note = f" Belief: strong candidate prob={strong_prob:.0%} -> more aggressive counter."

        # If ask is within budget range, accept directly
        if candidate_ask <= budget * 0.85:
            return AgentAction(
                player="hr", action_type="offer",
                params={"salary_offer": candidate_ask, "accepted_directly": True},
                reasoning=f"Candidate ask {candidate_ask}K well within budget. Accepting.{belief_note}",
                confidence=0.8, round=state.round,
                timestamp=datetime.now().isoformat(),
            )

        # If ask is within budget, negotiate
        if candidate_ask <= budget:
            target = int(candidate_ask * discount_pct)
            target = max(target, int(budget * 0.78))
            target = (target // 5) * 5
            return AgentAction(
                player="hr", action_type="counter_offer",
                params={"salary_offer": target, "previous_ask": candidate_ask},
                reasoning=f"Counter: {target}K to candidate ask of {candidate_ask}K.{belief_note}",
                confidence=0.65, round=state.round,
                timestamp=datetime.now().isoformat(),
            )

        # Ask exceeds budget: counter at budget ceiling or reject
        if candidate_ask <= budget * 1.25:
            offer = int(min(budget, equity_limit) * 0.95)
            offer = (offer // 5) * 5
            return AgentAction(
                player="hr", action_type="counter_offer",
                params={"salary_offer": offer, "final_offer": True},
                reasoning=f"Ask {candidate_ask}K above budget {budget}K. Best and final: {offer}K.{belief_note}",
                confidence=0.5, round=state.round,
                timestamp=datetime.now().isoformat(),
            )

        # Too far apart — reject
        return AgentAction(
            player="hr", action_type="reject",
            params={"reason": "budget_exceeded", "ask": candidate_ask, "budget": budget},
            reasoning=f"Ask {candidate_ask}K far exceeds budget {budget}K. Rejecting.{belief_note}",
            confidence=0.9, round=state.round,
            timestamp=datetime.now().isoformat(),
        )

    def _respond_to_counter(
        self, candidate_ask: int, state: GameState, pt: HRPrivateType, private_view: dict | None = None
    ) -> AgentAction:
        """Respond to candidate's counter-offer."""
        budget = pt.true_budget
        equity_limit = pt.internal_equity_constraint if pt.internal_equity_constraint > 0 else budget

        # Belief-driven adjustment: if candidate likely strong, increase concession
        belief_note = ""
        concession_mult = 1.0
        if private_view:
            beliefs = private_view.get("beliefs", {})
            cand_belief = beliefs.get("candidate", {})
            cand_dist = cand_belief.get("belief_distribution", {})
            strong_prob = cand_dist.get("strong_candidate", 0)
            if strong_prob > 0.6:
                concession_mult = 1.15
                belief_note = f" Belief: strong candidate prob={strong_prob:.0%} -> +15% concession."
            elif strong_prob < 0.2:
                concession_mult = 0.85
                belief_note = f" Belief: strong candidate prob={strong_prob:.0%} -> -15% concession."

        # Compute concession based on urgency and pool quality
        max_concession = budget * (0.05 + pt.urgency * 0.15) * concession_mult
        current_offer = state.public_offer or int(budget * 0.75)
        new_offer = int(current_offer + max_concession * (1 - pt.candidate_pool_quality))
        new_offer = min(new_offer, int(min(budget, equity_limit) * 0.98))
        new_offer = (new_offer // 5) * 5

        # If candidate asks for LESS than what we were going to offer, accept their ask
        if candidate_ask <= new_offer:
            # Accept at candidate's ask (with small goodwill bump if far below)
            final = candidate_ask if candidate_ask >= current_offer * 0.7 else min(candidate_ask + int(candidate_ask * 0.1), new_offer)
            final = (final // 5) * 5
            return AgentAction(
                player="hr", action_type="offer",
                params={"salary_offer": final, "accepted_candidate_ask": True},
                reasoning=f"Candidate ask {candidate_ask}K within our range. Accepting at {final}K.{belief_note}",
                confidence=0.85, round=state.round,
                timestamp=datetime.now().isoformat(),
            )

        if candidate_ask <= new_offer * 1.05:
            # Close enough — accept
            final = int((candidate_ask + new_offer) / 2)
            final = (final // 5) * 5
            return AgentAction(
                player="hr", action_type="offer",
                params={"salary_offer": final, "meeting_in_middle": True},
                reasoning=f"Meeting at {final}K (ask={candidate_ask}K, offer={new_offer}K).{belief_note}",
                confidence=0.75, round=state.round,
                timestamp=datetime.now().isoformat(),
            )

        if state.round < state.max_rounds - 1:
            return AgentAction(
                player="hr", action_type="counter_offer",
                params={"salary_offer": new_offer},
                reasoning=f"Counter: {new_offer}K. Budget remaining: {budget - new_offer}K.{belief_note}",
                confidence=0.55, round=state.round,
                timestamp=datetime.now().isoformat(),
            )

        # Last round: best and final
        final = int(min(budget, equity_limit) * 0.98)
        final = (final // 5) * 5
        return AgentAction(
            player="hr", action_type="offer",
            params={"salary_offer": final, "best_and_final": True},
            reasoning=f"Best and final: {final}K. Urgency: {pt.urgency:.0%}.{belief_note}",
            confidence=0.7, round=state.round,
            timestamp=datetime.now().isoformat(),
        )

    def _confirm_accept(self, state: GameState, pt: HRPrivateType) -> AgentAction:
        return AgentAction(
            player="hr", action_type="accept",
            params={"final_salary": state.public_offer, "status": "hired"},
            reasoning="Candidate accepted offer. Hiring confirmed.",
            confidence=1.0, round=state.round,
            timestamp=datetime.now().isoformat(),
        )

    def _handle_rejection(self, state: GameState, pt: HRPrivateType) -> AgentAction:
        # If urgent and budget has room, might improve offer
        if pt.urgency > 0.8 and state.round < state.max_rounds - 1:
            improved = int(state.public_offer * 1.10) if state.public_offer else int(pt.true_budget * 0.80)
            improved = min(improved, pt.true_budget)
            improved = (improved // 5) * 5
            return AgentAction(
                player="hr", action_type="counter_offer",
                params={"salary_offer": improved, "improved": True},
                reasoning=f"Urgent hire — improving offer to {improved}K.",
                confidence=0.5, round=state.round,
                timestamp=datetime.now().isoformat(),
            )
        return AgentAction(
            player="hr", action_type="accept",  # Accept the rejection
            params={"status": "rejected"},
            reasoning="Candidate rejected. Moving to next candidate in pool.",
            confidence=0.8, round=state.round,
            timestamp=datetime.now().isoformat(),
        )

    # ── Helpers ─────────────────────────────────────────────────────────

    def _estimate_candidate_quality(self, state: GameState) -> float:
        """Realistic HR screening: skill match + company tier + school + stability.

        In Chinese internet hiring, HR uses a composite heuristic:
          - Skill keyword match (primary)
          - Company pedigree (strong signal — "大厂出来的人靠谱")
          - School tier (secondary, matters more for junior)
          - Stability (job hopping = red flag)
          - Age/level alignment
        """
        skills = state.resume.skills or []
        required = state.job.required_skills or []
        total_years = self._compute_total_years(state)

        if not required:
            return 0.5

        req_set = {s.lower().strip() for s in required}
        cand_set = {s.lower().strip() for s in skills}
        skill_match = len(req_set & cand_set) / len(req_set)

        # Company pedigree
        from core.knowledge.knowledge_base import classify_company
        tiers = []
        for exp in state.resume.experience:
            tier, _, _ = classify_company(exp.company)
            tiers.append(tier)
        t1_count = tiers.count("T1") + tiers.count("foreign")
        company_bonus = 0.20 if t1_count >= 2 else 0.12 if t1_count == 1 else 0.05 if "T2" in tiers else 0.0

        # School tier
        school_bonus = 0.0
        if state.resume.education:
            from core.knowledge.knowledge_base import classify_school
            for edu in state.resume.education:
                tier, _, _ = classify_school(edu.school)
                if tier in ("C9", "QS100"):
                    school_bonus = 0.10
                    break
                elif tier == "985":
                    school_bonus = 0.06
                elif tier == "211" and school_bonus < 0.04:
                    school_bonus = 0.03

        # Level-dependent: school matters more for junior roles
        from core.china_market_model import LEVEL_YEARS
        expected = LEVEL_YEARS.get(state.job.level, 3)
        if total_years > 5:
            school_bonus *= 0.4  # Diminish school signal with experience

        # Stability penalty
        stability_penalty = self._get_stability_penalty(state)

        # Age check
        age_penalty, _ = self._check_age_penalty(state)
        if age_penalty > 0:
            stability_penalty += age_penalty * 0.5

        quality = skill_match * 0.50 + company_bonus + school_bonus - stability_penalty
        return round(min(max(quality, 0.0), 1.0), 3)

    @staticmethod
    def _compute_total_years(state: GameState) -> float:
        from datetime import date as _date
        total = 0.0
        today = _date.today()
        for exp in state.resume.experience:
            if exp.start_date:
                end = exp.end_date or today
                total += (end - exp.start_date).days / 365.0
        return max(total, 0.0)

    @staticmethod
    def _get_stability_penalty(state: GameState) -> float:
        """Job-hopping penalty for HR screening."""
        if not state.resume.experience:
            return 0.0
        from datetime import date as _date
        today = _date.today()
        tenures = []
        for exp in state.resume.experience:
            if exp.start_date:
                end = exp.end_date or today
                tenures.append((end - exp.start_date).days / 365.0)
        if not tenures:
            return 0.0
        avg = sum(tenures) / len(tenures)
        if avg < 0.8:
            return 0.30
        elif avg < 1.2:
            return 0.18
        elif avg < 1.8:
            return 0.06
        return 0.0

    @staticmethod
    def _check_age_penalty(state: GameState) -> tuple[float, bool]:
        """Check if candidate exceeds implicit age thresholds for this level."""
        from core.china_market_model import AGE_THRESHOLDS, COMPANY_AGE_TOLERANCE
        threshold = AGE_THRESHOLDS.get(state.job.level)
        if not threshold:
            return 0.0, False
        total_years = HRPlayer._compute_total_years(state)
        has_master = any(
            hasattr(e, 'degree') and e.degree in ("硕士", "博士")
            for e in (state.resume.education or [])
        )
        start_age = 25 if has_master else 22
        est_age = start_age + total_years

        tolerance = COMPANY_AGE_TOLERANCE.get(state.job.company, 1.0)
        soft = threshold["soft_ceiling"] * tolerance
        hard = threshold["hard_ceiling"] * tolerance

        if est_age > hard:
            return 0.25, True
        elif est_age > soft:
            return 0.10, True
        return 0.0, False

    # ── Deliberation-powered decisions ──────────────────────────────────

    def _get_persona(self):
        """Return the HRPersona for this negotiation session.

        The persona is injected by the engine during game initialization.
        If not set, returns None (deliberation falls back to no-persona prompts).
        """
        return getattr(self, "_persona", None)

    def set_persona(self, persona):
        """Inject the HR persona for this negotiation."""
        self._persona = persona

    # The old _act_llm single-prompt approach is replaced by the two-phase
    # deliberation engine in base.py's _deliberate_and_act().
    # HR-specific prompt building (with persona injection) is in
    # game/deliberation.py:_hr_phase1()
