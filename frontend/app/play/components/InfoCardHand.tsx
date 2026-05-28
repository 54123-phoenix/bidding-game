"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { InfoPlayFeedback } from "../hooks/useInfoWar";

interface InfoCard {
  card_id: string;
  card_type: string;
  icon: string;
  description: string;
  true_value: string | number;
  revealed_value?: string | number | null;
  reveal_state: "hidden" | "revealed" | "faked" | "probed";
  verifiability: number;
  trust_impact: number;
  salary_impact: number;
}

interface InfoCardHandProps {
  cards: InfoCard[];
  trust: number;
  trustLabel: string;
  onReveal: (cardId: string, value: string | number) => void | Promise<void>;
  onFake: (cardId: string, fakeValue: string | number) => void | Promise<void>;
  onConceal: (cardId: string) => void | Promise<void>;
  lastPlay?: InfoPlayFeedback | null;
  disabled?: boolean;
}

function classifyCard(card: InfoCard) {
  const text = `${card.card_type} ${card.description}`.toLowerCase();
  if (card.trust_impact < -0.12 || /fake|夸大|offer|竞品|competing|other/.test(text)) {
    return { label: "进攻牌", color: "var(--state-danger)", bg: "rgba(251,113,133,0.10)", tactic: "抬高锚点" };
  }
  if (card.verifiability > 0.72 || /证书|education|school|company|experience|技能|skill/.test(text)) {
    return { label: "证据牌", color: "var(--accent-cyan)", bg: "var(--accent-cyan-glow)", tactic: "增强可信度" };
  }
  if (card.salary_impact <= 0 || /stability|稳定|risk|风险/.test(text)) {
    return { label: "防守牌", color: "var(--market-emerald)", bg: "rgba(52,211,153,0.10)", tactic: "降低疑虑" };
  }
  return { label: "策略牌", color: "var(--accent-ali)", bg: "var(--accent-ali-glow)", tactic: "换取让步" };
}

export default function InfoCardHand({
  cards,
  trust,
  trustLabel,
  onReveal,
  onFake,
  onConceal,
  lastPlay,
  disabled = false,
}: InfoCardHandProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [fakeInputs, setFakeInputs] = useState<Record<string, string>>({});

  const hiddenCards = cards.filter((c) => c.reveal_state === "hidden");
  const playedCards = cards.filter((c) => c.reveal_state !== "hidden");

  return (
    <div className="surface-base overflow-hidden rounded-3xl">
      {/* Header */}
      <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-hairline)] bg-[var(--bg-elev)]/60 px-4 py-3">
        <div className="pointer-events-none absolute inset-0 micro-grid opacity-20" />
        <div className="flex items-center gap-2">
          <span className="text-base">🃏</span>
          <span className="text-sm font-bold text-[var(--text-primary)]">情报手牌</span>
          <span className="strategy-chip rounded-full px-2 py-0.5 text-[10px] font-bold">
            {hiddenCards.length} 张未使用
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--text-tertiary)]">HR信任度</span>
          <div className="w-20 h-1.5 rounded-full bg-[var(--bg-card)] overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{
                backgroundColor:
                  trust >= 0.6 ? "var(--state-success)" : trust >= 0.3 ? "var(--accent-cyan)" : "var(--state-danger)",
              }}
              animate={{ width: `${trust * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded"
            style={{
              color:
                trust >= 0.6 ? "var(--state-success)" : trust >= 0.3 ? "var(--accent-cyan)" : "var(--state-danger)",
              backgroundColor:
                trust >= 0.6
                  ? "var(--accent-green-glow)"
                  : trust >= 0.3
                  ? "var(--accent-cyan-glow)"
                  : "rgba(251,113,133,0.1)",
            }}
          >
            {trustLabel}
          </span>
        </div>
      </div>

      <AnimatePresence>
        {lastPlay && (
          <motion.div
            key={`${lastPlay.cardId}-${lastPlay.actionType}`}
            aria-live="polite"
            className="relative overflow-hidden border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)]/40 px-4 py-3"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <motion.div
              className="absolute inset-y-0 left-0 w-1"
              style={{ backgroundColor: lastPlay.actionType === "fake" ? "var(--state-danger)" : lastPlay.actionType === "conceal" ? "var(--text-tertiary)" : "var(--state-success)" }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
            />
            <div className="flex items-start gap-3">
              <motion.div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--accent-cyan)]/25 bg-[var(--accent-cyan-glow)] text-lg"
                initial={{ rotate: -18, scale: 0.7 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 380, damping: 18 }}
              >
                {lastPlay.actionType === "fake" ? "🎭" : lastPlay.actionType === "conceal" ? "🤐" : "✅"}
              </motion.div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-black text-[var(--text-primary)]">{lastPlay.label}</span>
                  {typeof lastPlay.trustAfter === "number" && (
                    <span className="rounded-full border border-[var(--accent-cyan)]/20 bg-[var(--accent-cyan-glow)] px-2 py-0.5 text-[9px] font-bold text-[var(--accent-cyan)]">
                      信任 {Math.round(lastPlay.trustAfter * 100)}%
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">{lastPlay.narrative}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden cards row */}
      <div className="p-4 space-y-3">
        {hiddenCards.length === 0 && (
          <div className="text-center text-xs text-[var(--text-tertiary)] py-4">
            所有情报已使用完毕
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
          {hiddenCards.map((card) => {
            const isExpanded = expandedId === card.card_id;
            const wasJustPlayed = lastPlay?.cardId === card.card_id;
            return (
              <motion.div
                key={card.card_id}
                layout
                className="relative min-w-0"
              >
                <motion.button
                  type="button"
                  aria-expanded={isExpanded}
                  aria-label={`选择情报卡：${card.description}`}
                  disabled={disabled}
                  onClick={() => setExpandedId(isExpanded ? null : card.card_id)}
                  className="group relative w-full cursor-pointer overflow-hidden rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-cyan)]/60 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    borderColor: isExpanded ? "var(--accent-ali)66" : "var(--border-hairline)",
                    background: isExpanded
                      ? "linear-gradient(135deg, rgba(255,106,0,0.16), rgba(34,211,238,0.08))"
                      : "linear-gradient(135deg, rgba(26,34,51,0.94), rgba(14,18,25,0.90))",
                    boxShadow: isExpanded ? "0 0 24px rgba(255,106,0,0.18)" : "none",
                  }}
                  whileHover={{ scale: disabled ? 1 : 1.035, y: disabled ? 0 : -6, rotate: disabled ? 0 : -0.5 }}
                  whileTap={{ scale: disabled ? 1 : 0.97 }}
                  animate={wasJustPlayed ? { y: [0, -10, 0], rotate: [0, -2, 0] } : {}}
                  transition={wasJustPlayed ? { duration: 0.55 } : undefined}
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent-ali)]/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="relative flex items-center gap-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--accent-cyan)]/20 bg-[var(--accent-cyan-glow)] text-lg" aria-hidden="true">{card.icon}</span>
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold text-[var(--text-primary)]">{card.description}</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                        {(() => {
                          const cardClass = classifyCard(card);
                          return (
                            <span
                              className="rounded-full border px-1.5 py-0.5 text-[8px] font-bold"
                              style={{ color: cardClass.color, background: cardClass.bg, borderColor: `${cardClass.color}33` }}
                            >
                              {cardClass.label} · {cardClass.tactic}
                            </span>
                          );
                        })()}
                        <span className="rounded-full border border-[var(--accent-cyan)]/20 bg-[var(--accent-cyan-glow)] px-1.5 py-0.5 text-[8px] font-bold text-[var(--accent-cyan)]">
                          验证 {Math.round(card.verifiability * 100)}%
                        </span>
                        <span className="rounded-full border border-[var(--accent-ali)]/20 bg-[var(--accent-ali-glow)] px-1.5 py-0.5 text-[8px] font-bold text-[var(--accent-ali)]">
                          薪资 {card.salary_impact > 0 ? "+" : ""}{card.salary_impact}K
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.button>

                {/* Expanded action panel */}
                <AnimatePresence>
                  {isExpanded && !disabled && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute z-20 top-full left-0 mt-2 w-64 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elev)] shadow-xl p-3 space-y-2"
                    >
                      <div className="text-[10px] text-[var(--text-tertiary)] mb-1">
                        真实值: <span className="text-[var(--text-secondary)]">{card.true_value}</span>
                      </div>

                      {/* Reveal */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onReveal(card.card_id, card.true_value);
                          setExpandedId(null);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--state-success)]/50"
                        style={{
                          backgroundColor: "var(--accent-green-glow)",
                          color: "var(--state-success)",
                        }}
                      >
                        ✅ 如实披露 — 交给 HR 验证
                      </button>

                      {/* Fake */}
                      <div className="space-y-1">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            name={`fake-${card.card_id}`}
                            aria-label={`伪造 ${card.description}`}
                            value={fakeInputs[card.card_id] || ""}
                            onChange={(e) => setFakeInputs((prev) => ({ ...prev, [card.card_id]: e.target.value }))}
                            placeholder={`伪造 ${card.description}…`}
                            className="flex-1 bg-[var(--bg-card)] border border-[var(--border-hairline)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--state-danger)]/50"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const value = (fakeInputs[card.card_id] || "").trim();
                              if (value) {
                                onFake(card.card_id, value);
                                setFakeInputs((prev) => ({ ...prev, [card.card_id]: "" }));
                                setExpandedId(null);
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--state-danger)]/50"
                            style={{
                              backgroundColor: "rgba(251,113,133,0.15)",
                              color: "var(--state-danger)",
                            }}
                          >
                            伪造
                          </button>
                        </div>
                        <div className="text-[9px] text-[var(--text-tertiary)]">
                          ⚠️ 若被识破，信任度 {Math.round(card.trust_impact * 100)}%
                        </div>
                      </div>

                      {/* Conceal */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onConceal(card.card_id);
                          setExpandedId(null);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-cyan)]/40"
                      >
                        🤐 暂不披露 — 保留筹码
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Played cards history */}
        {playedCards.length > 0 && (
          <div className="pt-2 border-t border-[var(--border-hairline)]">
            <div className="text-[10px] text-[var(--text-tertiary)] mb-2">已使用情报</div>
            <div className="flex flex-wrap gap-2">
              {playedCards.map((card) => (
                <div
                  key={card.card_id}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] border"
                  style={{
                    borderColor: "var(--border-hairline)",
                    backgroundColor: "var(--bg-card)",
                    opacity: 0.7,
                  }}
                >
                  <span>{card.icon}</span>
                  <span className="text-[var(--text-secondary)]">
                    {card.reveal_state === "revealed" && "✅ "}
                    {card.reveal_state === "faked" && "🎭 "}
                    {card.reveal_state === "probed" && "🔍 "}
                    {card.description}
                    {card.revealed_value !== null && card.revealed_value !== undefined && (
                      <span className="text-[var(--text-tertiary)]"> · {card.revealed_value}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
