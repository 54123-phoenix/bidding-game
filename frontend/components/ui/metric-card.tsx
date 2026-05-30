"use client";

import { motion } from "framer-motion";
import NumberTicker from "@/components/number-ticker";

export type MetricTone = "neutral" | "cyan" | "success" | "warning" | "danger" | "purple";

interface MetricCardProps {
  label: string;
  value: string | number;
  suffix?: string;
  subtext?: string;
  tone?: MetricTone;
  delay?: number;
  decimals?: number;
  animateNumber?: boolean;
}

const toneClass: Record<MetricTone, string> = {
  neutral: "text-[var(--text-primary)]",
  cyan: "text-[var(--accent-cyan)]",
  success: "text-[var(--state-success)]",
  warning: "text-[var(--interviewer-amber)]",
  danger: "text-[var(--state-danger)]",
  purple: "text-[var(--hr-purple)]",
};

export default function MetricCard({
  label,
  value,
  suffix = "",
  subtext,
  tone = "neutral",
  delay = 0,
  decimals = 0,
  animateNumber = typeof value === "number",
}: MetricCardProps) {
  return (
    <motion.div
      className="surface-base group relative overflow-hidden rounded-2xl p-3 text-left"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent-cyan)]/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
        {label}
      </div>
      <div className={`mt-1 text-xl font-black tabular-nums ${toneClass[tone]}`}>
        {animateNumber && typeof value === "number" ? (
          <NumberTicker target={value} suffix={suffix} duration={1.2} autoStart decimals={decimals} />
        ) : (
          <span>{value}{suffix}</span>
        )}
      </div>
      {subtext && (
        <div className="mt-1 text-[10px] leading-relaxed text-[var(--text-tertiary)]">{subtext}</div>
      )}
    </motion.div>
  );
}
