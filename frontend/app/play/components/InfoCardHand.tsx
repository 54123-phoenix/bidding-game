"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
  disabled?: boolean;
}

export default function InfoCardHand({
  cards,
  trust,
  trustLabel,
  onReveal,
  onFake,
  onConceal,
  disabled = false,
}: InfoCardHandProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [fakeInput, setFakeInput] = useState("");

  const hiddenCards = cards.filter((c) => c.reveal_state === "hidden");
  const playedCards = cards.filter((c) => c.reveal_state !== "hidden");

  return (
    <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-panel)] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border-hairline)] bg-[var(--bg-elev)]/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">🃏</span>
          <span className="text-sm font-bold text-[var(--text-primary)]">情报手牌</span>
          <span className="text-[10px] text-[var(--text-tertiary)] bg-[var(--bg-card)] px-2 py-0.5 rounded-full border border-[var(--border-hairline)]">
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

      {/* Hidden cards row */}
      <div className="p-4 space-y-3">
        {hiddenCards.length === 0 && (
          <div className="text-center text-xs text-[var(--text-tertiary)] py-4">
            所有情报已使用完毕
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {hiddenCards.map((card) => {
            const isExpanded = expandedId === card.card_id;
            return (
              <motion.div
                key={card.card_id}
                layout
                className="relative"
                onClick={() => !disabled && setExpandedId(isExpanded ? null : card.card_id)}
              >
                <motion.div
                  className="cursor-pointer rounded-lg border px-3 py-2 flex items-center gap-2 transition-colors"
                  style={{
                    borderColor: isExpanded ? "var(--accent-cyan)60" : "var(--border-hairline)",
                    backgroundColor: isExpanded ? "var(--accent-cyan-glow)" : "var(--bg-card)",
                  }}
                  whileHover={{ scale: disabled ? 1 : 1.03, y: disabled ? 0 : -2 }}
                  whileTap={{ scale: disabled ? 1 : 0.97 }}
                >
                  <span className="text-lg">{card.icon}</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-[var(--text-primary)]">{card.description}</span>
                    <span className="text-[9px] text-[var(--text-tertiary)]">
                      验证难度 {Math.round(card.verifiability * 100)}% · 薪资影响 {card.salary_impact > 0 ? "+" : ""}
                      {card.salary_impact}K
                    </span>
                  </div>
                </motion.div>

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
                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                        style={{
                          backgroundColor: "var(--accent-green-glow)",
                          color: "var(--state-success)",
                        }}
                      >
                        ✅ 如实披露 — 信任度 +8%
                      </button>

                      {/* Fake */}
                      <div className="space-y-1">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={fakeInput}
                            onChange={(e) => setFakeInput(e.target.value)}
                            placeholder={`伪造 ${card.description}...`}
                            className="flex-1 bg-[var(--bg-card)] border border-[var(--border-hairline)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--state-danger)]/50"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (fakeInput.trim()) {
                                onFake(card.card_id, fakeInput.trim());
                                setFakeInput("");
                                setExpandedId(null);
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
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
                        className="w-full text-left px-3 py-2 rounded-lg text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-colors"
                      >
                        🤐 保持沉默 — 无影响
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
