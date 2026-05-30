"use client";

import { motion } from "framer-motion";
import ActionBadge from "./ActionBadge";
import type { RoundActionView } from "../hooks/types";

const AGENT_LABELS: Record<string, string> = {
  candidate: "候选人",
  hr: "HR",
  interviewer: "面试官",
  market: "市场",
};

const AGENT_TONE: Record<string, string> = {
  candidate: "border-[var(--candidate-blue)]/30 bg-[var(--candidate-blue-glow)] text-[var(--candidate-blue)]",
  hr: "border-[var(--hr-purple)]/30 bg-[var(--hr-purple-glow)] text-[var(--hr-purple)]",
  interviewer: "border-[var(--interviewer-amber)]/30 bg-[var(--accent-orange-glow)] text-[var(--interviewer-amber)]",
  market: "border-[var(--market-emerald)]/30 bg-[var(--accent-green-glow)] text-[var(--market-emerald)]",
};

function extractSalary(action: RoundActionView) {
  const value = action.params?.salary_offer ?? action.params?.salary_ask ?? action.params?.salary_amount ?? action.params?.accepted_salary;
  return typeof value === "number" ? `${value}K` : null;
}

function evidenceWeight(action: RoundActionView) {
  if (/accept|reject/.test(action.action_type)) return 4;
  if (/counter_offer|offer/.test(action.action_type)) return 3;
  if (/signal|evaluate/.test(action.action_type)) return 2;
  return action.reasoning ? 1 : 0;
}

export default function RoundEvidenceTimeline({ actions }: { actions: RoundActionView[] }) {
  const evidence = actions
    .filter((action) => evidenceWeight(action) > 0)
    .sort((a, b) => evidenceWeight(b) - evidenceWeight(a) || a.round - b.round)
    .slice(0, 6)
    .sort((a, b) => a.round - b.round);

  if (!evidence.length) {
    return (
      <section className="surface-base rounded-3xl p-5 text-sm text-[var(--text-tertiary)]">
        暂无足够行动证据生成复盘链。
      </section>
    );
  }

  return (
    <section className="surface-base relative overflow-hidden rounded-3xl p-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(34,211,238,0.10),transparent_34%),radial-gradient(circle_at_100%_100%,rgba(168,85,247,0.10),transparent_34%)]" />
      <div className="relative z-10">
        <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--accent-cyan)]">Evidence Chain</div>
            <h2 className="mt-1 text-lg font-black text-[var(--text-primary)]">关键证据链</h2>
          </div>
          <p className="max-w-xl text-xs leading-relaxed text-[var(--text-tertiary)]">
            按轮次抽取最影响终局的报价、接受/拒绝、评估与市场信号，用于解释为什么谈判走到当前结果。
          </p>
        </div>

        <div className="relative space-y-3">
          <div className="absolute bottom-4 left-3 top-4 w-px bg-gradient-to-b from-[var(--accent-cyan)]/60 via-[var(--border-hairline)] to-transparent" />
          {evidence.map((action, index) => {
            const salary = extractSalary(action);
            const tone = AGENT_TONE[action.player] || "border-[var(--border-hairline)] bg-[var(--bg-elev)] text-[var(--text-secondary)]";
            return (
              <motion.div
                key={`${action.round}-${action.player}-${action.action_type}-${index}`}
                className="relative grid gap-3 pl-9 md:grid-cols-[150px_minmax(0,1fr)]"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
              >
                <div className="absolute left-0 top-2 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--accent-cyan)]/30 bg-[var(--bg-canvas)] text-[10px] font-black text-[var(--accent-cyan)] shadow-[0_0_18px_rgba(34,211,238,0.16)]">
                  {action.round + 1}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2 py-1 text-[10px] font-black ${tone}`}>
                    {AGENT_LABELS[action.player] || action.player}
                  </span>
                  <ActionBadge actionType={action.action_type} />
                  {salary && <span className="rounded-full border border-[var(--accent-cyan)]/20 bg-[var(--accent-cyan-glow)] px-2 py-1 text-[10px] font-black text-[var(--accent-cyan)]">{salary}</span>}
                </div>

                <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)]/45 px-4 py-3">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">第 {action.round + 1} 轮证据</div>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
                    {action.reasoning || "该动作改变了谈判状态，但当前没有返回详细推理。"}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
