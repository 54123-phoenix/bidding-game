"""GET /api/demo — Instant demo with built-in data (no upload needed)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from data.demo_profiles import JOBS, RESUMES
from game.engine import BiddingGameEngine
from game.equilibrium import EquilibriumSolver
from eval.dimensions import compute_composite
from eval.scorers.hard import score_experience_fit, score_skill_match
from eval.scorers.signals import score_company_pedigree, score_competition_signal, score_school_signal

router = APIRouter(tags=["Demo"])


@router.get("/demo")
async def demo(
    resume_key: str = Query(default="res-diana-zhao", description="Resume ID from demo_profiles"),
    job_key: str = Query(default="job-bytedance-backend", description="Job ID from demo_profiles"),
    strategy: str = Query(default="balanced"),
    market: str = Query(default="normal"),
):
    """Run a complete demo: evaluation + simulation + equilibrium, no upload needed.

    Try these combinations:
      - Strong match: res-diana-zhao / job-bytedance-backend
      - Weak match:   res-john-chen / job-ali-staff-architect
      - Cross-domain: res-ryan-sun / job-bytedance-ml-platform
      - Expert match: res-thomas-lin / job-ali-staff-architect
    """
    if resume_key not in RESUMES:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown resume_key. Available: {list(RESUMES.keys())}",
        )
    if job_key not in JOBS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown job_key. Available: {list(JOBS.keys())}",
        )

    resume = RESUMES[resume_key]
    job = JOBS[job_key]

    # 1. Evaluation
    dims = {}
    dim_details = []
    for scorer in [score_skill_match, score_experience_fit]:
        s = scorer(resume, job)
        dims[s.dimension] = s.score
        dim_details.append(s.model_dump())
    for scorer in [score_school_signal, score_competition_signal, score_company_pedigree]:
        s = scorer(resume)
        dims[s.dimension] = s.score
        dim_details.append(s.model_dump())
    composite = compute_composite(dims)

    # 2. Simulation — rule-based for fast demo response
    engine = BiddingGameEngine(max_rounds=8)
    result = await engine.run(resume, job, market_condition=market, strategy=strategy, use_llm=False)

    # 3. Equilibrium
    solver = EquilibriumSolver()
    eq = solver.solve(result.final_state)

    return {
        "status": "ok",
        "candidate": {"name": resume.name, "skills": resume.skills[:8], "level": resume.skills[:3]},
        "job": {"title": job.title, "company": job.company, "level": job.level, "required_skills": job.required_skills},
        "evaluation": {"composite": composite, "dimensions": dim_details},
        "simulation": result.model_dump(),
        "equilibrium": eq.model_dump(),
    }
