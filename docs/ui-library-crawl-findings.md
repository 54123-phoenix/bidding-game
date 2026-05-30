# UI Library Crawl Findings

This document summarizes a bounded crawl of public UI library documentation for patterns that can improve this project. The crawl intentionally avoided restricted pages, private data, bypassing anti-bot systems, or copying proprietary visual assets.

## Existing Project Baseline

The frontend already uses:

- Next.js 16, React 19, Tailwind CSS 4.
- `motion` for animation.
- `lucide-react` for icons.
- `shadcn` plus local UI components: `button`, `particles`, `bento-grid`, `marquee`, `neon-gradient-card`, `shimmer-button`, `border-beam`, `number-ticker`.
- A dark tactical visual system with glass panels, cyan/emerald/amber/purple state colors, grids, scanlines, and battle HUD components.

Recommended strategy: **do not replace the design system with a large UI kit**. Keep the current Tailwind/shadcn/Motion stack and selectively copy ideas from other libraries.

## Crawled Sources

| Library | Public Pages Checked | Result |
| --- | --- | --- |
| shadcn/ui | Accordion, Card, Dialog, Tabs, Sonner, Progress, Sheet, Tooltip | High fit, already aligned with project stack |
| Mantine | Button, Stepper, Timeline, AreaChart, Notifications, Colors | Strong design references; higher dependency cost |
| MUI / MUI X | Stepper, Timeline, Drawer, Charts, Alert, Skeleton | Useful enterprise UX patterns; avoid full MUI unless needed |
| HeroUI / NextUI | Component paths attempted | Public paths returned 404, no recommendation from crawl |
| Radix UI | Dialog, Tooltip, Progress, Tabs | High fit as primitives behind shadcn-style components |
| Ant Design | Steps, Timeline, Result, Statistic, Notification, Drawer | Very useful enterprise workflow patterns; dependency is heavy |
| daisyUI | Steps, Timeline, Stat, Drawer, Diff, Countdown | Useful Tailwind pattern inspiration; avoid plugin unless style reset is acceptable |
| Chakra UI | Steps, Timeline | Good API ideas; not worth adopting alongside current stack |
| Motion | Core feature page | Already installed; use for transitions/layout/exit states |
| Lucide React | React guide | Already installed; keep as primary icon source |
| Tabler Icons | Icons overview | Good optional icon source; use only if Lucide lacks specific symbols |
| Tailwind CSS | Background image docs | High fit for gradients, radial glows, custom CSS backgrounds |
| Tremor | AreaChart docs | Useful chart patterns; copying full component is large, use concept selectively |

## Highest-Value Patterns For This Project

### 1. Stepper / Progress Flow

Useful for:

- `/play` three-step flow: 情报收集 -> 薪资博弈 -> 战局复盘.
- Upload/analyze/start negotiation setup.
- Long-running LLM phases.

Best references:

- shadcn Progress for lightweight progress bars.
- Radix Progress for accessible `progressbar` semantics.
- Ant Design Steps for `current`, `status`, `percent`, `error`, `dot`, and responsive vertical behavior.
- MUI MobileStepper for compact mobile progress.
- Chakra Steps for validation hooks like `isStepValid` and `onStepInvalid`.

Project recommendation:

- Keep the existing custom step indicator, but add explicit states: `wait`, `process`, `finish`, `error`.
- Add a compact mobile version with text like `2 / 3 薪资博弈` plus a progress rail.
- Use `aria-current="step"` on the active step and `aria-label` on icon-only steps.

### 2. Timeline / Evidence Board

Useful for:

- Round-by-round negotiation history.
- Result explanation: what changed trust, patience, salary gap, and final outcome.
- Dashboard review sessions.

Best references:

- Ant Design Timeline: loading node, reverse order, horizontal/vertical orientation, alternate placement.
- Mantine Timeline: active index, dashed lines, custom bullets, theme icons.
- MUI Timeline: opposite content, alternating timeline, colored dots.
- daisyUI Timeline: simple Tailwind-only markup, colorful connector lines.
- Chakra Timeline: clean part anatomy and composition.

Project recommendation:

- Build a custom `RoundEvidenceTimeline` with no new dependency.
- Use colored nodes: cyan system, purple HR, blue candidate, amber caution, rose trust damage, emerald agreement.
- Add a pending/loading terminal node while HR is thinking.
- On mobile, collapse alternating layout into one-sided vertical chronology.

### 3. Result / Summary State

Useful for:

- Accepted/rejected outcome.
- Post-game next action.
- Error recovery.

Best references:

- Ant Design Result: status-driven title, subtitle, icon, extra actions, body area.
- MUI Alert: non-interrupting status messages, severity, action, accessibility guidance.
- shadcn Card/Dialog for project-native result panels.

Project recommendation:

- Create an `OutcomeResultCard` style rather than importing Ant Design.
- Use `status` variants: accepted, rejected, expired, error, demo.
- Always include a primary next action and a secondary review action.

### 4. Stat / Metric Cards

Useful for:

- Salary delta.
- HR patience.
- Trust level.
- Candidate credibility.
- Expected value / equilibrium metrics.

Best references:

- Ant Design Statistic: prefix/suffix, formatter, precision, timer.
- daisyUI Stat: compact metric block with icon, title, value, description, action.
- Chakra Stat: data-display structure.

Project recommendation:

- Use existing `number-ticker` for high-impact metric changes.
- Add a local `MetricCard` variant with title/value/description/trend/icon.
- Use tabular numbers for salaries and percentages.

### 5. Drawer / Sheet / Context Rail

Useful for:

- Mobile situation rail.
- Strategy reference.
- Info cards.
- Session history/detail preview.

Best references:

- shadcn Sheet: current-stack friendly side panel.
- Radix Dialog: focus trapping, title/description screen-reader announcements, Escape close.
- Ant Design Drawer: extra actions, loading skeleton, preview drawer, multi-level drawer.
- MUI Drawer: responsive temporary/permanent behavior and swipeable caution.
- daisyUI Drawer: responsive sidebar pattern.

Project recommendation:

- Add shadcn Sheet if missing, not Ant/MUI Drawer.
- Desktop: keep context visible as a rail.
- Mobile: convert context rail into bottom/right sheet with sticky action area.

### 6. Notification / Toast / Feedback

Useful for:

- Auto-save profile.
- Negotiation action submitted.
- Server sync failed.
- Session restored/expired.

Best references:

- shadcn Sonner: low setup cost, promise/status variants.
- Ant Design Notification: progress bar, stack, max count, role `alert` vs `status`.
- Mantine Notifications: update same notification from loading to success.

Project recommendation:

- Use Sonner if not already installed through shadcn.
- For long actions, update one toast instead of spawning many.
- Non-critical updates should use `role="status"`; urgent failures can use `role="alert"`.

### 7. Skeleton / Loading States

Useful for:

- Session restoration.
- Result analysis generation.
- HR deliberation.
- Dashboard history fetch.

Best references:

- MUI Skeleton: text/circular/rectangular/rounded shapes, wave animation, dimensions inferred from child.
- Ant Design Drawer: switched loading from spinner to skeleton.
- shadcn Skeleton if added later.

Project recommendation:

- Prefer skeleton panels over naked spinners for anything longer than 1 second.
- For AI calls, show phase copy and partial skeletons rather than static "loading".

### 8. Charts / Analysis Visualizations

Useful for:

- Trust trajectory.
- Patience trajectory.
- Salary gap over rounds.
- Strategy effectiveness comparison.

Best references:

- Tremor AreaChart: chart categories, `valueFormatter`, custom tooltip, mobile variant, `startEndOnly`.
- Mantine AreaChart: split positive/negative area, percent/stacked charts, reference lines, custom grid colors.
- MUI X Charts: line/bar/pie/scatter/sparkline/gauge, MIT community tier plus commercial advanced tiers.

Project recommendation:

- If charts are needed soon, add `recharts` only and build minimal local charts.
- Avoid importing a full dashboard kit until the data model is stable.
- Use cyan/purple/amber/emerald series colors matching existing tokens.

### 9. Backgrounds And Visual Atmosphere

Useful for:

- Home hero.
- Negotiation arena.
- Analysis pages.

Best references:

- Tailwind gradient utilities: radial, conic, linear, custom background values.
- Magic UI-style particles, grids, border beams already present locally.
- Motion for layout/enter/exit and gesture interactions.

Project recommendation:

- Create `TacticalBackdrop` with layered radial gradients, quiet grid, scanline, and reduced-motion fallback.
- Do not use external image backgrounds unless license is explicit.
- Keep live negotiation background active; keep result/analysis background calmer.

### 10. Icons

Useful for:

- Action cards.
- Timeline bullets.
- Status badges.
- Strategy chips.

Best references:

- Lucide React: already installed, tree-shakable, customizable SVG props.
- Tabler Icons: 6100+ MIT icons, good fallback if Lucide lacks a specific metaphor.

Project recommendation:

- Keep Lucide as primary icon system.
- Recommended Lucide metaphors: `ShieldCheck`, `Brain`, `Handshake`, `Scale`, `Target`, `Radar`, `Activity`, `BadgeCheck`, `AlertTriangle`, `Clock`, `WalletCards`, `ChartNoAxesCombined`.
- Use one stroke width per surface, generally `1.75` or `2`.

## Dependency Decisions

| Candidate | Add Now? | Reason |
| --- | --- | --- |
| shadcn components | Yes, selectively | Native to current stack and copy-owned pattern |
| Radix primitives | Yes, via shadcn when needed | Accessibility without visual lock-in |
| Sonner | Yes, if notifications are missing | Low-cost feedback improvement |
| Recharts | Maybe | Add only when implementing analysis charts |
| Mantine | No | Strong but duplicates design system |
| MUI / MUI X | No | Heavy and stylistically different |
| Ant Design | No | Excellent enterprise patterns, too visually dominant/heavy |
| daisyUI | No | Plugin may conflict with custom visual language; use as Tailwind inspiration |
| Chakra UI | No | Duplicates primitives/design system |
| HeroUI | No recommendation | Crawl paths failed with 404 |
| Tabler Icons | Maybe later | Only if Lucide lacks required icons |

## Concrete Backlog

### Immediate

1. Add `TacticalBackdrop` and apply it consistently to home/play/analysis shells.
2. Add `RoundEvidenceTimeline` for result and review flows.
3. Add `MetricCard` with `number-ticker` for salaries, trust, patience, gap, and outcome score.
4. Replace static loading states with phase-based AI progress: analyzing resume, reading JD, simulating HR, generating reply.
5. Add Sonner toast for save/sync/restore/error feedback.

### Next

1. Add a mobile Sheet for context rail and strategy cards.
2. Add a compact mobile stepper for `/play`.
3. Add a minimal chart module with Recharts if trust/patience/salary trend data is ready.
4. Add result status cards inspired by Ant Design Result, but styled with local tactical surfaces.

## Implementation Notes

- Prefer local Tailwind/React components over adopting full UI kits.
- Use Radix/shadcn for focus management and accessibility where overlays are involved.
- Use Motion for page transitions, list enter/exit, layout shifts, and number/metric emphasis.
- Keep `prefers-reduced-motion` behavior for animated backgrounds and metric transitions.
- Do not copy marketing page visuals, screenshots, or paid template assets into the app.
