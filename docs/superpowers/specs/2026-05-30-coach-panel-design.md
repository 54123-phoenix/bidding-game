# Coach Panel Design

## Purpose

Upgrade the negotiation phase from a simulation UI into a salary negotiation coach. The user should see not only the current game state, but also what to do next and why that action is rational.

The coach must answer three questions during play:

1. What should I do next?
2. Why is that the right move now?
3. How does HR currently see me?

## Product Decision

Use a single unified `CoachPanel` as the visible coaching surface during active negotiation.

Product behavior:

- Default open.
- User can collapse it.
- Demo/history-driven flows should show it open by default so judges immediately see the coaching value.
- It replaces the visible roles of `AdvisorToast`, `RoundInsightPanel`, and `DecisionHint` in the negotiation phase.

Implementation safety:

- Do not delete old components in the first implementation.
- Stop rendering duplicate visible hints from `PlayNegotiationStep` and `NegotiationActionComposer` once `CoachPanel` is in place.
- Keep old component files temporarily for rollback.

## Placement

Place `CoachPanel` in the right-side action column above `NegotiationActionComposer`.

Current right column order:

1. `NegotiationActionComposer`
2. `RoundInsightPanel`
3. `InfoCardHand`
4. `ParallelUniversePanel`
5. `infoNarrative`

Target order:

1. `CoachPanel`
2. `NegotiationActionComposer`
3. `InfoCardHand`
4. `ParallelUniversePanel`
5. `infoNarrative`

Rationale:

- The coach should guide the action before the user sees action buttons.
- `BattleHUD` remains a state dashboard.
- `ChatBubblePanel` remains the conversation record.
- `NegotiationActionComposer` remains the execution surface.
- `InfoCardHand` remains the tactical chip surface.

## Coach Panel Content

### 1. Coach Verdict

A single direct recommendation.

Examples:

- `先补筹码，不要立刻让步。`
- `HR 耐心偏低，转向成交条件。`
- `预算口径已出现，拆总包而不是继续加现金。`
- `当前信任足够，可以提出明确锚点。`

### 2. Why

Short explanation that ties the recommendation to current state.

Inputs:

- `roundInsight.hr_interpretation`
- `roundInsight.situation_delta`
- `hrPatience`
- `trustState.hr_trust_in_candidate`
- latest HR/candidate salary actions

Example:

`HR 正在测试你的底线。当前信任尚可，但耐心下降；如果此时直接让步，会强化“你可被压价”的判断。`

### 3. Recommended Move

Concrete next move, not just principle.

Examples:

- `先打出一张高可信筹码卡，再报价 76K。`
- `先确认职责与总包结构，再决定是否接受。`
- `减少解释，直接提出“现金 + 签字费 + 职级评审”的组合方案。`

The panel does not execute actions in the first version. It recommends; the existing action composer and chip hand remain responsible for execution.

### 4. HR Belief Snapshot

Lightweight second-order belief display. It explains how HR likely sees the user.

Fields:

- Trust: from `trustState.hr_trust_in_candidate`.
- Patience: from `hrPatience`.
- External option probability: derived from market condition, competition intensity, and signal actions.
- Bottom-line strength: derived from candidate counter-offer pattern and concession size.

Labels should be human-readable:

- `外部选择：弱 / 中 / 强`
- `底线强度：松动 / 稳定 / 强硬`
- `入职确定性：低 / 中 / 高`

## Rule Model

The first implementation should use transparent rules, not a new LLM call.

### Signals

Use these inputs:

- `actions`
- `gameState.public_offer`
- `gameState.competition_intensity`
- `gameState.market_adjustment`
- `hrPatience`
- `trustState`
- `roundInsight`
- `infoCards`
- `lastInfoPlay`

### Decision Rules

Order matters. Use the first matching high-priority rule.

1. If `hrPatience < 0.3`:
   - Verdict: close the deal or shift to structure.
   - Recommended move: reduce debate, discuss total package, level, signing bonus, review cycle.

2. If latest HR action is a low offer and trust is medium/high:
   - Verdict: do not concede immediately.
   - Recommended move: play a high-credibility chip, then counter.

3. If latest HR action mentions or implies budget/internal equity:
   - Verdict: stop single-axis cash negotiation.
   - Recommended move: split cash, signing bonus, title, equity, performance review.

4. If trust is low:
   - Verdict: repair credibility before asking higher.
   - Recommended move: emphasize verifiable project evidence; avoid aggressive reframing.

5. If market/competition is hot and HR patience is healthy:
   - Verdict: use entry certainty as leverage.
   - Recommended move: exchange faster acceptance for a higher offer or stronger package.

6. Default:
   - Verdict: establish evidence before anchoring.
   - Recommended move: connect one concrete achievement to the salary ask.

## Integration With Existing Features

### `AdvisorToast`

Do not render `AdvisorToast` once `CoachPanel` is live. Its message is redundant with the verdict.

### `RoundInsightPanel`

Do not render `RoundInsightPanel` once `CoachPanel` is live. Its content should be folded into `Why` and `HR Belief Snapshot`.

### `DecisionHint`

Remove or hide the static `DecisionHint` strip from `NegotiationActionComposer` when the coach is visible. Static hints are less useful than state-aware coaching and add noise.

### `InfoCardHand`

Keep it as the execution surface for chips. The coach can reference chips generically in v1, e.g. `先打出一张高可信筹码卡`. It does not need to select a specific card yet.

### `NegotiationMemo`

Keep as post-game takeaway. Do not duplicate its long-form strategy list in `CoachPanel`.

### `StrategyTreeLite`

Keep as post-game causal explanation. `CoachPanel` only gives current-step guidance.

### Demo Data

No changes required for the first coach version. Existing 25 demo sessions will show the coach when restored into `/play?review=` only if the review path renders the negotiation phase. Result pages already show memo/tree.

For live `/play`, demo profile and simulated sessions should show the coach immediately during negotiation.

## Component Interface

Proposed props:

```ts
interface CoachPanelProps {
  actions: RoundActionView[];
  gameState: GameStateView | null;
  hrPatience: number;
  trustState: TrustStateView | null;
  roundInsight: RoundInsight | null;
  infoCards: InfoCardView[];
  lastInfoPlay: InfoPlayFeedback | null;
  disabled?: boolean;
  defaultOpen?: boolean;
}
```

Internal model:

```ts
interface CoachAdvice {
  severity: "tip" | "warning" | "danger";
  verdict: string;
  why: string;
  recommendedMove: string;
  belief: {
    trust: number;
    patience: number;
    externalOptions: "weak" | "medium" | "strong";
    bottomLine: "loose" | "stable" | "firm";
    acceptanceCertainty: "low" | "medium" | "high";
  };
}
```

## Visual Design

Style should match the tactical coach direction already established:

- Use `surface-base` / `surface-raised`.
- Cyan for coach guidance.
- Amber for caution.
- Rose for high risk.
- Purple for HR belief.
- Keep copy short and scannable.

Collapsed state:

- Shows severity chip.
- Shows verdict.
- Shows expand button.

Expanded state:

- Verdict block.
- Why block.
- Recommended move block.
- Belief snapshot metrics.

## Error Handling

If inputs are missing:

- Use safe defaults.
- Do not hide the panel.
- Show a generic coaching prompt: `先建立可信筹码，再给薪资锚点。`

If `roundInsight` is null:

- Use deterministic rules from `actions`, `hrPatience`, and `trustState`.

If there are no actions:

- Show opening guidance: `开局先说明岗位匹配证据，再给合理高位锚点。`

## Testing And Validation

Manual checks:

1. `/play` setup starts normally.
2. Negotiation phase shows `CoachPanel` above actions.
3. `AdvisorToast` and `RoundInsightPanel` are not visibly duplicated.
4. Collapsing and expanding the panel works.
5. HR patience below 30% triggers high-risk closing advice.
6. Low trust triggers credibility-repair advice.
7. Build passes.
8. Lint has no new errors.

Regression checks:

- Existing action buttons still work.
- Free text mode still works.
- Chip actions still call existing handlers.
- Results page memo/tree still render.

## Non-Goals

- No new LLM call.
- No automatic action execution.
- No backend API changes.
- No deletion of old hint components in the first implementation.
- No mobile-specific redesign.

## Rollback Strategy

If `CoachPanel` causes layout or UX issues:

1. Re-enable `AdvisorToast` and `RoundInsightPanel` in `PlayNegotiationStep`.
2. Re-enable `DecisionHint` in `NegotiationActionComposer`.
3. Stop rendering `CoachPanel`.

Because old components are retained, rollback should be a render-level change only.
