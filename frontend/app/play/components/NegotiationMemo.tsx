"use client";

import { motion } from "framer-motion";
import type { EquilibriumView, FinalResultView, RoundActionView } from "../hooks/types";

function salaryOf(action: RoundActionView) {
  const value = action.params?.salary_offer ?? action.params?.salary_ask ?? action.params?.salary_amount ?? action.params?.accepted_salary;
  return typeof value === "number" ? value : null;
}

function firstCandidateAsk(actions: RoundActionView[]) {
  return actions.find((action) => action.player === "candidate" && salaryOf(action) !== null);
}

function strongestSignal(actions: RoundActionView[]) {
  return actions.find((action) => /signal|evaluate/.test(action.action_type) && action.reasoning) || actions.find((action) => action.reasoning);
}

export default function NegotiationMemo({
  finalResult,
  equilibrium,
  actions,
}: {
  finalResult: FinalResultView;
  equilibrium: EquilibriumView | null;
  actions: RoundActionView[];
}) {
  const outcome = String(finalResult.outcome || "rejected");
  const finalSalary = typeof finalResult.final_salary === "number" ? finalResult.final_salary : null;
  const openingAsk = firstCandidateAsk(actions);
  const openingSalary = salaryOf(openingAsk || actions[0]);
  const signal = strongestSignal(actions);
  const reservation = equilibrium?.candidate_strategy?.reservation_wage;
  const concedeTo = equilibrium?.candidate_strategy?.willing_to_concede_to;
  const hrCeiling = equilibrium?.hr_strategy?.max_final_offer ?? equilibrium?.hr_strategy?.budget_ceiling;
  const accepted = outcome === "accepted";

  const memoItems = [
    {
      label: "你的核心筹码",
      value: signal?.reasoning || "把最可验证的项目结果放在报价前，而不是报价后补充。",
    },
    {
      label: "推荐锚点",
      value: openingSalary ? `${openingSalary}K 起手，但必须先给证据再给数字。` : "先用项目影响力建立可信度，再给薪资锚点。",
    },
    {
      label: "底线区间",
      value: reservation || concedeTo ? `${reservation ?? "--"}K - ${concedeTo ?? "--"}K，低于底线时转向总包/职级/签字费。` : "先定义现金底线，再拆分总包、职级和成长空间。",
    },
    {
      label: "最佳成交窗口",
      value: accepted
        ? `HR 上限接近 ${hrCeiling ?? finalSalary ?? "--"}K 后，继续追价的边际收益下降。`
        : "HR 开始强调预算或内部公平时，应先换结构，不要继续单点加价。",
    },
  ];

  const scripts = accepted
    ? [
        "我认可这个区间。为了确保双方预期一致，我们把职责范围、绩效周期和总包结构一起确认一下。",
        "如果现金部分已经接近审批上限，我可以接受用签字费或明确的晋升评审时间来补齐预期。",
      ]
    : [
        "我理解预算约束。我们是否可以把现金、签字费、职级和绩效评审拆开看，而不是只卡在月薪？",
        "如果当前职级无法覆盖我的经验，我们可以先确认职责边界，再判断薪资带宽是否匹配。",
      ];

  return (
    <section className="surface-base relative overflow-hidden rounded-3xl p-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(34,211,238,0.10),transparent_34%)]" />
      <div className="relative z-10">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--accent-cyan)]">Negotiation Memo</div>
            <h2 className="mt-1 text-xl font-black text-[var(--text-primary)]">下次面试可直接使用的谈判备忘录</h2>
          </div>
          <div className={`rounded-full border px-3 py-1 text-[11px] font-black ${accepted ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200" : "border-rose-300/20 bg-rose-300/10 text-rose-200"}`}>
            {accepted ? "成交路径" : "修正路径"}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {memoItems.map((item, index) => (
            <motion.div
              key={item.label}
              className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)]/45 p-4"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">{item.label}</div>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{item.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-[var(--accent-cyan)]/15 bg-[var(--accent-cyan-glow)] p-4">
          <div className="text-xs font-black text-[var(--accent-cyan)]">推荐话术</div>
          <div className="mt-3 grid gap-2">
            {scripts.map((script) => (
              <p key={script} className="rounded-xl bg-[var(--bg-canvas)]/55 px-3 py-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                “{script}”
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
