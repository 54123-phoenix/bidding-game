# UI/UX Research Notes for Bidding Game

This note summarizes bounded, public web research for visual background ideas and UX patterns that fit the current project. It avoids copying proprietary artwork or scraping large volumes of content.

## Product Fit

Current frontend direction: dark tactical interface, glass panels, cyan/emerald accents, negotiation game loop, AI coach, battle HUD, and post-game analysis.

Recommended design thesis: **career negotiation war room**. Keep the dark tactical shell, but make the experience feel more like a playable decision simulator than a generic SaaS dashboard.

## Background And Visual Systems

| Source | Relevant Pattern | Project Use |
| --- | --- | --- |
| Magic UI Animated Grid Pattern | SVG grid with mask, skew, opacity control | Landing hero and negotiation arena atmospheric grid |
| Magic UI Flickering Grid | Canvas/SVG flickering squares | Low-opacity "market signal" background behind HUD panels |
| Magic UI Particles | Subtle moving particles | Waiting/thinking states while AI/HR is deliberating |
| Magic UI Bento Grid | Feature/story cards with visual previews | Dashboard, analysis summary, and landing proof sections |
| shadcn examples/patterns | MIT-style UI primitives and patterns | Forms, cards, tabs, dialogs, empty states, tables |

Implementation guidance:

- Prefer CSS/SVG generated backgrounds over downloaded images so the app stays lightweight and license-safe.
- Keep background opacity low: 2-8% for grids, 6-14% for radial glows, 10-20% for active state accents.
- Use masks around the main focus area so visual effects do not compete with salary numbers, action choices, or result copy.
- Add a `prefers-reduced-motion` fallback for flicker, particles, shimmer, and animated grids.

## Recommended Background Recipes

### 1. Negotiation War Room

Best for: `/play`, live negotiation, battle HUD.

Visual ingredients:

- Deep navy/black canvas: `#05070a`, `#080a10`, `#0e1219`.
- Thin grid lines, radial cyan glow near current actor, amber/purple glow near HR.
- Subtle scanline/noise overlay to imply telemetry without reducing readability.
- Small status ticks or market-signal dots around panel edges.

UX effect: communicates pressure, strategy, and system state without needing literal illustrations.

### 2. Career Coach Console

Best for: home, profile setup, tutorial.

Visual ingredients:

- Softer glass cards, warm cyan/emerald highlights, mascot/avatar panel.
- Bento cards for "profile", "demo", "dashboard", "history".
- Friendly microcopy that separates demo mode from real simulation.

UX effect: reduces anxiety before starting a high-stakes negotiation simulation.

### 3. Post-Game Evidence Board

Best for: result, analysis, dashboard history.

Visual ingredients:

- Timeline rails, confidence badges, evidence cards, comparison bars.
- More whitespace and fewer moving backgrounds than the live game screen.
- Color semantics: green accepted, amber risky, rose failed trust, cyan neutral insight.

UX effect: makes the result feel explainable and actionable instead of just scored.

## UX Principles To Apply

Based on Nielsen Norman Group usability heuristics and progress-indicator guidance:

- Visibility of system status: every AI/HR operation should show immediate feedback. Use looped indicators for short actions and step/progress indicators for longer analysis.
- Recognition over recall: keep current salary ask, HR offer, patience/trust, and available tactics visible during every decision.
- User control and freedom: make restart, back to dashboard, and review previous round visible but secondary.
- Error prevention: disable repeat-submit while a negotiation action is processing; show button state changes immediately.
- Plain-language recovery: errors should say what failed and what the user can do next, not only "request failed".
- Aesthetic minimalism: atmospheric effects should support the primary decision, not decorate every panel equally.

## Concrete UI Improvements

1. Add a reusable `TacticalBackdrop` component with grid, radial glow, noise, and reduced-motion support.
2. Replace static loading text in negotiation flows with an HR deliberation state that includes phase text: "分析简历", "评估预算", "生成回应".
3. Standardize semantic status colors across play/result/dashboard: cyan for system, emerald for success, amber for caution, rose for risk, purple for HR.
4. Add an evidence-board result layout: outcome summary, salary delta, trust trajectory, key decision moments, and next practice suggestion.
5. Use bento-style cards on the dashboard to make saved sessions, profile readiness, and quick actions scannable.
6. Keep mobile focused: one primary decision area, collapsible context rail, sticky action composer.

## License And Compliance Notes

- Do not copy visual assets from Dribbble, Behance, SaaS marketing pages, or game screenshots unless license explicitly permits reuse.
- Prefer open-source UI components with clear licenses, generated CSS/SVG effects, or custom implementation.
- Public UX articles are used as design references; quote sparingly and link back when documenting externally.
- If adding third-party components, verify package license before installation.

## Shortlist For This Project

Highest-value next implementation:

1. `TacticalBackdrop` for visual consistency.
2. Better long-running AI feedback in `/play`.
3. Evidence-board result UX.

These three changes match the product theme, improve perceived quality, and reduce user uncertainty during slow LLM calls.
