# PPT Outline

## Slide 1: Title

Title: 薪资谈判教练：面向求职者的可解释谈薪训练系统

Subtitle: 智聘创新AI+大赛作品

One-liner:

> 让求职者在真实面试前，练习 HR 压价、理解对方信念，并带走下一次可直接使用的谈判备忘录。

Visual:

- Homepage screenshot.
- Highlight `薪资谈判教练` and `Coach Mode`.

## Slide 2: Problem

Title: 求职者真正缺少的不是建议，而是可练习的决策反馈

Points:

- 真实谈薪中，候选人很难判断何时坚持、让步、举证或接受 offer。
- 普通 LLM 建议容易泛泛而谈，缺少状态、轮次和对方信念。
- 真实面试机会成本高，用户需要低风险训练场。

Key sentence:

> 我们把薪资谈判中的隐性判断显性化。

## Slide 3: Product Positioning

Title: 从“模拟游戏”到“薪资谈判教练”

Flow:

1. 输入档案/JD。
2. 系统模拟 HR、面试官和市场环境。
3. CoachPanel 每轮给出下一步建议。
4. 筹码卡训练真实经历包装。
5. 结果页生成备忘录、策略树和 What-if。

Visual:

- Product loop diagram.

## Slide 4: Core Experience

Title: 一局谈判如何帮助用户下次更会谈

Demo story:

- Sarah，4 年后端工程师。
- 面对 HR 从 68K 压价。
- CoachPanel 建议先补高可信筹码，再把锚点收敛。
- 最终复盘生成下次可用话术。

Visual:

- CoachPanel screenshot.
- Chip cards screenshot.

## Slide 5: CoachPanel

Title: 过程教练：每轮回答“我下一步该怎么做？”

Points:

- Coach Verdict: 直接建议。
- Why: 当前局势原因。
- Recommended Move: 具体动作。
- HR Profile: 预算守门人/抢人型/风险规避型等。
- Belief Snapshot: 信任、耐心、外部选择、底线强度、入职确定性。

Visual:

- Annotated CoachPanel screenshot.

## Slide 6: Chip Cards And Reputation

Title: 筹码包装：组织真实经历，而不是鼓励虚构经历

Points:

- 强调：突出真实且可验证优势。
- 重组：更有利的叙事角度，但带验证风险。
- 弱化：降低不利信息显著性，但影响长期信誉。
- 本地信誉分展示长期后果。

Boundary:

> 信誉分是训练机制，不代表真实行业信誉。

## Slide 7: Recap System

Title: 复盘不是报告，而是下次面试的策略备忘录

Points:

- Negotiation Memo: 核心筹码、锚点、底线、成交窗口、话术。
- Strategy Tree: 用户选择 -> HR 信念更新 -> 收益/风险变化。
- What-if: 如果多/少要 5K，会怎样？

Visual:

- Memo + StrategyTree + What-if screenshots.

## Slide 8: Technical Architecture

Title: 规则优先，LLM 可选，保证稳定可演示

Architecture:

- Frontend: Next.js, Tailwind, Motion.
- Backend: FastAPI, Redis session, Qdrant optional.
- Game engine: deterministic rule-first negotiation.
- LLM: optional parsing/text generation/debrief.
- Fallback: 25 seeded histories + demo profile.

Key sentence:

> LLM 是表达层增强，不是唯一决策源。

## Slide 9: Transparency And Boundaries

Title: 主动说明哪些是严格规则，哪些是近似解释

Table:

| Type | Examples |
| --- | --- |
| Deterministic | patience, reputation, what-if front-end rules, demo fallback |
| Heuristic | Bayesian-style belief, HR profile, equilibrium explanation |
| LLM-assisted | resume/JD parsing, deliberation text, debrief chat |

Do not claim:

- No live salary scraping.
- What-if is not strict equilibrium recomputation.
- Reputation is not real-world industry reputation.

## Slide 10: Demo Coverage

Title: 覆盖多岗位、多市场、多结果的 25 场谈薪历史

Points:

- 成功与破裂都有。
- 覆盖后端、AI、产品、测试、安全、IoT、数据、全栈、算法等岗位。
- 覆盖 aggressive / balanced / conservative 策略。
- 后端不可用时也能展示完整复盘闭环。

Visual:

- Dashboard screenshot with seeded sessions.

## Slide 11: Value

Title: 用户带走什么？

Outputs:

- 下次面试可用话术。
- 推荐锚点和底线区间。
- 对 HR 心理模型的理解。
- 对不同报价路径的风险直觉。
- 对筹码包装和信誉后果的认识。

## Slide 12: Closing

Title: 我们不是让 AI 替用户谈薪，而是让用户更会谈薪

Closing sentence:

> 这个系统把薪资谈判中的隐性判断显性化，让求职者在真实面试前完成一次低风险、高反馈的决策训练。

Visual:

- Final product screenshot.
- QR/link to repository or demo if allowed.
