"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const QUICK_TACTICS = [
  { label: "锚定高薪", text: "我目前总包60k，期望不低于这个数" },
  { label: "竞品压力", text: "我手上还有一个蚂蚁的offer在走流程" },
  { label: "项目影响", text: "我主导过双十一核心链路，稳定性99.99%" },
  { label: "快速入职", text: "如果能给到58k，我下周可以入职" },
  { label: "表达灵活", text: "薪资可以谈，但我更看重成长空间" },
];

function extractSalary(text: string): number | null {
  const m = text.match(/(\d{2,3})\s*[k千K/]/);
  if (m) return parseInt(m[1], 10);
  const m2 = text.match(/(?:期望|底线|至少|不低于|要|给|到)\s*(\d{2,3})/);
  if (m2) return parseInt(m2[1], 10);
  return null;
}

function detectIntent(text: string): { label: string; color: string } | null {
  const lower = text.toLowerCase();
  if (/(接受|同意|好的|可以|没问题|accept|join)/.test(lower)) {
    return { label: "接受意向", color: "text-[var(--state-success)]" };
  }
  if (/(拒绝|算了|不考虑|抱歉|reject|pass|decline)/.test(lower)) {
    return { label: "拒绝意向", color: "text-[var(--state-danger)]" };
  }
  if (/(总包|目前|期望|底线|不低于|至少|想要|希望)/.test(lower)) {
    return { label: "锚定策略", color: "text-[var(--accent-cyan)]" };
  }
  if (/(offer|蚂蚁|腾讯|阿里|字节|竞品|手上有|那边)/.test(lower)) {
    return { label: "竞品压力", color: "text-[var(--candidate-blue)]" };
  }
  if (/(主导|核心|稳定性|QPS|提升|99\.9|性能|优化)/.test(lower)) {
    return { label: "价值展示", color: "text-[var(--interviewer-amber)]" };
  }
  if (/(下周|入职|离职|已经|随时|马上|可以入职)/.test(lower)) {
    return { label: "入职承诺", color: "text-[var(--market-emerald)]" };
  }
  return null;
}

interface FreeTextNegotiationProps {
  onSend: (text: string) => void;
  onAccept: () => void;
  onReject: () => void;
  disabled?: boolean;
  hrThinking?: boolean;
}

export default function FreeTextNegotiation({
  onSend,
  onAccept,
  onReject,
  disabled,
  hrThinking,
}: FreeTextNegotiationProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const detectedSalary = extractSalary(text);
  const detectedIntent = detectIntent(text);

  const handleSend = () => {
    if (!text.trim() || disabled || hrThinking) return;
    onSend(text.trim());
    setText("");
  };

  return (
    <div className="space-y-3">
      {/* Quick tactics */}
      <div className="flex gap-2 overflow-x-auto pb-1"
      >
        {QUICK_TACTICS.map((t) => (
          <button
            key={t.label}
            onClick={() => {
              setText(t.text);
              inputRef.current?.focus();
            }}
            disabled={disabled || hrThinking}
            className="shrink-0 px-3 py-1.5 rounded-md bg-[var(--bg-elev)] border border-[var(--border-hairline)] text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:border-[var(--border-strong)] transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-cyan)]/40"
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Input row */}
      <div className="flex items-center gap-3"
      >
        <div className="flex-1 relative"
        >
          <input
            ref={inputRef}
            type="text"
            name="negotiation-message"
            aria-label="谈判话术"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="输入谈判话术，例如：我目前总包60k，期望不低于这个数…"
            disabled={disabled || hrThinking}
            className="w-full bg-[var(--bg-elev)] border border-[var(--border-hairline)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-cyan)]/60 disabled:opacity-50"
          />
          <AnimatePresence>
            {(detectedSalary || detectedIntent) && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="absolute -top-6 left-0 flex items-center gap-2"
              >
                {detectedIntent && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-elev)] border border-[var(--border-hairline)] ${detectedIntent.color}`}
                  >
                    {detectedIntent.label}
                  </span>
                )}
                {detectedSalary && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-elev)] border border-[var(--border-hairline)] text-[var(--accent-cyan)] font-mono"
                  >
                    {detectedSalary}K
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={handleSend}
          disabled={disabled || hrThinking || !text.trim()}
          className="px-5 py-2.5 rounded-lg bg-[var(--accent-cyan)] text-[var(--bg-canvas)] text-sm font-bold hover:brightness-110 disabled:opacity-30 disabled:pointer-events-none transition-[filter,opacity] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-cyan)]/60"
        >
          发送
        </button>
        <button
          onClick={onAccept}
          disabled={disabled || hrThinking}
          className="px-4 py-2.5 rounded-lg bg-[var(--state-success)] text-[var(--bg-canvas)] text-sm font-bold hover:brightness-110 disabled:opacity-30 disabled:pointer-events-none transition-[filter,opacity] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--state-success)]/60"
        >
          接受
        </button>
        <button
          onClick={onReject}
          disabled={disabled || hrThinking}
          className="px-4 py-2.5 rounded-lg bg-[var(--bg-elev)] border border-[var(--border-hairline)] text-[var(--text-secondary)] text-sm font-bold hover:bg-[var(--bg-card)] disabled:opacity-30 disabled:pointer-events-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-cyan)]/40"
        >
          拒绝
        </button>
      </div>
    </div>
  );
}
