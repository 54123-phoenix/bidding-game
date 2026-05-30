"use client";

import { motion } from "framer-motion";
import type React from "react";
import FreeTextNegotiation from "./FreeTextNegotiation";
import type { GameOption } from "../hooks/types";

type NegotiationMode = "buttons" | "freeText";

interface NegotiationActionComposerProps {
  negotiationMode: NegotiationMode;
  setNegotiationMode: (m: NegotiationMode) => void;
  prompt: string;
  options: GameOption[];
  gameLoading: boolean;
  hrThinking: boolean;
  showCounterInput: boolean;
  setShowCounterInput: (s: boolean) => void;
  counterSalary: number | null;
  setCounterSalary: (s: number | null) => void;
  currentOffer: number | null;
  handleAct: (actionType: string, salaryAmount?: number, message?: string) => Promise<void>;
  showHints?: boolean;
}

export default function NegotiationActionComposer({
  negotiationMode,
  setNegotiationMode,
  prompt,
  options,
  gameLoading,
  hrThinking,
  showCounterInput,
  setShowCounterInput,
  counterSalary,
  setCounterSalary,
  currentOffer,
  handleAct,
  showHints = true,
}: NegotiationActionComposerProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between xl:items-start">
        <div className="inline-flex w-fit rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elev)] p-1">
          <ModeButton active={negotiationMode === "buttons"} onClick={() => setNegotiationMode("buttons")}>战术按钮</ModeButton>
          <ModeButton active={negotiationMode === "freeText"} onClick={() => setNegotiationMode("freeText")}>自由话术</ModeButton>
        </div>
        <span className="text-[10px] text-[var(--text-tertiary)]">
          {negotiationMode === "buttons" ? "快速执行策略动作" : "用自然语言塑造谈判姿态"}
        </span>
      </div>

      {showHints && (
        <div className="grid gap-2 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-panel)]/70 p-3 lg:grid-cols-3 xl:grid-cols-1">
          <DecisionHint label="先定锚" value={currentOffer ? `当前 HR 锚点 ${currentOffer}K` : "开局先给合理高位"} />
          <DecisionHint label="再举证" value="用稀缺技能、竞品机会或业务影响力支撑要价" />
          <DecisionHint label="控风险" value="接受不是失败，拒绝前先确认总包和职级空间" />
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-panel)] shadow-[0_24px_90px_rgba(0,0,0,0.20)]">
        {prompt && !gameLoading && !hrThinking && (
          <div className="border-b border-[var(--border-hairline)] bg-[var(--bg-elev)]/60 px-5 py-3">
            <div className="mb-1 text-[10px] uppercase tracking-[0.22em] text-[var(--accent-cyan)]">Next Move</div>
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{prompt}</p>
          </div>
        )}

        {gameLoading ? (
          <div className="py-7 text-center">
            <div className="flex items-center justify-center gap-2">
              <motion.div
                className="h-5 w-5 rounded-full border-2 border-[var(--hr-purple)] border-t-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <span className="text-sm text-[var(--text-tertiary)]">HR 正在推演你的底线...</span>
            </div>
          </div>
        ) : negotiationMode === "freeText" ? (
          <div className="p-4">
            <FreeTextNegotiation
              onSend={(text) => {
                const salary = extractSalary(text);
                if (/接受|同意|好的|可以|没问题/.test(text)) handleAct("accept", undefined, text);
                else if (/拒绝|算了|不考虑|抱歉/.test(text)) handleAct("reject", undefined, text);
                else handleAct("counter_offer", salary, text);
              }}
              onAccept={() => handleAct("accept")}
              onReject={() => handleAct("reject")}
              disabled={gameLoading}
              hrThinking={hrThinking}
            />
          </div>
        ) : showCounterInput ? (
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center xl:items-stretch xl:flex-col">
            <input
              type="number"
              name="counter-salary"
              aria-label="期望薪资，单位 K 每年"
              inputMode="numeric"
              value={counterSalary || ""}
              onChange={(e) => setCounterSalary(Number(e.target.value))}
              placeholder="输入期望薪资 (K/年)…"
              className="flex-1 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elev)] px-4 py-3 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-cyan)]/60"
            />
            <button
              onClick={() => {
                if (counterSalary && counterSalary > 0) {
                  handleAct("counter_offer", counterSalary);
                  setCounterSalary(null);
                }
              }}
              className="rounded-xl bg-[var(--accent-cyan)] px-5 py-3 text-sm font-black text-[var(--bg-canvas)] transition-[filter,transform] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-cyan)]/60"
            >
              确认锚定
            </button>
            <button
              onClick={() => setShowCounterInput(false)}
              className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elev)] px-4 py-3 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-cyan)]/40"
            >
              取消
            </button>
          </div>
        ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-1">
            {options.map((opt) => (
              <ActionButton
                key={opt.action + (opt.salary || "")}
                option={opt}
                onClick={() => {
                  if (opt.action === "counter_offer" && opt.salary) handleAct("counter_offer", opt.salary);
                  else if (opt.action === "counter_offer") {
                    setShowCounterInput(true);
                    setCounterSalary((currentOffer || 30) + 5);
                  } else handleAct(opt.action);
                }}
              />
            ))}
            <motion.button
              onClick={() => {
                setShowCounterInput(true);
                setCounterSalary((currentOffer || 30) + 5);
              }}
              className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elev)] px-6 py-3.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-cyan)]/40"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
            >
              自定义金额
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
}

function DecisionHint({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elev)]/55 px-3 py-2">
      <div className="text-[9px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">{label}</div>
      <div className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">{value}</div>
    </div>
  );
}

function extractSalary(text: string) {
  const explicit = text.match(/(\d{2,3})\s*[k千K/]/)?.[1];
  if (explicit) return parseInt(explicit, 10);
  const intent = text.match(/(?:期望|底线|至少|不低于|要|给|到)\s*(\d{2,3})/)?.[1];
  return intent ? parseInt(intent, 10) : undefined;
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-cyan)]/50 ${active ? "bg-[var(--accent-cyan)] text-[var(--bg-canvas)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"}`}
    >
      {children}
    </button>
  );
}

function ActionButton({ option, onClick }: { option: { action: string; salary?: number; label: string }; onClick: () => void }) {
  const isAccept = option.action === "accept";
  const isReject = option.action === "reject";
  const isCounter = option.action === "counter_offer";
  return (
    <motion.button
      onClick={onClick}
      className="relative w-full overflow-hidden rounded-2xl px-5 py-3.5 text-sm font-black transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-cyan)]/60"
      style={{
        backgroundColor: isAccept ? "var(--state-success)" : isReject ? "var(--state-danger)" : "var(--accent-cyan)",
        color: isReject ? "var(--text-primary)" : "var(--bg-canvas)",
        boxShadow: isAccept ? "0 0 24px var(--accent-green-glow)" : isCounter ? "0 0 24px var(--accent-cyan-glow)" : "0 0 14px rgba(251,113,133,0.22)",
      }}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.97 }}
    >
      <span className="relative z-10 flex items-center gap-1.5">
        {isAccept && "握手"}{isReject && "离场"}{isCounter && "锚定"} · {option.label}
      </span>
    </motion.button>
  );
}
