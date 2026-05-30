# Risk Disclosure And Mitigation

This document keeps the project claims clear and bounded for submission materials.

## Summary

The project should be presented as a salary negotiation coach and competition prototype, not as a production hiring decision system.

Core safe claim:

> The system helps candidates practice salary negotiation decisions by making HR pressure, belief updates, chip packaging, and alternative choices visible.

## Key Risks

| Risk | Impact | Mitigation | Submission Wording |
| --- | --- | --- | --- |
| Overclaiming theory | Judges may challenge Bayesian/equilibrium rigor | Explicitly label belief/equilibrium/What-if as heuristic or approximate where applicable | “Bayesian-style belief explanation” / “approximate What-if training feedback” |
| LLM hallucination | Text advice may be inconsistent | Rule-first architecture; LLM is optional expression layer; seeded demo fallback | “LLM-assisted, not LLM-authoritative” |
| Ethical concern around chip packaging | Could be interpreted as encouraging deception | UI uses emphasize/reframe/downplay; reputation score penalizes risky packaging | “Organizing real experience with verification risk” |
| Data realism | No live salary scraping or validated market dataset | Use China-specific rules and 25 demo scenarios; state data boundary clearly | “Demo scenarios and local market assumptions, not live salary data” |
| What-if precision | Users may treat estimates as exact | Label as approximate; use for decision intuition only | “Not strict equilibrium recomputation” |
| Local reputation interpretation | Users may confuse it with real industry reputation | Store locally; explain it is a training mechanic | “Local training score, not real-world reputation” |
| Feature density | Reviewers may lose the main product loop | Demo only one loop: CoachPanel -> chip -> memo/tree/What-if | “One user story, one coaching loop” |
| Backend/LLM availability | Live demo may fail if service/API unavailable | 25 seeded histories and fixed profile support fallback demo | “Fallback demo data keeps review path available” |

## What To Say

Use these statements in documents, PPT, and video:

- This is a competition prototype for salary negotiation coaching.
- The authoritative path is deterministic and rule-first.
- LLM is optional and mainly improves parsing and natural-language expression.
- What-if is an approximate decision-training tool.
- Reputation is a local training mechanic.
- Chip cards are about organizing real experience, not fabricating experience.
- The product does not replace salary research, legal advice, or career counseling.

## What Not To Say

Avoid these claims:

- “We compute a rigorous production-grade Bayesian equilibrium.”
- “The system predicts real market salary accurately.”
- “What-if reruns the full game-theory solver.”
- “The reputation score reflects real hiring-market reputation.”
- “The app scrapes live recruiting websites.”
- “LLM makes the final decision.”

## Demo Risk Controls

Before recording or submission review:

1. Start the frontend and open `/`, `/play`, `/dashboard`, `/demo`.
2. If backend/LLM is unavailable, use seeded histories from dashboard.
3. Demonstrate CoachPanel, chip reputation, negotiation memo, strategy tree, and What-if.
4. Do not spend time on secondary pages unless required.
5. Mention boundaries proactively before the reviewer asks.

## Reviewer Question Short Answers

### Is the Bayesian update rigorous?

No. It is a Bayesian-style explanation layer for belief changes, not a statistically validated estimator.

### Does LLM decide the negotiation?

No. Core state and coaching logic are rule-first. LLM assists with parsing and expression.

### Is What-if exact?

No. It is approximate training feedback for decision intuition.

### Are chip cards encouraging deception?

No. The UI frames them as emphasizing, reframing, or downplaying real experience, with verification and reputation consequences.

### Is the salary data live?

No. Current data is demo/local-rule based. Live data would require authorized sources.
