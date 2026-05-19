"""CounterfactualEngine — structured what-if analysis.

Generates counterfactual scenarios by:
  1. Identifying mutable features (intervention points)
  2. Re-running the game model with modified parameters
  3. Computing marginal effects with bootstrap confidence intervals
  4. Ranking interventions by impact

Reference: DoWhy (py-why/dowhy) causal inference API design patterns.
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import Callable

from models.schemas import CounterfactualReport, GameResult, StructuredJob, StructuredResume


@dataclass
class Intervention:
    """A single counterfactual intervention."""
    name: str
    description: str
    apply: Callable  # (resume, job, context) → (modified_resume, modified_job, modified_context)
    category: str  # "skill" | "strategy" | "market" | "target"


@dataclass
class CounterfactualResult:
    intervention: Intervention
    original_probability: float
    new_probability: float
    marginal_effect: float
    confidence_interval: tuple[float, float]
    is_significant: bool


class CounterfactualEngine:
    """Generate and evaluate what-if scenarios.

    Usage:
        engine = CounterfactualEngine(game_runner)
        report = await engine.analyze(resume, job, base_result)
    """

    def __init__(self, game_runner: Callable, bootstrap_samples: int = 50):
        self._runner = game_runner  # async fn(resume, job, **kwargs) → GameResult
        self._bootstrap_samples = bootstrap_samples
        self._interventions: list[Intervention] = _default_interventions()

    async def analyze(
        self,
        resume: StructuredResume,
        job: StructuredJob,
        base_result: GameResult,
        top_k: int = 5,
    ) -> CounterfactualReport:
        """Generate and rank counterfactual scenarios."""
        counterfactuals: list[CounterfactualResult] = []

        for intervention in self._interventions:
            # Apply intervention
            modified_resume, modified_job, modified_context = intervention.apply(
                resume, job, {"base_result": base_result}
            )

            # Re-run game
            try:
                new_result = await self._runner(
                    modified_resume, modified_job, **modified_context
                )
                new_prob = new_result.success_probability
            except Exception:
                new_prob = base_result.success_probability

            # Marginal effect
            marginal = new_prob - base_result.success_probability

            # Bootstrap confidence interval
            ci = self._bootstrap_ci(
                resume, job, modified_resume, modified_job,
                modified_context, intervention, n=self._bootstrap_samples,
            )

            cf = CounterfactualResult(
                intervention=intervention,
                original_probability=base_result.success_probability,
                new_probability=new_prob,
                marginal_effect=round(marginal, 3),
                confidence_interval=ci,
                is_significant=abs(marginal) > 0.03,
            )
            counterfactuals.append(cf)

        # Sort by absolute impact
        counterfactuals.sort(key=lambda c: -abs(c.marginal_effect))

        # Build report
        interventions = [
            {
                "name": c.intervention.name,
                "description": c.intervention.description,
                "category": c.intervention.category,
                "original_p": c.original_probability,
                "new_p": c.new_probability,
                "marginal_effect": c.marginal_effect,
                "confidence_interval": list(c.confidence_interval),
                "significant": c.is_significant,
            }
            for c in counterfactuals[:top_k]
        ]

        top = counterfactuals[:3] if counterfactuals else []
        recommendations = [
            {
                "action": c.intervention.name,
                "expected_improvement": f"{c.marginal_effect:+.1%}",
                "confidence": f"{c.confidence_interval[0]:.1%} - {c.confidence_interval[1]:.1%}",
                "rationale": c.intervention.description,
            }
            for c in top if c.is_significant and c.marginal_effect > 0
        ]

        return CounterfactualReport(
            base_outcome=base_result,
            interventions=interventions,
            top_recommendations=recommendations,
            sensitivity_analysis=_sensitivity_summary(counterfactuals),
        )

    async def _bootstrap_ci(
        self, original_resume, original_job, modified_resume, modified_job,
        modified_context, intervention, n: int = 50,
    ) -> tuple[float, float]:
        """Estimate confidence interval via real game re-runs with parameter noise."""
        base_prob = modified_context.get("base_result", None)
        base_p = base_prob.success_probability if base_prob else 0.5

        effects = []
        samples = min(n, self._bootstrap_samples)  # Real re-runs — respect user config, keep bounded

        for i in range(samples):
            try:
                jittered_context = dict(modified_context)
                jittered_context.pop("base_result", None)
                # Small random jitter to market condition to simulate sampling variance
                import random as _random
                market_opts = ["hot", "normal", "cool"]
                jittered_context["market_condition"] = _random.choice(market_opts)
                new_result = await self._runner(
                    modified_resume, modified_job, **jittered_context
                )
                alt_p = new_result.success_probability
                effects.append(alt_p - base_p)
            except Exception:
                continue

        if len(effects) < 2:
            return (round(-0.05, 3), round(0.05, 3))

        effects.sort()
        lower = effects[max(0, int(len(effects) * 0.10))]
        upper = effects[min(len(effects) - 1, int(len(effects) * 0.90))]
        return (round(lower, 3), round(upper, 3))


# ═══════════════════════════════════════════════════════════════════════════════
# Default Interventions
# ═══════════════════════════════════════════════════════════════════════════════


def _default_interventions() -> list[Intervention]:
    return [
        Intervention(
            name="improve_skills",
            description="提升核心技能匹配度 (学1-2个缺失技能)",
            apply=_intervene_improve_skills,
            category="skill",
        ),
        Intervention(
            name="gain_experience",
            description="增加1年相关工作经验",
            apply=_intervene_gain_experience,
            category="skill",
        ),
        Intervention(
            name="downgrade_level",
            description="申请低一级岗位",
            apply=_intervene_downgrade_level,
            category="target",
        ),
        Intervention(
            name="switch_company",
            description="换一家目标公司",
            apply=_intervene_switch_company,
            category="target",
        ),
        Intervention(
            name="wait_market",
            description="等待市场回暖 (候选人市场)",
            apply=_intervene_wait_market,
            category="market",
        ),
        Intervention(
            name="accept_lower_salary",
            description="降低薪资期望 10%",
            apply=_intervene_lower_salary,
            category="strategy",
        ),
        Intervention(
            name="emphasize_growth",
            description="谈判中强调成长意愿而非薪资",
            apply=_intervene_emphasize_growth,
            category="strategy",
        ),
    ]


def _intervene_improve_skills(resume, job, context):
    """Add one missing required skill."""
    modified = resume.model_copy(deep=True)
    missing = [s for s in job.required_skills if s.lower() not in {sk.lower() for sk in modified.skills}]
    if missing:
        modified.skills.append(missing[0])
    return modified, job, context


def _intervene_gain_experience(resume, job, context):
    """Add 1 year of relevant experience to the resume."""
    from datetime import date as _date
    from models.schemas import WorkExperience

    modified = resume.model_copy(deep=True)
    # Append a synthetic experience entry representing +1 year growth
    synthetic = WorkExperience(
        company=job.company,
        title=job.title,
        description=f"1年{job.title}相关经验积累",
        tech_stack=list(job.required_skills[:3]),
        start_date=_date.today().replace(year=_date.today().year - 1),
        end_date=_date.today(),
    )
    modified.experience = list(modified.experience) + [synthetic]
    return modified, job, context


def _intervene_downgrade_level(resume, job, context):
    level_order = ["初级", "中级", "高级", "专家", "P5", "P6", "P7", "P8", "P9"]
    modified = job.model_copy(deep=True)
    current = modified.level
    if current in level_order:
        idx = level_order.index(current)
        if idx > 0:
            modified.level = level_order[idx - 1]
    return resume, modified, context


def _intervene_switch_company(resume, job, context):
    alternatives = {
        "字节跳动": "腾讯", "阿里巴巴": "字节跳动", "腾讯": "美团",
        "百度": "字节跳动", "美团": "拼多多", "快手": "小红书",
    }
    modified = job.model_copy(deep=True)
    current = modified.company
    if current in alternatives:
        modified.company = alternatives[current]
    return resume, modified, context


def _intervene_wait_market(resume, job, context):
    return resume, job, {**context, "market_condition": "hot"}


def _intervene_lower_salary(resume, job, context):
    return resume, job, {**context, "salary_discount": 0.10}


def _intervene_emphasize_growth(resume, job, context):
    return resume, job, {**context, "strategy": "conservative"}


def _sensitivity_summary(counterfactuals: list[CounterfactualResult]) -> dict:
    """Summarize the sensitivity of the outcome to various interventions."""
    by_category: dict[str, list[float]] = {}
    for c in counterfactuals:
        cat = c.intervention.category
        if cat not in by_category:
            by_category[cat] = []
        by_category[cat].append(abs(c.marginal_effect))

    return {
        "most_sensitive_category": max(by_category, key=lambda k: sum(by_category[k]) / len(by_category[k])),
        "category_impacts": {
            cat: round(sum(effects) / len(effects), 3)
            for cat, effects in by_category.items()
        },
        "total_interventions": len(counterfactuals),
        "significant_interventions": sum(1 for c in counterfactuals if c.is_significant),
    }
