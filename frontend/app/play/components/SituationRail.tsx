"use client";

import { motion } from "framer-motion";
import { VISUAL_ASSETS } from "@/lib/visual-assets";
import type { GameStateView, TrustStateView } from "../hooks/types";

interface SituationRailProps {
  gameState: GameStateView | null;
  hrPatience: number;
  trustState: TrustStateView | null;
  round: number;
  maxRounds: number;
}

function pct(v: number | undefined | null) {
  if (typeof v !== "number" || Number.isNaN(v)) return "--";
  return `${Math.round(v * 100)}%`;
}

export default function SituationRail({ gameState, hrPatience, trustState, round, maxRounds }: SituationRailProps) {
  const marketAdjustment = gameState?.market_adjustment ?? 1;
  const competition = gameState?.competition_intensity ?? 0.5;
  const publicOffer = gameState?.public_offer;
  const trust = trustState?.hr_trust_in_candidate ?? 0.5;
  const progress = Math.min((round + 1) / Math.max(maxRounds, 1), 1);

  return (
    <motion.aside
      className="surface-base overflow-hidden rounded-3xl p-4"
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45 }}
    >
      <img
        src={VISUAL_ASSETS.marketSignal}
        alt=""
        aria-hidden="true"
        width={480}
        height={300}
        className="pointer-events-none absolute -right-28 -top-16 w-64 opacity-12 mix-blend-screen"
      />
      <div className="relative z-10">
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-[0.28em] text-[var(--accent-cyan)]">Negotiation OS</div>
        <div className="mt-1 flex items-end justify-between gap-2">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">局势雷达</h3>
          <span className="font-mono text-lg font-bold text-[var(--accent-cyan)]">{publicOffer ? `${publicOffer}K` : "--"}</span>
        </div>
        <div className="mt-2 flex gap-1.5">
          <span className="ai-chip rounded-full px-2 py-0.5 text-[9px] font-bold">信念更新</span>
          <span className="strategy-chip rounded-full px-2 py-0.5 text-[9px] font-bold">博弈压力</span>
        </div>
      </div>

      <div className="space-y-3">
        <Gauge label="回合进度" value={progress} color="var(--accent-cyan)" caption={`${round + 1}/${maxRounds}`} />
        <Gauge label="HR 耐心" value={hrPatience} color={hrPatience < 0.35 ? "var(--state-danger)" : "var(--interviewer-amber)"} caption={pct(hrPatience)} />
        <Gauge label="HR 信任" value={trust} color={trust < 0.35 ? "var(--state-danger)" : "var(--state-success)"} caption={trustState?.trust_label || pct(trust)} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <MiniStat label="市场" value={marketAdjustment > 1.05 ? "候选人" : marketAdjustment < 0.95 ? "雇主" : "均衡"} tone="cyan" />
        <MiniStat label="竞争" value={pct(competition)} tone="amber" />
      </div>

      <div className="mt-4 rounded-xl border border-[var(--accent-cyan)]/15 bg-[var(--accent-cyan-glow)] px-3 py-2 text-[11px] leading-relaxed text-[var(--text-secondary)]">
        每次报价都会改变 HR 对你的预算预期、诚信判断和谈判耐心。
      </div>
      </div>
    </motion.aside>
  );
}

function Gauge({ label, value, color, caption }: { label: string; value: number; color: string; caption: string }) {
  const width = `${Math.max(0, Math.min(value, 1)) * 100}%`;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[10px] text-[var(--text-tertiary)]">{label}</span>
        <span className="text-[10px] font-bold" style={{ color }}>{caption}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elev)]">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}88, ${color})`, boxShadow: `0 0 16px ${color}55` }}
          initial={{ width: 0 }}
          animate={{ width }}
          transition={{ duration: 0.65, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone: "cyan" | "amber" }) {
  const color = tone === "cyan" ? "var(--accent-cyan)" : "var(--interviewer-amber)";
  return (
    <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elev)]/60 px-3 py-2">
      <div className="text-[9px] text-[var(--text-tertiary)]">{label}</div>
      <div className="mt-1 text-xs font-bold" style={{ color }}>{value}</div>
    </div>
  );
}
