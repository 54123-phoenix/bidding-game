"""Standalone demo runner for the Bidding Game engine.

Usage:
    python run_demo.py                  # Run all demos
    python run_demo.py --single         # Run single game with verbose output
    python run_demo.py --batch          # Batch compare all strategies
"""

from __future__ import annotations

import asyncio
import sys
from datetime import datetime


def print_separator(title: str = "", char: str = "=", width: int = 72) -> None:
    if title:
        side = (width - len(title) - 2) // 2
        print(f"\n{char * side} {title} {char * side}")
    else:
        print(char * width)


def print_result(result) -> None:
    """Pretty-print a game result."""
    print(f"  Game:       {result.game_id}")
    print(f"  Outcome:    {result.outcome.upper()}")
    print(f"  Rounds:     {result.negotiation_rounds}")
    print(f"  Final Salary: {result.final_salary}K/yr" if result.final_salary is not None else "  No deal")
    print(f"  Final Level:  {result.final_level}")
    print(f"  P(success):   {result.success_probability:.0%}")
    print(f"  Candidate Payoff: {result.candidate_payoff:.3f}")
    print(f"  HR Payoff:        {result.hr_payoff:.3f}")
    print(f"  Info Asym Cost:   {result.information_asymmetry_cost:.3f}")
    print(f"  Strategy:     {result.winning_strategy}")
    print(f"  Recommendation: {result.recommendation[:120]}")
    if result.key_turning_points:
        print(f"  Key Turning Points: {len(result.key_turning_points)}")
        for tp in result.key_turning_points[:3]:
            print(f"    [{tp.player}] {tp.action_type}: {tp.reasoning[:100]}")


async def run_single_demo():
    """Run a single detailed game demonstration."""
    from data.demo_profiles import JOBS, RESUMES
    from game.engine import BiddingGameEngine

    print_separator("Bidding Game — Single Demo", "=")

    resume = RESUMES["res-diana-zhao"]  # P7 Go/K8s engineer
    job = JOBS["job-bytedance-backend"]  # ByteDance backend

    print(f"\nCandidate: {resume.name}")
    print(f"  Skills: {', '.join(resume.skills[:8])}...")
    print(f"  Experience: {len(resume.experience)} roles")
    print(f"\nJob: {job.title} @ {job.company}")
    print(f"  Level: {job.level}")
    print(f"  Required: {', '.join(job.required_skills)}")
    print(f"  Salary band: {job.salary_range}")

    engine = BiddingGameEngine(max_rounds=5, seed=42)

    print_separator("Running game...", "-")
    result = await engine.run(resume, job, market_condition="normal", strategy="balanced")
    print_result(result)

    # Also show equilibrium analysis
    print_separator("Equilibrium Analysis", "-")
    from game.equilibrium import EquilibriumSolver
    solver = EquilibriumSolver()
    eq = solver.solve(result.final_state)
    print(f"  Equilibrium type: {eq.equilibrium_type}")
    print(f"  Candidate strategy: ask {eq.candidate_strategy.get('opening_salary_ask')}K, {eq.candidate_strategy.get('stance')}")
    print(f"  HR strategy:       offer {eq.hr_strategy.get('opening_offer')}K, ceiling {eq.hr_strategy.get('max_final_offer')}K")
    print(f"  Candidate payoff:  {eq.candidate_expected_payoff:.3f}")
    print(f"  HR payoff:         {eq.hr_expected_payoff:.3f}")
    print(f"  Converged: {eq.converged} ({eq.solver_iterations} iterations)")
    if eq.alternative_payoffs:
        print(f"  Counterfactuals: {len(eq.alternative_payoffs)} alternatives computed")


async def run_batch_demo():
    """Run batch comparison across multiple candidates × jobs × strategies."""
    from data.demo_profiles import JOBS, RESUMES
    from game.engine import BiddingGameEngine

    print_separator("Bidding Game — Batch Comparison", "=")

    engine = BiddingGameEngine(max_rounds=5, seed=42)
    strategies = ["aggressive", "balanced", "conservative"]

    demos = [
        ("Strong Match — P7 Go/K8s vs ByteDance Backend", "res-diana-zhao", "job-bytedance-backend"),
        ("Weak Match — P5 Junior vs P8 Architect", "res-john-chen", "job-ali-staff-architect"),
        ("Cross-Domain — NLP vs ML Platform", "res-ryan-sun", "job-bytedance-ml-platform"),
        ("Expert Match — P9 Principal vs P8 Architect", "res-thomas-lin", "job-ali-staff-architect"),
    ]

    for demo_name, resume_key, job_key in demos:
        resume = RESUMES[resume_key]
        job = JOBS[job_key]
        print_separator(demo_name, "-")
        print(f"  Candidate: {resume.name} | Skills: {', '.join(resume.skills[:6])}...")
        print(f"  Job:       {job.title} @ {job.company} | Required: {', '.join(job.required_skills)}")

        for strategy in strategies:
            result = await engine.run(resume, job, market_condition="normal", strategy=strategy)
            print(f"  [{strategy:12s}] Outcome: {result.outcome:10s} "
                  f"Salary: {str(result.final_salary) + 'K':>6s}  "
                  f"P(success): {result.success_probability:.0%}  "
                  f"Payoff: C={result.candidate_payoff:.3f} H={result.hr_payoff:.3f}")

    # Summary statistics
    print_separator("Summary", "=")
    total = accept = reject = timeout = 0
    for _, resume_key, job_key in demos:
        for strategy in strategies:
            total += 1
            result = await engine.run(RESUMES[resume_key], JOBS[job_key], strategy=strategy)
            if result.outcome == "accepted":
                accept += 1
            elif result.outcome == "rejected":
                reject += 1
            else:
                timeout += 1

    print(f"  TOTAL: {total} | Accepted: {accept} ({accept/total:.0%}) | "
          f"Rejected: {reject} ({reject/total:.0%}) | Timeout: {timeout} ({timeout/total:.0%})")


def main():
    print(f"Bidding Game Demo — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    if "--single" in sys.argv:
        asyncio.run(run_single_demo())
    elif "--batch" in sys.argv:
        asyncio.run(run_batch_demo())
    else:
        asyncio.run(run_single_demo())
        asyncio.run(run_batch_demo())

    print_separator("Done", "=")


if __name__ == "__main__":
    main()
