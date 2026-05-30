"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTypewriter } from "../hooks/useTypewriter";
import PlayerIcon from "@/components/player-icon";

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface RoundAction {
  player: string;
  action_type: string;
  params: Record<string, unknown>;
  reasoning: string;
  round: number;
}

interface HRPersona {
  name: string;
  archetype: string;
  tagline: string;
  avatar_expression: string;
  avatar_color: string;
}

interface ChatBubblePanelProps {
  actions: RoundAction[];
  hrPersona: HRPersona | null;
  isThinking: boolean;
  hrPatience: number;
  streamingText?: string;
  streamingPhase?: "analyze" | "decide" | null;
}

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════

const ACTION_LABELS: Record<string, string> = {
  accept: "接受",
  reject: "拒绝",
  offer: "出价",
  counter_offer: "还价",
  evaluate: "评估",
  signal: "信号",
  wait: "等待",
};

const BUBBLE_COLORS: Record<string, string> = {
  accept: "bg-emerald-600/20 border-emerald-600/30 text-emerald-200",
  reject: "bg-red-900/30 border-red-700/40 text-red-200",
  counter_offer: "bg-cyan-600/20 border-cyan-600/30 text-cyan-200",
  offer: "bg-cyan-600/20 border-cyan-600/30 text-cyan-200",
  evaluate: "bg-purple-900/30 border-purple-700/40 text-purple-200",
  signal: "bg-amber-900/30 border-amber-700/40 text-amber-200",
};

const BADGE_COLORS: Record<string, string> = {
  accept: "bg-emerald-700/60 text-emerald-200",
  reject: "bg-red-700/60 text-red-200",
  counter_offer: "bg-cyan-700/60 text-cyan-200",
  offer: "bg-cyan-700/60 text-cyan-200",
  evaluate: "bg-purple-700/60 text-purple-200",
  signal: "bg-amber-700/60 text-amber-200",
};

const INTENT_META: Record<string, { label: string; tone: "ai" | "strategy" | "risk"; hint: string }> = {
  accept: { label: "检测意图: 成交", tone: "strategy", hint: "锁定报价" },
  reject: { label: "风险信号: 破局", tone: "risk", hint: "谈判窗口收窄" },
  offer: { label: "提取指标: 首轮锚定", tone: "ai", hint: "建立价格参照" },
  counter_offer: { label: "检测意图: 拉锯", tone: "strategy", hint: "测试对方底线" },
  evaluate: { label: "AI 评估: 候选人画像", tone: "ai", hint: "更新信念" },
  signal: { label: "市场信号: 外部压力", tone: "ai", hint: "影响议价权" },
  wait: { label: "策略建议: 暂缓", tone: "strategy", hint: "保留筹码" },
};

function getSalaryFromAction(a: RoundAction): string {
  const s =
    a.params?.salary_offer ||
    a.params?.salary_ask ||
    a.params?.salary_amount ||
    a.params?.accepted_salary;
  return s ? ` ${s}K` : "";
}

function formatActionText(a: RoundAction): string {
  const action = ACTION_LABELS[a.action_type] || a.action_type;
  const salary = getSalaryFromAction(a);
  return ` ${action}${salary}`;
}

function getIntentMeta(a: RoundAction) {
  const meta = INTENT_META[a.action_type] || { label: "AI 拦截: 行为识别", tone: "ai" as const, hint: "分析谈判动作" };
  if (a.player === "hr" && (a.action_type === "offer" || a.action_type === "counter_offer")) {
    return { label: "检测意图: 压价试探", tone: "risk" as const, hint: "关注让步空间" };
  }
  return meta;
}

function intentClass(tone: "ai" | "strategy" | "risk") {
  if (tone === "strategy") return "strategy-chip";
  if (tone === "risk") return "border border-[var(--state-danger)]/25 bg-[rgba(251,113,133,0.10)] text-[var(--state-danger)] shadow-[0_0_18px_rgba(251,113,133,0.08)]";
  return "ai-chip";
}

function extractEvidenceTokens(action: RoundAction, reasoning: string) {
  const text = `${reasoning} ${Object.values(action.params || {}).join(" ")}`.toLowerCase();
  const tokens: string[] = [];
  const add = (label: string) => {
    if (!tokens.includes(label)) tokens.push(label);
  };

  if (/budget|预算|成本|ceiling|上限/.test(text)) add("预算约束");
  if (/market|市场|supply|demand|供需|竞争/.test(text)) add("市场压力");
  if (/skill|技能|experience|经验|能力|fit|匹配/.test(text)) add("能力匹配");
  if (/risk|风险|stability|稳定|trust|信任/.test(text)) add("信任风险");
  if (/offer|报价|薪资|salary|compensation|package/.test(text)) add("报价锚点");
  if (/patience|耐心|round|回合/.test(text)) add("时间压力");
  if (tokens.length === 0) {
    if (action.player === "hr") add("HR话术");
    else add("候选策略");
  }
  return tokens.slice(0, 3);
}

function buildEvidenceChain(action: RoundAction, reasoning: string) {
  const intent = getIntentMeta(action);
  const evidence = extractEvidenceTokens(action, reasoning);
  const suggestion = action.player === "hr"
    ? action.action_type === "offer" || action.action_type === "counter_offer"
      ? "先验证对方预算，再决定是否让步"
      : action.action_type === "reject"
      ? "降低破局风险，改用稳健信息牌"
      : "观察HR信号，保留关键筹码"
    : action.action_type === "offer" || action.action_type === "counter_offer"
    ? "用报价建立锚点，并准备证据支撑"
    : action.action_type === "accept"
    ? "确认成交收益，进入复盘"
    : "控制节奏，避免过早暴露底线";

  return { evidence, inference: intent.label.replace(/^(检测意图|提取指标|风险信号|AI 评估|市场信号|策略建议|AI 拦截):\s*/, ""), suggestion };
}

// ═══════════════════════════════════════════════════════════════
// HR Mood System
// ═══════════════════════════════════════════════════════════════

type HRMood = {
  emoji: string;
  label: string;
  color: string;
};

function getHRMood(
  archetype: string,
  patience: number,
  lastActionType?: string
): HRMood {
  // Action-based mood override
  if (lastActionType === "accept") {
    if (archetype === "hard_ass") return { emoji: "😤", label: "勉强接受", color: "text-emerald-400" };
    if (archetype === "anxious") return { emoji: "😅", label: "松了口气", color: "text-emerald-400" };
    return { emoji: "😏", label: "成交", color: "text-emerald-400" };
  }
  if (lastActionType === "reject") {
    return { emoji: "😠", label: "拒绝", color: "text-red-400" };
  }

  // Patience-based mood
  if (patience < 0.2) {
    return { emoji: "😠", label: "即将爆发", color: "text-red-400" };
  }
  if (patience < 0.4) {
    if (archetype === "hard_ass") return { emoji: "😒", label: "不耐烦", color: "text-orange-400" };
    if (archetype === "anxious") return { emoji: "😰", label: "焦虑", color: "text-orange-400" };
    if (archetype === "old_fox") return { emoji: "🤨", label: "评估中", color: "text-orange-400" };
    return { emoji: "😐", label: "冷淡", color: "text-orange-400" };
  }
  if (patience < 0.6) {
    if (archetype === "old_fox") return { emoji: "🧐", label: "盘算中", color: "text-amber-400" };
    return { emoji: "🤔", label: "犹豫", color: "text-amber-400" };
  }
  if (patience < 0.8) {
    if (archetype === "anxious") return { emoji: "😊", label: "积极", color: "text-cyan-400" };
    if (archetype === "hard_ass") return { emoji: "🙂", label: "尚可", color: "text-cyan-400" };
    return { emoji: "😏", label: "从容", color: "text-cyan-400" };
  }
  // patience >= 0.8
  if (archetype === "hard_ass") return { emoji: "😐", label: "待价而沽", color: "text-emerald-400" };
  if (archetype === "anxious") return { emoji: "🤗", label: "热情", color: "text-emerald-400" };
  if (archetype === "old_fox") return { emoji: "😎", label: "稳操胜券", color: "text-emerald-400" };
  return { emoji: "😊", label: "友好", color: "text-emerald-400" };
}

function getHRMoodFromActions(
  archetype: string,
  patience: number,
  actions: RoundAction[]
): HRMood {
  // Find the last HR action to determine mood
  for (let i = actions.length - 1; i >= 0; i--) {
    if (actions[i].player === "hr") {
      return getHRMood(archetype, patience, actions[i].action_type);
    }
  }
  return getHRMood(archetype, patience);
}


function getExpression(persona: HRPersona, patience: number, lastActionType?: string): string {
  return getHRMood(persona.archetype, patience, lastActionType).emoji;
}

// ═══════════════════════════════════════════════════════════════
// ThinkingIndicator — pulsing dots
// ═══════════════════════════════════════════════════════════════

const HR_THINKING_PHASES = [
  "评估你的锚点",
  "检查预算约束",
  "预测你的底线",
  "生成 HR 回应",
];

function ThinkingIndicator({ text }: { text?: string }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      {/* HR Avatar column */}
      <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-base shrink-0">
        🤔
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-purple-300">HR</span>
          <span className="text-[10px] text-slate-600">思考中</span>
        </div>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {HR_THINKING_PHASES.map((phase, i) => (
            <div key={phase} className="flex items-center gap-1.5 rounded-full border border-purple-400/10 bg-purple-950/20 px-2 py-1">
              <motion.span
                className="h-1.5 w-1.5 rounded-full bg-purple-400"
                animate={{ opacity: [0.25, 1, 0.25] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18 }}
              />
              <span className="text-[10px] text-slate-500">{phase}</span>
            </div>
          ))}
        </div>
        {text && (
          <p className="text-[11px] text-slate-500 italic mt-1">{text}</p>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// StreamingBubble — shows live LLM text as a draft HR bubble
// ═══════════════════════════════════════════════════════════════

function StreamingBubble({
  text,
  phase,
}: {
  text: string;
  phase: "analyze" | "decide" | null | undefined;
}) {
  const phaseLabel =
    phase === "analyze"
      ? "HR 正在评估锚点与约束…"
      : phase === "decide"
      ? "HR 正在生成回应策略…"
      : "HR 正在思考…";

  return (
    <motion.div
      className="flex items-start gap-3 px-4 py-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* HR Avatar column */}
      <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-base shrink-0">
        🧠
      </div>
      <div className="flex flex-col gap-1 max-w-[75%]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-purple-300">HR</span>
          <span className="text-[10px] text-purple-400/70 bg-purple-950/40 rounded-full px-2 py-0.5">
            {phaseLabel}
          </span>
        </div>
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl rounded-tl-sm px-4 py-2.5">
          <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">
            {text}
            <motion.span
              className="inline-block w-1.5 h-3.5 bg-cyan-400 ml-0.5 align-middle"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ChatBubbleMessage — single bubble for one action
// ═══════════════════════════════════════════════════════════════

function ChatBubbleMessage({
  action,
  hrPersona,
  hrPatience = 1.0,
  useTypewriterEffect = false,
  typewriterTrigger = 0,
}: {
  action: RoundAction;
  hrPersona: HRPersona | null;
  hrPatience?: number;
  useTypewriterEffect?: boolean;
  typewriterTrigger?: number;
}) {
  const isCandidate = action.player === "candidate";
  const reasoning = action.reasoning || "";
  const typewriterReasoning = useTypewriter(reasoning, 25, typewriterTrigger);
  const displayedReasoning = useTypewriterEffect
    ? typewriterReasoning
    : reasoning;
  const isTyping = useTypewriterEffect && displayedReasoning.length < reasoning.length;

  const bubbleColor = BUBBLE_COLORS[action.action_type] || "bg-slate-700/40 border-slate-600/30 text-slate-200";
  const badgeColor = BADGE_COLORS[action.action_type] || "bg-slate-700/60 text-slate-300";
  const actionText = formatActionText(action);
  const salary = getSalaryFromAction(action);
  const intent = getIntentMeta(action);
  const evidenceChain = buildEvidenceChain(action, reasoning);

  // HR mood for this message
  const mood = !isCandidate && hrPersona
    ? getHRMood(hrPersona.archetype, hrPatience, action.action_type)
    : null;

  return (
    <motion.div
      className={`flex items-start gap-3 px-4 py-2 ${isCandidate ? "flex-row-reverse" : ""}`}
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {/* Avatar column */}
      {isCandidate ? (
        <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
          <PlayerIcon player="candidate" size={20} />
        </div>
      ) : (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xl shrink-0 relative"
          style={{
            backgroundColor: hrPersona?.avatar_color
              ? `${hrPersona.avatar_color}20`
              : "rgba(168,85,247,0.2)",
            borderColor: hrPersona?.avatar_color
              ? `${hrPersona.avatar_color}40`
              : "rgba(168,85,247,0.3)",
            borderWidth: 1,
          }}
        >
          {hrPersona ? getExpression(hrPersona, hrPatience, action.action_type) : "🤖"}
          {/* Mood indicator dot */}
          {mood && (
            <motion.div
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-slate-900"
              style={{
                backgroundColor: mood.color === "text-red-400" ? "#f87171"
                  : mood.color === "text-orange-400" ? "#fb923c"
                  : mood.color === "text-amber-400" ? "#fbbf24"
                  : mood.color === "text-cyan-400" ? "#22d3ee"
                  : mood.color === "text-emerald-400" ? "#34d399"
                  : "#94a3b8",
              }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </div>
      )}

      {/* Bubble */}
      <div className={`flex flex-col gap-1.5 ${isCandidate ? "items-end" : "items-start"} max-w-[74%]`}>
        {/* Sender name + mood + action badge */}
        <div className={`flex items-center gap-2 ${isCandidate ? "flex-row-reverse" : ""} flex-wrap`}>
          <span className="text-[11px] font-medium text-slate-400">
            {isCandidate ? "你" : hrPersona?.name || "HR"}
          </span>
          {/* Mood label on HR messages */}
          {mood && (
            <span className={`text-[9px] ${mood.color} bg-slate-800/80 rounded-full px-1.5 py-0.5`}>
              {mood.emoji} {mood.label}
            </span>
          )}
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badgeColor}`}
          >
            {actionText.trim()}
            {salary && (
              <span className="text-[10px] font-mono ml-1 opacity-80">
                {salary}
              </span>
            )}
          </span>
        </div>

        {/* Message body */}
        {reasoning && (
          <div
            className={`relative overflow-hidden rounded-2xl px-4 py-2.5 border ${bubbleColor} ${
              isCandidate ? "rounded-tr-sm" : "rounded-tl-sm"
            }`}
          >
            <div className="pointer-events-none absolute inset-0 scanline-soft opacity-20" />
            <p className="text-xs leading-relaxed whitespace-pre-wrap">
              {displayedReasoning}
              {isTyping && (
                <motion.span
                  className="inline-block w-1 h-3.5 bg-current ml-0.5 align-middle opacity-60"
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.7, repeat: Infinity }}
                />
              )}
            </p>
          </div>
        )}

        <div className={`flex flex-wrap gap-1.5 ${isCandidate ? "justify-end" : "justify-start"}`}>
          <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${intentClass(intent.tone)}`}>
            {intent.label}
          </span>
          <span className="rounded-full border border-[var(--border-hairline)] bg-[var(--bg-canvas)]/55 px-2 py-0.5 text-[9px] text-[var(--text-tertiary)]">
            {intent.hint}
          </span>
        </div>

        {reasoning && (
          <div className={`max-w-full text-[9px] leading-relaxed text-[var(--text-tertiary)] ${isCandidate ? "text-right" : "text-left"}`}>
            <span className="text-[var(--accent-cyan)]">AI</span>
            <span> 依据 {evidenceChain.evidence.join(" / ")}，判断为 </span>
            <b className="font-semibold text-[var(--text-secondary)]">{evidenceChain.inference}</b>
            <span>，建议 </span>
            <b className="font-semibold text-[var(--accent-ali)]">{evidenceChain.suggestion}</b>
          </div>
        )}

        {/* Round indicator */}
        <span className="text-[10px] text-slate-600 px-1">
          第 {action.round + 1} 轮
        </span>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ChatBubblePanel — main component
// ═══════════════════════════════════════════════════════════════

export default function ChatBubblePanel({
  actions,
  hrPersona,
  isThinking,
  hrPatience,
  streamingText,
  streamingPhase,
}: ChatBubblePanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  // Auto-scroll when new actions arrive or streaming text updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [actions.length, streamingText, isThinking]);

  const visibleActions = useMemo(
    () => actions.filter((a) => a.player === "candidate" || a.player === "hr"),
    [actions]
  );

  // Track when a new HR action is added (to trigger typewriter on the last one)
  const needsTypewriter = visibleActions.length > 0;

  // Current HR mood (based on last action + patience)
  const currentMood = hrPersona
    ? getHRMoodFromActions(hrPersona.archetype, hrPatience, visibleActions)
    : null;

  const patiencePct = Math.round(hrPatience * 100);
  const patienceColor =
    hrPatience >= 0.7 ? "bg-emerald-500"
    : hrPatience >= 0.4 ? "bg-amber-500"
    : hrPatience >= 0.2 ? "bg-orange-500"
    : "bg-red-500";

  return (
    <div className="surface-raised overflow-hidden rounded-3xl">
      {/* HR Profile Header */}
      {hrPersona && (
        <div className="relative border-b border-[var(--border-hairline)] bg-[var(--bg-elev)]/70 px-4 py-3">
          <div className="pointer-events-none absolute inset-0 micro-grid opacity-25" />
          <div className="flex items-center gap-3">
            {/* HR Avatar */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0 border-2"
              style={{
                backgroundColor: hrPersona.avatar_color
                  ? `${hrPersona.avatar_color}25`
                  : "rgba(168,85,247,0.2)",
                borderColor: hrPersona.avatar_color
                  ? `${hrPersona.avatar_color}50`
                  : "rgba(168,85,247,0.3)",
              }}
            >
              {getExpression(hrPersona, hrPatience)}
            </div>

            {/* Name + tagline + mood */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white truncate">
                  {hrPersona.name}
                </span>
                <span className="text-[10px] text-slate-500 bg-slate-800 rounded-full px-2 py-0.5 shrink-0">
                  HR
                </span>
                {currentMood && (
                  <span className={`text-[10px] ${currentMood.color} bg-slate-800/80 rounded-full px-2 py-0.5 shrink-0`}>
                    {currentMood.emoji} {currentMood.label}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                {hrPersona.tagline}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <span className="ai-chip rounded-full px-2 py-0.5 text-[9px] font-bold">AI 实时拦截已开启</span>
                <span className="strategy-chip rounded-full px-2 py-0.5 text-[9px] font-bold">谈判心理挖掘</span>
              </div>
            </div>

            {/* Patience bar */}
            <div className="flex flex-col items-end gap-1 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500">耐心</span>
                <span className="text-[11px] font-mono text-slate-300 tabular-nums">
                  {patiencePct}%
                </span>
              </div>
              <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${patienceColor}`}
                  initial={{ width: "100%" }}
                  animate={{ width: `${patiencePct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* Thinking badge */}
            {isThinking && (
              <div className="flex gap-0.5">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1 h-3 rounded-full bg-purple-400"
                    animate={{ opacity: [0.2, 1, 0.2] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="relative max-h-[420px] overflow-y-auto py-1">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-[var(--bg-panel)] to-transparent z-10" />
        {visibleActions.length === 0 && !isThinking && (
          <div className="text-center py-8">
            <p className="text-xs text-slate-600">等待谈判开始…</p>
          </div>
        )}

        <RoundGroupedMessages
          actions={visibleActions}
          hrPersona={hrPersona}
          hrPatience={hrPatience}
          isThinking={isThinking}
          needsTypewriter={needsTypewriter && !isThinking}
          typewriterTrigger={visibleActions.length}
        />

        {/* Streaming bubble — show live LLM output */}
        {isThinking && streamingText && (
          <StreamingBubble text={streamingText} phase={streamingPhase} />
        )}

        {/* Thinking dots (before streaming text arrives) */}
        {isThinking && !streamingText && (
          <ThinkingIndicator text="HR 正在分析你的报价…" />
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// RoundGroupedMessages — groups actions by round, collapses past rounds
// ═══════════════════════════════════════════════════════════════

function RoundGroupedMessages({
  actions,
  hrPersona,
  hrPatience,
  isThinking,
  needsTypewriter,
  typewriterTrigger,
}: {
  actions: RoundAction[];
  hrPersona: HRPersona | null;
  hrPatience: number;
  isThinking: boolean;
  needsTypewriter: boolean;
  typewriterTrigger: number;
}) {
  const [collapsedRounds, setCollapsedRounds] = useState<Set<number>>(new Set());
  const prevRoundRef = useRef<number>(-1);

  // Group actions by round, oldest first
  const roundGroups = useMemo(() => {
    const groups = new Map<number, RoundAction[]>();
    for (const a of actions) {
      if (!groups.has(a.round)) groups.set(a.round, []);
      groups.get(a.round)!.push(a);
    }
    return Array.from(groups.entries())
      .sort(([a], [b]) => a - b)
      .map(([round, acts]) => ({ round, actions: acts }));
  }, [actions]);

  const currentRound = actions.length > 0 ? actions[actions.length - 1].round : 0;

  // Auto-collapse past rounds on round transition
  useEffect(() => {
    if (currentRound < 0) return;
    if (prevRoundRef.current >= 0 && currentRound !== prevRoundRef.current) {
      setCollapsedRounds(prev => {
        const next = new Set(prev);
        next.add(prevRoundRef.current);
        return next;
      });
    }
    prevRoundRef.current = currentRound;
  }, [currentRound]);

  const toggleRound = (round: number) => {
    setCollapsedRounds(prev => {
      const next = new Set(prev);
      if (next.has(round)) next.delete(round);
      else next.add(round);
      return next;
    });
  };

  return (
    <AnimatePresence initial={false}>
      {roundGroups.map((group) => {
        const isCurrent = group.round === currentRound;
        const isCollapsed = collapsedRounds.has(group.round) && !isCurrent;

        return (
          <RoundSection
            key={`round-${group.round}`}
            group={group}
            isCollapsed={isCollapsed}
            isCurrent={isCurrent}
            onToggle={() => toggleRound(group.round)}
            hrPersona={hrPersona}
            hrPatience={hrPatience}
            isThinking={isThinking}
            needsTypewriter={needsTypewriter}
            typewriterTrigger={typewriterTrigger}
          />
        );
      })}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════
// RoundSection — one round, expandable
// ═══════════════════════════════════════════════════════════════

function generateRoundSummary(group: {
  round: number;
  actions: RoundAction[];
}): string {
  const acts = group.actions;
  let summary = `第${group.round + 1}轮`;

  // Find candidate action with salary
  const candAct = acts.find(a => a.player === "candidate");
  const hrAct = acts.find(a => a.player === "hr");
  const candSalary =
    candAct?.params?.salary_ask ??
    candAct?.params?.salary_amount ??
    null;
  const hrSalary =
    hrAct?.params?.salary_offer ??
    hrAct?.params?.salary_amount ??
    hrAct?.params?.accepted_salary ??
    null;

  if (candAct?.action_type === "accept") {
    summary += ` · 你接受${candSalary ? ` ${candSalary}K` : ""}`;
  } else if (candAct?.action_type === "reject") {
    summary += " · 你拒绝";
  } else if (candAct?.action_type === "offer" || candAct?.action_type === "counter_offer") {
    summary += ` 你要价 ${candSalary}K`;
  }

  if (hrAct?.action_type === "accept") {
    summary += ` → HR接受`;
  } else if (hrAct?.action_type === "reject") {
    summary += " → HR拒绝";
  } else if (hrAct?.action_type === "offer" || hrAct?.action_type === "counter_offer") {
    if (hrSalary) summary += ` → HR出价 ${hrSalary}K`;
  }

  return summary;
}

function RoundSection({
  group,
  isCollapsed,
  isCurrent,
  onToggle,
  hrPersona,
  hrPatience,
  needsTypewriter,
  typewriterTrigger,
}: {
  group: { round: number; actions: RoundAction[] };
  isCollapsed: boolean;
  isCurrent: boolean;
  onToggle: () => void;
  hrPersona: HRPersona | null;
  hrPatience: number;
  isThinking: boolean;
  needsTypewriter: boolean;
  typewriterTrigger: number;
}) {
  const summary = generateRoundSummary(group);
  const msgCount = group.actions.length;

  // Collapsed header
  if (isCollapsed) {
    // Count salary numbers for preview
    const salaries = group.actions
      .map(a => a.params?.salary_offer ?? a.params?.salary_ask ?? a.params?.salary_amount ?? null)
      .filter(Boolean) as number[];
    const minSal = salaries.length > 0 ? Math.min(...salaries) : null;
    const maxSal = salaries.length > 0 ? Math.max(...salaries) : null;

    return (
      <motion.button
        className="w-full flex items-center gap-2 px-4 py-2 hover:bg-slate-800/30 transition-colors text-left border-b border-slate-800/20 last:border-b-0"
        onClick={onToggle}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ height: 0, opacity: 0, padding: 0 }}
        transition={{ duration: 0.25 }}
      >
        <motion.div
          animate={{ rotate: 0 }}
          className="text-[10px] text-slate-600 shrink-0"
        >
          ▶
        </motion.div>
        <span className="text-[11px] text-slate-500 font-medium shrink-0">
          第{group.round + 1}轮
        </span>
        {/* Mini salary preview */}
        {minSal !== null && maxSal !== null && (
          <span className="text-[10px] text-slate-600 font-mono">
            {minSal === maxSal ? `${minSal}K` : `${minSal}K–${maxSal}K`}
          </span>
        )}
        {/* Quick action tags */}
        <div className="flex gap-1 ml-auto">
          {group.actions
            .filter(a => a.action_type !== "evaluate" && a.action_type !== "signal")
            .slice(-2)
            .map((a, i) => {
              const colors: Record<string, string> = {
                accept: "bg-emerald-700/40 text-emerald-300",
                reject: "bg-red-700/40 text-red-300",
                counter_offer: "bg-cyan-700/40 text-cyan-300",
                offer: "bg-cyan-700/40 text-cyan-300",
              };
              return (
                <span
                  key={i}
                  className={`text-[9px] px-1.5 py-0.5 rounded-full ${colors[a.action_type] || "bg-slate-700/40 text-slate-400"}`}
                >
                  {ACTION_LABELS[a.action_type] || a.action_type}
                </span>
              );
            })}
        </div>
        <span className="text-[9px] text-slate-600">{msgCount}条</span>
      </motion.button>
    );
  }

  // Expanded round
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ height: 0, opacity: 0, overflow: "hidden" }}
      transition={{ duration: 0.25 }}
    >
      {/* Round header */}
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-slate-800/20">
        <button
          onClick={onToggle}
          className="flex items-center gap-1.5 text-[10px] text-slate-600 hover:text-slate-400 transition-colors"
        >
          <motion.span
            animate={{ rotate: 0 }}
            className="inline-block"
          >
            ▼
          </motion.span>
          {isCurrent ? (
            <span className="text-cyan-500 font-medium">当前回合</span>
          ) : (
            <span>第{group.round + 1}轮</span>
          )}
        </button>
        {summary && !isCurrent && (
          <span className="text-[9px] text-slate-600 truncate ml-2">
            {summary}
          </span>
        )}
      </div>

      {/* Messages in this round */}
      {group.actions.map((a, i) => {
        // Typewriter only on HR's most recent message (always in the current round)
        const isHRLastMsg = a.player === "hr" && isCurrent;
        return (
          <ChatBubbleMessage
            key={`${a.round}-${a.player}-${a.action_type}-${i}`}
            action={a}
            hrPersona={hrPersona}
            hrPatience={hrPatience}
            useTypewriterEffect={isHRLastMsg && needsTypewriter}
            typewriterTrigger={typewriterTrigger}
          />
        );
      })}
    </motion.div>
  );
}
