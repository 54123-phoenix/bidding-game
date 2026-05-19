# Career Bidding Game — 智聘创新AI+大赛

**Multi-Agent Bayesian Hiring Game Simulation** for the Chinese tech industry.

4个AI Agent（候选人、HR、面试官、市场环境）在信息不对称下的多轮薪资博弈模拟，结合12维评估体系、贝叶斯均衡求解、反事实分析和AI辩论引擎。

## Architecture

```
bidding-game/
├── api/                  # FastAPI REST API
│   ├── main.py           # App entry point, CORS, lifespan
│   └── routes/           # upload, simulate, counterfactual, report, debate, game, demo, debrief_chat
├── core/                 # Domain logic (no API dependency)
│   ├── config.py         # Centralized configuration (env vars)
│   ├── signal_extractor.py  # Resume → 12-dimension career signals
│   ├── china_market_model.py # China-specific market data & rules
│   └── knowledge/        # Skill synonyms, school/company/competition classification
├── game/                 # Game engine
│   ├── engine.py         # Multi-round Bayesian negotiation orchestrator
│   ├── equilibrium.py    # Bayesian Nash Equilibrium solver
│   ├── payoff.py         # Payoff functions for all 4 agents
│   ├── patience.py       # Dynamic bilateral patience system
│   ├── persona.py        # HR persona generation
│   ├── deliberation.py   # LLM deliberation (two-dimension projection)
│   ├── beliefs.py        # Bayesian belief updating
│   ├── strategies/       # Reusable negotiation strategies
│   └── players/          # Candidate, HR, Interviewer, Market agents
├── eval/                 # 12-dimension evaluation framework
│   ├── dimensions.py     # Dimension definitions & composite scoring
│   └── scorers/          # hard.py (skill/exp match), signals.py (school/company/competition)
├── counterfactual/       # What-if analysis engine
├── debate/               # Evidence-backed proposal builder
├── retrieval/            # Qdrant vector search + sentence-transformers embedding
├── input/                # Resume PDF parsing
├── llm/                  # LLM client (DashScope → Ollama → mock fallback)
├── models/               # Pydantic schemas (shared data types)
├── data/                 # Demo profiles (10 resumes + 15 JDs)
├── tests/                # Unit tests (66 tests, pytest)
├── frontend/             # Next.js UI
│   └── app/              # play, simulation, analysis, demo, debate pages
├── run_demo.py           # CLI demo runner
├── requirements.txt      # Python dependencies
└── .gitignore
```

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+ (for frontend)

### Backend

```bash
# Create virtual environment
python -m venv .venv
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Configure LLM (optional — falls back to rule-based mode)
cp .env.example .env
# Edit .env: DASHSCOPE_API_KEY=your_key

# Run server
uvicorn api.main:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev  # → http://localhost:3000
```

### Tests

```bash
pytest tests/ -v
```

## Game Flow

1. **Upload** — Candidate uploads resume PDF → parsed into structured data
2. **Signal Extraction** — 12 career dimensions extracted: skill match, school prestige, company pedigree, growth trajectory, negotiation leverage, etc.
3. **Game Simulation** — 4-agent Bayesian negotiation:
   - Market emits macro signals (supply/demand ratio, salary trends, hot skills)
   - Interviewer evaluates candidate (skill/experience/domain/soft skills)
   - Candidate and HR negotiate salary/level via alternating offers
   - Patience levels change dynamically based on actions and signals
4. **Equilibrium Analysis** — Bayesian Nash Equilibrium computation with counterfactual what-if scenarios
5. **Debate** — Structured proposal with computation traces for every claim

## Key Design Decisions

- **Deterministic-first**: All scoring is rule-based. LLM is optional for natural language generation only.
- **China-specific**: Encodes real Chinese internet industry structures — Alibaba P-levels, company tiers, implicit age thresholds, talent flow networks.
- **Computation traces**: Every output number has a verifiable computation path (formula + evidence + code reference).
- **Patience-based termination**: Negotiation ends when either side's patience runs out — not a fixed timer.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DASHSCOPE_API_KEY` | (none) | DashScope API key for LLM features |
| `LLM_MODEL` | `qwen-plus` | LLM model name |
| `CORS_ORIGINS` | `http://localhost:3000,...` | Allowed CORS origins |
| `SERVER_PORT` | `8001` | API server port |
| `GAME_MAX_ROUNDS` | `8` | Max negotiation rounds |
| `BOOTSTRAP_SAMPLES` | `50` | Counterfactual bootstrap iterations |
| `QDRANT_URL` | `data/qdrant_storage/` | Qdrant storage path |

## License

This project is developed for the Alibaba Cloud 智聘创新AI+大赛.
