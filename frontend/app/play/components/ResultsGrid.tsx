"use client";

import { motion } from "framer-motion";
import NumberTicker from "@/components/number-ticker";

interface ResultsGridProps {
  outcome: string;
  finalSalary: number | null;
  successProbability: number;
  negotiationRounds: number;
  candidatePayoff: number;
  hrPayoff: number;
  informationAsymmetryCost: number;
  equilibriumType?: string;
  solverIterations?: number;
}

export default function ResultsGrid({
  outcome,
  finalSalary,
  successProbability,
  negotiationRounds,
  candidatePayoff,
  hrPayoff,
  informationAsymmetryCost,
  equilibriumType,
  solverIterations,
}: ResultsGridProps) {
  const isAccepted = outcome === "accepted";

  const items = [
    {
      label: "结果",
      value: isAccepted ? "已录取" : outcome === "rejected" ? "已拒绝" : "超时",
      color: isAccepted ? "text-[var(--state-success)]" : "text-[var(--state-danger)]",
      delay: 0.1,
      isNumber: false,
    },
    {
      label: "最终薪资",
      value: finalSalary ?? 0,
      suffix: "K",
      subtext: finalSalary ? `${(finalSalary / 10).toFixed(0)}万/年` : undefined,
      color: "text-[var(--text-primary)]",
      delay: 0.15,
      isNumber: true,
    },
    {
      label: "成功率",
      value: Math.round(successProbability * 100),
      suffix: "%",
      color: "text-[var(--accent-cyan)]",
      delay: 0.2,
      isNumber: true,
    },
    {
      label: "谈判轮次",
      value: negotiationRounds,
      color: "text-[var(--text-primary)]",
      delay: 0.25,
      isNumber: true,
    },
    {
      label: "候选人收益",
      value: candidatePayoff.toFixed(3),
      color: candidatePayoff > 0.3 ? "text-[var(--state-success)]" : "text-[var(--interviewer-amber)]",
      delay: 0.3,
      isNumber: false,
    },
    {
      label: "HR收益",
      value: hrPayoff.toFixed(3),
      color: hrPayoff > 0.3 ? "text-[var(--state-success)]" : "text-[var(--interviewer-amber)]",
      delay: 0.35,
      isNumber: false,
    },
    {
      label: "信息不对称成本",
      value: informationAsymmetryCost.toFixed(3),
      color: "text-[var(--interviewer-amber)]",
      delay: 0.4,
      isNumber: false,
    },
    {
      label: "均衡解",
      value: equilibriumType === "pure_bne" ? "纯策略BNE" : equilibriumType || "—",
      subtext: solverIterations ? `${solverIterations} 次迭代` : undefined,
      color: "text-[var(--hr-purple)]",
      delay: 0.45,
      isNumber: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((item) => (
        <motion.div
          key={item.label}
          className="bg-[var(--bg-panel)] border border-[var(--border-hairline)] rounded-lg p-3 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: item.delay }}
        >
          <div className="text-[10px] text-[var(--text-tertiary)] mb-1 uppercase tracking-wider">
            {item.label}
          </div>
          <div className={`text-lg font-bold ${item.color}`}>
            {item.isNumber && typeof item.value === "number" ? (
              <NumberTicker target={item.value} suffix={item.suffix || ""} duration={1.2} autoStart />
            ) : (
              <span>{item.value}{item.suffix || ""}</span>
            )}
          </div>
          {item.subtext && (
            <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{item.subtext}</div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
