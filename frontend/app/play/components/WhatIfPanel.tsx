"use client";

import { useMemo, useState } from "react";
import MetricCard from "@/components/ui/metric-card";
import { estimateWhatIf, type WhatIfPosture } from "../lib/what-if-rules";
import type { EquilibriumView, FinalResultView, RoundActionView } from "../hooks/types";

interface WhatIfPanelProps {
  finalResult: FinalResultView;
  actions: RoundActionView[];
  equilibrium: EquilibriumView | null;
}

const POSTURES: { value: WhatIfPosture; label: string; description: string }[] = [
  { value: "firm", label: "更强硬", description: "争取更高薪资，接受更高破裂风险" },
  { value: "balanced", label: "更稳健", description: "保留谈判空间，平衡薪资和成交" },
  { value: "close_fast", label: "更快成交", description: "提高确定性，换取更快达成一致" },
];

function salaryOf(action: RoundActionView | undefined) {
  const value = action?.params?.salary_offer ?? action?.params?.salary_ask ?? action?.params?.salary_amount ?? action?.params?.accepted_salary;
  return typeof value === "number" ? value : null;
}

function collectCandidateSalaryActions(actions: RoundActionView[]) {
  return actions.filter((action) => action.player === "candidate" && salaryOf(action) !== null);
}

function estimateMarketHeat(finalResult: FinalResultView, equilibrium: EquilibriumView | null) {
  const urgency = equilibrium?.hr_strategy?.urgency;
  const candidatePayoff = typeof finalResult.candidate_payoff === "number" ? finalResult.candidate_payoff : 0.5;
  return Math.max(0.2, Math.min(1, typeof urgency === "number" ? urgency : candidatePayoff));
}

function estimatePatience(actions: RoundActionView[], finalResult: FinalResultView) {
  const rounds = Number(finalResult.negotiation_rounds || 0);
  const rejected = String(finalResult.outcome || "") === "rejected";
  return Math.max(0.15, Math.min(0.85, rejected ? 0.25 : 0.72 - rounds * 0.06 + actions.length * 0.005));
}

export default function WhatIfPanel({ finalResult, actions, equilibrium }: WhatIfPanelProps) {
  const candidateSalaryActions = useMemo(() => collectCandidateSalaryActions(actions), [actions]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [salaryDelta, setSalaryDelta] = useState(0);
  const [posture, setPosture] = useState<WhatIfPosture>("balanced");
  const selectedAction = candidateSalaryActions[selectedIndex] || candidateSalaryActions[0] || actions[0];
  const selectedSalary = salaryOf(selectedAction);
  const baseSuccessProbability = Math.max(0, Math.min(1, Number(finalResult.success_probability || 0)));
  const baseFinalSalary = typeof finalResult.final_salary === "number" ? finalResult.final_salary : null;
  const result = estimateWhatIf({
    baseSuccessProbability,
    baseFinalSalary,
    selectedSalary,
    salaryDelta,
    posture,
    marketHeat: estimateMarketHeat(finalResult, equilibrium),
    hrPatienceEstimate: estimatePatience(actions, finalResult),
  });

  return (
    <section className="surface-base relative overflow-hidden rounded-3xl p-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(34,211,238,0.10),transparent_34%),radial-gradient(circle_at_100%_100%,rgba(251,191,36,0.10),transparent_34%)]" />
      <div className="relative z-10 space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--accent-cyan)]">What-if Lab</div>
            <h2 className="mt-1 text-xl font-black text-[var(--text-primary)]">如果当时换一种谈法？</h2>
          </div>
          <div className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[10px] font-black text-amber-200">
            近似推演
          </div>
        </div>

        <p className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)]/45 px-4 py-3 text-xs leading-relaxed text-[var(--text-tertiary)]">
          用于训练决策直觉，不是严格重跑完整均衡模型。结果基于报价变化、市场热度、HR 耐心和策略姿态做前端近似估计。
        </p>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="space-y-4 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)]/35 p-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-tertiary)]">关键轮次</label>
              <select
                value={selectedIndex}
                onChange={(event) => setSelectedIndex(Number(event.target.value))}
                className="mt-2 w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elev)] px-3 py-2 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-cyan)]/50"
              >
                {(candidateSalaryActions.length ? candidateSalaryActions : actions.slice(0, 1)).map((action, index) => (
                  <option key={`${action.round}-${action.action_type}-${index}`} value={index}>
                    第 {action.round + 1} 轮 · {salaryOf(action) ?? "--"}K · {action.action_type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <label className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-tertiary)]">报价调整</label>
                <span className="font-mono text-sm font-black text-[var(--accent-cyan)]">{salaryDelta > 0 ? "+" : ""}{salaryDelta}K</span>
              </div>
              <input
                type="range"
                min={-10}
                max={10}
                step={1}
                value={salaryDelta}
                onChange={(event) => setSalaryDelta(Number(event.target.value))}
                className="mt-3 w-full accent-cyan-300"
              />
              <div className="mt-1 flex justify-between text-[10px] text-[var(--text-tertiary)]">
                <span>少要 10K</span>
                <span>原报价</span>
                <span>多要 10K</span>
              </div>
            </div>

            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-tertiary)]">策略姿态</div>
              <div className="mt-2 grid gap-2">
                {POSTURES.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setPosture(item.value)}
                    className={posture === item.value ? "rounded-xl border border-[var(--accent-cyan)]/40 bg-[var(--accent-cyan-glow)] px-3 py-2 text-left" : "rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elev)]/55 px-3 py-2 text-left transition hover:border-[var(--accent-cyan)]/25"}
                  >
                    <div className="text-xs font-black text-[var(--text-primary)]">{item.label}</div>
                    <div className="mt-0.5 text-[10px] leading-relaxed text-[var(--text-tertiary)]">{item.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <MetricCard label="成交概率" value={Math.round(result.successProbability * 100)} suffix="%" tone={result.successProbability >= baseSuccessProbability ? "success" : "warning"} />
              <MetricCard label="预估薪资" value={result.finalSalary ?? "--"} suffix={result.finalSalary === null ? "" : "K"} tone="cyan" animateNumber={typeof result.finalSalary === "number"} />
              <MetricCard label="破裂风险" value={Math.round(result.breakRisk * 100)} suffix="%" tone={result.breakRisk > 0.5 ? "danger" : "warning"} />
              <MetricCard label="信任变化" value={`${result.trustDelta > 0 ? "+" : ""}${Math.round(result.trustDelta * 100)}%`} tone={result.trustDelta >= 0 ? "success" : "danger"} animateNumber={false} />
            </div>
            <div className="rounded-2xl border border-[var(--accent-cyan)]/15 bg-[var(--accent-cyan-glow)] px-4 py-3">
              <div className="text-xs font-black text-[var(--accent-cyan)]">推演解释</div>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{result.explanation}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
