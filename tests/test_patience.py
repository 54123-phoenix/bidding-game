"""Tests for patience system."""

import pytest

from game.patience import (
    PatienceState,
    check_termination,
    compute_candidate_patience_deltas,
    compute_hr_patience_deltas,
    apply_patience_deltas,
)


class TestComputeHRPatienceDeltas:
    def test_aggressive_counter_reduces_hr_patience(self):
        events = compute_hr_patience_deltas(
            candidate_action_type="counter_offer",
            candidate_params={"salary_ask": 100},
            hr_budget=60,
            market_condition="normal",
            resume_signals={},
            interviewer_recommendation="",
            round_num=1,
        )
        assert any(e.delta < 0 for e in events)

    def test_high_ask_relative_to_budget_punishes_more(self):
        events_high = compute_hr_patience_deltas(
            candidate_action_type="counter_offer",
            candidate_params={"salary_ask": 120},
            hr_budget=60,
            market_condition="normal",
            resume_signals={},
            interviewer_recommendation="",
            round_num=1,
        )
        events_low = compute_hr_patience_deltas(
            candidate_action_type="counter_offer",
            candidate_params={"salary_ask": 70},
            hr_budget=60,
            market_condition="normal",
            resume_signals={},
            interviewer_recommendation="",
            round_num=1,
        )
        high_penalty = sum(e.delta for e in events_high)
        low_penalty = sum(e.delta for e in events_low)
        assert high_penalty < low_penalty

    def test_strong_hire_recommendation_bonuses(self):
        events = compute_hr_patience_deltas(
            candidate_action_type="counter_offer",
            candidate_params={"salary_ask": 70},
            hr_budget=60,
            market_condition="normal",
            resume_signals={},
            interviewer_recommendation="strong_hire",
            round_num=1,
        )
        assert any(e.delta > 0 and "强烈推荐" in e.reason for e in events)

    def test_hot_market_reduces_patience_loss(self):
        events_hot = compute_hr_patience_deltas(
            candidate_action_type="counter_offer",
            candidate_params={"salary_ask": 80},
            hr_budget=60,
            market_condition="hot",
            resume_signals={},
            interviewer_recommendation="",
            round_num=1,
        )
        events_cool = compute_hr_patience_deltas(
            candidate_action_type="counter_offer",
            candidate_params={"salary_ask": 80},
            hr_budget=60,
            market_condition="cool",
            resume_signals={},
            interviewer_recommendation="",
            round_num=1,
        )
        hot_total = sum(e.delta for e in events_hot)
        cool_total = sum(e.delta for e in events_cool)
        # Hot market: HR is more tolerant of high asks
        assert hot_total > cool_total

    def test_top_tier_resume_signals_bonus(self):
        events = compute_hr_patience_deltas(
            candidate_action_type="counter_offer",
            candidate_params={"salary_ask": 70},
            hr_budget=60,
            market_condition="normal",
            resume_signals={"school_tier": "C9", "competition_tier": "S", "company_tier": "T1"},
            interviewer_recommendation="",
            round_num=1,
        )
        assert any(e.delta > 0 for e in events)

    def test_reject_reduces_hr_patience(self):
        events = compute_hr_patience_deltas(
            candidate_action_type="reject",
            candidate_params={},
            hr_budget=60,
            market_condition="normal",
            resume_signals={},
            interviewer_recommendation="",
            round_num=1,
        )
        assert any(e.delta < 0 for e in events)


class TestComputeCandidatePatienceDeltas:
    def test_low_offer_reduces_candidate_patience(self):
        events = compute_candidate_patience_deltas(
            hr_action_type="offer",
            hr_params={"salary_offer": 30},
            candidate_reservation=50,
            market_condition="normal",
            round_num=1,
        )
        assert any(e.delta < 0 for e in events)

    def test_offer_below_reservation_punishes(self):
        events = compute_candidate_patience_deltas(
            hr_action_type="offer",
            hr_params={"salary_offer": 35},
            candidate_reservation=50,
            market_condition="normal",
            round_num=1,
        )
        penalty = sum(e.delta for e in events)
        assert penalty < 0

    def test_hot_market_bonus(self):
        events_hot = compute_candidate_patience_deltas(
            hr_action_type="offer",
            hr_params={"salary_offer": 45},
            candidate_reservation=50,
            market_condition="hot",
            round_num=1,
        )
        events_normal = compute_candidate_patience_deltas(
            hr_action_type="offer",
            hr_params={"salary_offer": 45},
            candidate_reservation=50,
            market_condition="normal",
            round_num=1,
        )
        hot_total = sum(e.delta for e in events_hot)
        normal_total = sum(e.delta for e in events_normal)
        assert hot_total > normal_total

    def test_hr_reject_reduces_candidate_patience(self):
        events = compute_candidate_patience_deltas(
            hr_action_type="reject",
            hr_params={},
            candidate_reservation=50,
            market_condition="normal",
            round_num=1,
        )
        assert any(e.delta < 0 for e in events)

    def test_hr_improved_offer_rewards(self):
        events = compute_candidate_patience_deltas(
            hr_action_type="counter_offer",
            hr_params={"improved": True},
            candidate_reservation=50,
            market_condition="normal",
            round_num=1,
        )
        assert any(e.delta > 0 for e in events)


class TestApplyPatienceDeltas:
    def test_deltas_are_applied(self):
        state = PatienceState(hr_patience=1.0, candidate_patience=1.0)
        hr_events = compute_hr_patience_deltas(
            "counter_offer", {"salary_ask": 80}, 60, "normal", {}, "", 1
        )
        cand_events = compute_candidate_patience_deltas(
            "offer", {"salary_offer": 40}, 50, "normal", 1
        )
        result = apply_patience_deltas(state, hr_events, cand_events)
        assert result.hr_patience != 1.0
        assert result.candidate_patience != 1.0

    def test_patience_clamped_to_zero(self):
        state = PatienceState(hr_patience=0.05, candidate_patience=0.05)
        hr_events = compute_hr_patience_deltas(
            "counter_offer", {"salary_ask": 999}, 60, "normal", {}, "", 1
        )
        cand_events = compute_candidate_patience_deltas(
            "offer", {"salary_offer": 10}, 50, "normal", 1
        )
        result = apply_patience_deltas(state, hr_events, cand_events)
        assert result.hr_patience >= 0.0
        assert result.candidate_patience >= 0.0

    def test_patience_capped_at_one(self):
        state = PatienceState(hr_patience=0.99, candidate_patience=0.99)
        hr_events = compute_hr_patience_deltas(
            "counter_offer", {"salary_ask": 60}, 60, "normal", {}, "strong_hire", 1
        )
        cand_events = compute_candidate_patience_deltas(
            "counter_offer", {"improved": True}, 50, "normal", 1
        )
        result = apply_patience_deltas(state, hr_events, cand_events)
        assert result.hr_patience <= 1.0
        assert result.candidate_patience <= 1.0


class TestCheckTermination:
    def test_both_patience_exhausted_ends_negotiation(self):
        state = PatienceState(hr_patience=0.0, candidate_patience=0.0)
        should_end, reason = check_termination(state, "negotiating", 3, 8)
        assert should_end is True
        assert "patience" in reason

    def test_timeout_at_max_rounds(self):
        state = PatienceState(hr_patience=0.5, candidate_patience=0.5)
        should_end, reason = check_termination(state, "negotiating", 8, 8)
        assert should_end is True
        assert reason == "timeout"

    def test_accepted_ends_immediately(self):
        state = PatienceState(hr_patience=0.5, candidate_patience=0.5)
        should_end, reason = check_termination(state, "accepted", 2, 8)
        assert should_end is True

    def test_rejected_ends_immediately(self):
        state = PatienceState(hr_patience=0.5, candidate_patience=0.5)
        should_end, reason = check_termination(state, "rejected", 2, 8)
        assert should_end is True

    def test_early_round_continues(self):
        state = PatienceState(hr_patience=0.5, candidate_patience=0.5)
        should_end, reason = check_termination(state, "negotiating", 1, 8)
        assert should_end is False

    def test_hr_patience_exhausted_reason(self):
        state = PatienceState(hr_patience=0.0, candidate_patience=0.5)
        should_end, reason = check_termination(state, "negotiating", 5, 8)
        assert should_end is True
        assert "hr_patience" in reason

    def test_candidate_patience_exhausted_reason(self):
        state = PatienceState(hr_patience=0.5, candidate_patience=0.0)
        should_end, reason = check_termination(state, "negotiating", 5, 8)
        assert should_end is True
        assert "candidate_patience" in reason
