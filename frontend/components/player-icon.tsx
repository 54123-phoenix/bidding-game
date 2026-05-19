"use client";

import { motion } from "framer-motion";

type Player = "candidate" | "hr" | "interviewer" | "market";

const CONFIG: Record<Player, { bg: string; ring: string; face: string; emoji: string; label: string }> = {
  candidate: {
    bg: "bg-blue-500",
    ring: "ring-blue-400/40",
    face: "text-white",
    emoji: "",
    label: "候选人",
  },
  hr: {
    bg: "bg-purple-500",
    ring: "ring-purple-400/40",
    face: "text-white",
    emoji: "",
    label: "HR",
  },
  interviewer: {
    bg: "bg-amber-500",
    ring: "ring-amber-400/40",
    face: "text-white",
    emoji: "",
    label: "面试官",
  },
  market: {
    bg: "bg-emerald-500",
    ring: "ring-emerald-400/40",
    face: "text-white",
    emoji: "",
    label: "市场",
  },
};

function QFace({ player, size = 48 }: { player: Player; size?: number }) {
  const cfg = CONFIG[player];
  const s = size;
  const eyeR = s * 0.065;
  const eyeY = s * 0.38;
  const mouthY = s * 0.6;

  // Different expressions per player
  const expressions: Record<Player, { leftEyeX: number; rightEyeX: number; mouth: React.ReactNode }> = {
    candidate: {
      leftEyeX: s * 0.38,
      rightEyeX: s * 0.62,
      mouth: <path d={`M${s * 0.38},${mouthY} Q${s * 0.5},${mouthY + s * 0.1} ${s * 0.62},${mouthY}`} fill="none" stroke="white" strokeWidth={s * 0.04} strokeLinecap="round" />,
    },
    hr: {
      leftEyeX: s * 0.38,
      rightEyeX: s * 0.62,
      mouth: <line x1={s * 0.4} y1={mouthY} x2={s * 0.6} y2={mouthY} stroke="white" strokeWidth={s * 0.04} strokeLinecap="round" />,
    },
    interviewer: {
      leftEyeX: s * 0.38,
      rightEyeX: s * 0.62,
      mouth: <path d={`M${s * 0.38},${mouthY} Q${s * 0.5},${mouthY - s * 0.08} ${s * 0.62},${mouthY}`} fill="none" stroke="white" strokeWidth={s * 0.04} strokeLinecap="round" />,
    },
    market: {
      leftEyeX: s * 0.38,
      rightEyeX: s * 0.62,
      mouth: <path d={`M${s * 0.35},${mouthY - s * 0.04} Q${s * 0.42},${mouthY + s * 0.06} ${s * 0.5},${mouthY} Q${s * 0.58},${mouthY - s * 0.06} ${s * 0.65},${mouthY + s * 0.02}`} fill="none" stroke="white" strokeWidth={s * 0.04} strokeLinecap="round" />,
    },
  };

  const expr = expressions[player];

  return (
    <svg viewBox={`0 0 ${s} ${s}`} width={s} height={s} className="drop-shadow-lg">
      {/* Face circle */}
      <circle cx={s / 2} cy={s / 2} r={s * 0.44} fill="currentColor" className={cfg.bg} opacity="0.9" />
      {/* Eyes */}
      <circle cx={expr.leftEyeX} cy={eyeY} r={eyeR} fill="white" />
      <circle cx={expr.rightEyeX} cy={eyeY} r={eyeR} fill="white" />
      {/* Pupils */}
      <circle cx={expr.leftEyeX + s * 0.015} cy={eyeY} r={eyeR * 0.5} fill="#1e293b" />
      <circle cx={expr.rightEyeX + s * 0.015} cy={eyeY} r={eyeR * 0.5} fill="#1e293b" />
      {/* Mouth */}
      {expr.mouth}
      {/* Blush */}
      <circle cx={s * 0.27} cy={s * 0.52} r={s * 0.07} fill="white" opacity="0.15" />
      <circle cx={s * 0.73} cy={s * 0.52} r={s * 0.07} fill="white" opacity="0.15" />
    </svg>
  );
}

interface Props {
  player: Player;
  size?: number;
  pulse?: boolean;
  label?: boolean;
}

export default function PlayerIcon({ player, size = 48, pulse = false, label: showLabel = false }: Props) {
  const cfg = CONFIG[player];

  return (
    <div className="flex flex-col items-center gap-1">
      <motion.div
        className={`relative rounded-full ${cfg.bg} ring-2 ${cfg.ring}`}
        animate={pulse ? { scale: [1, 1.08, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <QFace player={player} size={size} />
      </motion.div>
      {showLabel && (
        <span className="text-[10px] text-slate-500 font-medium">{cfg.label}</span>
      )}
    </div>
  );
}
