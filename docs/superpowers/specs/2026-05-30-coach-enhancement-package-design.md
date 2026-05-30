# Coach Enhancement Package Design

## Purpose

Extend the app from an in-round salary negotiation coach into a stronger decision-support product. The user should be able to explore alternative choices, understand HR beliefs, see the long-term impact of chip packaging, and learn the interface quickly.

This package includes four focused enhancements:

1. Interactive What-if analysis.
2. HR belief explanation inside `CoachPanel`.
3. Local reputation tracking for chip packaging.
4. Updated onboarding tutorial for coach mode.

The design intentionally avoids backend rewrites, rule DSLs, event buses, real recruiting-site data, and complex game-theory solvers in this phase.

## Product Goals

After one run, a user should be able to answer:

1. If I had changed my round-2 ask by 5K, what likely changes?
2. Why does HR currently trust or distrust me?
3. Did my chip packaging improve or damage my credibility?
4. How do I use coach mode, chips, actions, and recap without reading documentation?

## Non-Goals

- No backend API changes.
- No new LLM calls.
- No strict equilibrium recomputation for What-if v1.
- No cross-device reputation sync.
- No mobile-specific redesign.
- No scraping or real salary data integration.
- No DSL or event bus implementation.

## Module 1: Interactive What-if Panel

### Placement

Add a new result-page tab in `GameResultsView`:

Existing tabs:

1. `谈判备忘录`
2. `复盘叙事`
3. `博弈面板`
4. `轮次回放`
5. `策略树`
6. `评估与均衡`

Target tabs:

1. `谈判备忘录`
2. `复盘叙事`
3. `博弈面板`
4. `轮次回放`
5. `策略树`
6. `What-if`
7. `评估与均衡`

### Component

Add `frontend/app/play/components/WhatIfPanel.tsx`.

Inputs:

```ts
interface WhatIfPanelProps {
  finalResult: FinalResultView;
  actions: RoundActionView[];
  equilibrium: EquilibriumView | null;
}
```

### Interactions

The user can adjust:

1. Key round
   - Default: first candidate `counter_offer` action.
   - Fallback: first candidate salary action.
   - Fallback if none: first action.

2. Salary delta
   - Range: `-10K` to `+10K`.
   - Step: `1K`.
   - Label: `如果这一轮报价调整 X K`.

3. Strategy posture
   - `更强硬`
   - `更稳健`
   - `更快成交`

### Outputs

Show four result cards:

- Estimated success probability.
- Estimated final salary.
- Break risk.
- HR trust change.

Show one short explanation paragraph.

Example:

`如果第 2 轮多要 5K，预计最终薪资上升约 3K，但成交概率下降 8%。由于 HR 耐心已经偏低，强硬姿态会显著增加破裂风险。`

### Rule File

Add `frontend/app/play/lib/what-if-rules.ts`.

Export:

```ts
interface WhatIfInput {
  baseSuccessProbability: number;
  baseFinalSalary: number | null;
  selectedSalary: number | null;
  salaryDelta: number;
  posture: "firm" | "balanced" | "close_fast";
  marketHeat: number;
  hrPatienceEstimate: number;
}

interface WhatIfResult {
  successProbability: number;
  finalSalary: number | null;
  breakRisk: number;
  trustDelta: number;
  explanation: string;
}

export function estimateWhatIf(input: WhatIfInput): WhatIfResult;
```

### Rule Behavior

First version is an approximate front-end model.

- Higher ask:
  - Salary estimate increases.
  - Success probability decreases.
  - Break risk increases.

- Lower ask:
  - Salary estimate decreases.
  - Success probability increases.
  - Trust slightly increases.

- Hot market reduces the penalty of higher asks.
- Low HR patience increases the penalty of higher asks.
- `firm` posture increases salary and risk.
- `balanced` posture moderates effects.
- `close_fast` increases success probability and lowers salary upside.

The UI must label this as approximate:

`近似推演：用于训练决策直觉，不是严格重跑完整均衡模型。`

## Module 2: CoachPanel Belief Explanation

### Current State

`CoachPanel` already shows:

- Verdict.
- Why.
- Recommended move.
- HR profile.
- Belief metrics.

### Enhancement

Each belief metric should include one-line reasoning.

Metrics:

1. Trust
   - Explanation source: `trustState`, chip action, `lastInfoPlay`.
   - Example: `来自筹码可信度、回应一致性和 HR 验证结果。`

2. Patience
   - Explanation source: `hrPatience`, round count, high-pressure actions.
   - Example: `耐心低时，继续拉扯现金会更容易破裂。`

3. External options
   - Explanation source: `competition_intensity`, `market_adjustment`, signal actions.
   - Example: `市场热度和外部机会信号越强，HR 越担心你被截走。`

4. Bottom-line strength
   - Explanation source: concession pattern.
   - Example: `报价让步越小，HR 越会判断你底线强。`

5. Acceptance certainty
   - Explanation source: trust + patience + accept/close-fast signals.
   - Example: `你释放成交条件越明确，HR 越愿意换取上调。`

### UI

No new tooltip library.

Use compact metric cards with:

- Metric label.
- Metric value.
- One-line explanation.

Keep the expanded panel readable. If it becomes too tall, use 2 columns where space allows.

## Module 3: Local Reputation Tracking

### Purpose

Make chip packaging a long-term strategy. The user should see that repeated aggressive reframing can damage credibility, while high-credibility emphasis can improve reputation.

### Data Storage

Use localStorage only.

Key: `bidding_reputation`.

Shape:

```ts
interface ReputationState {
  score: number;
  events: ReputationEvent[];
}

interface ReputationEvent {
  id: string;
  timestamp: number;
  actionType: "emphasize" | "reframe" | "downplay";
  label: string;
  delta: number;
  reason: string;
  trustAfter?: number;
}
```

Initial score: `0.72`.

Clamp score to `[0, 1]`.

### Rule File

Add `frontend/app/play/lib/reputation.ts`.

Exports:

```ts
export function loadReputation(): ReputationState;
export function applyReputationEvent(event: Omit<ReputationEvent, "id" | "timestamp">): ReputationState;
export function describeReputation(score: number): { label: string; tone: "good" | "neutral" | "risk" };
```

### Reputation Rules

- `emphasize` with trust increase: `+0.02`.
- `emphasize` with no trust change: `+0.01`.
- `reframe` with trust decrease: `-0.04`.
- `reframe` with trust increase: `+0.01`.
- `downplay`: `-0.01` by default.
- Any event should apply mild mean reversion toward `0.72` before delta, so one event does not permanently dominate.

### UI

Add `frontend/app/play/components/ReputationBadge.tsx`.

Show in `InfoCardHand` header:

- `市场信誉 78%`
- `最近变化 +2% · 高可信筹码`

Also allow `CoachPanel` to use the score later, but v1 does not need to feed it into advice rules.

### Integration With `useInfoWar`

After `applyResponse` receives `trustAfter`, compute a reputation delta and write local state.

Map existing internal actions to product language:

- `reveal` -> `emphasize`
- `fake` -> `reframe`
- `conceal` -> `downplay`

Do not change backend action names in this phase.

## Module 4: New Onboarding Tutorial

### Component

Update `TutorialModal`.

### New Four-Step Flow

1. Coach Mode
   - Explains that every round gives next-step advice and HR belief interpretation.

2. Chip Cards
   - Explains that chips are about packaging real experience: emphasize, reframe, downplay.
   - Mentions reputation impact.

3. Negotiation Actions
   - Explains quote, accept, reject, and free-text actions.
   - Emphasizes that the goal is not to win a game, but to practice real salary judgment.

4. Recap
   - Explains memo, strategy tree, and What-if replay.

### Copy Constraint

Avoid terms that imply encouraging deception:

- Avoid `造假`.
- Avoid `夸大` as a recommended action.
- Avoid `隐藏真实实力`.

Use:

- `强调`
- `重组`
- `弱化`
- `验证风险`
- `信誉影响`

## Implementation Order

1. What-if panel and rules.
2. CoachPanel belief explanations.
3. Reputation rule file, badge, and `useInfoWar` integration.
4. TutorialModal copy and flow update.

This order maximizes visible value while keeping risk contained.

## Validation

Run:

- `npm run lint`
- `npm run build`

Manual checks:

1. Result page has a `What-if` tab.
2. Salary delta slider updates result cards without network requests.
3. CoachPanel still renders and is not overly tall.
4. Belief metric explanations are readable.
5. Playing chip actions updates local reputation.
6. Reputation badge appears in `InfoCardHand`.
7. TutorialModal avoids deception-oriented language.
8. Existing action buttons, free text, and results page still work.

## Rollback Strategy

- What-if can be removed by dropping the tab and component import.
- Reputation can be disabled by not rendering `ReputationBadge`; localStorage data can remain harmless.
- Tutorial copy changes are isolated to `TutorialModal`.
- CoachPanel belief explanations can be reverted to metric-only cards.
