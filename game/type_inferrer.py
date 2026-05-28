"""TypeInferrer — infer private types from observable data.

Each player in the Bayesian hiring game has a private type (hidden information).
The TypeInferrer extracts these types from resume signals, job descriptions,
market conditions, and random generation.
"""

from __future__ import annotations

import random

from core.china_market_model import HOT_SKILLS_2025
from core.signal_extractor import extract_signals
from game.strategies.base import (
    AggressiveStrategy,
    ConservativeStrategy,
    GradualStrategy,
    HonestStrategy,
    Strategy,
)
from models.schemas import (
    CandidatePrivateType,
    HRPrivateType,
    InterviewerPrivateType,
    MarketPrivateType,
    StructuredJob,
    StructuredResume,
)


class TypeInferrer:
    """Infer private types for all 4 players from observable data."""

    def infer_candidate_type(
        self, resume: StructuredResume, strategy: str
    ) -> CandidatePrivateType:
        """Infer candidate's private type from resume signals."""
        signals = extract_signals(resume)

        # True ability: composite of skill match + experience + signals
        ability = signals.t_shape_score * 0.4 + signals.inferred_leverage * 0.3 + 0.3

        # Reservation wage from suggested salary range
        if signals.suggested_salary_range:
            reservation = signals.suggested_salary_range[0]
        else:
            reservation = 25  # Default for junior level

        # Career ambition: from growth trajectory
        trajectory_map = {"steep": 0.9, "steady": 0.6, "plateau": 0.3, "declining": 0.1}
        ambition = trajectory_map.get(signals.career_trajectory_label, 0.5)

        # Resolve strategy name → class for behavioural calibration
        strategy_map: dict[str, type[Strategy]] = {
            "aggressive": AggressiveStrategy,
            "conservative": ConservativeStrategy,
            "gradual": GradualStrategy,
            "honest": HonestStrategy,
            "balanced": GradualStrategy,  # "balanced" maps to GradualStrategy
        }
        strategy_cls = strategy_map.get(strategy, GradualStrategy)

        # Strategy-driven parameter multipliers
        strategy_overrides = {
            AggressiveStrategy: {"ability_mult": 1.15, "reservation_mult": 1.20, "ambition_mult": 0.7},
            ConservativeStrategy: {"ability_mult": 0.90, "reservation_mult": 0.85, "ambition_mult": 0.8},
            HonestStrategy: {"ability_mult": 1.00, "reservation_mult": 1.00, "ambition_mult": 1.0},
            GradualStrategy: {"ability_mult": 1.00, "reservation_mult": 1.00, "ambition_mult": 1.0},
        }
        override = strategy_overrides.get(strategy_cls, strategy_overrides[GradualStrategy])

        return CandidatePrivateType(
            true_ability=min(ability * override["ability_mult"], 1.0),
            reservation_wage=int(reservation * override["reservation_mult"]),
            career_ambition=min(ambition * override["ambition_mult"], 1.0),
            skill_growth_rate=signals.skill_growth_rate,
        )

    @staticmethod
    def infer_hr_type(job: StructuredJob, market_condition: str) -> HRPrivateType:
        """Infer HR's private type from job posting and market conditions."""
        # Budget: from salary range
        if job.salary_range:
            budget = job.salary_range[1]  # Top of range is real budget
        else:
            budget = 40  # Default

        # Urgency: market-dependent
        urgency_map = {"hot": 0.8, "normal": 0.5, "cool": 0.3}
        urgency = urgency_map.get(market_condition, 0.5)

        # Equity constraint: 75-85% of budget
        equity = int(budget * 0.80)

        return HRPrivateType(
            true_budget=budget,
            urgency=urgency,
            internal_equity_constraint=equity,
        )

    @staticmethod
    def infer_interviewer_type() -> InterviewerPrivateType:
        """Create an interviewer with random individual differences."""
        return InterviewerPrivateType(
            strictness=round(random.uniform(0.3, 0.7), 2),
            bias_vector={
                "school_prestige": round(random.uniform(-0.2, 0.3), 2),
                "big_company": round(random.uniform(-0.1, 0.25), 2),
                "youth": round(random.uniform(-0.1, 0.2), 2),
            },
            preferred_skill_style=random.choice(["depth", "breadth", "balance"]),
            risk_tolerance=round(random.uniform(0.2, 0.8), 2),
        )

    @staticmethod
    def infer_market_type(market_condition: str, job: StructuredJob) -> MarketPrivateType:
        """Infer market state from conditions and job context."""
        if market_condition == "hot":
            ratio = 0.6   # Candidate market
            trend = "rising"
        elif market_condition == "cool":
            ratio = 1.8   # Employer market
            trend = "cooling"
        else:
            ratio = 1.0
            trend = "stable"

        # Hot skills from the job
        hot = [s for s in job.required_skills if s.lower() in {h.lower() for h in HOT_SKILLS_2025}]

        return MarketPrivateType(
            supply_demand_ratio=ratio,
            salary_trend=trend,
            hot_skills=hot,
            industry_growth=0.15 if market_condition == "hot" else 0.0 if market_condition == "cool" else 0.05,
        )
