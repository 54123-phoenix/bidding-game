"use client";

import { motion } from "framer-motion";
import type { EquilibriumView, RoundActionView } from "../hooks/types";

function salaryOf(action: RoundActionView) {
  const value = action.params?.salary_offer ?? action.params?.salary_ask ?? action.params?.salary_amount ?? action.params?.accepted_salary;
  return typeof value === "number" ? value : null;
}

function nodeImpact(action: RoundActionView) {
  if (action.action_type === "accept") return { payoff: "+成交确定性", belief: "HR 判断你愿意收敛，成交风险下降。" };
  if (action.action_type === "reject") return { payoff: "-成交机会", belief: "HR 判断差距不可收敛，后续报价意愿归零。" };
  if (/offer|counter_offer/.test(action.action_type)) return { payoff: "+锚点压力", belief: "对方会据此更新你的底线和可让步空间。" };
  if (/signal|evaluate/.test(action.action_type)) return { payoff: "+可信筹码", belief: "HR 对岗位匹配和外部选择的估计上调。" };
  return { payoff: "局势观察", belief: "该节点主要影响耐心和节奏。" };
}

export default function StrategyTreeLite({ actions, equilibrium }: { actions: RoundActionView[]; equilibrium: EquilibriumView | null }) {
  const decisionNodes = actions
    .filter((action) => /counter_offer|offer|accept|reject|signal|evaluate/.test(action.action_type))
    .slice(0, 7);
  const recommendedAsk = equilibrium?.candidate_strategy?.opening_salary_ask;
  const concedeTo = equilibrium?.candidate_strategy?.willing_to_concede_to;

  return (
    <section className="surface-base rounded-3xl p-5">
      <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--hr-purple)]">Strategy Tree</div>
          <h2 className="mt-1 text-xl font-black text-[var(--text-primary)]">实际路径 vs 推荐路径</h2>
        </div>
        <p className="max-w-xl text-xs leading-relaxed text-[var(--text-tertiary)]">
          每个节点拆成“你的选择 → HR 信念更新 → 收益变化”，帮助你把复盘转化为下次行动。
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="relative space-y-3">
          <div className="absolute bottom-5 left-3 top-5 w-px bg-gradient-to-b from-[var(--hr-purple)]/60 via-[var(--border-hairline)] to-transparent" />
          {decisionNodes.map((action, index) => {
            const salary = salaryOf(action);
            const impact = nodeImpact(action);
            return (
              <motion.div
                key={`${action.round}-${action.player}-${action.action_type}-${index}`}
                className="relative pl-9"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="absolute left-0 top-4 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--hr-purple)]/30 bg-[var(--bg-canvas)] text-[10px] font-black text-[var(--hr-purple)]">
                  {index + 1}
                </div>
                <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)]/45 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[var(--bg-elev)] px-2 py-1 text-[10px] font-black text-[var(--text-secondary)]">第 {action.round + 1} 轮 · {action.player}</span>
                    <span className="rounded-full border border-[var(--accent-cyan)]/20 px-2 py-1 text-[10px] font-black text-[var(--accent-cyan)]">{action.action_type}</span>
                    {salary && <span className="rounded-full border border-emerald-300/20 px-2 py-1 text-[10px] font-black text-emerald-200">{salary}K</span>}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{action.reasoning || "该动作改变了谈判节奏。"}</p>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    <div className="rounded-xl bg-[var(--bg-elev)]/55 px-3 py-2 text-xs text-[var(--text-tertiary)]">HR 信念更新：{impact.belief}</div>
                    <div className="rounded-xl bg-[var(--bg-elev)]/55 px-3 py-2 text-xs text-[var(--text-tertiary)]">收益变化：{impact.payoff}</div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <aside className="rounded-2xl border border-[var(--accent-cyan)]/15 bg-[var(--accent-cyan-glow)] p-4">
          <div className="text-xs font-black text-[var(--accent-cyan)]">系统推荐路径</div>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-[var(--text-secondary)]">
            <p>1. 先抛出可验证筹码，再给薪资锚点。</p>
            <p>2. 建议起手：{recommendedAsk ? `${recommendedAsk}K` : "接近岗位上沿但留出让步空间"}。</p>
            <p>3. 让步边界：{concedeTo ? `${concedeTo}K 附近` : "现金让步前先换总包结构"}。</p>
            <p>4. 当 HR 强调预算时，转向职级、签字费、绩效周期，而不是继续单点加价。</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
