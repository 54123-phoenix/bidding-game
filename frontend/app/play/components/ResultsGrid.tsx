"use client";

import MetricCard, { type MetricTone } from "@/components/ui/metric-card";

interface ResultMetricItem {
  label: string;
  value: string | number;
  suffix?: string;
  subtext?: string;
  tone: MetricTone;
  delay: number;
  animateNumber: boolean;
}

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

  const items: ResultMetricItem[] = [
    {
      label: "结果",
      value: isAccepted ? "已录取" : outcome === "rejected" ? "已拒绝" : "超时",
      tone: isAccepted ? "success" : "danger",
      delay: 0.1,
      animateNumber: false,
    },
    {
      label: "最终薪资",
      value: finalSalary ?? 0,
      suffix: "K",
      subtext: finalSalary ? `${(finalSalary / 10).toFixed(0)}万/年` : undefined,
      tone: "neutral",
      delay: 0.15,
      animateNumber: true,
    },
    {
      label: "成功率",
      value: Math.round(successProbability * 100),
      suffix: "%",
      tone: "cyan",
      delay: 0.2,
      animateNumber: true,
    },
    {
      label: "谈判轮次",
      value: negotiationRounds,
      tone: "neutral",
      delay: 0.25,
      animateNumber: true,
    },
    {
      label: "候选人收益",
      value: candidatePayoff.toFixed(3),
      tone: candidatePayoff > 0.3 ? "success" : "warning",
      delay: 0.3,
      animateNumber: false,
    },
    {
      label: "HR收益",
      value: hrPayoff.toFixed(3),
      tone: hrPayoff > 0.3 ? "success" : "warning",
      delay: 0.35,
      animateNumber: false,
    },
    {
      label: "信息不对称成本",
      value: informationAsymmetryCost.toFixed(3),
      tone: "warning",
      delay: 0.4,
      animateNumber: false,
    },
    {
      label: "均衡解",
      value: equilibriumType === "pure_bne" ? "纯策略BNE" : equilibriumType || "—",
      subtext: solverIterations ? `${solverIterations} 次迭代` : undefined,
      tone: "purple",
      delay: 0.45,
      animateNumber: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <MetricCard
          key={item.label}
          label={item.label}
          value={item.value}
          suffix={item.suffix}
          subtext={item.subtext}
          tone={item.tone}
          delay={item.delay}
          animateNumber={item.animateNumber}
        />
      ))}
    </div>
  );
}
