"use client";

const ACTION_LABELS: Record<string, string> = {
  offer: "报价",
  counter_offer: "还价",
  accept: "接受",
  reject: "拒绝",
  wait: "等待",
  evaluate: "评估",
  signal: "市场信号",
  info_reveal: "筹码强调",
  info_fake: "叙事重组",
  info_conceal: "风险弱化",
};

const ACTION_COLORS: Record<string, string> = {
  offer: "bg-emerald-900/40 text-emerald-300 border-emerald-700/50",
  counter_offer: "bg-amber-900/40 text-amber-300 border-amber-700/50",
  accept: "bg-teal-900/40 text-teal-300 border-teal-700/50",
  reject: "bg-rose-900/40 text-rose-300 border-rose-700/50",
  wait: "bg-[var(--bg-elev)] text-[var(--text-tertiary)] border-[var(--border-hairline)]",
  evaluate: "bg-violet-900/40 text-violet-300 border-violet-700/50",
  signal: "bg-cyan-900/40 text-cyan-300 border-cyan-700/50",
  info_reveal: "bg-blue-900/40 text-blue-300 border-blue-700/50",
  info_fake: "bg-orange-900/40 text-orange-300 border-orange-700/50",
  info_conceal: "bg-slate-800 text-slate-400 border-slate-700",
};

export default function ActionBadge({ actionType }: { actionType: string }) {
  return (
    <span
      className={`text-[10px] px-2 py-0.5 rounded-full border ${
        ACTION_COLORS[actionType] || "bg-[var(--bg-elev)] border-[var(--border-hairline)] text-[var(--text-tertiary)]"
      }`}
    >
      {ACTION_LABELS[actionType] || actionType}
    </span>
  );
}
