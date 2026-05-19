"""MarketPlayer — the macro environment in the Bayesian hiring game.

Private type: supply_demand_ratio, salary_trend, hot_skills, industry_growth
Observable:    partial market signals (published salary bands, hiring activity)
Hidden from:   all individual player private types

Strategy: sets market conditions that affect all players' payoffs and strategies.
Acts as a "nature" player — its actions are external shocks, not strategic choices.
"""

from __future__ import annotations

import math
import random
from datetime import datetime

from game.players.base import BayesianPlayer, PlayerConfig
from models.schemas import AgentAction, GameState, MarketPrivateType


class MarketPlayer(BayesianPlayer):
    player_role = "market"

    def __init__(self, private_type: MarketPrivateType, config: PlayerConfig | None = None):
        super().__init__(config)
        self.private_type = private_type

    def get_private_view(self, state: GameState, role: str) -> dict:
        return {
            "role": "market",
            "private": {
                "supply_demand_ratio": self.private_type.supply_demand_ratio,
                "salary_trend": self.private_type.salary_trend,
                "hot_skills": self.private_type.hot_skills,
                "industry_growth": self.private_type.industry_growth,
            },
            "public": {
                "round": state.round,
                "job_title": state.job.title,
                "job_company": state.job.company,
                "job_level": state.job.level,
                "candidate_skills": state.resume.skills,
            },
        }

    # ── Rule-based market signals ───────────────────────────────────────

    def _act_rules(self, state: GameState, private_view: dict) -> AgentAction:
        """Emit market signals that affect the negotiation environment.

        Market acts once at the start, then provides updated signals each round.
        """
        mt = self.private_type

        # Compute market adjustment factor
        market_adjustment = self._compute_market_adjustment(mt)

        # Compute competition intensity
        competition = self._compute_competition(mt)

        # Identify which of the candidate's skills are "hot"
        hot_skill_overlap = self._hot_skill_overlap(state, mt)

        # Salary trend signal
        trend_signal = self._trend_signal(mt)

        # Market action is always "signal" — it publishes macro conditions
        return AgentAction(
            player="market", action_type="signal",
            params={
                "market_adjustment": round(market_adjustment, 3),
                "competition_intensity": round(competition, 3),
                "hot_skill_overlap": hot_skill_overlap,
                "salary_trend": mt.salary_trend,
                "trend_signal": trend_signal,
                "industry_growth": mt.industry_growth,
                "supply_demand_label": (
                    "candidate_market" if mt.supply_demand_ratio < 0.7
                    else "balanced" if mt.supply_demand_ratio < 1.3
                    else "employer_market"
                ),
            },
            reasoning=(
                f"Market: {market_adjustment:.2f}x adjustment, "
                f"competition={competition:.0%}, "
                f"trend={mt.salary_trend}, "
                f"hot skills overlap: {hot_skill_overlap}%. "
                f"Supply/demand: {mt.supply_demand_ratio:.2f} ({'candidate-favored' if mt.supply_demand_ratio < 1.0 else 'employer-favored'})."
            ),
            confidence=0.8,
            round=state.round, timestamp=datetime.now().isoformat(),
        )

    # ── Signal computation ──────────────────────────────────────────────

    def _compute_market_adjustment(self, mt: MarketPrivateType) -> float:
        """Compute the market adjustment multiplier.

        > 1.0 = candidate-favored (easy to get offers)
        < 1.0 = employer-favored (hard to get offers)

        Range: [0.5, 1.5]
        """
        # Base: inverse of supply/demand ratio
        base = 1.0 / max(mt.supply_demand_ratio, 0.3)

        # Trend modifier
        trend_mod = {"rising": 0.05, "stable": 0.0, "cooling": -0.08}[mt.salary_trend]

        # Industry growth modifier
        growth_mod = mt.industry_growth * 0.5

        adjustment = base + trend_mod + growth_mod
        return round(min(max(adjustment, 0.5), 1.5), 3)

    def _compute_competition(self, mt: MarketPrivateType) -> float:
        """Compute competition intensity — how many applicants per role.

        0.0 = no competition (unique skill set)
        1.0 = extreme competition (every role has 50+ applicants)
        """
        # Based on supply/demand ratio
        if mt.supply_demand_ratio <= 0.5:
            base = 0.1  # Talent shortage
        elif mt.supply_demand_ratio <= 1.0:
            base = 0.3
        elif mt.supply_demand_ratio <= 2.0:
            base = 0.6
        else:
            base = 0.85

        # Industry growth dampens competition
        growth_dampener = -mt.industry_growth * 0.2

        # Deterministic noise based on market parameters (avoids non-reproducible runs)
        noise_hash = abs(hash((mt.supply_demand_ratio, mt.salary_trend, mt.industry_growth))) % 21
        noise = (noise_hash / 100.0) - 0.10  # Range: [-0.10, +0.10]

        return round(min(max(base + growth_dampener + noise, 0.0), 1.0), 3)

    def _hot_skill_overlap(self, state: GameState, mt: MarketPrivateType) -> int:
        """What percentage of the candidate's skills are in high demand?"""
        if not mt.hot_skills or not state.resume.skills:
            return 0

        hot_set = {s.lower().strip() for s in mt.hot_skills}
        cand_set = {s.lower().strip() for s in state.resume.skills}
        overlap = len(hot_set & cand_set)

        return round(overlap / max(len(cand_set), 1) * 100)

    def _trend_signal(self, mt: MarketPrivateType) -> str:
        """Human-readable market trend description."""
        if mt.salary_trend == "rising":
            return "薪资上涨趋势 — 候选人议价能力增强"
        elif mt.salary_trend == "cooling":
            return "薪资降温趋势 — 雇主议价能力增强"
        return "薪资平稳 — 供需均衡"

    # ── Utility ─────────────────────────────────────────────────────────

    @staticmethod
    def get_market_multiplier(market_type: MarketPrivateType) -> float:
        """Get the salary negotiation multiplier from market conditions."""
        from core.china_market_model import MARKET_MULTIPLIERS

        if market_type.supply_demand_ratio < 0.7 and market_type.salary_trend == "rising":
            return MARKET_MULTIPLIERS["hot"]
        elif market_type.supply_demand_ratio > 1.5:
            return MARKET_MULTIPLIERS["cool"]
        return MARKET_MULTIPLIERS["normal"]
