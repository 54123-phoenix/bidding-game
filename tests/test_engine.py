"""Tests for BiddingGameEngine core logic."""

import pytest

from game.engine import BiddingGameEngine
from models.schemas import (
    AgentAction,
    CandidatePrivateType,
    GameState,
    HRPrivateType,
    InterviewerPrivateType,
    MarketPrivateType,
    StructuredJob,
    StructuredResume,
)


def _resume():
    return StructuredResume(
        resume_id="r1",
        name="Test Candidate",
        skills=["Python", "Go"],
        education=[],
        experience=[],
    )


def _job(salary_range=(40, 80)):
    return StructuredJob(
        job_id="j1",
        title="Backend Engineer",
        company="TestCo",
        salary_range=salary_range,
        required_skills=["Python", "Go"],
    )


def _state(**overrides) -> GameState:
    defaults = dict(
        game_id="test",
        resume=_resume(),
        job=_job(),
        candidate_type=CandidatePrivateType(true_ability=0.5, reservation_wage=40),
        hr_type=HRPrivateType(true_budget=60),
        interviewer_type=InterviewerPrivateType(),
        market_type=MarketPrivateType(),
    )
    defaults.update(overrides)
    return GameState(**defaults)


class TestInferCandidateType:
    def test_balanced_strategy_default(self):
        engine = BiddingGameEngine(seed=42)
        ctype = engine._infer_candidate_type(_resume(), "balanced")
        assert 0.0 <= ctype.true_ability <= 1.0
        assert ctype.reservation_wage >= 0
        assert 0.0 <= ctype.career_ambition <= 1.0

    def test_aggressive_strategy_increases_ability_and_reservation(self):
        engine = BiddingGameEngine(seed=42)
        aggressive = engine._infer_candidate_type(_resume(), "aggressive")
        balanced = engine._infer_candidate_type(_resume(), "balanced")
        assert aggressive.true_ability >= balanced.true_ability
        assert aggressive.reservation_wage >= balanced.reservation_wage

    def test_conservative_strategy_decreases_ability_and_reservation(self):
        engine = BiddingGameEngine(seed=42)
        conservative = engine._infer_candidate_type(_resume(), "conservative")
        balanced = engine._infer_candidate_type(_resume(), "balanced")
        assert conservative.true_ability <= balanced.true_ability
        assert conservative.reservation_wage <= balanced.reservation_wage

    def test_unknown_strategy_defaults_to_balanced(self):
        engine = BiddingGameEngine(seed=42)
        result = engine._infer_candidate_type(_resume(), "unknown_strategy")
        balanced = engine._infer_candidate_type(_resume(), "balanced")
        assert result.true_ability == balanced.true_ability


class TestInferHRType:
    def test_budget_from_salary_range_top(self):
        engine = BiddingGameEngine(seed=42)
        hr_type = engine._infer_hr_type(_job(), "normal")
        assert hr_type.true_budget == _job().salary_range[1]

    def test_urgency_by_market_condition(self):
        engine = BiddingGameEngine(seed=42)
        hot = engine._infer_hr_type(_job(), "hot")
        normal = engine._infer_hr_type(_job(), "normal")
        cool = engine._infer_hr_type(_job(), "cool")
        assert hot.urgency > normal.urgency > cool.urgency

    def test_equity_constraint_is_80_percent_of_budget(self):
        engine = BiddingGameEngine(seed=42)
        hr_type = engine._infer_hr_type(_job(), "normal")
        assert hr_type.internal_equity_constraint == int(hr_type.true_budget * 0.80)

    def test_default_budget_when_no_range(self):
        engine = BiddingGameEngine(seed=42)
        job = StructuredJob(job_id="j2", title="Dev", company="Co")
        hr_type = engine._infer_hr_type(job, "normal")
        assert hr_type.true_budget == 40


class TestInferInterviewerType:
    def test_strictness_in_range(self):
        engine = BiddingGameEngine(seed=42)
        itype = engine._infer_interviewer_type()
        assert 0.3 <= itype.strictness <= 0.7

    def test_bias_vector_keys(self):
        engine = BiddingGameEngine(seed=42)
        itype = engine._infer_interviewer_type()
        assert "school_prestige" in itype.bias_vector
        assert "big_company" in itype.bias_vector
        assert "youth" in itype.bias_vector

    def test_risk_tolerance_in_range(self):
        engine = BiddingGameEngine(seed=42)
        itype = engine._infer_interviewer_type()
        assert 0.2 <= itype.risk_tolerance <= 0.8

    def test_preferred_skill_style_is_valid(self):
        engine = BiddingGameEngine(seed=42)
        itype = engine._infer_interviewer_type()
        assert itype.preferred_skill_style in ("depth", "breadth", "balance")


class TestInferMarketType:
    def test_hot_market_low_ratio(self):
        engine = BiddingGameEngine(seed=42)
        mtype = engine._infer_market_type("hot", _job())
        assert mtype.supply_demand_ratio < 1.0
        assert mtype.salary_trend == "rising"

    def test_cool_market_high_ratio(self):
        engine = BiddingGameEngine(seed=42)
        mtype = engine._infer_market_type("cool", _job())
        assert mtype.supply_demand_ratio > 1.0
        assert mtype.salary_trend == "cooling"

    def test_normal_market_stable(self):
        engine = BiddingGameEngine(seed=42)
        mtype = engine._infer_market_type("normal", _job())
        assert mtype.supply_demand_ratio == 1.0
        assert mtype.salary_trend == "stable"

    def test_hot_skills_extracted_from_job(self):
        engine = BiddingGameEngine(seed=42)
        mtype = engine._infer_market_type("hot", _job())
        assert isinstance(mtype.hot_skills, list)


class TestResolveRound:
    def test_both_accept_creates_deal(self):
        engine = BiddingGameEngine(seed=42)
        state = _state()
        c_action = AgentAction(player="candidate", action_type="accept", params={"accepted_salary": 50})
        h_action = AgentAction(player="hr", action_type="accept", params={"final_salary": 50})
        engine._resolve_round(state, c_action, h_action)
        assert state.public_status == "accepted"
        assert state.public_offer == 50

    def test_candidate_reject_ends_negotiation(self):
        engine = BiddingGameEngine(seed=42)
        state = _state()
        c_action = AgentAction(player="candidate", action_type="reject")
        h_action = AgentAction(player="hr", action_type="offer", params={"salary_offer": 50})
        engine._resolve_round(state, c_action, h_action)
        assert state.public_status == "rejected"

    def test_hr_reject_ends_negotiation(self):
        engine = BiddingGameEngine(seed=42)
        state = _state()
        c_action = AgentAction(player="candidate", action_type="counter_offer", params={"salary_ask": 60})
        h_action = AgentAction(player="hr", action_type="reject")
        engine._resolve_round(state, c_action, h_action)
        assert state.public_status == "rejected"

    def test_offers_within_8_percent_auto_accept(self):
        engine = BiddingGameEngine(seed=42)
        state = _state()
        c_action = AgentAction(player="candidate", action_type="counter_offer", params={"salary_ask": 50})
        h_action = AgentAction(player="hr", action_type="counter_offer", params={"salary_offer": 52})
        engine._resolve_round(state, c_action, h_action)
        assert state.public_status == "accepted"
        assert state.public_offer == 50

    def test_offers_far_apart_continue_negotiating(self):
        engine = BiddingGameEngine(seed=42)
        state = _state()
        c_action = AgentAction(player="candidate", action_type="counter_offer", params={"salary_ask": 80})
        h_action = AgentAction(player="hr", action_type="counter_offer", params={"salary_offer": 40})
        engine._resolve_round(state, c_action, h_action)
        assert state.public_status == "negotiating"


class TestCheckTermination:
    def test_accepted_ends_game(self):
        engine = BiddingGameEngine(seed=42)
        state = _state(public_status="accepted")
        from game.patience import PatienceState
        engine._patience = PatienceState(hr_patience=0.5, candidate_patience=0.5)
        assert engine._check_termination(state) is True

    def test_rejected_ends_game(self):
        engine = BiddingGameEngine(seed=42)
        state = _state(public_status="rejected")
        from game.patience import PatienceState
        engine._patience = PatienceState(hr_patience=0.5, candidate_patience=0.5)
        assert engine._check_termination(state) is True


class TestEstimateSuccessProbability:
    def test_perfect_match_high_probability(self):
        engine = BiddingGameEngine(seed=42)
        state = _state(
            scores={"overall": 0.9},
            market_adjustment=1.0,
            competition_intensity=0.2,
        )
        prob = engine._estimate_success_probability(state)
        assert prob > 0.5

    def test_low_skill_match_capped(self):
        engine = BiddingGameEngine(seed=42)
        state = _state(
            resume=StructuredResume(resume_id="r2", name="X", skills=["Ruby"]),
            scores={"overall": 0.5},
            market_adjustment=1.0,
            competition_intensity=0.5,
        )
        prob = engine._estimate_success_probability(state)
        assert prob <= 0.25

    def test_probability_bounded_between_0_03_and_0_98(self):
        engine = BiddingGameEngine(seed=42)
        state = _state(scores={})
        prob = engine._estimate_success_probability(state)
        assert 0.03 <= prob <= 0.98


class TestDetectStalemate:
    def test_no_stalemate_early(self):
        engine = BiddingGameEngine(seed=42)
        state = _state()
        assert engine._detect_stalemate(state) is False

    def test_stalemate_when_offers_stagnant(self):
        engine = BiddingGameEngine(seed=42)
        state = _state(
            action_history=[
                AgentAction(player="candidate", action_type="counter_offer", params={"salary_ask": 50}),
                AgentAction(player="hr", action_type="counter_offer", params={"salary_offer": 51}),
                AgentAction(player="candidate", action_type="counter_offer", params={"salary_ask": 50}),
                AgentAction(player="hr", action_type="counter_offer", params={"salary_offer": 51}),
                AgentAction(player="candidate", action_type="counter_offer", params={"salary_ask": 50}),
                AgentAction(player="hr", action_type="counter_offer", params={"salary_offer": 51}),
            ],
            round_snapshots=[{}, {}],
        )
        assert engine._detect_stalemate(state) is True


class TestDetermineWinningStrategy:
    def test_firm_opening_when_first_action_firm(self):
        engine = BiddingGameEngine(seed=42)
        state = _state(
            action_history=[
                AgentAction(player="candidate", action_type="offer", params={"opening_position": "firm"}),
            ],
        )
        result = engine._determine_winning_strategy(state, "accepted")
        assert result == "firm_opening"

    def test_emphasize_growth_for_high_ambition(self):
        engine = BiddingGameEngine(seed=42)
        state = _state(
            candidate_type=CandidatePrivateType(true_ability=0.5, reservation_wage=40, career_ambition=0.9),
        )
        result = engine._determine_winning_strategy(state, "rejected")
        assert result == "should_emphasize_growth"


class TestComputeInformationCost:
    def test_accepted_overpayment_cost(self):
        engine = BiddingGameEngine(seed=42)
        state = _state(
            candidate_type=CandidatePrivateType(true_ability=0.5, reservation_wage=30),
            public_offer=50,
        )
        cost = engine._compute_information_cost(state, "accepted")
        assert cost > 0.0

    def test_rejected_near_agreement_cost(self):
        engine = BiddingGameEngine(seed=42)
        state = _state(
            candidate_type=CandidatePrivateType(true_ability=0.5, reservation_wage=50),
            public_offer=45,
        )
        cost = engine._compute_information_cost(state, "rejected")
        assert cost > 0.0

    def test_no_cost_when_far_apart(self):
        engine = BiddingGameEngine(seed=42)
        state = _state(
            candidate_type=CandidatePrivateType(true_ability=0.5, reservation_wage=80),
            public_offer=30,
        )
        cost = engine._compute_information_cost(state, "rejected")
        assert cost == 0.0


class TestBuildRecommendation:
    def test_accepted_recommendation_includes_salary(self):
        engine = BiddingGameEngine(seed=42)
        state = _state(public_offer=55)
        rec = engine._build_recommendation(state, "accepted", 0.8)
        assert "55" in rec
        assert "successful" in rec.lower()

    def test_rejected_recommendation_suggests_alternatives(self):
        engine = BiddingGameEngine(seed=42)
        state = _state(
            candidate_type=CandidatePrivateType(true_ability=0.5, reservation_wage=60),
            hr_type=HRPrivateType(true_budget=50),
            public_offer=45,
        )
        rec = engine._build_recommendation(state, "rejected", 0.3)
        assert "consider" in rec.lower() or "alternative" in rec.lower()

    def test_timeout_recommendation(self):
        engine = BiddingGameEngine(seed=42)
        state = _state()
        rec = engine._build_recommendation(state, "timeout", 0.5)
        assert "超时" in rec or "timed out" in rec.lower()
