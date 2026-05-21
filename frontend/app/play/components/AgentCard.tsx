"use client";

import { motion } from "framer-motion";
import PlayerIcon from "@/components/player-icon";
import ActionBadge from "./ActionBadge";

const AGENT_LABELS: Record<string, string> = {
  candidate: "候选人",
  hr: "HR",
  interviewer: "面试官",
  market: "市场",
};

const PRIVATE_LABELS: Record<string, string> = {
  supply_demand_ratio: "供需比",
  salary_trend: "薪资趋势",
  hot_skills: "热门技能",
  strictness: "评分严格度",
  preferred_skill_style: "技能偏好",
  risk_tolerance: "风险偏好",
  true_ability: "真实能力",
  reservation_wage: "薪资底线",
  career_ambition: "职业野心",
  true_budget: "真实预算",
  urgency: "紧急程度",
  internal_equity_constraint: "内部公平约束",
};

const COLOR_MAP: Record<string, { border: string; bg: string }> = {
  candidate: {
    border: "border-[var(--candidate-blue)]/30",
    bg: "bg-[var(--candidate-blue-glow)]",
  },
  hr: {
    border: "border-[var(--hr-purple)]/30",
    bg: "bg-[var(--hr-purple-glow)]",
  },
  interviewer: {
    border: "border-[var(--interviewer-amber)]/30",
    bg: "bg-[var(--interviewer-amber)]/10",
  },
  market: {
    border: "border-[var(--market-emerald)]/30",
    bg: "bg-[var(--market-emerald)]/10",
  },
};

function formatPrivateValue(k: string, v: unknown): string {
  if (typeof v !== "number") return String(v);
  if (k.includes("budget") || k.includes("wage") || k.includes("salary") || k.includes("equity")) {
    return `${v}K`;
  }
  if (k.includes("ratio")) return v.toFixed(2);
  return `${(v * 100).toFixed(0)}%`;
}

export default function AgentCard({
  role,
  actions,
  privateInfo,
}: {
  role: string;
  actions: any[];
  privateInfo?: Record<string, unknown>;
}) {
  const myActions = actions.filter((a) => a.player === role);
  const lastAction = myActions[myActions.length - 1];
  const colors = COLOR_MAP[role] || { border: "border-[var(--border-hairline)]", bg: "bg-[var(--bg-panel)]" };

  return (
    <motion.div
      className={`border rounded-xl p-4 ${colors.border} ${colors.bg}`}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="flex items-center gap-2 mb-3">
        <PlayerIcon player={role as any} size={34} />
        <div>
          <div className="text-sm font-semibold text-[var(--text-primary)]">{AGENT_LABELS[role]}</div>
          <div className="text-[10px] text-[var(--text-tertiary)]">私有信息不可见</div>
        </div>
      </div>

      {privateInfo && Object.keys(privateInfo).length > 0 && (
        <div className="text-[10px] text-[var(--text-tertiary)] space-y-0.5 mb-2 bg-[var(--bg-elev)]/60 rounded-lg p-2">
          {Object.entries(privateInfo).map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span>{PRIVATE_LABELS[k] || k}</span>
              <span className="text-[var(--text-secondary)]">{formatPrivateValue(k, v)}</span>
            </div>
          ))}
        </div>
      )}

      {lastAction && (
        <div className="mt-2 pt-2 border-t border-[var(--border-hairline)]">
          <div className="flex items-center gap-2 mb-1">
            <ActionBadge actionType={lastAction.action_type} />
            <span className="text-[10px] text-[var(--text-tertiary)]">第{lastAction.round + 1}轮</span>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed line-clamp-3">
            {lastAction.reasoning}
          </p>
        </div>
      )}
    </motion.div>
  );
}
