"""GET /api/debate/proposal — Full evidence-backed career strategy proposal.

Returns a DebateProposal with:
  - Strengths & weaknesses (each backed by computation traces)
  - P(offer) trace with full decomposition
  - Simulation & equilibrium summaries
  - Alternative strategies from counterfactual analysis
  - Determinism percentage
"""

from __future__ import annotations

from fastapi import APIRouter, Query

from counterfactual.engine import CounterfactualEngine
from data.demo_profiles import JOBS, RESUMES
from debate.engine import build_proposal
from eval.dimensions import compute_composite
from eval.scorers.hard import score_experience_fit, score_skill_match
from eval.scorers.signals import score_company_pedigree, score_competition_signal, score_school_signal
from game.engine import BiddingGameEngine
from game.equilibrium import EquilibriumSolver

router = APIRouter(tags=["Debate"])


@router.get("/debate/proposal")
async def debate_proposal(
    resume_key: str = Query(default="res-diana-zhao"),
    job_key: str = Query(default="job-bytedance-backend"),
    strategy: str = Query(default="balanced"),
    market: str = Query(default="normal"),
):
    """Build a complete evidence-backed career strategy proposal.

    Every number in the response has an associated computation trace
    that can be expanded to show the full calculation chain.
    """
    resume = RESUMES.get(resume_key, RESUMES["res-diana-zhao"])
    job = JOBS.get(job_key, JOBS["job-bytedance-backend"])

    # 1. Run evaluation
    dims = {}
    all_scores = []
    for scorer in [score_skill_match, score_experience_fit]:
        s = scorer(resume, job)
        dims[s.dimension] = s.score
        all_scores.append(s)
    for scorer in [score_school_signal, score_competition_signal, score_company_pedigree]:
        s = scorer(resume)
        dims[s.dimension] = s.score
        all_scores.append(s)
    composite = compute_composite(dims)

    # 2. Run simulation
    engine = BiddingGameEngine(max_rounds=5)
    game_result = await engine.run(resume, job, market_condition=market, strategy=strategy)

    # 3. Equilibrium
    solver = EquilibriumSolver()
    eq = solver.solve(game_result.final_state)

    # 4. Counterfactuals
    async def rerun(r, j, **kwargs):
        return await engine.run(r, j, strategy=kwargs.get("strategy", "balanced"),
                                market_condition=kwargs.get("market_condition", "normal"))
    cf_engine = CounterfactualEngine(rerun, bootstrap_samples=20)
    cf_report = await cf_engine.analyze(resume, job, game_result)

    # 5. Build debate proposal
    proposal = build_proposal(
        resume=resume,
        job=job,
        game_result=game_result,
        equilibrium=eq,
        eval_scores=all_scores,
        counterfactuals=cf_report.interventions if cf_report else [],
    )

    return {
        "status": "ok",
        "proposal": proposal.model_dump(),
        "candidate": {"name": resume.name, "skills": resume.skills[:8]},
        "job": {"title": job.title, "company": job.company, "level": job.level,
                "required_skills": job.required_skills},
        "evaluation": {"composite": composite, "dimensions": [s.model_dump() for s in all_scores]},
        "simulation": game_result.model_dump(),
        "equilibrium": eq.model_dump(),
    }
