"""
Shared data models for the Bidding Game system.

Ported from ai-career-intelligence backend/shared/types.py.
Extended with game-theoretic types for multi-agent Bayesian hiring simulation.

Version: 2.0.0 — restructured for bidding-game architecture
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

# ═══════════════════════════════════════════════════════════════════════════════
# L1: Input / Parsing Types (ported)
# ═══════════════════════════════════════════════════════════════════════════════


class Project(BaseModel):
    name: str = Field(description="Project name")
    description: str = Field(default="")
    tech_stack: list[str] = Field(default_factory=list)
    start_date: date | None = None
    end_date: date | None = None


class Education(BaseModel):
    school: str
    degree: Literal["本科", "硕士", "博士", "其他"] = "其他"
    major: str = ""
    graduation_year: int | None = None


class WorkExperience(BaseModel):
    company: str
    title: str
    description: str = ""
    tech_stack: list[str] = Field(default_factory=list)
    start_date: date | None = None
    end_date: date | None = None


class Competition(BaseModel):
    name: str
    year: int | None = None
    award: str = ""
    description: str = ""


class StructuredResume(BaseModel):
    """Parsed resume — input to the bidding game."""
    resume_id: str
    name: str = ""
    email: str | None = None
    phone: str | None = None
    summary: str = ""
    skills: list[str] = Field(default_factory=list)
    skill_levels: dict[str, str] = Field(default_factory=dict)
    projects: list[Project] = Field(default_factory=list)
    education: list[Education] = Field(default_factory=list)
    experience: list[WorkExperience] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    competitions: list[Competition] = Field(default_factory=list)
    skill_embedding: list[float] | None = None


class StructuredJob(BaseModel):
    """Job description — target role in the bidding game."""
    job_id: str
    title: str
    company: str
    location: str = ""
    level: str = ""
    description: str = ""
    required_skills: list[str] = Field(default_factory=list)
    optional_skills: list[str] = Field(default_factory=list)
    salary_range: tuple[int, int] | None = None
    posted_date: date | None = None
    job_embedding: list[float] | None = None
    min_experience_years: float = 0.0
    min_education_level: str = ""
    school_tier_preferred: str = ""
    required_competitions: list[str] = Field(default_factory=list)


class MatchResult(BaseModel):
    item_id: str
    score: float = Field(ge=0.0, le=1.0)
    payload: dict = Field(default_factory=dict)
    match_type: Literal["resume_to_job", "job_to_resume", "skill_to_skill"]

# ═══════════════════════════════════════════════════════════════════════════════
# L2: Game Theory Types (new — Bayesian hiring game)
# ═══════════════════════════════════════════════════════════════════════════════


class CandidatePrivateType(BaseModel):
    """Candidate's hidden information — unknown to HR/Interviewer."""
    true_ability: float = Field(ge=0.0, le=1.0, description="Real capability score")
    reservation_wage: int = Field(ge=0, description="Minimum acceptable salary (K/year)")
    outside_options: list[dict] = Field(default_factory=list, description="Other offers")
    career_ambition: float = Field(
        default=0.5, ge=0.0, le=1.0,
        description="Growth vs salary weight (1.0 = pure growth seeker)"
    )
    skill_growth_rate: float = Field(default=0.1, ge=0.0, description="Learning speed (skills/year)")


class HRPrivateType(BaseModel):
    """HR's hidden information — unknown to Candidate."""
    true_budget: int = Field(ge=0, description="Actual salary budget ceiling (K/year)")
    candidate_pool_quality: float = Field(default=0.5, ge=0.0, le=1.0)
    urgency: float = Field(default=0.5, ge=0.0, le=1.0, description="Hiring urgency (1.0 = desperate)")
    internal_equity_constraint: int = Field(default=0, description="Max salary to avoid internal inversion")
    team_growth_stage: Literal["build", "scale", "maintain"] = "scale"


class InterviewerPrivateType(BaseModel):
    """Interviewer's hidden preferences — unknown to Candidate and HR."""
    strictness: float = Field(default=0.5, ge=0.0, le=1.0, description="Scoring strictness")
    bias_vector: dict[str, float] = Field(
        default_factory=dict,
        description="Implicit bias weights: {'school_prestige': 0.3, 'big_company': 0.2, ...}"
    )
    preferred_skill_style: Literal["depth", "breadth", "balance"] = "balance"
    risk_tolerance: float = Field(default=0.5, ge=0.0, le=1.0, description="Tolerance for unconventional backgrounds")


class MarketPrivateType(BaseModel):
    """Market state — macro environment all players observe partially."""
    supply_demand_ratio: float = Field(default=1.0, description=">1 = employer market, <1 = candidate market")
    salary_trend: Literal["rising", "stable", "cooling"] = "stable"
    hot_skills: list[str] = Field(default_factory=list, description="Skills with 30%+ premium")
    industry_growth: float = Field(default=0.0, description="Industry growth rate")


class BeliefState(BaseModel):
    """What one player believes about another's private type."""
    about_player: Literal["candidate", "hr", "interviewer", "market"]
    belief_distribution: dict[str, float] = Field(
        default_factory=dict,
        description="Discrete probability distribution over opponent types"
    )
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)
    last_updated_round: int = 0


class AgentAction(BaseModel):
    """A single action taken by a player in the game."""
    player: Literal["candidate", "hr", "interviewer", "market"]
    action_type: str  # "offer", "counter_offer", "accept", "reject", "evaluate", "signal", "wait"
    params: dict = Field(default_factory=dict)
    reasoning: str = ""
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)
    round: int = 0
    timestamp: str = ""


# ═══════════════════════════════════════════════════════════════════════════════
# InfoWar Types — Information Warfare Mechanism (v3.0)
# ═══════════════════════════════════════════════════════════════════════════════


class InformationCard(BaseModel):
    """Candidate's information cards — can reveal, conceal, or fake."""
    card_id: str
    card_type: Literal["outside_offer", "current_salary", "true_ability",
                       "family_burden", "other_interviews", "resignation_timeline"]
    true_value: str | int | float = Field(description="The actual truth")
    revealed_value: str | int | float | None = Field(default=None, description="What was stated (may differ from truth)")
    reveal_state: Literal["hidden", "revealed", "faked", "probed"] = "hidden"
    verifiability: float = Field(default=0.5, ge=0.0, le=1.0, description="Probability HR can verify")
    trust_impact: float = Field(default=-0.3, ge=-1.0, le=1.0, description="Trust change if caught lying")
    salary_impact: float = Field(default=0.0, ge=-50, le=50, description="Marginal salary impact (K)")
    description: str = Field(default="", description="Display text for frontend")
    icon: str = Field(default="🃏", description="Emoji icon")


class TrustState(BaseModel):
    """Trust between candidate and HR — core InfoWar state."""
    hr_trust_in_candidate: float = Field(default=0.5, ge=0.0, le=1.0)
    candidate_trust_in_hr: float = Field(default=0.5, ge=0.0, le=1.0)
    trust_history: list[dict] = Field(default_factory=list)
    red_flags: list[str] = Field(default_factory=list)
    last_trust_change: float = Field(default=0.0, description="Most recent trust delta")
    trust_label: str = Field(default="谨慎信任", description="Human-readable trust level")


class InformationAction(BaseModel):
    """An information warfare action attached to an AgentAction."""
    action_type: Literal["reveal", "conceal", "fake", "probe", "verify", "none"] = "none"
    target_card: str | None = None
    stated_value: str | int | float | None = None
    actual_value: str | int | float | None = None
    detected: bool = False
    detection_reason: str = ""
    trust_delta: float = Field(default=0.0, description="Resulting trust change")
    hr_reaction: str = Field(default="", description="HR's narrative reaction")


class InfoWarResult(BaseModel):
    """Summary of information warfare for a single round."""
    round: int
    candidate_action: InformationAction | None = None
    hr_action: InformationAction | None = None
    trust_before: TrustState
    trust_after: TrustState
    cards_revealed: list[str] = Field(default_factory=list)
    cards_faked: list[str] = Field(default_factory=list)
    cards_probed: list[str] = Field(default_factory=list)
    detected_fakes: list[str] = Field(default_factory=list)
    narrative: str = Field(default="", description="Narrative summary of the info phase")


# ═══════════════════════════════════════════════════════════════════════════════
# Parallel Universe Types — Counterfactual Visualization
# ═══════════════════════════════════════════════════════════════════════════════


class TimelineEvent(BaseModel):
    """A single event in a career timeline."""
    year: float = Field(description="Years since hire, e.g. 0.5 = 6 months")
    month: int = Field(default=0)
    event_type: Literal["salary_change", "promotion", "layoff", "ipo",
                        "team_change", "skill_growth", "regret_moment",
                        "satisfaction", "startup", "switch_company"] = "salary_change"
    title: str = ""
    description: str = ""
    salary: int | None = None
    level: str | None = None
    satisfaction: float | None = Field(default=None, ge=0.0, le=1.0)
    triggered_by: str = Field(default="", description="Decision that triggered this")
    icon: str = Field(default="📅")


class UniverseTimeline(BaseModel):
    """One parallel universe timeline."""
    universe_id: str
    universe_label: str
    universe_emoji: str = "🌍"
    trigger_decision: str = ""
    color: str = "#22d3ee"
    timeline: list[TimelineEvent] = Field(default_factory=list)
    final_assessment: str = ""
    regret_score: float = Field(default=0.0, ge=0.0, le=1.0)
    final_salary: int = 0
    final_satisfaction: float = Field(default=0.5, ge=0.0, le=1.0)


class ParallelUniverseReport(BaseModel):
    """Complete parallel universe analysis."""
    base_universe: UniverseTimeline
    alternative_universes: list[UniverseTimeline] = Field(default_factory=list)
    comparison_summary: str = ""
    key_insight: str = ""


class GameState(BaseModel):
    """Full state of a multi-round hiring negotiation."""
    game_id: str
    resume: StructuredResume
    job: StructuredJob
    round: int = 0
    max_rounds: int = 5

    # Player private types (only known to themselves)
    candidate_type: CandidatePrivateType
    hr_type: HRPrivateType
    interviewer_type: InterviewerPrivateType
    market_type: MarketPrivateType

    # Public state (visible to all)
    public_offer: int | None = None  # Current salary offer on the table
    public_level: str = ""  # Current level offer
    public_status: Literal["negotiating", "accepted", "rejected", "timeout"] = "negotiating"

    # Market signals (set by MarketPlayer each round)
    market_adjustment: float = 1.0
    competition_intensity: float = 0.5

    # Evaluation scores (set by InterviewerPlayer)
    scores: dict[str, float] = Field(default_factory=dict)

    # Beliefs (each player's belief about others)
    candidate_beliefs: dict[str, BeliefState] = Field(default_factory=dict)
    hr_beliefs: dict[str, BeliefState] = Field(default_factory=dict)
    interviewer_beliefs: dict[str, BeliefState] = Field(default_factory=dict)

    # Audit trail
    action_history: list[AgentAction] = Field(default_factory=list)
    round_snapshots: list[dict] = Field(default_factory=list)

    # Patience (dynamic, updated each round)
    hr_patience: float = 1.0
    candidate_patience: float = 1.0
    patience_events: list[dict] = Field(default_factory=list)
    termination_reason: str = ""
    screening_multiplier: float = 1.0  # Opening offer adjustment from resume screening tier

    # InfoWar (v3.0 — information warfare)
    candidate_hand: list[InformationCard] = Field(default_factory=list)
    trust_state: TrustState = Field(default_factory=TrustState)
    information_history: list[InformationAction] = Field(default_factory=list)
    info_war_enabled: bool = Field(default=True)
    hr_probe_count: int = 0
    candidate_reveal_count: int = 0


class GameResult(BaseModel):
    """Final output of a bidding game simulation."""
    game_id: str
    outcome: Literal["accepted", "rejected", "timeout"]
    final_state: GameState

    # Negotiation details
    final_salary: int | None = None
    final_level: str | None = None
    negotiation_rounds: int = 0

    # Payoffs
    candidate_payoff: float = 0.0
    hr_payoff: float = 0.0

    # Analysis
    success_probability: float = 0.0
    key_turning_points: list[AgentAction] = Field(default_factory=list)
    information_asymmetry_cost: float = Field(
        default=0.0,
        description="Payoff lost due to imperfect information"
    )
    winning_strategy: str = ""
    recommendation: str = ""

    # Meta
    hr_persona: dict = Field(default_factory=dict, description="HR persona info for frontend display")

    # InfoWar results
    info_war_summary: InfoWarResult | None = None
    trust_final: TrustState | None = None

    # Parallel Universe
    parallel_universes: ParallelUniverseReport | None = None


class EquilibriumResult(BaseModel):
    """Result of solving for equilibrium in the hiring game."""
    equilibrium_type: Literal["pure_bne", "mixed_bne", "correlated"] = "pure_bne"

    # Strategy profiles
    candidate_strategy: dict = Field(default_factory=dict)
    hr_strategy: dict = Field(default_factory=dict)

    # Payoffs under equilibrium
    candidate_expected_payoff: float = 0.0
    hr_expected_payoff: float = 0.0

    # Counterfactuals
    alternative_payoffs: dict[str, float] = Field(
        default_factory=dict,
        description="Payoffs if different strategies were chosen"
    )

    solver_iterations: int = 0
    converged: bool = False


class CounterfactualReport(BaseModel):
    """Structured counterfactual analysis — what-if scenarios."""
    base_outcome: GameResult
    interventions: list[dict] = Field(
        default_factory=list,
        description="List of {intervention, new_probability, marginal_effect, confidence_interval}"
    )
    top_recommendations: list[dict] = Field(default_factory=list)
    sensitivity_analysis: dict = Field(default_factory=dict)


class DimensionScore(BaseModel):
    """A single dimension score from the 12-dim evaluation framework."""
    dimension: str
    score: float = Field(ge=0.0, le=1.0)
    weight: float = Field(ge=0.0, le=1.0)
    evidence: list[str] = Field(default_factory=list, description="Evidence from resume/job")
    reasoning: str = ""
    llm_used: bool = False


# ═══════════════════════════════════════════════════════════════════════════════
# Audit Trail Types — Computation Trace (四级溯源体系)
# ═══════════════════════════════════════════════════════════════════════════════


class EvidenceItem(BaseModel):
    """A single piece of evidence — the atomic unit of auditability.

    Every claim the system makes must be traceable to either:
      - A specific field in the input data (resume.skills[0] = "Go")
      - A specific rule in the knowledge base (knowledge_base.py:142)
      - A specific step in an algorithm (equilibrium.py:45)
    """
    source: str = Field(description="Where this evidence comes from, e.g. 'resume.skills[0]'")
    value: str | None = Field(default=None, description="The actual value found")
    matched: bool = Field(default=False, description="Whether this evidence supports the claim")
    weight_contribution: float = Field(default=0.0, description="How much this item contributes to the score")
    note: str = Field(default="", description="Human-readable annotation")


class ComputeStep(BaseModel):
    """One step in a multi-step computation.

    A ComputationTrace is a tree of ComputeSteps. Each step has:
      - A formula (how the value is computed)
      - Children steps (decomposition into sub-steps)
      - Evidence items (data backing this step)
    """
    label: str = Field(description="Human-readable label, e.g. '精确匹配'")
    value: float = Field(description="The computed value at this step")
    weight: float = Field(default=1.0, description="Weight of this step in parent's formula")
    formula: str = Field(default="", description="How this value was computed, e.g. 'matched_count / total_count'")
    evidence: list[EvidenceItem] = Field(default_factory=list)
    children: list["ComputeStep"] = Field(default_factory=list)
    deterministic: bool = Field(default=True, description="True if purely rule-based, False if LLM-involved")
    code_ref: str = Field(default="", description="Source code reference, e.g. 'eval/scorers/hard.py:42'")


class ComputationTrace(BaseModel):
    """Full audit trail for a single score / probability.

    Root of a tree of ComputeSteps. Every number in the system
    that is shown to the user must have a ComputationTrace.
    """
    trace_id: str = Field(description="Unique identifier for this trace")
    label: str = Field(description="What this trace explains, e.g. 'P(offer)' or '技能匹配度'")
    final_value: float = Field(description="The final score / probability")
    formula: str = Field(default="", description="Top-level formula")
    steps: list[ComputeStep] = Field(default_factory=list)
    deterministic: bool = Field(default=True)
    llm_used: bool = Field(default=False)
    confidence_lower: float | None = Field(default=None)
    confidence_upper: float | None = Field(default=None)
    failure_conditions: list[str] = Field(default_factory=list, description="Conditions under which this estimate may fail")


# ═══════════════════════════════════════════════════════════════════════════════
# Debate Types — Structured Career Advisor
# ═══════════════════════════════════════════════════════════════════════════════


class StrategyClaim(BaseModel):
    """A single claim made by the AI in the debate proposal.

    Each claim is backed by computation traces — the AI doesn't just assert,
    it shows its work.
    """
    id: str = Field(description="Unique claim ID, e.g. 'claim-1'")
    type: Literal["strength", "weakness", "risk", "suggestion"]
    headline: str = Field(description="One-line claim, e.g. '微服务经验缺失'")
    body: str = Field(description="Full natural language explanation (LLM-translated from traces)")
    severity: Literal["critical", "major", "minor", "info"] = "major"
    traces: list[ComputationTrace] = Field(default_factory=list, description="Evidence backing this claim")
    counterfactual: dict | None = Field(default=None, description="What-if analysis if this issue is addressed")


class ActionPlan(BaseModel):
    """A concrete, time-bound action plan generated from the debate."""
    title: str
    description: str
    steps: list[dict] = Field(default_factory=list, description="Ordered steps with timeline")
    expected_outcome: dict = Field(default_factory=dict)
    timeline_months: int = 1


class DebateProposal(BaseModel):
    """Complete AI strategy proposal — the output of the debate engine."""
    proposal_id: str
    candidate_name: str
    job_title: str
    job_company: str

    # Strengths & weaknesses (each backed by traces)
    strengths: list[StrategyClaim] = Field(default_factory=list)
    weaknesses: list[StrategyClaim] = Field(default_factory=list)

    # Core metrics with full traces
    evaluation_traces: list[ComputationTrace] = Field(default_factory=list)
    simulation_summary: dict = Field(default_factory=dict)
    equilibrium_summary: dict = Field(default_factory=dict)
    success_probability_trace: ComputationTrace | None = None

    # Alternative paths
    alternatives: list[dict] = Field(default_factory=list, description="2-3 alternative strategies with P(offer)")

    # Natural language summary (LLM-translated from above data)
    summary_text: str = Field(default="")
    recommendation: str = Field(default="")

    # Meta
    deterministic_pct: float = Field(default=85.0, description="% of numbers computed deterministically")


class DebateRecomputeRequest(BaseModel):
    """User submits supplemental info for re-evaluation."""
    original_proposal_id: str
    amendments: dict = Field(default_factory=dict, description="Key-value pairs of amendments")
    free_text: str = Field(default="", description="Optional free-text explanation")
