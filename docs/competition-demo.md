# Competition Demo Script

## Positioning

This project is a job-offer negotiation cockpit. It does not claim to predict the real market. It demonstrates how a candidate can rehearse salary strategy under incomplete information, then review the reasoning trail.

## 3-Minute Demo Path

1. Open `/` and explain the product promise: resume + JD become a negotiation game with salary, trust, patience, and evidence.
2. Click a quick scenario. The launch flow initializes a real backend session instead of showing static mock cards.
3. In `/play`, point out the mission briefing, HR persona, salary tug-of-war, situation rail, and information cards.
4. Make one counter-offer. Explain that HR response, trust, patience, and next advice update from game state.
5. Reveal or conceal one information card to show the information-war mechanic.
6. Finish or continue until results. Show the credibility ledger first: rule-first scoring, LLM-assisted explanation, simplified strategy analysis, evidence coverage.
7. Open results tabs: narrative, game board, timeline, evaluation. Close by saying the system is a rehearsal and explanation tool, not an oracle.

## Judge Talking Points

- Complete loop: landing -> initialize -> negotiate -> result -> review.
- Differentiation: salary negotiation is treated as a stateful game, not a single chat response.
- Engineering: FastAPI backend, Next.js frontend, typed API boundary, session recovery, tests, production build.
- Honesty: UI now discloses which outputs are rule-based, LLM-assisted, or scenario-style.

## Known Boundaries

- Salary ranges are demo inputs and rules, not live market data.
- Strategy analysis is simplified best-response analysis, not a rigorous production-grade equilibrium solver.
- RAG/vector search exists as a supporting module, but the main demo path is rule-first simulation.

## Backup Plan

If LLM/API keys are unavailable, use quick scenarios. The core simulation and UI still run with deterministic fallback behavior.
