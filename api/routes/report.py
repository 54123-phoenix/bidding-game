"""POST /api/report — Full multi-dimensional evaluation report."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from eval.dimensions import compute_composite
from eval.scorers.hard import score_experience_fit, score_skill_match
from eval.scorers.signals import score_company_pedigree, score_competition_signal, score_school_signal
from models.schemas import StructuredJob, StructuredResume

router = APIRouter(tags=["Report"])


class ReportRequest(BaseModel):
    resume: dict
    job: dict


@router.post("/report")
async def report(request: ReportRequest):
    """Generate a 12-dimension evaluation report.

    Currently implements 5/12 dimensions (hard + signal groups).
    Dynamic and game dimensions require signal_extractor outputs.
    """
    try:
        resume = StructuredResume(**request.resume)
        job = StructuredJob(**request.job)

        # Run all available scorers
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

        return {
            "status": "ok",
            "composite_score": composite,
            "dimensions": [s.model_dump() for s in all_scores],
            "dimension_count": len(all_scores),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
