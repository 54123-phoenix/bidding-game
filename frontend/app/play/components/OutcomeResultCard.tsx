"use client";

import { motion } from "framer-motion";
import type { RoundActionView } from "../hooks/types";

interface WarReport {
  firstSalary: number | null;
  lastSalary: number | null;
  largestMove: number;
  riskLevel: string;
  turningPoint?: RoundActionView;
  signalCount: number;
}

interface OutcomeResultCardProps {
  outcome: string;
  outcomeMessage: string;
  actionCount: number;
  warReport: WarReport;
}

export default function OutcomeResultCard({
  outcome,
  outcomeMessage,
  actionCount,
  warReport,
}: OutcomeResultCardProps) {
  const accepted = outcome === "accepted";

  return (
    <motion.div
      className="surface-raised relative overflow-hidden rounded-3xl p-6 text-center md:p-8"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
    >
      <div className="pointer-events-none absolute inset-0 micro-grid opacity-20" />
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background: accepted
            ? "radial-gradient(circle at 50% 0%, var(--accent-green-glow), transparent 46%)"
            : "radial-gradient(circle at 50% 0%, rgba(251,113,133,0.13), transparent 46%)",
        }}
      />

      <motion.div
        className="relative z-10 mb-4 text-6xl"
        initial={{ rotate: -10, scale: 0 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.2 }}
      >
        {accepted ? "🎉" : "💔"}
      </motion.div>

      <motion.h1
        className={`relative z-10 mb-2 text-2xl font-bold ${accepted ? "text-[var(--state-success)]" : "text-[var(--state-danger)]"}`}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        {outcomeMessage}
      </motion.h1>

      <div className="relative z-10 mx-auto mt-5 grid max-w-4xl gap-2 text-left sm:grid-cols-4">
        <WarReportMetric label="开局锚点" value={warReport.firstSalary ? `${warReport.firstSalary}K` : "--"} />
        <WarReportMetric label="终局报价" value={warReport.lastSalary ? `${warReport.lastSalary}K` : "--"} tone="cyan" />
        <WarReportMetric label="最大让步" value={`${warReport.largestMove}K`} tone="orange" />
        <WarReportMetric label="风险态势" value={warReport.riskLevel} tone={warReport.riskLevel === "高压" ? "danger" : "cyan"} />
      </div>

      <div className="relative z-10 mx-auto mt-4 max-w-3xl rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)]/45 px-4 py-3 text-left text-xs leading-relaxed text-[var(--text-secondary)]">
        <span className="font-bold text-[var(--accent-cyan)]">战报摘要：</span>
        本局共记录 {actionCount} 个行动信号、{warReport.signalCount} 个评估/市场信号。
        {warReport.turningPoint?.reasoning ? ` 关键转折来自第 ${warReport.turningPoint.round + 1} 轮：${warReport.turningPoint.reasoning}` : " 关键转折将在轮次回放中展开。"}
      </div>
    </motion.div>
  );
}

function WarReportMetric({ label, value, tone = "normal" }: { label: string; value: string; tone?: "normal" | "cyan" | "orange" | "danger" }) {
  const color = tone === "cyan" ? "var(--accent-cyan)" : tone === "orange" ? "var(--accent-ali)" : tone === "danger" ? "var(--state-danger)" : "var(--text-primary)";
  return (
    <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)]/45 px-3 py-2">
      <div className="text-[9px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">{label}</div>
      <div className="mt-1 font-mono text-lg font-black tabular-nums" style={{ color }}>{value}</div>
    </div>
  );
}
