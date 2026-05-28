"use client";

import { motion, AnimatePresence } from "framer-motion";

interface GameHUDProps {
  publicOffer: number | null;
  hrPatience: number;
  marketAdjustment: number;
  competitionIntensity: number;
  interviewerRec: string;
  overallScore: number;
  round: number;
  maxRounds: number;
  candidateReservationWage: number | null;
  hrPersona?: { name: string; archetype: string; tagline: string } | null;
}

function getPatienceTier(p: number): { label: string; color: string; glow: string; icon: string } {
  if (p >= 0.8) return { label: "从容", color: "#34d399", glow: "#34d39940", icon: "💚" };
  if (p >= 0.6) return { label: "尚可", color: "#22d3ee", glow: "#22d3ee40", icon: "💙" };
  if (p >= 0.4) return { label: "犹豫", color: "#fbbf24", glow: "#fbbf2440", icon: "💛" };
  if (p >= 0.2) return { label: "不耐烦", color: "#fb923c", glow: "#fb923c40", icon: "🧡" };
  return { label: "即将爆发", color: "#fb7185", glow: "#fb718540", icon: "❤️‍🔥" };
}

function getMarketLabel(adj: number): { label: string; color: string; icon: string } {
  if (adj > 1.05) return { label: "候选人市场", color: "#34d399", icon: "📈" };
  if (adj < 0.95) return { label: "雇主市场", color: "#fb7185", icon: "📉" };
  return { label: "供需平衡", color: "#8b95a5", icon: "➡️" };
}

export default function GameHUD({
  publicOffer,
  hrPatience,
  marketAdjustment,
  competitionIntensity,
  interviewerRec,
  overallScore,
  round,
  maxRounds,
  candidateReservationWage,
  hrPersona,
}: GameHUDProps) {
  const patienceTier = getPatienceTier(hrPatience);
  const marketInfo = getMarketLabel(marketAdjustment);
  const patiencePct = Math.round(hrPatience * 100);
  const scorePct = Math.round((overallScore || 0.5) * 100);
  const roundProgress = (round + 1) / maxRounds;

  return (
    <motion.div
      className="surface-raised overflow-hidden rounded-3xl"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--candidate-blue-glow)] via-transparent to-[var(--hr-purple-glow)] opacity-30" />

      <div className="relative z-10 px-4 py-3">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--accent-cyan)]/20 bg-[var(--accent-cyan-glow)] shadow-[0_0_18px_rgba(34,211,238,0.12)]">
              <span className="text-sm font-bold text-[var(--accent-cyan)] font-mono">
                {publicOffer || "—"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wider">当前报价</span>
              <span className="text-lg font-bold text-[var(--accent-cyan)] tabular-nums leading-tight">
                {publicOffer ? `${publicOffer}K` : "—"}
                <span className="text-[10px] text-[var(--text-tertiary)] ml-1">/年</span>
              </span>
            </div>
          </div>

          <div className="w-px h-10 bg-[var(--border-hairline)]" />

          <div className="flex-1 min-w-[140px]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1">
                {patienceTier.icon} HR 耐心
              </span>
              <span className="text-[10px] font-mono tabular-nums" style={{ color: patienceTier.color }}>
                {patiencePct}%
              </span>
            </div>
            <div className="relative h-2.5 bg-[var(--bg-elev)] rounded-full overflow-hidden border border-[var(--border-hairline)]">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${patienceTier.color}88, ${patienceTier.color})`,
                  boxShadow: `0 0 12px ${patienceTier.glow}`,
                }}
                initial={{ width: "100%" }}
                animate={{ width: `${patiencePct}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
              {hrPatience < 0.3 && (
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{ background: `linear-gradient(90deg, transparent, ${patienceTier.color}30)` }}
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[9px]" style={{ color: patienceTier.color }}>
                {patienceTier.label}
              </span>
              {hrPersona && (
                <span className="text-[9px] text-[var(--text-tertiary)]">
                  · {hrPersona.name}
                </span>
              )}
            </div>
          </div>

          <div className="w-px h-10 bg-[var(--border-hairline)]" />

          <div className="flex flex-col items-center gap-1 shrink-0">
            <span className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wider">回合</span>
            <div className="flex items-center gap-1">
              <span className="text-lg font-bold text-[var(--text-primary)] font-mono tabular-nums">
                {round + 1}
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)]">/ {maxRounds}</span>
            </div>
            <div className="w-16 h-1 bg-[var(--bg-elev)] rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-[var(--accent-cyan)]"
                initial={{ width: 0 }}
                animate={{ width: `${roundProgress * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          <div className="w-px h-10 bg-[var(--border-hairline)]" />

          <div className="flex flex-col gap-1.5 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-[var(--text-tertiary)]">{marketInfo.icon}</span>
              <span className="text-[10px] font-medium" style={{ color: marketInfo.color }}>
                {marketInfo.label}
              </span>
              <span className="text-[9px] text-[var(--text-tertiary)]">
                竞争 {(competitionIntensity * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-[var(--text-tertiary)]">🎯 面试</span>
              <span className="text-[10px] text-[var(--text-secondary)]">{interviewerRec}</span>
              <span className="text-[9px] text-[var(--accent-cyan)] font-mono">{scorePct}%</span>
            </div>
            {candidateReservationWage !== null && (
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-[var(--text-tertiary)]">底线</span>
                <span className="text-[10px] text-[var(--text-secondary)] font-mono">{candidateReservationWage}K/年</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
