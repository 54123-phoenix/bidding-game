"""Tests for Bayesian belief update logic."""

import pytest

from game.beliefs import (
    CANDIDATE_TYPE_LIKELIHOOD,
    HR_TYPE_LIKELIHOOD,
    _candidate_dynamic_likelihood,
    _default_prior,
    _hr_dynamic_likelihood,
    compute_dynamic_likelihood,
    get_beliefs_for_deliberation,
    update_beliefs_bayesian,
    update_candidate_beliefs,
    update_hr_beliefs,
)
from models.schemas import (
    BeliefState,
    CandidatePrivateType,
    GameState,
    HRPrivateType,
    InterviewerPrivateType,
    MarketPrivateType,
    StructuredJob,
    StructuredResume,
)


def _minimal_game_state(job_salary_range=(30, 80)) -> GameState:
    """Create a minimal valid GameState for testing."""
    return GameState(
        game_id="test",
        resume=StructuredResume(resume_id="r1", name="Test"),
        job=StructuredJob(
            job_id="j1", title="Dev", company="Co", salary_range=job_salary_range
        ),
        candidate_type=CandidatePrivateType(true_ability=0.5, reservation_wage=40),
        hr_type=HRPrivateType(true_budget=60),
        interviewer_type=InterviewerPrivateType(),
        market_type=MarketPrivateType(),
    )


class TestUpdateBeliefsBayesian:
    def test_uniform_prior_updates(self):
        prior = {"type_a": 0.5, "type_b": 0.5}
        beliefs = BeliefState(about_player="hr", belief_distribution=prior)
        likelihood = {"type_a": {"offer": 0.8}, "type_b": {"offer": 0.2}}
        observed = {"action_type": "offer"}

        result = update_beliefs_bayesian(beliefs, observed, likelihood)

        assert result.belief_distribution["type_a"] == pytest.approx(0.8, abs=0.01)
        assert result.belief_distribution["type_b"] == pytest.approx(0.2, abs=0.01)
        assert result.confidence > beliefs.confidence
        assert result.last_updated_round == beliefs.last_updated_round + 1

    def test_empty_prior_returns_unchanged(self):
        beliefs = BeliefState(about_player="hr", belief_distribution={})
        result = update_beliefs_bayesian(beliefs, {"action_type": "offer"}, {})
        assert result.belief_distribution == {}

    def test_unknown_action_uses_default_likelihood(self):
        prior = {"type_a": 0.5, "type_b": 0.5}
        beliefs = BeliefState(about_player="hr", belief_distribution=prior)
        likelihood = {"type_a": {"offer": 0.8}}
        observed = {"action_type": "unknown_action"}

        result = update_beliefs_bayesian(beliefs, observed, likelihood)

        assert abs(sum(result.belief_distribution.values()) - 1.0) < 0.01

    def test_confidence_caps_at_0_95(self):
        prior = {"type_a": 1.0}
        beliefs = BeliefState(about_player="hr", belief_distribution=prior, confidence=0.94)
        likelihood = {"type_a": {"offer": 1.0}}
        result = update_beliefs_bayesian(beliefs, {"action_type": "offer"}, likelihood)
        assert result.confidence == 0.95


class TestUpdateHRBeliefs:
    def test_candidate_offer_updates_hr_beliefs(self):
        prior = {
            "strong_candidate": 0.33,
            "average_candidate": 0.34,
            "weak_candidate": 0.33,
        }
        beliefs = BeliefState(about_player="candidate", belief_distribution=prior)
        action = {"action_type": "offer", "params": {"salary_ask": 50}}

        result = update_hr_beliefs(beliefs, action)

        assert abs(sum(result.belief_distribution.values()) - 1.0) < 0.01

    def test_weak_candidate_accept_increases_weak_prob(self):
        prior = {
            "strong_candidate": 0.33,
            "average_candidate": 0.34,
            "weak_candidate": 0.33,
        }
        beliefs = BeliefState(about_player="candidate", belief_distribution=prior)
        action = {"action_type": "accept"}

        result = update_hr_beliefs(beliefs, action)

        assert result.belief_distribution["weak_candidate"] > prior["weak_candidate"]


class TestUpdateCandidateBeliefs:
    def test_hr_offer_updates_candidate_beliefs(self):
        prior = {
            "high_budget_low_urgency": 0.25,
            "high_budget_high_urgency": 0.25,
            "low_budget_low_urgency": 0.25,
            "low_budget_high_urgency": 0.25,
        }
        beliefs = BeliefState(about_player="hr", belief_distribution=prior)
        action = {"action_type": "offer", "params": {"salary_offer": 60}}

        result = update_candidate_beliefs(beliefs, action)

        assert abs(sum(result.belief_distribution.values()) - 1.0) < 0.01

    def test_high_budget_hr_more_likely_to_offer(self):
        prior = {
            "high_budget_low_urgency": 0.25,
            "high_budget_high_urgency": 0.25,
            "low_budget_low_urgency": 0.25,
            "low_budget_high_urgency": 0.25,
        }
        beliefs = BeliefState(about_player="hr", belief_distribution=prior)
        action = {"action_type": "offer"}

        result = update_candidate_beliefs(beliefs, action)

        high_total = (
            result.belief_distribution["high_budget_low_urgency"]
            + result.belief_distribution["high_budget_high_urgency"]
        )
        assert high_total > 0.5


class TestDynamicLikelihood:
    def test_hr_dynamic_above_mid_band(self):
        state = _minimal_game_state((30, 80))
        result = _hr_dynamic_likelihood("offer", {"salary_offer": 70}, state)
        assert result["high_budget_high_urgency"] > result["low_budget_high_urgency"]

    def test_hr_dynamic_below_mid_band(self):
        state = _minimal_game_state((30, 80))
        result = _hr_dynamic_likelihood("offer", {"salary_offer": 35}, state)
        assert result["low_budget_low_urgency"] > result["high_budget_low_urgency"]

    def test_candidate_dynamic_high_ask(self):
        state = _minimal_game_state((30, 80))
        result = _candidate_dynamic_likelihood("counter_offer", {"salary_ask": 75}, state)
        assert result["strong_candidate"] > result["weak_candidate"]

    def test_candidate_dynamic_low_ask_weak_increases_relative_to_high(self):
        state = _minimal_game_state((30, 80))
        result_low = _candidate_dynamic_likelihood("counter_offer", {"salary_ask": 35}, state)
        result_high = _candidate_dynamic_likelihood("counter_offer", {"salary_ask": 75}, state)
        assert result_low["weak_candidate"] > result_high["weak_candidate"]
        assert result_low["strong_candidate"] < result_high["strong_candidate"]

    def test_candidate_accept_favors_weak(self):
        state = _minimal_game_state((30, 80))
        result = _candidate_dynamic_likelihood("accept", {}, state)
        assert result["weak_candidate"] > result["strong_candidate"]

    def test_candidate_reject_favors_strong(self):
        state = _minimal_game_state((30, 80))
        result = _candidate_dynamic_likelihood("reject", {}, state)
        assert result["strong_candidate"] > result["weak_candidate"]

    def test_compute_dynamic_likelihood_unknown_agent(self):
        state = _minimal_game_state()
        result = compute_dynamic_likelihood("offer", {}, "unknown", state)
        assert result == {"unknown": 0.5}


class TestDefaultPrior:
    def test_candidate_default_prior(self):
        result = _default_prior("candidate")
        assert "high_budget_low_urgency" in result
        assert abs(sum(result.values()) - 1.0) < 0.01

    def test_hr_default_prior(self):
        result = _default_prior("hr")
        assert "strong_candidate" in result
        assert abs(sum(result.values()) - 1.0) < 0.01


class TestGetBeliefsForDeliberation:
    def test_returns_belief_distribution_when_available(self):
        state = _minimal_game_state()
        state.candidate_beliefs = {
            "hr": BeliefState(
                about_player="hr",
                belief_distribution={"high_budget": 0.7, "low_budget": 0.3},
            )
        }
        result = get_beliefs_for_deliberation(state, "candidate")
        assert result["high_budget"] == pytest.approx(0.7, abs=0.01)
        assert result["low_budget"] == pytest.approx(0.3, abs=0.01)

    def test_returns_default_prior_when_no_beliefs(self):
        state = _minimal_game_state()
        state.candidate_beliefs = {}
        result = get_beliefs_for_deliberation(state, "candidate")
        assert "high_budget_low_urgency" in result

    def test_returns_default_prior_when_empty_distribution(self):
        state = _minimal_game_state()
        state.candidate_beliefs = {
            "hr": BeliefState(about_player="hr", belief_distribution={})
        }
        result = get_beliefs_for_deliberation(state, "candidate")
        assert "high_budget_low_urgency" in result
