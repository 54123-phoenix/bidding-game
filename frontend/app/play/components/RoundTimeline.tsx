"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ActionBadge from "./ActionBadge";
import type { RoundActionView } from "../hooks/types";

const AGENT_LABELS: Record<string, string> = {
  candidate: "候选人",
  hr: "HR",
  interviewer: "面试官",
  market: "市场",
};

export default function RoundTimeline({ actions }: { actions: RoundActionView[] }) {
  const rounds = new Map<number, RoundActionView[]>();
  actions.forEach((a) => {
    const r = a.round ?? 0;
    if (!rounds.has(r)) rounds.set(r, []);
    rounds.get(r)!.push(a);
  });

  const [expandedRound, setExpandedRound] = useState<number | null>(0);

  return (
    <div className="space-y-2">
      {Array.from(rounds.entries()).map(([round, roundActions]) => (
        <div key={round} className="border border-[var(--border-hairline)] rounded-lg overflow-hidden">
          <button
            onClick={() => setExpandedRound(expandedRound === round ? null : round)}
            className="w-full flex items-center justify-between px-4 py-2 bg-[var(--bg-elev)]/50 hover:bg-[var(--bg-elev)] transition-colors text-left"
          >
            <span className="text-sm font-medium text-[var(--text-primary)]">
              第 {round + 1} 轮
              <span className="text-xs text-[var(--text-tertiary)] ml-2">
                {roundActions.length} 个动作
              </span>
            </span>
            <span className="text-xs text-[var(--text-tertiary)]">
              {expandedRound === round ? "收起 ▲" : "展开 ▼"}
            </span>
          </button>
          <AnimatePresence>
            {expandedRound === round && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="px-4 py-2 space-y-1.5 border-t border-[var(--border-hairline)]/50">
                  {roundActions.map((a, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="flex items-start gap-3 text-sm py-1.5"
                    >
                      <div className="flex items-center gap-1.5 min-w-0 shrink-0">
                        <div
                          className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                            a.player === "candidate"
                              ? "bg-[var(--candidate-blue)]"
                              : a.player === "hr"
                              ? "bg-[var(--hr-purple)]"
                              : a.player === "interviewer"
                              ? "bg-[var(--interviewer-amber)]"
                              : "bg-[var(--market-emerald)]"
                          }`}
                        />
                        <span className="text-[10px] text-[var(--text-tertiary)] w-14 shrink-0">
                          {AGENT_LABELS[a.player] || a.player}
                        </span>
                      </div>
                      <ActionBadge actionType={a.action_type} />
                      <span className="text-[11px] text-[var(--text-secondary)] min-w-0 flex-1 line-clamp-2">
                        {a.reasoning}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
