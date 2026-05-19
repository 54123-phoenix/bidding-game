"""Belief update module — Bayesian updating of opponent type beliefs.

After each round, players observe actions and update their probability
distribution over opponents' private types.

This combines:
  - LLM-driven inference (semantic understanding of opponent behavior)
  - Rule-based Bayesian update (numeric probability revision)

Reference: NegMAS opponent modeling patterns.
"""

from __future__ import annotations

from models.schemas import BeliefState


def update_beliefs_bayesian(
    current_beliefs: BeliefState,
    observed_action: dict,
    likelihood_model: dict[str, dict[str, float]],
) -> BeliefState:
    """Bayesian update: P(type | action) ∝ P(action | type) × P(type).

    Args:
        current_beliefs: Prior belief distribution
        observed_action: The action just observed
        likelihood_model: P(action | type) for each possible type and action

    Returns:
        Updated BeliefState with posterior distribution
    """
    prior = current_beliefs.belief_distribution
    if not prior:
        return current_beliefs

    action_key = observed_action.get("action_type", "unknown")

    posterior: dict[str, float] = {}
    total_prob = 0.0

    for type_name, prior_prob in prior.items():
        # Likelihood: how likely is this action given this type?
        likelihood = likelihood_model.get(type_name, {}).get(action_key, 0.5)
        posterior[type_name] = prior_prob * likelihood
        total_prob += posterior[type_name]

    # Normalize
    if total_prob > 0:
        posterior = {k: v / total_prob for k, v in posterior.items()}

    return BeliefState(
        about_player=current_beliefs.about_player,
        belief_distribution=posterior,
        confidence=min(current_beliefs.confidence + 0.05, 0.95),
        last_updated_round=current_beliefs.last_updated_round + 1,
    )


# ── Pre-built likelihood models ────────────────────────────────────────


HR_TYPE_LIKELIHOOD: dict[str, dict[str, float]] = {
    # How likely each HR type is to take each action
    "high_budget_low_urgency": {
        "offer": 0.7, "counter_offer": 0.2, "accept": 0.05, "reject": 0.05,
    },
    "high_budget_high_urgency": {
        "offer": 0.8, "counter_offer": 0.1, "accept": 0.08, "reject": 0.02,
    },
    "low_budget_low_urgency": {
        "offer": 0.3, "counter_offer": 0.3, "accept": 0.1, "reject": 0.3,
    },
    "low_budget_high_urgency": {
        "offer": 0.4, "counter_offer": 0.4, "accept": 0.15, "reject": 0.05,
    },
}

CANDIDATE_TYPE_LIKELIHOOD: dict[str, dict[str, float]] = {
    "strong_candidate": {
        "offer": 0.6, "counter_offer": 0.3, "accept": 0.05, "reject": 0.05,
    },
    "average_candidate": {
        "offer": 0.4, "counter_offer": 0.4, "accept": 0.15, "reject": 0.05,
    },
    "weak_candidate": {
        "offer": 0.2, "counter_offer": 0.3, "accept": 0.4, "reject": 0.1,
    },
}


def update_hr_beliefs(
    beliefs: BeliefState, candidate_action: dict
) -> BeliefState:
    """Update HR's beliefs about the candidate after observing their action."""
    return update_beliefs_bayesian(beliefs, candidate_action, CANDIDATE_TYPE_LIKELIHOOD)


def update_candidate_beliefs(
    beliefs: BeliefState, hr_action: dict
) -> BeliefState:
    """Update Candidate's beliefs about HR after observing their action."""
    return update_beliefs_bayesian(beliefs, hr_action, HR_TYPE_LIKELIHOOD)


# ═══════════════════════════════════════════════════════════════════════════════
# Dynamic Likelihood (situation-aware, replaces static tables in deliberation)
# ═══════════════════════════════════════════════════════════════════════════════


def compute_dynamic_likelihood(
    action_type: str,
    action_params: dict,
    agent_type: str,
    state: "GameState",  # type: ignore
) -> dict[str, float]:
    """Compute P(action | type) for each possible private type, given context.

    Unlike the static HR_TYPE_LIKELIHOOD table, this considers the actual
    salary numbers in relation to the job band, market conditions, etc.

    Args:
        action_type: The observed action ("offer", "counter_offer", "accept", "reject")
        action_params: The action's parameter dict
        agent_type: "hr" or "candidate" — whose type are we inferring?
        state: Full game state for context

    Returns:
        Dict mapping type_name → likelihood (un-normalized)
    """
    if agent_type == "hr":
        return _hr_dynamic_likelihood(action_type, action_params, state)
    elif agent_type == "candidate":
        return _candidate_dynamic_likelihood(action_type, action_params, state)
    return {"unknown": 0.5}


def _hr_dynamic_likelihood(
    action_type: str, action_params: dict, state: "GameState"
) -> dict[str, float]:
    """Context-aware likelihood for HR types."""
    salary = action_params.get("salary_offer") or action_params.get("final_salary") or 0
    job_band = state.job.salary_range or (30, 80)
    band_lo, band_hi = job_band[0], job_band[1]
    band_mid = (band_lo + band_hi) / 2

    # Position of HR's offer in the salary band tells us about their budget
    if salary > 0:
        position = (salary - band_lo) / max(band_hi - band_lo, 1)
    else:
        position = 0.5

    # High-budget HRs are more likely to offer above mid-band
    high_budget_base = min(position * 1.5, 1.0)
    low_budget_base = 1.0 - min(position * 1.2, 0.9)

    # Urgency: fast-decision HRs (accept quickly) signal high urgency
    if action_type == "accept":
        urgency_high = 0.6
        urgency_low = 0.2
    elif action_type == "reject":
        urgency_high = 0.1
        urgency_low = 0.4
    elif action_type == "counter_offer":
        urgency_high = 0.3
        urgency_low = 0.4
    else:
        urgency_high = 0.25
        urgency_low = 0.25

    return {
        "high_budget_low_urgency": high_budget_base * (1 - urgency_high) * 0.4 + 0.1,
        "high_budget_high_urgency": high_budget_base * urgency_high * 0.4 + 0.1,
        "low_budget_low_urgency": low_budget_base * (1 - urgency_low) * 0.4 + 0.1,
        "low_budget_high_urgency": low_budget_base * urgency_low * 0.4 + 0.1,
    }


def _candidate_dynamic_likelihood(
    action_type: str, action_params: dict, state: "GameState"
) -> dict[str, float]:
    """Context-aware likelihood for Candidate types."""
    salary = action_params.get("salary_ask") or action_params.get("salary_amount") or 0
    job_band = state.job.salary_range or (30, 80)
    band_hi = job_band[1]

    # Strong candidates ask higher (closer to band top)
    if salary > 0 and band_hi > 0:
        position = salary / band_hi
    else:
        position = 0.5

    strong_base = min(position * 1.3, 0.9)
    weak_base = max(1.0 - position * 1.0, 0.1)

    if action_type == "accept":
        # Weak candidates accept more readily
        return {
            "strong_candidate": 0.15,
            "average_candidate": 0.40,
            "weak_candidate": 0.55,
        }
    elif action_type == "reject":
        return {
            "strong_candidate": 0.50,
            "average_candidate": 0.25,
            "weak_candidate": 0.05,
        }
    elif action_type == "counter_offer":
        return {
            "strong_candidate": strong_base * 0.5 + 0.1,
            "average_candidate": 0.35,
            "weak_candidate": weak_base * 0.3 + 0.05,
        }
    return {
        "strong_candidate": 0.33,
        "average_candidate": 0.34,
        "weak_candidate": 0.33,
    }


def get_beliefs_for_deliberation(
    state: "GameState", agent_role: str
) -> dict[str, float]:
    """Extract opponent belief probabilities in a format suitable for deliberation.

    Returns a flat dict mapping "<type_label>" → probability (0.0-1.0).
    """
    if agent_role == "candidate":
        beliefs = state.candidate_beliefs.get("hr")
    elif agent_role == "hr":
        beliefs = state.hr_beliefs.get("candidate")
    else:
        return {}

    if not beliefs or not beliefs.belief_distribution:
        return _default_prior(agent_role)

    dist = beliefs.belief_distribution
    total = sum(dist.values())
    if total <= 0:
        return _default_prior(agent_role)

    return {k: v / total for k, v in dist.items()}


def _default_prior(agent_role: str) -> dict[str, float]:
    """Uniform prior when no belief data exists."""
    if agent_role == "candidate":
        return {
            "high_budget_low_urgency": 0.25,
            "high_budget_high_urgency": 0.25,
            "low_budget_low_urgency": 0.25,
            "low_budget_high_urgency": 0.25,
        }
    return {
        "strong_candidate": 0.33,
        "average_candidate": 0.34,
        "weak_candidate": 0.33,
    }
