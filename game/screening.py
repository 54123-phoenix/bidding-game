"""Resume Screening — lightweight pre-negotiation filter.

Not strict: most candidates pass. Only obviously mismatched profiles are rejected.
Screening result affects:
  - Whether negotiation starts at all
  - Initial salary offer (lower match = lower opening offer)
  - HR patience baseline (lower match = less patience)

Tiers:
  A (score >= 0.65): Normal entry, standard opening offer
  B (0.35 <= score < 0.65): Entry allowed, reduced opening offer (-10% to -25%)
  C (score < 0.35): Screening failed, negotiation does not start
"""

from __future__ import annotations

from dataclasses import dataclass

from models.schemas import StructuredJob, StructuredResume


# ── Tier thresholds (lenient) ─────────────────────────────────────────────

TIER_A_THRESHOLD = 0.65
TIER_B_THRESHOLD = 0.35

# ── Scoring weights ───────────────────────────────────────────────────────

SKILL_WEIGHT = 0.40
EXPERIENCE_WEIGHT = 0.30
EDUCATION_WEIGHT = 0.15
COMPANY_WEIGHT = 0.15

# ── Education score map ───────────────────────────────────────────────────

EDU_SCORES: dict[str, float] = {
    "博士": 1.0, "博士在读": 0.9,
    "硕士": 0.85, "硕士在读": 0.75, "研究生": 0.85,
    "本科": 0.65, "本科在读": 0.55, "学士": 0.65,
    "大专": 0.40, "专科": 0.40,
    "高中": 0.20, "其他": 0.30,
}

# ── Tiered companies ──────────────────────────────────────────────────────

TIER1_KEYWORDS = [
    "阿里", "字节", "腾讯", "百度", "美团", "京东", "滴滴", "快手", "拼多多",
    "google", "amazon", "microsoft", "meta", "apple", "netflix",
    "华为", "小米", "网易", "携程", "哔哩", "b站",
]

TIER2_KEYWORDS = [
    "商汤", "旷视", "依图", "云从", "第四范式", "地平线", "寒武纪",
    "momenta", "pony.ai", "文远", "autox", "图森",
    "shopee", "grab", "gojek", "sea",
    " Goldman ", " Morgan ", "麦肯锡", "贝恩", "波士顿",
]


@dataclass
class ScreeningResult:
    passed: bool
    score: float
    tier: str  # "A" | "B" | "C"
    skill_match: float
    experience_match: float
    education_score: float
    company_score: float
    feedback: str
    opening_offer_multiplier: float  # 1.0 for A, 0.75~0.9 for B
    patience_adjustment: float  # +0.05 for A, -0.05 for B


def _normalize_skill(raw: str) -> str:
    return raw.strip().lower().replace(".", "").replace(" ", "")


def _skill_match(resume: StructuredResume, job: StructuredJob) -> float:
    """Ratio of required skills found in resume."""
    if not job.required_skills:
        return 0.7  # No requirements = lenient

    resume_skills = {_normalize_skill(s) for s in resume.skills}
    matched = 0
    for req in job.required_skills:
        req_norm = _normalize_skill(req)
        # Direct match or substring match
        if req_norm in resume_skills or any(req_norm in rs for rs in resume_skills):
            matched += 1
            continue
        # Synonym check
        for rs in resume_skills:
            if _are_synonyms(req_norm, rs):
                matched += 1
                break

    ratio = matched / len(job.required_skills)
    # Bonus for optional skills
    if job.optional_skills:
        opt_matched = sum(
            1 for opt in job.optional_skills
            if _normalize_skill(opt) in resume_skills
        )
        ratio += 0.05 * min(opt_matched, 3)  # Cap bonus at +0.15

    return min(ratio, 1.0)


def _are_synonyms(a: str, b: str) -> bool:
    """Quick synonym check for common skill aliases."""
    syn_groups = [
        {"react", "reactjs", "react.js", "前端", "frontend"},
        {"vue", "vuejs", "vue.js"},
        {"angular", "ng"},
        {"nodejs", "node", "node.js"},
        {"python", "py", "python3"},
        {"go", "golang", "go-lang"},
        {"kubernetes", "k8s"},
        {"tensorflow", "tf"},
        {"pytorch", "torch"},
        {"postgresql", "postgres"},
        {"mongodb", "mongo"},
        {"elasticsearch", "es"},
        {"docker", "容器"},
        {"redis", "缓存"},
        {"kafka", "消息队列", "mq"},
        {"graphql", "gql"},
        {"grpc", "rpc"},
        {"microservices", "微服务"},
        {"distributed", "分布式"},
        {"highconcurrency", "高并发"},
        {"machinelearning", "ml", "机器学习"},
        {"deeplearning", "dl", "深度学习"},
        {"nlp", "自然语言处理"},
        {"llm", "大模型", "大语言模型"},
        {"rag", "检索增强"},
        {"finetuning", "微调", "sft"},
    ]
    for group in syn_groups:
        if a in group and b in group:
            return True
    return False


def _experience_match(resume: StructuredResume, job: StructuredJob) -> float:
    """Resume years vs job minimum requirement."""
    resume_years = getattr(resume, "experience_years", 0) or 0

    # Compute from experience list if explicit field missing
    if not resume_years and resume.experience:
        from datetime import date as _date
        total = 0.0
        for exp in resume.experience:
            if exp.start_date:
                end = exp.end_date or _date.today()
                total += (end - exp.start_date).days / 365.0
        resume_years = total

    min_required = job.min_experience_years or 0
    if min_required <= 0:
        return 0.7  # No requirement = lenient

    ratio = resume_years / min_required
    if ratio >= 1.0:
        return 1.0
    if ratio >= 0.7:
        return 0.85
    if ratio >= 0.5:
        return 0.65
    if ratio >= 0.3:
        return 0.45
    return 0.30  # Floor — still pass if other dimensions are strong


def _education_score(resume: StructuredResume) -> float:
    """Highest education level score."""
    if not resume.education:
        return 0.50

    best = 0.0
    for edu in resume.education:
        deg = (edu.degree or "").strip()
        score = EDU_SCORES.get(deg, 0.30)
        # School bonus
        school = (edu.school or "").lower()
        if any(kw in school for kw in ("清华", "北大", "浙大", "上交", "复旦", "中科大")):
            score = min(score + 0.10, 1.0)
        elif "985" in school or "211" in school:
            score = min(score + 0.05, 1.0)
        best = max(best, score)

    return best


def _company_score(resume: StructuredResume) -> float:
    """Work experience company tier score."""
    if not resume.experience:
        return 0.50

    has_tier1 = False
    has_tier2 = False

    for exp in resume.experience:
        company = (exp.company or "").lower()
        if any(kw in company for kw in [k.lower() for k in TIER1_KEYWORDS]):
            has_tier1 = True
            break
        if any(kw in company for kw in [k.lower() for k in TIER2_KEYWORDS]):
            has_tier2 = True

    if has_tier1:
        return 1.0
    if has_tier2:
        return 0.85
    return 0.55  # Still decent — not strict


def _build_feedback(
    tier: str,
    skill_match: float,
    exp_match: float,
    edu_score: float,
    company_score: float,
) -> str:
    """Human-readable screening feedback."""
    if tier == "A":
        parts = ["简历与岗位匹配度高"]
        if skill_match >= 0.8:
            parts.append("核心技能覆盖全面")
        if exp_match >= 0.9:
            parts.append("经验丰富")
        if edu_score >= 0.8:
            parts.append("学历背景优秀")
        if company_score >= 0.9:
            parts.append("大厂背景加分")
        return "。".join(parts) + "。直接进入谈判。"

    if tier == "B":
        parts = ["简历基本符合岗位要求"]
        if skill_match < 0.6:
            parts.append(f"技能匹配度{int(skill_match * 100)}%（部分技能待补充）")
        if exp_match < 0.7:
            parts.append(f"经验稍浅（匹配度{int(exp_match * 100)}%）")
        return "。".join(parts) + "。可进入面试谈判，但初始报价会适度下调。"

    # Tier C
    parts = []
    if skill_match < 0.3:
        parts.append(f"技能匹配度仅{int(skill_match * 100)}%，核心技能差距较大")
    if exp_match < 0.4:
        parts.append(f"经验不足（匹配度{int(exp_match * 100)}%）")
    if edu_score < 0.5:
        parts.append("学历背景与岗位要求有差距")
    if not parts:
        parts.append("综合匹配度偏低")
    return "。".join(parts) + "。建议优化简历后再投递。"


def screen_resume(resume: StructuredResume, job: StructuredJob) -> ScreeningResult:
    """Run lightweight screening. Lenient — most candidates pass."""
    skill = _skill_match(resume, job)
    exp = _experience_match(resume, job)
    edu = _education_score(resume)
    comp = _company_score(resume)

    score = (
        skill * SKILL_WEIGHT +
        exp * EXPERIENCE_WEIGHT +
        edu * EDUCATION_WEIGHT +
        comp * COMPANY_WEIGHT
    )

    if score >= TIER_A_THRESHOLD:
        tier = "A"
        passed = True
        offer_mul = 1.0
        patience_adj = 0.05
    elif score >= TIER_B_THRESHOLD:
        tier = "B"
        passed = True
        # Lower match = lower offer multiplier, range 0.75 ~ 0.92
        offer_mul = 0.92 - (TIER_A_THRESHOLD - score) * 0.5
        offer_mul = max(0.75, min(0.92, offer_mul))
        patience_adj = -0.05
    else:
        tier = "C"
        passed = False
        offer_mul = 0.0
        patience_adj = 0.0

    return ScreeningResult(
        passed=passed,
        score=round(score, 3),
        tier=tier,
        skill_match=round(skill, 3),
        experience_match=round(exp, 3),
        education_score=round(edu, 3),
        company_score=round(comp, 3),
        feedback=_build_feedback(tier, skill, exp, edu, comp),
        opening_offer_multiplier=round(offer_mul, 3),
        patience_adjustment=round(patience_adj, 3),
    )
