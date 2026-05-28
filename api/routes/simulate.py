"""POST /api/simulate — Run the bidding game simulation."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from game.engine import BiddingGameEngine
from game.equilibrium import EquilibriumSolver
from models.schemas import StructuredJob, StructuredResume

router = APIRouter(tags=["Simulate"])


class SimulateRequest(BaseModel):
    resume: dict = Field(description="Parsed resume (StructuredResume as dict)")
    job: dict = Field(description="Target job (StructuredJob as dict)")
    strategy: str = Field(default="balanced", description="balanced | aggressive | conservative")
    market_condition: str = Field(default="normal", description="hot | normal | cool")
    max_rounds: int = Field(default=5, ge=2, le=10)


@router.post("/simulate")
async def simulate(request: SimulateRequest):
    """Run a complete multi-round bidding game.

    Returns the GameResult with full negotiation history, payoffs,
    equilibrium analysis, and recommendations.
    """
    try:
        resume = StructuredResume(**request.resume)
        job = StructuredJob(**request.job)

        engine = BiddingGameEngine(max_rounds=request.max_rounds)
        result = await engine.run(
            resume, job,
            market_condition=request.market_condition,
            strategy=request.strategy,
        )

        # Equilibrium analysis
        solver = EquilibriumSolver()
        eq = solver.solve(result.final_state)

        return {
            "status": "ok",
            "game": result.model_dump(),
            "equilibrium": eq.model_dump(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
