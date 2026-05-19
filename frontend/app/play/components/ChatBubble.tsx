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

const PLAYER_LABELS: Record<string, string> = {
  candidate: "你",
  hr: "HR",
  interviewer: "面试官",
  market: "市场",
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

function ThinkingIndicator({ text }: { text?: string }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      {/* HR Avatar column */}
      <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-base shrink-0">
        🤔
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-purple-300">HR</span>
          <span className="text-[10px] text-slate-600">思考中</span>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-purple-400"
              animate={{ opacity: [0.2, 1, 0.2], y: [0, -3, 0] }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut",
              }}
            />
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
      ? "HR 正在分析局势…"
      : phase === "decide"
      ? "HR 正在做决策…"
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
  const displayedReasoning = useTypewriterEffect
    ? useTypewriter(reasoning, 25, typewriterTrigger)
    : reasoning;
  const isTyping = useTypewriterEffect && displayedReasoning.length < reasoning.length;

  const bubbleColor = BUBBLE_COLORS[action.action_type] || "bg-slate-700/40 border-slate-600/30 text-slate-200";
  const badgeColor = BADGE_COLORS[action.action_type] || "bg-slate-700/60 text-slate-300";
  const actionText = formatActionText(action);
  const salary = getSalaryFromAction(action);

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
      <div className={`flex flex-col gap-1 ${isCandidate ? "items-end" : "items-start"} max-w-[70%]`}>
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
            className={`rounded-2xl px-4 py-2.5 border ${bubbleColor} ${
              isCandidate ? "rounded-tr-sm" : "rounded-tl-sm"
            }`}
          >
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
  const [prevActionCount, setPrevActionCount] = useState(0);

  // Auto-scroll when new actions arrive or streaming text updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [actions.length, streamingText, isThinking]);

  // Track when a new HR action is added (to trigger typewriter on the last one)
  const needsTypewriter = actions.length > prevActionCount;
  if (actions.length > prevActionCount) {
    setPrevActionCount(actions.length);
  }

  const hrActions = actions.filter((a) => a.player === "hr");
  const lastHrActionIdx =
    hrActions.length > 0
      ? actions.indexOf(hrActions[hrActions.length - 1])
      : -1;

  // Current HR mood (based on last action + patience)
  const currentMood = hrPersona
    ? getHRMoodFromActions(hrPersona.archetype, hrPatience, actions)
    : null;

  const patiencePct = Math.round(hrPatience * 100);
  const patienceColor =
    hrPatience >= 0.7 ? "bg-emerald-500"
    : hrPatience >= 0.4 ? "bg-amber-500"
    : hrPatience >= 0.2 ? "bg-orange-500"
    : "bg-red-500";

  return (
    <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl overflow-hidden">
      {/* HR Profile Header */}
      {hrPersona && (
        <div className="px-4 py-3 border-b border-slate-800/60 bg-slate-900/90">
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
      <div className="max-h-[420px] overflow-y-auto py-1">
        {actions.length === 0 && !isThinking && (
          <div className="text-center py-8">
            <p className="text-xs text-slate-600">等待谈判开始…</p>
          </div>
        )}

        <RoundGroupedMessages
          actions={actions}
          hrPersona={hrPersona}
          hrPatience={hrPatience}
          isThinking={isThinking}
          needsTypewriter={needsTypewriter && !isThinking}
          typewriterTrigger={actions.length}
          lastHrActionIdx={lastHrActionIdx}
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
  lastHrActionIdx,
}: {
  actions: RoundAction[];
  hrPersona: HRPersona | null;
  hrPatience: number;
  isThinking: boolean;
  needsTypewriter: boolean;
  typewriterTrigger: number;
  lastHrActionIdx: number;
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
