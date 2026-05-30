# Demo Checklist

## Goal

Present the project as a salary negotiation coach, not just a negotiation simulator.

The core message:

> This tool helps a candidate practice salary negotiation, understand how HR sees them, and leave with concrete talking points for the next real interview.

## Pre-Demo Setup

1. Start the frontend:

   `cd frontend && npm run dev`

2. Open these pages before the demo:

   - `http://localhost:3000`
   - `http://localhost:3000/play`
   - `http://localhost:3000/dashboard`
   - `http://localhost:3000/demo`

3. If the backend is unavailable, the app still has fallback demo data:

   - 25 seeded negotiation histories.
   - A fixed demo profile for `Sarah Wang`.
   - Dashboard and recent sessions can still show realistic scenarios.

4. Confirm the visible positioning:

   - Brand: `薪资谈判教练`
   - Hero: `你的薪资谈判教练。`
   - Play setup: `Coach Mode 已开启`

## Recommended Demo Path

### 1. Homepage

Show:

- `过程教练`
- `可解释`
- `可带走`

Talking point:

> The product is centered on decision coaching: what to do next, why, and what to take into the next interview.

### 2. Dashboard

Show the 25 seeded scenarios.

Talking point:

> The dataset covers successful and failed negotiations across backend, AI, product, testing, security, IoT, data, full-stack, and algorithm roles.

### 3. Play Setup

Show:

- Demo profile availability.
- Resume/JD setup.
- `Coach Mode 已开启`.

Talking point:

> The coach uses the candidate profile and job description to create a negotiation context, not generic advice.

### 4. Negotiation Round

Show `CoachPanel` first.

Highlight:

- Coach verdict.
- Why.
- Recommended move.
- HR profile.
- HR belief snapshot.

Talking point:

> The user does not only see state. They get a recommended action and the reason behind it.

### 5. Chip Cards And Reputation

Show:

- `谈薪筹码卡`.
- `市场信誉` badge.
- Actions: emphasize, reframe, downplay.

Talking point:

> Chip packaging is framed as organizing real experience, with trust and reputation consequences. This avoids encouraging deception.

### 6. Results Page

Show these tabs in order:

1. `谈判备忘录`
2. `策略树`
3. `What-if`
4. `评估与均衡`

Talking point:

> The user leaves with a memo, a causal explanation of their decisions, and a way to test alternative choices.

## Key Feature Talking Points

### CoachPanel

- Gives next-step advice during the negotiation.
- Explains how HR likely sees the candidate.
- Uses transparent rules first, not a black-box LLM call.

### Negotiation Memo

- Converts a completed run into interview-ready guidance.
- Includes core leverage, anchor, bottom line, closing window, and reusable scripts.

### Strategy Tree

- Shows the causal chain:

  `user choice -> HR belief update -> payoff/risk change`

### What-if Panel

- Lets the user ask:

  `What if I had asked 5K more or less?`

- Clearly marked as approximate training feedback, not a strict equilibrium recomputation.

### Reputation System

- Tracks local reputation through chip packaging behavior.
- Emphasizing high-credibility chips can improve reputation.
- Risky reframing can reduce reputation.
- Data is local and not represented as real-world industry reputation.

## Fallback Plan

If backend API is down:

1. Use homepage and dashboard seeded scenarios.
2. Open a completed history from dashboard/recent sessions.
3. Demonstrate:
   - Negotiation memo.
   - Strategy tree.
   - What-if panel.
   - 25 scenario coverage.

If live negotiation fails:

1. Explain that live mode depends on backend/LLM availability.
2. Switch to demo history.
3. Continue with result-page coaching features.

## Final Verification Commands

Run before delivery:

```bash
cd frontend
npm run lint
npm run build
```

Expected state:

- Lint has no errors.
- Existing warnings may remain for image optimization and hook dependencies.
- Build succeeds.

## Do Not Claim

- Do not claim real salary data is scraped live.
- Do not claim What-if is a strict game-theory recomputation.
- Do not claim local reputation equals real industry reputation.
- Do not claim the tool replaces real salary research, legal advice, or career counseling.

## One-Minute Pitch

This is a salary negotiation coach for job seekers. It simulates HR pressure, explains how HR updates beliefs about the candidate, recommends what to do next, and turns each run into an interview-ready negotiation memo. The user can inspect a strategy tree, test What-if alternatives, and learn how chip packaging affects trust and reputation.
