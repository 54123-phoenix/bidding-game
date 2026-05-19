"""12-Dimension Evaluation Framework for Chinese Tech Hiring.

Dimensions are organized into 4 groups:
  - Hard (quantifiable from resume × job matching)
  - Signal (prestige / pedigree — industry-specific)
  - Dynamic (trajectory / potential — time-series)
  - Game (negotiation leverage — requires opponent modeling)

Each dimension has:
  - weight: importance in the composite score (sums to 1.0)
  - method: how to compute the score
  - evidence_fields: which resume/job fields to extract evidence from
"""

from __future__ import annotations

from dataclasses import dataclass, field

# ═══════════════════════════════════════════════════════════════════════════════
# Dimension Definitions
# ═══════════════════════════════════════════════════════════════════════════════


@dataclass
class EvalDimension:
    key: str
    group: str  # "hard" | "signal" | "dynamic" | "game"
    label_zh: str
    weight: float
    description: str


DIMENSIONS: list[EvalDimension] = [
    # ── Hard Group (0.32 total) ──
    EvalDimension(
        key="skill_match", group="hard", label_zh="技能匹配度",
        weight=0.20,
        description="Required skills semantic match + skill graph adjacency bonus",
    ),
    EvalDimension(
        key="experience_fit", group="hard", label_zh="经验匹配度",
        weight=0.12,
        description="Years × relevance × company tier multiplier. Big-company experience has nonlinear premium.",
    ),

    # ── Signal Group (0.24 total) ──
    EvalDimension(
        key="school_signal", group="signal", label_zh="学历信号",
        weight=0.08,
        description="C9/985/211/QS100 tier × degree level. Chinese HR gatekeeping reality encoded.",
    ),
    EvalDimension(
        key="competition_signal", group="signal", label_zh="竞赛信号",
        weight=0.06,
        description="ACM Gold > Kaggle Gold > Blue Bridge > None. Industry consensus hierarchy.",
    ),
    EvalDimension(
        key="company_pedigree", group="signal", label_zh="公司背书",
        weight=0.10,
        description="Previous company tier (T1/foreign/T2/startup) × tenure. Big-tech experience signals ability to operate at scale.",
    ),

    # ── Dynamic Group (0.26 total) ──
    EvalDimension(
        key="career_trajectory", group="dynamic", label_zh="职业轨迹",
        weight=0.10,
        description="Promotion speed + skill evolution rate. 3yr→P7 more impressive than 5yr→P7.",
    ),
    EvalDimension(
        key="stability_risk", group="dynamic", label_zh="稳定性风险",
        weight=0.08,
        description="Job-hopping frequency calibrated to Chinese internet norms. 1.5yr tenure is baseline.",
    ),
    EvalDimension(
        key="growth_potential", group="dynamic", label_zh="成长潜力",
        weight=0.08,
        description="T-shaped assessment + learning trajectory. Can they grow into the next level?",
    ),

    # ── Game Group (0.18 total) ──
    EvalDimension(
        key="negotiation_leverage", group="game", label_zh="议价筹码",
        weight=0.08,
        description="Outside options × market demand × skill rarity. Requires opponent modeling.",
    ),
    EvalDimension(
        key="salary_alignment", group="game", label_zh="薪资匹配度",
        weight=0.06,
        description="Expected salary vs market band for level. Within 25th-75th percentile = good.",
    ),
    EvalDimension(
        key="timeline_feasibility", group="game", label_zh="到岗可行性",
        weight=0.02,
        description="Notice period vs market window. Golden-Silver-Bronze hiring seasons matter.",
    ),
    EvalDimension(
        key="team_fit", group="game", label_zh="团队匹配度",
        weight=0.02,
        description="Tech stack complement vs overlap. Team composition context matters.",
    ),
]

# Default weights (can be calibrated by calibrator.py)
DEFAULT_WEIGHTS: dict[str, float] = {d.key: d.weight for d in DIMENSIONS}

# Group weights
GROUP_WEIGHTS = {
    "hard": 0.32,
    "signal": 0.24,
    "dynamic": 0.26,
    "game": 0.18,
}


def get_dimension(key: str) -> EvalDimension | None:
    for d in DIMENSIONS:
        if d.key == key:
            return d
    return None


def compute_composite(scores: dict[str, float], weights: dict[str, float] | None = None) -> float:
    """Compute weighted composite score from dimension scores."""
    w = weights or DEFAULT_WEIGHTS
    total = 0.0
    weight_sum = 0.0
    for key, score in scores.items():
        if key in w:
            total += score * w[key]
            weight_sum += w[key]
    if weight_sum == 0:
        return 0.5
    return round(total / weight_sum, 3)
