"use client";

import { motion } from "framer-motion";
import NumberTicker from "@/components/number-ticker";

const DIM_LABELS: Record<string, string> = {
  skill_match: "技能匹配",
  experience_fit: "经验匹配",
  school_signal: "学历信号",
  competition_signal: "竞赛信号",
  company_pedigree: "公司背书",
  project_impact: "项目影响力",
  growth_potential: "成长潜力",
  leadership_signal: "领导力信号",
};

interface Dimension {
  dimension: string;
  score: number;
  reasoning?: string;
}

export default function EvalBars({
  dimensions,
  composite,
}: {
  dimensions: Dimension[];
  composite: number;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2 mb-4">
        <span className="text-3xl font-bold text-[var(--accent-cyan)]">
          <NumberTicker target={Math.round(composite * 100)} suffix="%" duration={1.5} autoStart />
        </span>
        <span className="text-sm text-[var(--text-tertiary)] mb-1">综合评分</span>
      </div>
      {dimensions.map((d, idx) => (
        <div key={d.dimension}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[var(--text-secondary)]">
              {DIM_LABELS[d.dimension] || d.dimension}
            </span>
            <span className="text-[var(--text-primary)] font-mono">
              {(d.score * 100).toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-[var(--bg-elev)] rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${d.score * 100}%` }}
              transition={{ duration: 0.8, delay: 0.2 + idx * 0.1, ease: "easeOut" }}
              style={{
                background:
                  d.score > 0.7
                    ? "linear-gradient(90deg, var(--accent-cyan), var(--candidate-blue))"
                    : d.score > 0.4
                    ? "linear-gradient(90deg, var(--interviewer-amber), #f97316)"
                    : "linear-gradient(90deg, var(--state-danger), #f97316)",
              }}
            />
          </div>
          {d.reasoning && (
            <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5 truncate">
              {d.reasoning}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
