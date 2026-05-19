"""Signal Extractor — converts raw resume data into structured career signals.

Ported from ai-career-intelligence backend/domain/signal_extractor.py.
Extended with dynamic dimensions: growth potential, stability risk, negotiation leverage.

Input:  StructuredResume
Output: SignalProfile (with 8 signal dimensions)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date as _date

from core.knowledge.knowledge_base import (
    classify_company,
    classify_competition,
    classify_school,
    extract_project_metrics,
)
from models.schemas import StructuredResume


@dataclass
class SignalProfile:
    """Structured career signals extracted from a resume.

    Extended from original to include dynamic dimensions used by the bidding game.
    """

    # ── Static Signals (school / competition / company) ──
    highest_school_tier: str = "其他"         # C9 / 985 / 211 / QS100 / 双一流 / 其他
    highest_school_label: str = "其他院校"
    school_score_multiplier: float = 1.00

    best_competition_level: str = "无"        # S / A / B / C / 无
    best_competition_label: str = ""
    competition_bonus: float = 0.0

    company_tiers: list[str] = field(default_factory=list)
    company_labels: list[str] = field(default_factory=list)
    best_company_tier: str = "T3"
    best_company_label: str = "其他公司"
    company_experience_weight: float = 1.0

    # ── Project / Experience Signals ──
    project_metrics: dict[str, str] = field(default_factory=dict)
    has_quantified_impact: bool = False
    project_count: int = 0
    total_experience_years: float = 0.0
    inferred_level: str = ""                   # P5/P6/P7/P8/P9

    # ── Dynamic Signals (new — for bidding game) ──

    # Growth trajectory: how fast is the candidate improving?
    skill_growth_rate: float = 0.0             # Skills acquired per year on average
    promotion_speed: float = 0.0               # Years per level-up (lower = faster)
    career_trajectory_label: str = "steady"    # "steep" | "steady" | "plateau" | "declining"

    # Stability: what's the risk of early departure?
    avg_tenure_years: float = 0.0
    jump_frequency: float = 0.0                # Job changes per year
    stability_risk: float = 0.5                # 0 = very stable, 1 = flight risk

    # Negotiation leverage
    inferred_leverage: float = 0.5             # 0 = weak position, 1 = strong position
    suggested_salary_range: tuple[int, int] | None = None  # (min, max) K/yr

    # Skill depth assessment
    skill_depths: dict[str, str] = field(default_factory=dict)  # {"Go": "精通", ...}
    skill_breadth_score: float = 0.0           # How many distinct domains covered
    t_shape_score: float = 0.0                 # Depth × Breadth composite

    def to_dict(self) -> dict:
        return {
            "school": {"tier": self.highest_school_tier, "label": self.highest_school_label,
                       "multiplier": self.school_score_multiplier},
            "competition": {"level": self.best_competition_level, "label": self.best_competition_label,
                            "bonus": self.competition_bonus},
            "company": {"tiers": self.company_tiers, "labels": self.company_labels,
                        "best_tier": self.best_company_tier, "best_label": self.best_company_label,
                        "experience_weight": self.company_experience_weight},
            "projects": {"metrics": self.project_metrics, "has_quantified_impact": self.has_quantified_impact,
                         "count": self.project_count},
            "experience": {"total_years": self.total_experience_years, "inferred_level": self.inferred_level},
            "growth": {"rate": self.skill_growth_rate, "promotion_speed": self.promotion_speed,
                       "trajectory": self.career_trajectory_label},
            "stability": {"avg_tenure_years": self.avg_tenure_years, "jump_frequency": self.jump_frequency,
                          "risk": self.stability_risk},
            "leverage": {"score": self.inferred_leverage,
                         "suggested_salary": list(self.suggested_salary_range)
                         if self.suggested_salary_range else None},
            "skills": {"depths": self.skill_depths, "breadth": self.skill_breadth_score,
                       "t_shape": self.t_shape_score},
        }


def extract_signals(resume: StructuredResume) -> SignalProfile:
    """Extract all career signals from a structured resume.

    This is THE single entry point. Call once per resume, use the SignalProfile everywhere downstream.
    """
    profile = SignalProfile()
    profile.skill_depths = dict(resume.skill_levels) if resume.skill_levels else {}

    _extract_school_signal(resume, profile)
    _extract_competition_signal(resume, profile)
    _extract_company_signal(resume, profile)
    _extract_project_signal(resume, profile)
    _extract_experience_signal(resume, profile)
    _extract_growth_signal(resume, profile)       # NEW
    _extract_stability_signal(resume, profile)     # NEW
    _extract_leverage_signal(resume, profile)      # NEW
    _extract_skill_shape(resume, profile)          # NEW

    return profile


# ── Static signal extractors (ported from original) ─────────────────────


def _extract_school_signal(resume: StructuredResume, p: SignalProfile):
    if not resume.education:
        return
    best_tier, best_label, best_score = "其他", "其他院校", 1.00
    tier_rank = {"C9": 5, "QS100": 4, "985": 3, "211": 2, "双一流": 2, "其他": 1}
    for edu in resume.education:
        tier, label, score = classify_school(edu.school)
        if tier_rank.get(tier, 0) > tier_rank.get(best_tier, 0):
            best_tier, best_label, best_score = tier, label, score
    p.highest_school_tier = best_tier
    p.highest_school_label = best_label
    p.school_score_multiplier = best_score


def _extract_competition_signal(resume: StructuredResume, p: SignalProfile):
    if not resume.competitions:
        p.best_competition_level = "无"
        p.best_competition_label = "无竞赛经历"
        p.competition_bonus = 0.0
        return
    best_level, best_label, best_bonus = "C", "", 0.0
    level_rank = {"S": 4, "A": 3, "B": 2, "C": 1}
    for comp in resume.competitions:
        level, label, bonus = classify_competition(comp.name, comp.award)
        if level_rank.get(level, 0) > level_rank.get(best_level, 0) or (
            level == best_level and bonus > best_bonus
        ):
            best_level, best_label, best_bonus = level, label, bonus
    p.best_competition_level = best_level
    p.best_competition_label = best_label
    p.competition_bonus = best_bonus


def _extract_company_signal(resume: StructuredResume, p: SignalProfile):
    if not resume.experience:
        p.company_experience_weight = 1.0
        return
    tiers, labels = [], []
    best_tier, best_label, best_weight = "T3", "其他公司", 1.0
    tier_rank = {"T1": 4, "foreign": 3, "T2": 2, "T3": 1, "startup": 0}
    for exp in resume.experience:
        tier, label, weight = classify_company(exp.company)
        tiers.append(tier)
        labels.append(label)
        if tier_rank.get(tier, 0) > tier_rank.get(best_tier, 0):
            best_tier, best_label, best_weight = tier, label, weight
    p.company_tiers = tiers
    p.company_labels = labels
    p.best_company_tier = best_tier
    p.best_company_label = best_label
    p.company_experience_weight = best_weight


def _extract_project_signal(resume: StructuredResume, p: SignalProfile):
    p.project_count = len(resume.projects)
    all_metrics: dict[str, str] = {}
    for proj in resume.projects:
        metrics = extract_project_metrics(proj.description)
        for k, v in metrics.items():
            if k not in all_metrics:
                all_metrics[k] = v
    p.project_metrics = all_metrics
    p.has_quantified_impact = len(all_metrics) > 0


def _extract_experience_signal(resume: StructuredResume, p: SignalProfile):
    today = _date.today()
    total_days = 0.0
    for exp in resume.experience:
        if exp.start_date:
            end = exp.end_date if exp.end_date else today
            total_days += (end - exp.start_date).days
    years = round(total_days / 365.25, 1)
    p.total_experience_years = max(years, 0.0)
    # Infer level
    has_big_company = p.best_company_tier in ("T1", "foreign")
    has_strong_education = p.highest_school_tier in ("C9", "985", "QS100")
    if years >= 10:
        p.inferred_level = "P9"
    elif years >= 7:
        p.inferred_level = "P8" if has_big_company else "P7"
    elif years >= 5:
        p.inferred_level = "P7" if (has_big_company or has_strong_education) else "P6"
    elif years >= 3:
        p.inferred_level = "P6" if has_big_company else "P5"
    elif years >= 1:
        p.inferred_level = "P5"
    else:
        p.inferred_level = "P4"


# ── Dynamic signal extractors (NEW — for bidding game) ──────────────────


def _extract_growth_signal(resume: StructuredResume, p: SignalProfile):
    """Estimate career growth rate from observable signals.

    Looks at: skill count growth, promotion speed, project complexity escalation.
    """
    skills = [s.lower().strip() for s in resume.skills] if resume.skills else []
    years = max(p.total_experience_years, 0.5)
    p.skill_growth_rate = round(len(skills) / years, 1)

    # Promotion speed: years per title change
    titles = [e.title for e in resume.experience if e.title]
    unique_titles = list(dict.fromkeys(titles))  # deduplicate preserving order
    if len(unique_titles) >= 2:
        p.promotion_speed = round(years / len(unique_titles), 1)
    else:
        p.promotion_speed = years

    # Trajectory label (order matters — check most specific first)
    if p.skill_growth_rate >= 8 and p.promotion_speed <= 2:
        p.career_trajectory_label = "steep"
    elif p.total_experience_years > 8 and p.skill_growth_rate < 1:
        p.career_trajectory_label = "declining"
    elif p.skill_growth_rate >= 4 and p.promotion_speed <= 4:
        p.career_trajectory_label = "steady"
    elif p.skill_growth_rate < 2 or p.promotion_speed > 6:
        p.career_trajectory_label = "plateau"
    else:
        p.career_trajectory_label = "steady"


def _extract_stability_signal(resume: StructuredResume, p: SignalProfile):
    """Estimate job-hopping risk from tenure patterns.

    Chinese internet industry baseline: 1.5-2 year tenure is normal.
    < 1 year per job = flight risk; > 3 years = very stable.
    """
    if not resume.experience:
        p.avg_tenure_years = 0.0
        p.jump_frequency = 0.0
        p.stability_risk = 0.5
        return

    tenures: list[float] = []
    today = _date.today()
    for exp in resume.experience:
        if exp.start_date:
            end = exp.end_date if exp.end_date else today
            tenure = (end - exp.start_date).days / 365.0
            tenures.append(max(tenure, 0.0))

    if tenures:
        p.avg_tenure_years = round(sum(tenures) / len(tenures), 1)

    years = max(p.total_experience_years, 0.5)
    num_jobs = len(resume.experience)
    p.jump_frequency = round(num_jobs / years, 2)

    # Risk scoring (calibrated for Chinese internet industry)
    if p.avg_tenure_years < 1.0:
        p.stability_risk = 0.85   # Very high flight risk
    elif p.avg_tenure_years < 1.5:
        p.stability_risk = 0.65
    elif p.avg_tenure_years < 2.0:
        p.stability_risk = 0.45   # Normal for internet industry
    elif p.avg_tenure_years < 3.0:
        p.stability_risk = 0.25
    else:
        p.stability_risk = 0.10   # Very stable


def _extract_leverage_signal(resume: StructuredResume, p: SignalProfile):
    """Estimate candidate's negotiation leverage.

    Factors: company pedigree, competition record, skill rarity, level, market position.
    """
    base_score = 0.5

    # Company pedigree bonus
    if p.best_company_tier == "T1":
        base_score += 0.15
    elif p.best_company_tier == "foreign":
        base_score += 0.12
    elif p.best_company_tier == "T2":
        base_score += 0.05

    # Competition bonus
    base_score += p.competition_bonus

    # Education bonus
    if p.highest_school_tier in ("C9", "QS100"):
        base_score += 0.08
    elif p.highest_school_tier == "985":
        base_score += 0.04

    # Quantified impact bonus
    if p.has_quantified_impact:
        base_score += 0.05

    p.inferred_leverage = round(min(max(base_score, 0.1), 0.95), 2)

    # Suggested salary range based on level + leverage
    # Units: K/year (thousands), e.g., 420 = 42万/year for P7
    level_salary_base = {
        "P4": (120, 180), "P5": (180, 280), "P6": (280, 420),
        "P7": (420, 600), "P8": (550, 800), "P9": (700, 1000),
    }
    base_range = level_salary_base.get(p.inferred_level, (20, 35))
    leverage_mult = 0.8 + p.inferred_leverage * 0.4  # 0.8x - 1.2x
    p.suggested_salary_range = (
        int(base_range[0] * leverage_mult),
        int(base_range[1] * leverage_mult),
    )


def _extract_skill_shape(resume: StructuredResume, p: SignalProfile):
    """Assess skill depth-vs-breadth (T-shaped assessment).

    T-shaped = deep expertise in 1-2 domains + broad knowledge across many.
    """
    skills = resume.skills if resume.skills else []

    # Define skill domains
    domains = {
        "backend": {"go", "java", "python", "c++", "rust", "node.js", "fastapi", "django",
                    "spring boot", "gin", "grpc", "微服务", "分布式", "高并发"},
        "frontend": {"react", "vue", "angular", "typescript", "javascript", "css", "html",
                     "next.js", "tailwind css", "webpack", "vite"},
        "data": {"sql", "mysql", "postgresql", "mongodb", "redis", "kafka", "spark",
                 "flink", "hadoop", "clickhouse", "数据仓库", "etl"},
        "ai_ml": {"python", "pytorch", "tensorflow", "nlp", "cv", "llm", "rag",
                  "transformers", "langchain", "机器学习", "深度学习"},
        "cloud": {"kubernetes", "docker", "aws", "azure", "gcp", "terraform",
                  "prometheus", "grafana", "istio", "serverless", "云原生"},
        "mobile": {"swift", "kotlin", "flutter", "react native", "ios", "android"},
        "security": {"安全", "渗透", "密码学", "waf", "soc", "zero trust"},
    }

    domain_hits: dict[str, int] = {}
    for skill in skills:
        skill_lower = skill.lower().strip()
        for domain, keywords in domains.items():
            if skill_lower in keywords:
                domain_hits[domain] = domain_hits.get(domain, 0) + 1

    num_domains = len(domain_hits)
    max_depth = max(domain_hits.values()) if domain_hits else 0
    total_skills = len(skills) if skills else 1

    p.skill_breadth_score = round(min(num_domains / 4.0, 1.0), 2)  # 4+ domains = max breadth
    depth_score = round(min(max_depth / 8.0, 1.0), 2)            # 8+ skills in one domain = max depth
    p.t_shape_score = round(depth_score * 0.5 + p.skill_breadth_score * 0.3 + (len(skills) / 20.0) * 0.2, 2)
