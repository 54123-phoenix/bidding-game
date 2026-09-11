# Project Evidence And Contribution Boundaries

This page separates repository evidence from product claims. It is intended to make the project easier to review without treating code volume or AI terminology as proof by themselves.

## Repository Status

- Product type: competition-oriented salary-negotiation coaching prototype.
- Core behavior: deterministic rule-based simulation with optional LLM-assisted parsing and explanation.
- Current branch at the time of this review: `upgrade/safe-refactor`; it should become `main` before the repository is featured.
- Public history currently records one Git author (`phenix`) across incremental feature, fix, test, and documentation commits.

## Verified Evidence

On 2026-09-11, the default automated backend suite completed on Python 3.11.9:

```text
148 passed in 1.72s
```

The command was:

```bash
python -m pytest tests -q
```

`pyproject.toml` excludes `tests/manual/` from the default suite. Those files are service-level or exploratory checks and are not included in the 148-test claim.

## Implemented Boundaries

Implemented and represented in the repository:

- FastAPI API and session flow;
- deterministic negotiation engine, payoff rules, belief updates, patience, and personas;
- evaluation and counterfactual modules;
- Next.js coaching, negotiation, recap, strategy-tree, and What-if interfaces;
- optional LLM routing with mock/fallback behavior;
- Docker and local-development configuration.

Not claimed:

- production-grade hiring or compensation advice;
- a formally solved game-theoretic equilibrium;
- real-time labor-market coverage;
- a live public deployment or real-user outcome study;
- strict counterfactual recomputation for the What-if UI.

## AI-Assisted Development Boundary

Repository artifacts and commit history are the evidence for what exists. Interview or portfolio descriptions should claim only code paths that the maintainer can independently explain, run, modify, and test; generated plans, review reports, or terminology are not treated as implementation evidence by themselves.
