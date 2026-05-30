"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "@/lib/api";
import type { FinalResultView, JobView, ResumeView } from "../hooks/types";

interface ParallelUniversePanelProps {
  resumeData: ResumeView | null;
  jobData: JobView | null;
  strategy?: string;
  marketCondition?: string;
  finalResult?: FinalResultView | null;
}

interface ApiIntervention {
  intervention_name?: string;
  marginal_effect?: number;
  expected_salary_delta?: number;
  success_probability_delta?: number;
  confidence_interval?: [number, number];
}

interface CounterfactualResponse {
  status?: string;
  base?: { final_salary?: number | null; success_probability?: number };
  counterfactual?: { interventions?: ApiIntervention[] };
  message?: string;
}

interface Universe {
  label: string;
  salary: number;
  successProb: number;
  emoji: string;
  colorScheme: "current" | "good" | "bad";
}

function scheme(prob: number): Universe["colorScheme"] {
  if (prob > 0.7) return "good";
  if (prob < 0.4) return "bad";
  return "current";
}

function emoji(prob: number) {
  if (prob > 0.7) return "😊";
  if (prob < 0.4) return "😤";
  return "🎯";
}

function clampProb(value: number) {
  return Math.max(0, Math.min(1, value));
}

export default function ParallelUniversePanel({
  resumeData,
  jobData,
  strategy = "balanced",
  marketCondition = "normal",
  finalResult,
}: ParallelUniversePanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [universes, setUniverses] = useState<Universe[]>([]);

  const fallback = useMemo<Universe[]>(() => {
    const salary = finalResult?.final_salary ?? (Array.isArray(jobData?.salary_range) ? Math.round((jobData.salary_range[0] + jobData.salary_range[1]) / 2) : 50);
    const probability = finalResult?.success_probability ?? 0.55;
    return [
      { label: "当前策略", salary, successProb: probability, emoji: emoji(probability), colorScheme: scheme(probability) },
      { label: "降价5 K", salary: Math.max(0, salary - 5), successProb: clampProb(probability + 0.16), emoji: emoji(clampProb(probability + 0.16)), colorScheme: scheme(clampProb(probability + 0.16)) },
      { label: "坚持5 K", salary: salary + 5, successProb: clampProb(probability - 0.14), emoji: emoji(clampProb(probability - 0.14)), colorScheme: scheme(clampProb(probability - 0.14)) },
    ];
  }, [finalResult, jobData]);

  useEffect(() => {
    if (!resumeData || !jobData) {
      setUniverses(fallback);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetch(`${API_BASE}/api/counterfactual`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume: resumeData, job: jobData, strategy, market_condition: marketCondition }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`counterfactual ${r.status}`);
        return (await r.json()) as CounterfactualResponse;
      })
      .then((data) => {
        if (cancelled) return;
        const baseSalary = data.base?.final_salary ?? fallback[0].salary;
        const baseProb = data.base?.success_probability ?? fallback[0].successProb;
        const interventions = data.counterfactual?.interventions ?? [];
        const mapped = interventions.slice(0, 2).map((item, index) => {
          const deltaSalary = item.expected_salary_delta ?? (index === 0 ? -5 : 5);
          const deltaProb = item.success_probability_delta ?? item.marginal_effect ?? (index === 0 ? 0.12 : -0.1);
          const prob = clampProb(baseProb + deltaProb);
          return {
            label: item.intervention_name || (index === 0 ? "降价5 K" : "坚持5 K"),
            salary: Math.max(0, Math.round(baseSalary + deltaSalary)),
            successProb: prob,
            emoji: emoji(prob),
            colorScheme: scheme(prob),
          };
        });
        const current = { label: "当前策略", salary: Math.round(baseSalary), successProb: baseProb, emoji: emoji(baseProb), colorScheme: scheme(baseProb) };
        setUniverses([current, ...mapped].slice(0, 3));
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setUniverses([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [resumeData, jobData, strategy, marketCondition, fallback]);

  if (loading) {
    return (
      <section className="cyber-glass rounded-2xl p-4">
        <div className="mb-3 h-4 w-32 animate-pulse rounded bg-white/10" />
        <div className="grid gap-3 min-[480px]:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/10" />)}
        </div>
      </section>
    );
  }

  if (error) {
    return <section className="cyber-glass rounded-2xl p-6 text-center text-sm font-bold text-slate-400">预测暂不可用</section>;
  }

  const items = universes.length ? universes : fallback;

  return (
    <section className="cyber-glass relative overflow-hidden rounded-2xl p-4 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(0,224,255,0.12),transparent_35%),radial-gradient(circle_at_100%_100%,rgba(255,106,0,0.10),transparent_36%)]" />
      <div className="relative z-10">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-black">平行宇宙预测</h3>
        <span className="rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[10px] font-bold text-slate-300">3 条路径</span>
      </div>
      <div className="grid gap-3 min-[480px]:grid-cols-3">
        {items.map((u) => <UniverseCard key={u.label} universe={u} />)}
      </div>
      </div>
    </section>
  );
}

function UniverseCard({ universe }: { universe: Universe }) {
  const style = universe.colorScheme === "good"
    ? "border-green-300/25 bg-green-400/10 text-green-100"
    : universe.colorScheme === "bad"
    ? "border-red-300/25 bg-red-400/10 text-red-100"
    : "border-cyan-300/25 bg-cyan-400/10 text-cyan-100";
  const bar = universe.colorScheme === "good" ? "bg-green-500" : universe.colorScheme === "bad" ? "bg-red-500" : "bg-blue-500";
  return (
    <button type="button" className={`rounded-2xl border p-4 text-left transition duration-200 hover:-translate-y-1 active:scale-[0.97] ${style}`}>
      <div className="flex items-center justify-between">
        <span className="text-2xl">{universe.emoji}</span>
        <span className="text-[10px] font-black">{universe.label}</span>
      </div>
      <div className="mt-3 text-2xl font-black">{universe.salary}K</div>
      <div className="mt-1 text-xs font-bold">成交概率 {Math.round(universe.successProb * 100)}%</div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/70">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.round(universe.successProb * 100)}%` }} />
      </div>
    </button>
  );
}
