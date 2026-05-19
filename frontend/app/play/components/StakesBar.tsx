"use client";

import { motion } from "framer-motion";

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface StakesBarProps {
  publicOffer: number | null;
  hrPatience: number;
  marketAdjustment: number;
  competitionIntensity: number;
  interviewerRec: string;
  overallScore: number;
  round: number;
  maxRounds: number;
  candidateReservationWage?: number;
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function getPatienceColor(p: number): string {
  if (p >= 0.7) return "bg-emerald-500";
  if (p >= 0.4) return "bg-amber-500";
  if (p >= 0.2) return "bg-orange-500";
  return "bg-red-500";
}

function getPatienceBg(p: number): string {
  if (p >= 0.7) return "bg-emerald-500/15 border-emerald-500/20";
  if (p >= 0.4) return "bg-amber-500/15 border-amber-500/20";
  if (p >= 0.2) return "bg-orange-500/15 border-orange-500/20";
  return "bg-red-500/15 border-red-500/20";
}

function getMarketLabel(adj: number): string {
  if (adj > 1.05) return "候选人市场";
  if (adj < 0.95) return "雇主市场";
  return "供需平衡";
}

function getMarketColor(adj: number): string {
  if (adj > 1.05) return "text-emerald-400";
  if (adj < 0.95) return "text-red-400";
  return "text-slate-300";
}

// ═══════════════════════════════════════════════════════════════
// StakesBar
// ═══════════════════════════════════════════════════════════════

export default function StakesBar({
  publicOffer,
  hrPatience,
  marketAdjustment,
  competitionIntensity,
  interviewerRec,
  overallScore,
  round,
  maxRounds,
  candidateReservationWage,
}: StakesBarProps) {
  const patienceColor = getPatienceColor(hrPatience);
  const patienceBg = getPatienceBg(hrPatience);
  const marketLabel = getMarketLabel(marketAdjustment);
  const marketColor = getMarketColor(marketAdjustment);
  const patiencePct = Math.round(hrPatience * 100);
  const scorePct = Math.round((overallScore || 0.5) * 100);

  return (
    <motion.div
      className="bg-slate-900/60 border border-slate-800/60 rounded-xl px-4 py-3"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Current Offer */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500">当前报价</span>
          <span className="text-lg font-bold text-cyan-400 tabular-nums">
            {publicOffer ? `${publicOffer}K` : "—"}
          </span>
          <span className="text-[10px] text-slate-600">/年</span>
        </div>

        <div className="w-px h-6 bg-slate-800" />

        {/* HR Patience */}
        <div className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border ${patienceBg}`}>
          <div className="flex gap-0.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`w-1.5 h-3 rounded-sm ${
                  i / 4 < hrPatience ? patienceColor : "bg-slate-700"
                }`}
                style={{ opacity: 1 - i * 0.08 }}
              />
            ))}
          </div>
          <span className="text-[11px] text-slate-400">
            HR 耐心 <span className="font-mono text-slate-300">{patiencePct}%</span>
          </span>
        </div>

        <div className="w-px h-6 bg-slate-800" />

        {/* Market */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-500">市场</span>
          <span className={`text-[11px] font-medium ${marketColor}`}>
            {marketLabel}
          </span>
          <span className="text-[10px] text-slate-600">
            (竞争 {(competitionIntensity * 100).toFixed(0)}%)
          </span>
        </div>

        <div className="w-px h-6 bg-slate-800" />

        {/* Interview */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-500">面试</span>
          <span className="text-[11px] text-slate-300">{interviewerRec}</span>
          <span className="text-[10px] text-slate-600">{scorePct}%</span>
        </div>

        <div className="w-px h-6 bg-slate-800" />

        {/* Round */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-500">回合</span>
          <span className="text-[11px] font-mono text-slate-300">
            {round + 1}/{maxRounds}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
