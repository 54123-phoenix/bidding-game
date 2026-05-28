"""POST /api/counterfactual — What-if analysis."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from counterfactual.engine import CounterfactualEngine
from game.engine import BiddingGameEngine
from models.schemas import StructuredJob, StructuredResume

router = APIRouter(tags=["Counterfactual"])


class CounterfactualRequest(BaseModel):
    resume: dict
    job: dict
    strategy: str = "balanced"
    market_condition: str = "normal"


@router.post("/counterfactual")
async def counterfactual(request: CounterfactualRequest):
    """Run counterfactual analysis on a bidding game.

    Tests 7 interventions (improve skills, gain experience, downgrade level,
    switch company, wait for market, lower salary, emphasize growth) and
    returns ranked recommendations with marginal effects and confidence intervals.
    """
    try:
        resume = StructuredResume(**request.resume)
        job = StructuredJob(**request.job)

        # Run base case
        engine = BiddingGameEngine(max_rounds=5)
        base_result = await engine.run(resume, job, market_condition=request.market_condition, strategy=request.strategy)

        # Counterfactual analysis
        async def rerun(r, j, **kwargs):
            return await engine.run(r, j, strategy=kwargs.get("strategy", "balanced"),
                                    market_condition=kwargs.get("market_condition", "normal"))

        cf_engine = CounterfactualEngine(rerun, bootstrap_samples=30)
        report = await cf_engine.analyze(resume, job, base_result)

        return {"status": "ok", "base": base_result.model_dump(), "counterfactual": report.model_dump()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
