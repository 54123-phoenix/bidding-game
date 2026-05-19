"""Hard dimension scorers — quantifiable from resume × job data."""

from __future__ import annotations

from models.schemas import DimensionScore, StructuredJob, StructuredResume


def score_skill_match(resume: StructuredResume, job: StructuredJob) -> DimensionScore:
    """Skill matching with semantic adjacency bonus.

    Beyond simple set intersection, considers:
    - Exact matches
    - Adjacent skills (Go ↔ Rust, Python ↔ PyTorch)
    - Skill depth levels
    """
    req = {s.lower().strip() for s in job.required_skills}
    opt = {s.lower().strip() for s in job.optional_skills}
    cand = {s.lower().strip() for s in resume.skills}

    if not req:
        return DimensionScore(dimension="skill_match", score=0.5, weight=0.20, reasoning="No required skills specified.")

    exact_match = len(req & cand) / len(req)

    # Adjacency bonus: skills in adjacent domains
    adjacent_pairs = {
        "go": {"rust", "python", "java", "c++"},
        "python": {"go", "pytorch", "tensorflow", "pandas"},
        "kubernetes": {"docker", "istio", "helm", "terraform"},
        "react": {"vue", "angular", "javascript", "typescript"},
        "kafka": {"rabbitmq", "pulsar", "redis"},
        "postgresql": {"mysql", "mongodb", "clickhouse"},
    }
    adj_bonus = 0
    for r_skill in req - cand:
        r_lower = r_skill.lower().strip()
        adj_set = adjacent_pairs.get(r_lower, set())
        if adj_set & cand:
            adj_bonus += 1

    # Optional skills match bonus
    opt_match = len(opt & cand) * 0.03 if opt else 0

    score = min(exact_match + adj_bonus * 0.05 + opt_match, 1.0)

    return DimensionScore(
        dimension="skill_match", score=round(score, 3), weight=0.20,
        evidence=[
            f"匹配技能: {', '.join(req & cand)}" if req & cand else "无精确匹配",
            f"缺失技能: {', '.join(list(req - cand)[:5])}",
            f"邻近技能补偿: {adj_bonus}项",
        ],
        reasoning=f"技能匹配度 {score:.0%}: 精确匹配{exact_match:.0%} + 邻近补偿{adj_bonus * 0.05:.0%}",
    )


def score_experience_fit(resume: StructuredResume, job: StructuredJob) -> DimensionScore:
    """Experience matching with company tier multiplier.

    Big-company experience has a nonlinear premium in Chinese tech hiring.
    """
    if not resume.experience:
        return DimensionScore(dimension="experience_fit", score=0.1, weight=0.12,
                              reasoning="无工作经验。")

    from datetime import date

    total_years = 0.0
    relevant_roles = 0
    company_tiers_seen: list[str] = []

    for exp in resume.experience:
        if exp.start_date:
            end = exp.end_date or date.today()
            total_years += (end - exp.start_date).days / 365.0

        # Relevance
        job_title_lower = job.title.lower()
        if any(w in (exp.title or "").lower() for w in job_title_lower.split()):
            relevant_roles += 1

        # Company tier
        from core.knowledge.knowledge_base import classify_company
        tier, _, _ = classify_company(exp.company)
        company_tiers_seen.append(tier)

    from core.china_market_model import LEVEL_YEARS
    expected_years = LEVEL_YEARS.get(job.level, 3)

    years_score = min(total_years / max(expected_years, 1), 1.0)
    relevance_score = min(relevant_roles / max(len(resume.experience), 1), 1.0)

    # Company tier multiplier
    tier_multiplier = 1.0
    has_t1 = "T1" in company_tiers_seen or "foreign" in company_tiers_seen
    has_t2 = "T2" in company_tiers_seen
    if has_t1:
        tier_multiplier = 1.2
    elif has_t2 and total_years > 3:
        tier_multiplier = 1.1

    score = min((years_score * 0.50 + relevance_score * 0.35 + 0.15) * tier_multiplier, 1.0)

    return DimensionScore(
        dimension="experience_fit", score=round(score, 3), weight=0.12,
        evidence=[
            f"总年限: {total_years:.1f}年 (要求: {expected_years}年)",
            f"相关岗位: {relevant_roles}/{len(resume.experience)}",
            f"最高公司层级: {'T1/外企' if has_t1 else 'T2' if has_t2 else 'T3/其他'} (×{tier_multiplier:.1f})",
        ],
        reasoning=f"经验匹配 {score:.0%}: 年限{total_years:.1f}y / 期望{expected_years}y, 公司背书×{tier_multiplier}",
    )
