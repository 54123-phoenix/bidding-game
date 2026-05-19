"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface DeliberationOption {
  action: string;
  salary?: number;
  label: string;
  expected_utility: number;
  risk_level: "low" | "medium" | "high";
  best_case: string;
  worst_case: string;
  opponent_projections?: {
    action: string;
    probability: number;
    reasoning: string;
  }[];
  future?: {
    promotion: string;
    salary_trajectory: string;
    exit_value: string;
    opportunity_cost: string;
    risk: string;
  } | null;
}

interface DeliberationPanelProps {
  situation: string;
  options: DeliberationOption[];
  selectedIndex: number;
  confidence: number;
  onSelect: (index: number) => void;
  onCustom: () => void;
  loading?: boolean;
  /** Real-time streaming text from LLM deliberation */
  streamingText?: string;
  /** Current streaming phase */
  streamingPhase?: "analyze" | "decide" | null;
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

const ACTION_LABELS: Record<string, string> = {
  accept: "接受",
  counter_offer: "还价",
  offer: "出价",
  reject: "拒绝",
  signal: "信号",
};

const RISK_COLORS: Record<string, string> = {
  low: "text-emerald-400 border-emerald-700/50 bg-emerald-950/30",
  medium: "text-amber-400 border-amber-700/50 bg-amber-950/30",
  high: "text-red-400 border-red-700/50 bg-red-950/30",
};

// ═══════════════════════════════════════════════════════════════
// StreamingText — typewriter effect for live LLM output
// ═══════════════════════════════════════════════════════════════

function StreamingText({ text, phase }: { text: string; phase: string | null }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [text]);

  if (!text) return null;

  const phaseLabel = phase === "analyze" ? "正在分析局势..." : phase === "decide" ? "正在做出决策..." : "";

  return (
    <div className="px-5 py-3 border-b border-slate-800/50 bg-slate-900/50">
      {phaseLabel && (
        <div className="flex items-center gap-2 mb-2">
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-cyan-400"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span className="text-xs text-cyan-400 font-medium">{phaseLabel}</span>
        </div>
      )}
      <div
        ref={containerRef}
        className="text-xs text-slate-300 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap"
      >
        {text}
        <motion.span
          className="inline-block w-1.5 h-3.5 bg-cyan-400 ml-0.5 align-middle"
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DeliberationPanel
// ═══════════════════════════════════════════════════════════════

export default function DeliberationPanel({
  situation,
  options,
  selectedIndex,
  confidence,
  onSelect,
  onCustom,
  loading = false,
  streamingText,
  streamingPhase = null,
}: DeliberationPanelProps) {
  const [expandedOption, setExpandedOption] = useState<number | null>(
    selectedIndex
  );
  const [showAllOptions, setShowAllOptions] = useState(false);

  const isStreaming = !!streamingText && streamingPhase !== null;
  const hasContent = (options && options.length > 0) || isStreaming || !!situation;
  if (!hasContent) return null;

  const displayOptions = showAllOptions ? options : (options || []).slice(0, 3);

  return (
    <motion.div
      className="bg-slate-900/80 backdrop-blur border border-slate-700/50 rounded-2xl overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <span className="text-sm">🧠</span>
          </div>
          <span className="text-sm font-semibold text-slate-200">
            AI 推演分析
          </span>
          {!isStreaming && confidence > 0 && (
            <span className="text-[11px] text-slate-500 bg-slate-800 rounded-full px-2 py-0.5">
              信心 {Math.round(confidence * 100)}%
            </span>
          )}
        </div>
        {(loading || isStreaming) && (
          <motion.div
            className="flex gap-1"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          </motion.div>
        )}
      </div>

      {/* Streaming text display */}
      {isStreaming && (
        <StreamingText text={streamingText || ""} phase={streamingPhase} />
      )}

      {/* Situation Assessment (static, after streaming) */}
      {!isStreaming && situation && (
        <motion.div
          className="px-5 py-3 border-b border-slate-800/50 bg-slate-900/50"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-xs text-slate-400 leading-relaxed">{situation}</p>
        </motion.div>
      )}

      {/* Options Grid */}
      {options && options.length > 0 && !isStreaming && (
        <div className="p-4">
          <div
            className={`grid gap-3 ${
              displayOptions.length === 2
                ? "grid-cols-2"
                : displayOptions.length === 3
                ? "grid-cols-3"
                : "grid-cols-2"
            }`}
          >
            <AnimatePresence>
              {displayOptions.map((opt, i) => {
                const isSelected = i === selectedIndex;
                const isExpanded = expandedOption === i;
                const actualIndex = showAllOptions
                  ? i
                  : options.indexOf(opt);

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.1 }}
                    className={`relative rounded-xl border transition-colors cursor-pointer overflow-hidden ${
                      isSelected
                        ? "border-cyan-500/50 bg-cyan-950/20 shadow-lg shadow-cyan-500/5"
                        : "border-slate-700/50 bg-slate-800/40 hover:border-slate-600/50"
                    }`}
                    onClick={() => {
                      setExpandedOption(isExpanded ? null : i);
                      onSelect(actualIndex);
                    }}
                  >
                    {/* Selected indicator */}
                    {isSelected && (
                      <motion.div
                        className="absolute top-2 right-2 w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </motion.div>
                    )}

                    <div className="p-3">
                      {/* Action type badge */}
                      <div className="flex items-center gap-1.5 mb-2">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            opt.action === "accept"
                              ? "bg-emerald-900/50 text-emerald-300"
                              : opt.action === "reject"
                              ? "bg-red-900/50 text-red-300"
                              : "bg-cyan-900/50 text-cyan-300"
                          }`}
                        >
                          {ACTION_LABELS[opt.action] || opt.action}
                        </span>
                      </div>

                      {/* Salary + Label */}
                      <div className="mb-2">
                        {opt.salary && (
                          <span className="text-xl font-bold text-white tabular-nums">
                            {opt.salary}K
                          </span>
                        )}
                        <p className="text-xs text-slate-400 mt-0.5">
                          {opt.label}
                        </p>
                      </div>

                      {/* Quick stats */}
                      <div className="space-y-1 mb-2">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-500">综合评分</span>
                          <span className="text-cyan-400 font-mono">
                            {opt.expected_utility.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-500">风险</span>
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium ${
                              RISK_COLORS[opt.risk_level] || ""
                            }`}
                          >
                            {opt.risk_level === "low"
                              ? "低"
                              : opt.risk_level === "medium"
                              ? "中"
                              : "高"}
                          </span>
                        </div>
                      </div>

                      {/* Expanded details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                          >
                            {/* Opponent Projections */}
                            {opt.opponent_projections &&
                              opt.opponent_projections.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-slate-700/50">
                                  <p className="text-[10px] text-slate-500 mb-1.5">
                                    HR 可能的回应
                                  </p>
                                  {opt.opponent_projections.map((p, j) => (
                                    <div
                                      key={j}
                                      className="flex items-center gap-2 text-[10px] mb-1"
                                    >
                                      <span className="text-slate-400">
                                        {ACTION_LABELS[p.action] || p.action}
                                      </span>
                                      <span className="text-slate-500 font-mono">
                                        {Math.round(p.probability * 100)}%
                                      </span>
                                      <span className="text-slate-500 truncate">
                                        {p.reasoning}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                            {/* Best/Worst */}
                            <div className="mt-2 pt-2 border-t border-slate-700/50 space-y-1">
                              <p className="text-[10px]">
                                <span className="text-emerald-500">最好：</span>
                                <span className="text-slate-400">
                                  {opt.best_case}
                                </span>
                              </p>
                              <p className="text-[10px]">
                                <span className="text-red-500">最坏：</span>
                                <span className="text-slate-400">
                                  {opt.worst_case}
                                </span>
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Custom option card */}
            {!showAllOptions && options.length > 3 && (
              <motion.div
                className="rounded-xl border border-dashed border-slate-700/30 bg-transparent flex items-center justify-center cursor-pointer hover:border-slate-600/50 transition-colors min-h-[120px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                onClick={() => setShowAllOptions(true)}
              >
                <span className="text-xs text-slate-600">+{options.length - 3} 更多选项</span>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* Action Bar */}
      {!isStreaming && options && options.length > 0 && (
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/80 flex items-center gap-3">
          <motion.button
            className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm transition-colors shadow-lg shadow-cyan-600/20"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(selectedIndex)}
          >
            采纳 AI 建议
          </motion.button>
          <motion.button
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onCustom}
          >
            自定义
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}
