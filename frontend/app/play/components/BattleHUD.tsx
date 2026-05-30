"use client";

import ChibiAvatar from "./ChibiAvatar";
import type { GameStateView, HRPersonaView, TrustStateView } from "../hooks/types";

interface BattleHUDProps {
  gameState: GameStateView | null;
  hrPersona: HRPersonaView | null;
  hrPatience: number;
  trustState: TrustStateView | null;
  round: number;
  maxRounds: number;
  phase?: string;
  candidateName?: string;
  candidateTrust?: number;
  candidateChips?: number;
}

function pct(value: number) {
  return `${Math.round(Math.max(0, Math.min(value, 1)) * 100)}%`;
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  const low = value < 0.3;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] font-bold text-slate-400">
        <span>{label}</span>
        <span>{pct(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full border border-white/10 bg-white/10">
        <div
          className={low ? "h-full rounded-full bg-red-500 pulse-red" : "h-full rounded-full shadow-[0_0_14px_currentColor]"}
          style={{ width: pct(value), backgroundColor: low ? undefined : color, color }}
        />
      </div>
    </div>
  );
}

function moodFromPatience(value: number): "confident" | "nervous" | "happy" | "stern" | "thinking" {
  if (value < 0.3) return "stern";
  if (value < 0.55) return "thinking";
  return "confident";
}

export default function BattleHUD({
  gameState,
  hrPersona,
  hrPatience,
  trustState,
  round,
  maxRounds,
  phase = "谈判中",
  candidateName = "候选人",
  candidateTrust,
  candidateChips,
}: BattleHUDProps) {
  const candidateLeverage = typeof candidateTrust === "number"
    ? candidateTrust
    : Math.max(0.15, Math.min(1, (gameState?.scores?.overall ?? 0.55)));
  const chips = candidateChips ?? Math.max(0.1, Math.min(1, (gameState?.competition_intensity ?? 0.5)));
  const trust = trustState?.hr_trust_in_candidate ?? 0.5;

  return (
    <section className="cyber-glass relative overflow-hidden rounded-2xl p-4 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(255,106,0,0.20),transparent_32%),radial-gradient(circle_at_88%_18%,rgba(0,224,255,0.18),transparent_34%)]" />
      <div className="absolute inset-0 micro-grid opacity-25" />
      <div className="relative z-10 grid gap-4 min-[480px]:grid-cols-[1fr_auto_1fr] min-[480px]:items-center">
        <div className="flex items-center gap-3">
          <ChibiAvatar role="candidate" mood="confident" speechBubble="我能创造价值" className="shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <div className="truncate text-sm font-black">{candidateName}</div>
              <div className="text-[10px] font-bold text-[#FF6A00]">候选人</div>
            </div>
            <Bar label="耐心值" value={candidateLeverage} color="#FF6A00" />
            <Bar label="筹码数" value={chips} color="#FFB36A" />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/35 px-5 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="absolute inset-x-4 top-2 h-px bg-gradient-to-r from-transparent via-[#00E0FF] to-transparent opacity-70" />
          <div className="text-2xl font-black tracking-tight text-white">VS</div>
          <div className="mt-1 text-[11px] font-bold text-slate-400">第 {round + 1} / {maxRounds} 轮</div>
          <div className="mt-2 inline-flex rounded-full border border-[#00E0FF]/30 bg-[#00E0FF]/10 px-3 py-1 text-[10px] font-black text-[#00E0FF] shadow-[0_0_18px_rgba(0,224,255,0.16)]">
            {phase}
          </div>
        </div>

        <div className="flex items-center gap-3 min-[480px]:flex-row-reverse">
          <ChibiAvatar role="hr" mood={moodFromPatience(hrPatience)} speechBubble={hrPersona?.tagline || "预算要谨慎"} className="shrink-0" />
          <div className="min-w-0 flex-1 space-y-2 min-[480px]:text-right">
            <div>
              <div className="truncate text-sm font-black">{hrPersona?.name || "HR"}</div>
              <div className="text-[10px] font-bold text-[#FF6B6B]">招聘方</div>
            </div>
            <Bar label="耐心值" value={hrPatience} color="#FF6B6B" />
            <Bar label="信任度" value={trust} color="#FF9A9A" />
          </div>
        </div>
      </div>
    </section>
  );
}
