"""Signal dimension scorers — prestige and pedigree evaluation.

These dimensions encode Chinese tech industry-specific heuristics
that general hiring models miss.
"""

from __future__ import annotations

from models.schemas import DimensionScore, StructuredResume


def score_school_signal(resume: StructuredResume) -> DimensionScore:
    """School prestige signal calibrated for Chinese tech hiring.

    C9 + PhD = near-perfect; 985 + Master = strong; no degree = baseline.
    """
    if not resume.education:
        return DimensionScore(dimension="school_signal", score=0.3, weight=0.08,
                              reasoning="无教育背景记录。基准分 0.3。")

    from core.knowledge.knowledge_base import classify_school

    tier_scores = {"C9": 0.95, "QS100": 0.90, "985": 0.80, "211": 0.65, "双一流": 0.60, "其他": 0.40}
    degree_scores = {"博士": 0.95, "硕士": 0.75, "本科": 0.55, "其他": 0.30}

    best_score = 0.0
    best_school = ""
    best_degree = ""

    for edu in resume.education:
        tier, label, multiplier = classify_school(edu.school)
        tier_base = tier_scores.get(tier, 0.40)
        degree_base = degree_scores.get(edu.degree, 0.30)
        # Composite: school tier × 0.6 + degree × 0.4
        composite = tier_base * 0.6 + degree_base * 0.4
        if composite > best_score:
            best_score = composite
            best_school = f"{edu.school}({label})"
            best_degree = edu.degree

    return DimensionScore(
        dimension="school_signal", score=round(best_score, 3), weight=0.08,
        evidence=[
            f"最高学历: {best_school} {best_degree}",
            f"综合评分: {best_score:.0%}",
        ],
        reasoning=f"学历信号 {best_score:.0%}: {best_school} {best_degree}",
    )


def score_competition_signal(resume: StructuredResume) -> DimensionScore:
    """Competition achievement signal.

    ACM Gold >> Kaggle Gold >> Provincial >> None.
    Award level matters more than participation count.
    """
    if not resume.competitions:
        return DimensionScore(dimension="competition_signal", score=0.0, weight=0.06,
                              reasoning="无竞赛经历。", evidence=["无竞赛记录"])

    from core.knowledge.knowledge_base import classify_competition

    level_scores = {"S": 1.0, "A": 0.80, "B": 0.50, "C": 0.20}
    best_score = 0.0
    best_label = ""

    for comp in resume.competitions:
        level, label, bonus = classify_competition(comp.name, comp.award)
        base = level_scores.get(level, 0.20) * 0.7 + bonus * 2.5  # Bonus contributes up to 0.375
        if base > best_score:
            best_score = base
            best_label = label

    return DimensionScore(
        dimension="competition_signal", score=round(min(best_score, 1.0), 3), weight=0.06,
        evidence=[
            f"最高竞赛: {best_label}",
            f"竞赛数量: {len(resume.competitions)}",
        ],
        reasoning=f"竞赛信号 {min(best_score, 1.0):.0%}: {best_label}",
    )


def score_company_pedigree(resume: StructuredResume) -> DimensionScore:
    """Company pedigree — previous employer prestige.

    T1 big tech experience is a strong positive signal in Chinese hiring.
    Startup experience can be positive (ownership, speed) or negative (process maturity).
    """
    if not resume.experience:
        return DimensionScore(dimension="company_pedigree", score=0.2, weight=0.10,
                              reasoning="无工作经历，公司背书为 0。", evidence=["无工作经验"])

    from core.knowledge.knowledge_base import classify_company

    tier_scores = {"T1": 1.0, "foreign": 0.90, "T2": 0.65, "T3": 0.35, "startup": 0.30}
    tiers_seen: list[str] = []
    companies_seen: list[str] = []

    for exp in resume.experience:
        tier, label, weight = classify_company(exp.company)
        tiers_seen.append(tier)
        companies_seen.append(label)

    # Best tier with tenure bonus
    has_t1 = "T1" in tiers_seen
    has_foreign = "foreign" in tiers_seen
    has_t2 = "T2" in tiers_seen

    # Count T1 companies
    t1_count = tiers_seen.count("T1") + tiers_seen.count("foreign")

    if has_t1 or has_foreign:
        best_tier = "T1" if has_t1 else "foreign"
        base = tier_scores[best_tier]
        # Multiple T1 stints = even better
        base = min(base + t1_count * 0.05, 1.0)
    elif has_t2:
        base = tier_scores["T2"]
    else:
        # Default for T3/startup
        base = max(tier_scores.get(t, 0.35) for t in tiers_seen)

    # Diversity bonus: experience at 2+ different company types
    unique_tiers = len(set(tiers_seen))
    if unique_tiers >= 3:
        base = min(base + 0.05, 1.0)

    return DimensionScore(
        dimension="company_pedigree", score=round(base, 3), weight=0.10,
        evidence=[
            f"公司: {', '.join(companies_seen)}",
            f"层级分布: {', '.join(tiers_seen)}",
            f"一线大厂数量: {t1_count}",
        ],
        reasoning=f"公司背书 {base:.0%}: {'T1大厂' if has_t1 else 'T2中厂' if has_t2 else '其他'}经历",
    )
