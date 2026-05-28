# CLAUDE.md — Bidding Game Project Guidance

## Project Overview
Multi-Agent Bayesian Hiring Game Simulation for the Chinese tech industry (阿里云智聘创新AI+大赛). FastAPI backend + Next.js frontend. Core logic is deterministic/rule-based; LLM is optional for natural language generation.

## Common Commands

```bash
# Install backend deps
pip install -r requirements.txt

# Run backend (port 8001)
uvicorn api.main:app --host 0.0.0.0 --port 8001 --reload

# Run frontend (port 3000)
cd frontend && npm run dev

# Run all unit tests
pytest tests/ -v

# Run specific test file
pytest tests/test_payoff.py -v

# Run CLI demo
python scripts/run_demo.py --single
python scripts/run_demo.py --batch
```

## Architecture Rules

### Module Dependency Hierarchy (top-down)
```
api/ → game/ + eval/ + debate/ + counterfactual/ + input/ + retrieval/
game/ → core/ + models/ + llm/
core/ → models/
eval/ → core/ + models/
```

**Rules:**
- `core/` must NOT import from `game/`, `api/`, `eval/`, `debate/`
- `models/` is the shared data layer — all Pydantic schemas live here
- `game/engine.py` is the orchestrator — all game flow goes through it
- LLM access is ONLY through `llm/client.py` — never call providers directly
- Configuration is centralized in `core/config.py` — no `os.getenv()` scattered in other modules

### File Naming
- Route files match their URL prefix: `api/routes/upload.py` → `/api/upload`
- Player files match their role: `game/players/candidate.py` → `CandidatePlayer`
- Scorer files match their group: `eval/scorers/hard.py`, `eval/scorers/signals.py`

## Key Design Patterns

### Player Pattern
All agents extend `BayesianPlayer` (game/players/base.py):
- `act(state, private_view)` → `AgentAction` (async, may use LLM)
- `_act_rules(state, private_view)` → `AgentAction` (sync, deterministic)
- LLM is tried first, falls back to `_act_rules`

### Payoff Pattern
Each agent type has a payoff function in `game/payoff.py`:
- `candidate_payoff(result, ctype)` — salary utility + growth utility
- `hr_payoff(result, hrtype)` — quality - cost + urgency
- `interviewer_payoff(result, itype)` — accuracy - bias penalty
- `market_payoff(result, mtype)` — matching efficiency

### Signal Pattern
`core/signal_extractor.py` transforms `StructuredResume` → `SignalProfile` with 12 dimensions across 4 groups: hard, signal, dynamic, game.

### Knowledge Base Pattern
`core/knowledge/knowledge_base.py` is the single source of truth for:
- Skill synonym normalization
- School tier classification (C9/985/211/QS100)
- Company tier classification (T1/T2/T3/startup/foreign)
- Competition classification (S/A/B/C)
- Project metric extraction regex patterns

## Important Conventions

### No Comments Unless Necessary
Default to writing no comments. Code should be self-documenting through good naming.

### Deterministic-First
All scoring and game logic must be deterministic. Randomness is only allowed in:
- Interviewer type generation (random but seeded)
- Persona generation (cosmetic only)

### China-Specific Data
Market data in `core/china_market_model.py` encodes real Chinese internet industry structures. When adding new companies/schools/competitions, maintain the tier system.

### Tests Must Pass
66 unit tests in `tests/` covering payoff, equilibrium, knowledge_base, and signal_extractor. All must pass before committing.

## Project Context
- **Competition**: 阿里云智聘创新AI+大赛
- **Target users**: Chinese tech job seekers negotiating offers at tier-1 internet companies
- **Key differentiator**: Bayesian game theory applied to real Chinese hiring market data
