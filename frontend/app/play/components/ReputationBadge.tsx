"use client";

import { useEffect, useState } from "react";
import { describeReputation, loadReputation, type ReputationState } from "../lib/reputation";

export default function ReputationBadge() {
  const [state, setState] = useState<ReputationState>({ score: 0.72, events: [] });

  useEffect(() => {
    const sync = () => setState(loadReputation());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("bidding-reputation-updated", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("bidding-reputation-updated", sync);
    };
  }, []);

  const meta = describeReputation(state.score);
  const latest = state.events[0];
  const tone = meta.tone === "good" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : meta.tone === "risk" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <div className={`rounded-xl border px-3 py-2 text-[10px] font-bold ${tone}`}>
      <div className="flex items-center justify-between gap-2">
        <span>市场信誉</span>
        <span>{Math.round(state.score * 100)}%</span>
      </div>
      <div className="mt-0.5 text-[9px] opacity-80">
        {latest ? `${latest.delta > 0 ? "+" : ""}${Math.round(latest.delta * 100)}% · ${latest.reason}` : meta.label}
      </div>
    </div>
  );
}
