"""BayesianPlayer — base class for all agents in the hiring game.

Each player has:
  - private_type: hidden information only they know
  - beliefs: probability distribution over each opponent's private type
  - strategy: mapping from (state, beliefs) → action

The act() method is async — players can use LLM for type inference.
The act_sync() method is the pure rule-based fallback.
"""

from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

from models.schemas import AgentAction, BeliefState, GameState


@dataclass
class PlayerConfig:
    """Configuration for a single player instance."""
    player_id: str = field(default_factory=lambda: f"player-{uuid.uuid4().hex[:6]}")
    use_llm: bool = True  # Whether to use LLM for type inference
    strategy_name: str = "default"
    model: str | None = None  # LLM model override (None = use default)


class BayesianPlayer(ABC):
    """Abstract base for all players in the Bayesian hiring game.

    Subclasses must implement:
      - _act_rules(state, private_view) → AgentAction
      - _act_llm(state, private_view) → AgentAction (optional, defaults to _act_rules)
    """

    player_role: str  # "candidate" | "hr" | "interviewer" | "market"

    def __init__(self, config: PlayerConfig | None = None):
        self.config = config or PlayerConfig()
        self.player_id = self.config.player_id
        self.beliefs: dict[str, BeliefState] = {}  # opp_role → BeliefState

    # ── Public API ──────────────────────────────────────────────────────

    async def act(self, state: GameState, private_view: dict) -> AgentAction:
        """Three-phase decision: deliberate → decide → act.

        Phase 1 (Deliberation): Run two-dimension projection (adversarial + future self)
        Phase 2 (Decide): Select the best option from the deliberation
        Phase 3 (Act): Build the final AgentAction with deliberation trace attached
        """
        from datetime import datetime

        # Phase 1+2: Deliberate and select
        if self.config.use_llm:
            try:
                action = await self._deliberate_and_act(state, private_view)
                if action is not None:
                    return action
            except Exception:
                pass

        # Fallback to rule-based
        action = self._act_rules(state, private_view)
        return action

    async def _deliberate_and_act(
        self, state: GameState, private_view: dict
    ) -> AgentAction | None:
        """Run deliberation and build an action with the deliberation trace attached.

        Subclasses should override _build_deliberation_persona() and
        _build_deliberation_prompt() instead of this method.
        """
        from datetime import datetime
        from game.deliberation import deliberate, deliberation_to_dict

        persona = self._get_persona() if hasattr(self, "_get_persona") else None

        result = await deliberate(
            agent_role=self.player_role,
            state=state,
            private_view=private_view,
            persona=persona,
            model=self.config.model,
        )

        if not result.evaluated_options:
            return None

        selected = result.evaluated_options[result.selected_index]

        # Build reasoning from deliberation
        reasoning = selected.opponent_projections[0].reasoning if selected.opponent_projections else ""
        if not reasoning:
            reasoning = f"选择：{selected.option.label}（EU={selected.expected_utility:.2f}）"

        action = AgentAction(
            player=self.player_role,
            action_type=selected.option.action_type,
            params=selected.option.params,
            reasoning=reasoning,
            confidence=result.confidence,
            round=state.round,
            timestamp=datetime.now().isoformat(),
        )

        # Attach full deliberation trace for frontend display
        action.params["_deliberation"] = deliberation_to_dict(result)

        return action

    def act_sync(self, state: GameState, private_view: dict) -> AgentAction:
        """Synchronous rule-based action — for standalone/CLI usage."""
        return self._act_rules(state, private_view)

    # ── Belief management ───────────────────────────────────────────────

    def get_private_view(self, state: GameState, role: str) -> dict:
        """Extract the information visible to a given player role.

        Each player sees: public state + their own private type + their beliefs.
        They do NOT see other players' private types.
        """
        raise NotImplementedError

    def update_beliefs(self, observed_actions: list[dict], context: dict) -> dict[str, BeliefState]:
        """Update beliefs about opponents based on observed actions.

        This is the Bayesian update step — after each round, players observe
        what others did and revise their type estimates.
        """
        return self.beliefs

    # ── Subclass hooks ──────────────────────────────────────────────────

    @abstractmethod
    def _act_rules(self, state: GameState, private_view: dict) -> AgentAction:
        """Rule-based decision logic. Must be implemented by subclasses."""
        ...

    async def _act_llm(self, state: GameState, private_view: dict) -> AgentAction | None:
        """LLM-powered decision. Optional — subclasses may override."""
        return None

    def expected_utility(
        self, state: GameState, action: AgentAction, private_view: dict
    ) -> float:
        """Compute expected utility of taking `action` in `state` given beliefs."""
        return 0.0
