"use client";

import { motion } from "framer-motion";

interface HRPersona {
  name: string;
  archetype: string;
  tagline: string;
  avatar_expression: string;
  avatar_color: string;
  greeting?: string;
  tone_style?: string;
}

interface HRAvatarProps {
  persona: HRPersona;
  patience: number;
  message?: string;
  isThinking?: boolean;
}

const ARCHETYPE_CONFIG: Record<string, { label: string; icon: string; color: string; bgGradient: string }> = {
  hard_ass: {
    label: "铁面判官",
    icon: "🛡️",
    color: "#fb7185",
    bgGradient: "linear-gradient(135deg, #1a0a10, #150810)",
  },
  anxious: {
    label: "焦虑招募",
    icon: "😰",
    color: "#fbbf24",
    bgGradient: "linear-gradient(135deg, #1a150a, #151008)",
  },
  old_fox: {
    label: "老狐狸",
    icon: "🦊",
    color: "#c084fc",
    bgGradient: "linear-gradient(135deg, #150a1a, #100815)",
  },
  professional: {
    label: "职业精英",
    icon: "💼",
    color: "#60a5fa",
    bgGradient: "linear-gradient(135deg, #0a101a, #081015)",
  },
};

function getExpression(archetype: string, patience: number): string {
  if (archetype === "hard_ass") return "😐";
  if (archetype === "anxious") {
    if (patience < 0.3) return "😰";
    if (patience < 0.5) return "😟";
    return "😊";
  }
  if (archetype === "old_fox") {
    if (patience < 0.2) return "😒";
    return "😏";
  }
  if (patience < 0.3) return "😐";
  if (patience < 0.6) return "🙂";
  return "😊";
}

function getPatienceColor(patience: number): string {
  if (patience >= 0.7) return "#34d399";
  if (patience >= 0.4) return "#fbbf24";
  if (patience >= 0.2) return "#fb923c";
  return "#fb7185";
}

function getPatienceLabel(patience: number): string {
  if (patience >= 0.7) return "从容";
  if (patience >= 0.4) return "犹豫";
  if (patience >= 0.2) return "不耐烦";
  return "即将爆发";
}

export default function HRAvatar({
  persona,
  patience,
  message,
  isThinking = false,
}: HRAvatarProps) {
  const patienceColor = getPatienceColor(patience);
  const patiencePct = Math.round(patience * 100);
  const dashArray = 283;
  const dashOffset = dashArray * (1 - patience);
  const config = ARCHETYPE_CONFIG[persona.archetype] || ARCHETYPE_CONFIG.professional;
  const expression = getExpression(persona.archetype, patience);

  return (
    <motion.div
      className="relative overflow-hidden rounded-xl border border-[var(--border-hairline)]"
      style={{ background: config.bgGradient }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(circle at 30% 20%, ${config.color}30, transparent 60%)`,
        }}
      />

      <div className="relative z-10 p-4 flex flex-col items-center gap-3">
        <div className="relative">
          <svg
            className="absolute inset-0 -rotate-90"
            viewBox="0 0 100 100"
            style={{ width: 104, height: 104, margin: -10 }}
          >
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="2.5"
            />
            <motion.circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={patienceColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={dashArray}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{
                filter: `drop-shadow(0 0 8px ${patienceColor}60)`,
              }}
            />
          </svg>

          <motion.div
            className="w-20 h-20 rounded-full flex items-center justify-center text-3xl select-none border-2"
            style={{
              backgroundColor: `${config.color}15`,
              borderColor: `${config.color}40`,
            }}
            animate={
              isThinking
                ? {
                    borderColor: [`${config.color}40`, config.color, `${config.color}40`],
                    scale: [1, 1.03, 1],
                  }
                : {}
            }
            transition={
              isThinking
                ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                : {}
            }
          >
            {expression}
          </motion.div>

          {isThinking && (
            <motion.div
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1 h-1 rounded-full"
                  style={{ backgroundColor: config.color }}
                  animate={{ opacity: [0.2, 1, 0.2], y: [0, -2, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </motion.div>
          )}
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm font-bold text-[var(--text-primary)]">
              {persona.name}
            </span>
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
              style={{ color: config.color, backgroundColor: `${config.color}15` }}>
              {config.icon} {config.label}
            </span>
          </div>
          <p className="text-[10px] text-[var(--text-tertiary)] mt-1.5 max-w-[160px] leading-relaxed">
            {persona.tagline}
          </p>
        </div>

        <div className="w-full">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] text-[var(--text-tertiary)] flex items-center gap-1">
              ❤️ 耐心值
            </span>
            <span className="text-[10px] font-mono font-bold tabular-nums"
              style={{ color: patienceColor }}>
              {patiencePct}%
            </span>
          </div>
          <div className="w-full h-2 bg-[var(--bg-elev)] rounded-full overflow-hidden border border-[var(--border-hairline)]">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, ${patienceColor}88, ${patienceColor})`,
                boxShadow: `0 0 8px ${patienceColor}40`,
              }}
              initial={{ width: "100%" }}
              animate={{ width: `${patiencePct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[9px]" style={{ color: patienceColor }}>
              {getPatienceLabel(patience)}
            </span>
            {patience < 0.3 && (
              <motion.span
                className="text-[9px] text-[var(--state-danger)] font-bold"
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                ⚠️ 危险
              </motion.span>
            )}
          </div>
        </div>

        {message && (
          <motion.div
            className="w-full bg-[var(--bg-elev)] border border-[var(--border-hairline)] rounded-lg px-3 py-2 text-[11px] text-[var(--text-secondary)] leading-relaxed relative"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {message}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
