# Salary Negotiation Coach — 智聘创新AI+大赛

规则优先的多 Agent 薪资谈判教练，帮助求职者练习 HR 压价场景、理解对方信念，并生成下次面试可用的谈判备忘录。

> Current scope: this is a competition-oriented prototype, not a production hiring decision system. The authoritative path is deterministic rule-based simulation. LLM features are optional and mainly used for parsing, deliberation text, and recap expression.

## Why This Exists

求职者在真实面试前，最难判断的不是“我要多少钱”，而是：什么时候坚持、什么时候让步、什么时候补充筹码、什么时候换成总包/职级/签字费来谈。

Example user story:

> Sarah 是一名 4 年经验的后端工程师。她不知道应该在第 2 轮坚持 82K，还是尽快接受 HR 的 72K。系统会模拟 HR 的预算与耐心，提示她先补充“高并发推送链路”的可信筹码，再把报价收敛到 76K。谈判结束后，她能看到策略树、What-if 推演和下次面试可直接使用的话术。

## Product Loop

1. **建立个人筹码**
   - 导入简历/JD。
   - 提取技能、项目、公司、稳定性、岗位匹配、薪资杠杆等信号。

2. **进入教练局**
   - HR、面试官、市场共同生成谈判上下文。
   - `CoachPanel` 每轮给出下一步建议：坚持、让步、举证、转总包或收口。

3. **使用谈薪筹码卡**
   - 将真实经历进行强调、重组或弱化。
   - 动作会影响 HR 信任和本地市场信誉。

4. **执行谈判动作**
   - 报价、还价、接受、拒绝、自由话术。
   - HR 耐心、信任、外部选择判断会随轮次变化。

5. **复盘并带走策略**
   - 谈判备忘录：核心筹码、锚点、底线、成交窗口、推荐话术。
   - 策略树：你的选择 -> HR 信念更新 -> 收益/风险变化。
   - What-if：用滑块探索“如果第 2 轮多/少要 5K 会怎样”。

## Key Features

### CoachPanel

- 给出当前轮次的下一步建议。
- 解释为什么该这么做。
- 展示 HR 画像：预算守门人、抢人型 HR、风险规避型 HR、技术导向型 HR 等。
- 展示 HR 如何看你：信任、耐心、外部选择、底线强度、入职确定性。

### Chip Cards And Reputation

- 筹码卡不是鼓励虚构经历，而是训练用户如何组织真实经历。
- 行动语义：强调、重组、弱化。
- 本地信誉分记录长期影响：高可信筹码可提升信誉，风险较高的重组可能降低信誉。

### Negotiation Memo

- 将一局谈判转化为面试可用备忘录。
- 输出核心筹码、推荐锚点、底线区间、最佳成交窗口和可直接复用的话术。

### Strategy Tree

- 将过程拆成决策链：

  `user choice -> HR belief update -> payoff/risk change`

- 用户能看到哪一步改变了谈判走向。

### What-if Panel

- 用户可以选择关键轮次，调整报价 `-10K` 到 `+10K`。
- 展示成交概率、预估薪资、破裂风险和信任变化。
- 明确标注为近似推演，不是严格重跑完整均衡模型。

### Demo Fallback

- 内置 25 场谈薪历史。
- 内置固定个人档案 `Sarah Wang`。
- 后端或 LLM 不可用时，前端仍可展示 dashboard、复盘、策略树和 What-if。

## What Is Deterministic, Heuristic, Or LLM-Assisted?

### Deterministic

- 核心谈判状态流转。
- 硬技能匹配与部分评分规则。
- HR 耐心变化。
- 筹码信誉 localStorage 更新。
- What-if 前端近似规则。
- Demo session fallback。

### Heuristic / Explanatory

- 贝叶斯风格信念更新。
- 均衡解释。
- HR 画像推断。
- What-if 反事实近似。

### LLM-Assisted

- 简历/JD 非结构化解析。
- HR deliberation 文本。
- 复盘表达与 debrief chat。
- 自由话术解释。

### Not Claimed

- 不是生产级招聘决策系统。
- 不替代薪资调研、法律建议或职业咨询。
- What-if 不是严格均衡重算。
- 本地信誉不是现实行业信誉。
- 当前不实时抓取招聘网站薪资数据。

## Architecture

```
bidding-game/
├── api/                  # FastAPI REST API
│   ├── main.py           # App entry point, CORS, lifespan
│   ├── session_store.py  # Redis-backed session persistence
│   └── routes/           # upload, simulate, counterfactual, report, debate, game, demo, debrief_chat
├── core/                 # Domain logic
│   ├── signal_extractor.py
│   ├── china_market_model.py
│   └── knowledge/        # Skill synonyms, school/company/competition classification
├── game/                 # Negotiation engine
│   ├── engine.py
│   ├── equilibrium.py    # Simplified best-response strategy analysis
│   ├── patience.py       # Dynamic bilateral patience system
│   ├── persona.py        # HR persona generation
│   ├── beliefs.py        # Bayesian-style belief updating
│   ├── infowar.py        # Backend signal actions, surfaced as chip packaging in UI
│   └── players/          # Candidate, HR, Interviewer, Market agents
├── eval/                 # Evaluation framework
├── counterfactual/       # Scenario-style counterfactual engine
├── llm/                  # LLM client (DashScope -> Ollama -> mock fallback)
├── models/               # Shared schemas
├── data/                 # Backend demo profiles
├── frontend/             # Next.js UI
│   └── app/play/         # Coach mode, negotiation, recap, What-if
├── docker/               # Dockerfiles
├── docker-compose.yml
└── requirements.txt
```

## Quick Start

### Option A: Docker

```bash
cp .env.example .env
# Optional: configure DASHSCOPE_API_KEY for LLM-assisted features

docker-compose up --build

# Frontend -> http://localhost:3000
# API Docs  -> http://localhost:8001/docs
```

### Option B: Local Development

Backend:

```bash
python -m venv .venv
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Linux/Mac

pip install -e .
uvicorn api.main:app --host 0.0.0.0 --port 8001 --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

### Tests

```bash
pytest tests/ -v
```

Frontend validation:

```bash
cd frontend
npm run lint
npm run build
```

## Key Design Decisions

- **Salary-coach first**: the product is framed around helping candidates make better salary decisions, not around showing every possible game-theory module.
- **Rule-first**: core mechanics use deterministic rules; LLM output is optional and bounded.
- **China-specific**: includes Chinese internet-company structures, levels, company tiers, age/stability signals, and talent-flow assumptions.
- **Transparent boundaries**: simplified belief/equilibrium/What-if outputs are explicitly marked as explanatory or approximate.
- **Ethical chip packaging**: UI language uses emphasize/reframe/downplay, with reputation consequences, rather than encouraging deception.

## Demo And Review Docs

- `docs/demo-checklist.md` — recommended demo path, fallback plan, and pitch.
- `docs/judges-faq.md` — prepared answers for theory, LLM, What-if, reputation, and data-boundary questions.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DASHSCOPE_API_KEY` | (none) | DashScope API key for optional LLM features |
| `LLM_MODEL` | `qwen-plus` | LLM model name |
| `LLM_API_BASE` | `https://dashscope.aliyuncs.com/compatible-mode/v1` | LLM API endpoint |
| `CORS_ORIGINS` | `http://localhost:3000,...` | Allowed CORS origins |
| `SERVER_HOST` | `0.0.0.0` | API server bind host |
| `SERVER_PORT` | `8001` | API server port |
| `GAME_MAX_ROUNDS` | `8` | Max negotiation rounds |
| `BOOTSTRAP_SAMPLES` | `50` | Counterfactual bootstrap iterations |
| `EQUILIBRIUM_MAX_ITER` | `20` | Equilibrium solver iteration limit |
| `QDRANT_URL` | `http://localhost:6333` | Qdrant vector DB URL |
| `QDRANT_MEMORY` | `false` | Use in-memory Qdrant instead of server |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection URL |
| `SESSION_TTL` | `14400` | Session TTL in seconds |

## License

This project is developed for the Alibaba Cloud 智聘创新AI+大赛.
