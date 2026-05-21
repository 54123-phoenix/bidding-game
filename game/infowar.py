"""InfoWar Engine — information warfare mechanism for the bidding game.

Extends the core negotiation with a "meta-game" of information manipulation:
  - Candidates hold information cards (outside offers, current salary, etc.)
  - Each round, before salary negotiation, both sides may play info actions
  - Trust evolves based on honesty / deception / verification
  - Detected lies can lead to immediate rejection

This module is designed to be injected into BiddingGameEngine without
breaking existing logic — all new fields have safe defaults.
"""

from __future__ import annotations

import random
import uuid
from dataclasses import dataclass

from models.schemas import (
    GameState,
    InformationCard,
    InformationAction,
    InfoWarResult,
    TrustState,
)


# ═══════════════════════════════════════════════════════════════════════════════
# Card Templates — default hand dealt to every candidate
# ═══════════════════════════════════════════════════════════════════════════════

CARD_TEMPLATES: list[dict] = [
    {
        "card_type": "outside_offer",
        "icon": "📨",
        "description": "我收到了其他公司的offer",
        "verifiability": 0.70,
        "trust_impact": -0.40,
        "salary_impact": 15,
        "default_value": "阿里P7 · 80K/年",
    },
    {
        "card_type": "current_salary",
        "icon": "💰",
        "description": "我目前的薪资水平",
        "verifiability": 0.90,
        "trust_impact": -0.60,
        "salary_impact": 8,
        "default_value": "45K/年",
    },
    {
        "card_type": "true_ability",
        "icon": "🧠",
        "description": "我的真实能力评估",
        "verifiability": 0.30,
        "trust_impact": -0.30,
        "salary_impact": 5,
        "default_value": "85%",
    },
    {
        "card_type": "family_burden",
        "icon": "🏠",
        "description": "我的家庭负担情况",
        "verifiability": 0.20,
        "trust_impact": -0.20,
        "salary_impact": -3,
        "default_value": "高（房贷+育儿）",
    },
    {
        "card_type": "other_interviews",
        "icon": "🔄",
        "description": "我正在面试的其他公司",
        "verifiability": 0.40,
        "trust_impact": -0.30,
        "salary_impact": 10,
        "default_value": "3家进行中",
    },
    {
        "card_type": "resignation_timeline",
        "icon": "📅",
        "description": "我的离职时间线",
        "verifiability": 0.60,
        "trust_impact": -0.30,
        "salary_impact": 5,
        "default_value": "1个月",
    },
]


# ═══════════════════════════════════════════════════════════════════════════════
# InfoWarEngine
# ═══════════════════════════════════════════════════════════════════════════════

class InfoWarEngine:
    """Manages the information warfare mini-game within each negotiation round.

    Usage (inside BiddingGameEngine):
        info_engine = InfoWarEngine()
        info_engine.deal_hand(state)           # once at game start
        info_result = info_engine.run_phase(state)  # each round before salary negotiation
    """

    def __init__(self, rng: random.Random | None = None):
        self.rng = rng or random.Random()

    # ── Setup ───────────────────────────────────────────────────────────

    def deal_hand(self, state: GameState) -> None:
        """Deal a fresh hand of information cards to the candidate."""
        hand: list[InformationCard] = []
        for tmpl in CARD_TEMPLATES:
            card = InformationCard(
                card_id=f"card-{uuid.uuid4().hex[:6]}",
                card_type=tmpl["card_type"],
                true_value=tmpl["default_value"],
                revealed_value=None,
                reveal_state="hidden",
                verifiability=tmpl["verifiability"],
                trust_impact=tmpl["trust_impact"],
                salary_impact=tmpl["salary_impact"],
                description=tmpl["description"],
                icon=tmpl["icon"],
            )
            hand.append(card)
        state.candidate_hand = hand
        state.trust_state = TrustState()

    # ── Per-round phase ─────────────────────────────────────────────────

    def run_phase(self, state: GameState) -> InfoWarResult:
        """Run one round of information warfare.

        This is called BEFORE the salary negotiation actions each round.
        Returns a summary for narrative / UI display.
        """
        if not state.info_war_enabled or not state.candidate_hand:
            return InfoWarResult(
                round=state.round,
                trust_before=state.trust_state,
                trust_after=state.trust_state,
            )

        trust_before = state.trust_state.model_copy(deep=True)
        result = InfoWarResult(
            round=state.round,
            trust_before=trust_before,
            trust_after=trust_before,
        )

        # Candidate info action (if any pending from frontend)
        cand_info = self._get_candidate_info_action(state)
        if cand_info:
            result.candidate_action = cand_info
            self._apply_candidate_info(state, cand_info, result)

        # HR info action (probe or verify)
        hr_info = self._generate_hr_info_action(state)
        if hr_info:
            result.hr_action = hr_info
            self._apply_hr_info(state, hr_info, result)

        # Update trust label
        state.trust_state.trust_label = self._trust_label(state.trust_state.hr_trust_in_candidate)
        result.trust_after = state.trust_state.model_copy(deep=True)
        result.narrative = self._build_narrative(result)

        return result

    # ── Candidate info actions ──────────────────────────────────────────

    def _get_candidate_info_action(self, state: GameState) -> InformationAction | None:
        """Retrieve candidate's pending info action from state (set by frontend/API).

        If none pending, candidate defaults to 'conceal everything'.
        """
        # The frontend sets a pending action via API; here we just check state.
        # For rule-based fallback, candidate may randomly reveal low-risk cards.
        return None  # placeholder — actual action comes from user input

    def apply_candidate_action(
        self,
        state: GameState,
        action: InformationAction,
    ) -> InfoWarResult:
        """Apply a candidate-initiated info action (called from API route)."""
        trust_before = state.trust_state.model_copy(deep=True)
        result = InfoWarResult(
            round=state.round,
            trust_before=trust_before,
            trust_after=trust_before,
            candidate_action=action,
        )
        self._apply_candidate_info(state, action, result)

        # HR may respond with verify
        hr_response = self._hr_respond_to_candidate_info(state, action)
        if hr_response:
            result.hr_action = hr_response
            self._apply_hr_info(state, hr_response, result)

        state.trust_state.trust_label = self._trust_label(state.trust_state.hr_trust_in_candidate)
        result.trust_after = state.trust_state.model_copy(deep=True)
        result.narrative = self._build_narrative(result)
        state.information_history.append(action)
        if result.hr_action:
            state.information_history.append(result.hr_action)
        return result

    def _apply_candidate_info(
        self,
        state: GameState,
        action: InformationAction,
        result: InfoWarResult,
    ) -> None:
        """Apply candidate's info action to game state."""
        card = next((c for c in state.candidate_hand if c.card_id == action.target_card), None)
        if not card:
            return

        if action.action_type == "reveal":
            card.reveal_state = "revealed"
            card.revealed_value = action.stated_value
            state.candidate_reveal_count += 1
            result.cards_revealed.append(card.card_id)
            # Revealing truth builds trust
            delta = 0.08
            state.trust_state.hr_trust_in_candidate = min(1.0, state.trust_state.hr_trust_in_candidate + delta)
            state.trust_state.last_trust_change = delta
            action.trust_delta = delta

        elif action.action_type == "fake":
            card.reveal_state = "faked"
            card.revealed_value = action.stated_value
            result.cards_faked.append(card.card_id)
            # Fake is hidden until verified
            action.trust_delta = 0.0

        elif action.action_type == "conceal":
            # Nothing happens visibly
            action.trust_delta = 0.0

        elif action.action_type == "probe":
            # Candidate probes HR — rare, but possible
            state.hr_probe_count += 1
            result.cards_probed.append(card.card_id)
            # Probing slightly reduces HR trust (seems pushy)
            delta = -0.03
            state.trust_state.hr_trust_in_candidate = max(0.0, state.trust_state.hr_trust_in_candidate + delta)
            state.trust_state.last_trust_change = delta
            action.trust_delta = delta

    # ── HR info actions ─────────────────────────────────────────────────

    def _generate_hr_info_action(self, state: GameState) -> InformationAction | None:
        """Generate HR's autonomous info action (probe or verify).

        Called when candidate did NOT play an info action this round.
        """
        # HR only acts if there are faked cards to verify or if trust is low
        faked = [c for c in state.candidate_hand if c.reveal_state == "faked"]
        if faked and self.rng.random() < 0.25:
            return self._hr_verify_action(state, self.rng.choice(faked))

        # Random probe
        if state.hr_probe_count < 2 and self.rng.random() < 0.15:
            return self._hr_probe_action(state)

        return None

    def _hr_respond_to_candidate_info(
        self,
        state: GameState,
        cand_action: InformationAction,
    ) -> InformationAction | None:
        """HR responds to candidate's info action."""
        if cand_action.action_type == "fake":
            card = next((c for c in state.candidate_hand if c.card_id == cand_action.target_card), None)
            if card:
                return self._hr_verify_action(state, card)
        elif cand_action.action_type == "reveal":
            # HR may verify high-stakes reveals
            card = next((c for c in state.candidate_hand if c.card_id == cand_action.target_card), None)
            if card and card.verifiability > 0.7 and self.rng.random() < 0.3:
                return self._hr_verify_action(state, card)
        return None

    def _hr_verify_action(self, state: GameState, card: InformationCard) -> InformationAction:
        """HR attempts to verify a card's claimed value."""
        suspicion = 1.0 - state.trust_state.hr_trust_in_candidate
        verify_prob = card.verifiability * (0.3 + 0.7 * suspicion)

        detected = self.rng.random() < verify_prob and card.reveal_state == "faked"

        action = InformationAction(
            action_type="verify",
            target_card=card.card_id,
            stated_value=card.revealed_value,
            actual_value=card.true_value,
            detected=detected,
        )

        if detected:
            action.detection_reason = f"HR通过背景调查发现{card.description}与事实不符"
            action.trust_delta = card.trust_impact
            state.trust_state.hr_trust_in_candidate = max(
                0.0, state.trust_state.hr_trust_in_candidate + card.trust_impact
            )
            state.trust_state.last_trust_change = card.trust_impact
            state.trust_state.red_flags.append(action.detection_reason)
        else:
            # Verification passed (or nothing to detect)
            if card.reveal_state == "faked":
                # Fake went undetected — candidate gains hidden advantage
                action.trust_delta = 0.05
                state.trust_state.hr_trust_in_candidate = min(
                    1.0, state.trust_state.hr_trust_in_candidate + 0.05
                )
            else:
                action.trust_delta = 0.02
                state.trust_state.hr_trust_in_candidate = min(
                    1.0, state.trust_state.hr_trust_in_candidate + 0.02
                )

        return action

    def _hr_probe_action(self, state: GameState) -> InformationAction:
        """HR probes candidate with a question."""
        state.hr_probe_count += 1
        return InformationAction(
            action_type="probe",
            target_card=None,
            hr_reaction="HR试探性地询问了你的薪资期望底线...",
            trust_delta=0.0,
        )

    def _apply_hr_info(
        self,
        state: GameState,
        action: InformationAction,
        result: InfoWarResult,
    ) -> None:
        """Apply HR's info action to state (mostly trust updates already done)."""
        if action.action_type == "verify" and action.detected:
            result.detected_fakes.append(action.target_card or "unknown")
        elif action.action_type == "probe":
            result.cards_probed.append("hr_probe")

    # ── Helpers ─────────────────────────────────────────────────────────

    @staticmethod
    def _trust_label(trust: float) -> str:
        if trust >= 0.8:
            return "高度信任"
        if trust >= 0.6:
            return "基本信任"
        if trust >= 0.4:
            return "谨慎信任"
        if trust >= 0.2:
            return "心存疑虑"
        return "完全不信任"

    @staticmethod
    def _build_narrative(result: InfoWarResult) -> str:
        parts: list[str] = []
        if result.candidate_action:
            a = result.candidate_action
            if a.action_type == "reveal":
                parts.append(f"你透露了信息，HR的信任度{a.trust_delta:+.0%}")
            elif a.action_type == "fake":
                parts.append("你释放了一个信号，HR正在评估...")
            elif a.action_type == "conceal":
                parts.append("你选择了保持沉默")
            elif a.action_type == "probe":
                parts.append("你试探了HR的底线")

        if result.hr_action:
            h = result.hr_action
            if h.action_type == "verify" and h.detected:
                parts.append(f"⚠️ HR识破了谎言！信任度暴跌{h.trust_delta:+.0%}")
            elif h.action_type == "verify":
                parts.append("HR进行了核实，未发现异常")
            elif h.action_type == "probe":
                parts.append(h.hr_reaction or "HR试探了你的态度")

        if not parts:
            return "本轮双方都没有进行信息交换"

        return "；".join(parts)
