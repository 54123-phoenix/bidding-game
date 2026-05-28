"use client";

import { motion } from "framer-motion";
import type { EquilibriumView, FinalResultView } from "../hooks/types";

interface CredibilityLedgerProps {
  finalResult: FinalResultView;
  equilibrium: EquilibriumView | null;
}

function pct(value: number | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return `${Math.round(value * 100)}%`;
}

export default function CredibilityLedger({ finalResult, equilibrium }: CredibilityLedgerProps) {
  const actionCount = finalResult.final_state?.action_history?.length ?? 0;
  const scoreCount = Object.keys(finalResult.final_state?.scores || {}).length;
  const hasParallelUniverse = Boolean(finalResult.parallel_universes?.base_universe);
  const converged = equilibrium?.converged;

  const cards = [
    {
      label: "核心机制",
      value: "规则优先",
      caption: "薪资、耐心、市场与收益由确定性规则驱动",
      tone: "cyan",
    },
    {
      label: "解释层",
      value: "LLM 辅助",
      caption: "话术和复盘可由模型润色，不作为唯一事实来源",
      tone: "purple",
    },
    {
      label: "策略分析",
      value: converged === true ? "已收敛" : converged === false ? "未完全收敛" : "简化响应",
      caption: `${equilibrium?.solver_iterations ?? "--"} 次迭代；不是严格生产级博弈求解`,
      tone: "amber",
    },
    {
      label: "证据覆盖",
      value: `${scoreCount} 组评分 / ${actionCount} 个动作`,
      caption: `反事实宇宙：${hasParallelUniverse ? "已生成" : "未生成"}；成功率 ${pct(finalResult.success_probability)}`,
      tone: "green",
    },
  ];

  return (
    <motion.section
      className="relative overflow-hidden rounded-2xl border border-[var(--border-hairline)] bg-[linear-gradient(135deg,rgba(14,18,25,0.96),rgba(8,10,16,0.98))] p-4 shadow-[0_28px_100px_rgba(0,0,0,0.28)]"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,var(--accent-cyan-glow),transparent_36%),radial-gradient(circle_at_92%_20%,var(--hr-purple-glow),transparent_34%)] opacity-70" />
      <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <div className="lg:w-64">
          <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--accent-cyan)]">Credibility Ledger</div>
          <h2 className="mt-1 text-lg font-black text-[var(--text-primary)]">可信度账本</h2>
          <p className="mt-2 text-xs leading-relaxed text-[var(--text-tertiary)]">
            把“AI 看起来很强”的部分拆开：哪些是规则计算，哪些是模型解释，哪些只是策略情景推演。
          </p>
        </div>

        <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card, index) => (
            <motion.div
              key={card.label}
              className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elev)]/70 px-3 py-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * index }}
            >
              <div className="text-[9px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">{card.label}</div>
              <div
                className="mt-1 text-sm font-black"
                style={{
                  color:
                    card.tone === "purple"
                      ? "var(--hr-purple)"
                      : card.tone === "amber"
                      ? "var(--interviewer-amber)"
                      : card.tone === "green"
                      ? "var(--state-success)"
                      : "var(--accent-cyan)",
                }}
              >
                {card.value}
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-[var(--text-secondary)]">{card.caption}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
