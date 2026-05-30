"use client";

import { useState } from "react";
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
  onSkip?: () => void;
  makeOffer?: () => void;
}

type CardIntent = "reveal" | "exaggerate" | "conceal";

const INTENT_META: Record<CardIntent, { emoji: string; label: string; cls: string }> = {
  reveal: { emoji: "🔍", label: "揭示", cls: "bg-green-50 border-green-200" },
  exaggerate: { emoji: "✨", label: "夸大", cls: "bg-yellow-50 border-yellow-200" },
  conceal: { emoji: "🙈", label: "隐藏", cls: "bg-purple-50 border-purple-200" },
};

function inferIntent(card: InfoCard): CardIntent {
  const text = `${card.card_type} ${card.description}`.toLowerCase();
  if (card.verifiability < 0.5 || card.trust_impact < -0.1 || /fake|夸大|offer|竞品|competing/.test(text)) return "exaggerate";
  if (card.salary_impact <= 0 || /risk|stability|稳定|隐藏|conceal/.test(text)) return "conceal";
  return "reveal";
}

function trustBadge(value: number) {
  const signed = Math.round(value * 100);
  if (signed === 0) return "0";
  return `${signed > 0 ? "+" : ""}${signed}`;
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
  onSkip,
  makeOffer,
}: InfoCardHandProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fakeInputs, setFakeInputs] = useState<Record<string, string>>({});
  const selected = cards.find((card) => card.card_id === selectedId && card.reveal_state === "hidden") || null;
  const remaining = cards.filter((card) => card.reveal_state === "hidden").length;

  const playSelected = () => {
    if (!selected || disabled) return;
    const intent = inferIntent(selected);
    if (intent === "reveal") onReveal(selected.card_id, selected.true_value);
    else if (intent === "exaggerate") onFake(selected.card_id, fakeInputs[selected.card_id]?.trim() || selected.true_value);
    else onConceal(selected.card_id);
    setSelectedId(null);
  };

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 text-slate-900 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-black">信息战手牌</div>
          <div className="mt-1 flex items-center gap-2 text-[11px] font-bold text-slate-500">
            <span>HR信任 {Math.round(trust * 100)}%</span>
            <span className="rounded-full bg-slate-50 px-2 py-0.5">{trustLabel}</span>
          </div>
        </div>
        <span className="rounded-full bg-[#4F7EFF] px-3 py-1 text-[11px] font-black text-white">剩余 {remaining}</span>
      </div>

      {lastPlay && (
        <div className="mb-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-600">
          {lastPlay.label}：{lastPlay.narrative}
        </div>
      )}

      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-3 min-[480px]:flex-wrap min-[480px]:overflow-visible">
        {cards.map((card) => {
          const used = card.reveal_state !== "hidden";
          const selectedCard = selectedId === card.card_id;
          const intent = inferIntent(card);
          const meta = INTENT_META[intent];
          const trustDelta = trustBadge(card.trust_impact);
          return (
            <button
              key={card.card_id}
              type="button"
              disabled={disabled || used}
              onClick={() => setSelectedId(selectedCard ? null : card.card_id)}
              className={`relative min-h-[150px] w-[150px] shrink-0 rounded-2xl border p-3 text-left transition duration-200 ${meta.cls} ${used ? "cursor-not-allowed grayscale opacity-40" : "hover:-translate-y-1.5 hover:border-[#4F7EFF]"} ${selectedCard ? "-translate-y-2.5 border-[#4F7EFF] bg-blue-50" : ""}`}
            >
              <span className="absolute left-3 top-2 text-lg" aria-label={meta.label}>{meta.emoji}</span>
              <span className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-black ${card.trust_impact >= 0 ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
                {trustDelta}
              </span>
              <div className="pt-8">
                <div className="text-xl">{card.icon}</div>
                <div className="mt-2 line-clamp-2 text-xs font-black leading-snug text-slate-800">{card.description}</div>
                <div className="mt-2 text-[10px] font-bold text-slate-500">{meta.label} · 薪资 {card.salary_impact > 0 ? "+" : ""}{card.salary_impact}K</div>
                {intent === "exaggerate" && !used && selectedCard && (
                  <input
                    type="text"
                    value={fakeInputs[card.card_id] || ""}
                    onChange={(e) => setFakeInputs((prev) => ({ ...prev, [card.card_id]: e.target.value }))}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="夸大说法"
                    className="mt-2 w-full rounded-lg border border-yellow-200 bg-white px-2 py-1 text-[10px] outline-none focus:border-[#4F7EFF]"
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
        <button
          type="button"
          disabled={!selected || disabled}
          onClick={playSelected}
          className="rounded-xl bg-[#4F7EFF] px-3 py-2 text-xs font-black text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ⚡ 打出
        </button>
        <button
          type="button"
          onClick={onSkip || (() => setSelectedId(null))}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50"
        >
          跳过
        </button>
        <button
          type="button"
          onClick={makeOffer}
          className="rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-amber-950 transition hover:brightness-105 disabled:opacity-40"
          disabled={!makeOffer || disabled}
        >
          💬 出价 →
        </button>
      </div>
    </section>
  );
}
