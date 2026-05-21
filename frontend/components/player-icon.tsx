"use client";

import { motion } from "framer-motion";

type Player = "candidate" | "hr" | "interviewer" | "market";

const CONFIG: Record<Player, { color: string; glow: string; label: string }> = {
  candidate: {
    color: "var(--candidate-blue)",
    glow: "var(--candidate-blue-glow)",
    label: "候选人",
  },
  hr: {
    color: "var(--hr-purple)",
    glow: "var(--hr-purple-glow)",
    label: "HR",
  },
  interviewer: {
    color: "var(--interviewer-amber)",
    glow: "rgba(251, 191, 36, 0.2)",
    label: "面试官",
  },
  market: {
    color: "var(--market-emerald)",
    glow: "rgba(52, 211, 153, 0.2)",
    label: "市场",
  },
};

function QFace({ player, size = 48 }: { player: Player; size?: number }) {
  const cfg = CONFIG[player];
  const s = size;
  const eyeR = s * 0.065;
  const eyeY = s * 0.38;
  const mouthY = s * 0.6;

  const expressions: Record<
    Player,
    { leftEyeX: number; rightEyeX: number; mouth: React.ReactNode }
  > = {
    candidate: {
      leftEyeX: s * 0.38,
      rightEyeX: s * 0.62,
      mouth: (
        <path
          d={`M${s * 0.38},${mouthY} Q${s * 0.5},${mouthY + s * 0.1} ${s * 0.62},${mouthY}`}
          fill="none"
          stroke="white"
          strokeWidth={s * 0.04}
          strokeLinecap="round"
        />
      ),
    },
    hr: {
      leftEyeX: s * 0.38,
      rightEyeX: s * 0.62,
      mouth: (
        <line
          x1={s * 0.4}
          y1={mouthY}
          x2={s * 0.6}
          y2={mouthY}
          stroke="white"
          strokeWidth={s * 0.04}
          strokeLinecap="round"
        />
      ),
    },
    interviewer: {
      leftEyeX: s * 0.38,
      rightEyeX: s * 0.62,
      mouth: (
        <path
          d={`M${s * 0.38},${mouthY} Q${s * 0.5},${mouthY - s * 0.08} ${s * 0.62},${mouthY}`}
          fill="none"
          stroke="white"
          strokeWidth={s * 0.04}
          strokeLinecap="round"
        />
      ),
    },
    market: {
      leftEyeX: s * 0.38,
      rightEyeX: s * 0.62,
      mouth: (
        <path
          d={`M${s * 0.35},${mouthY - s * 0.04} Q${s * 0.42},${mouthY + s * 0.06} ${s * 0.5},${mouthY} Q${s * 0.58},${mouthY - s * 0.06} ${s * 0.65},${mouthY + s * 0.02}`}
          fill="none"
          stroke="white"
          strokeWidth={s * 0.04}
          strokeLinecap="round"
        />
      ),
    },
  };

  const expr = expressions[player];

  return (
    <svg viewBox={`0 0 ${s} ${s}`} width={s} height={s} className="drop-shadow-lg">
      <circle
        cx={s / 2}
        cy={s / 2}
        r={s * 0.44}
        fill={cfg.color}
        opacity="0.9"
      />
      <circle cx={expr.leftEyeX} cy={eyeY} r={eyeR} fill="white" />
      <circle cx={expr.rightEyeX} cy={eyeY} r={eyeR} fill="white" />
      <circle
        cx={expr.leftEyeX + s * 0.015}
        cy={eyeY}
        r={eyeR * 0.5}
        fill="#1e293b"
      />
      <circle
        cx={expr.rightEyeX + s * 0.015}
        cy={eyeY}
        r={eyeR * 0.5}
        fill="#1e293b"
      />
      {expr.mouth}
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

export default function PlayerIcon({
  player,
  size = 48,
  pulse = false,
  label: showLabel = false,
}: Props) {
  const cfg = CONFIG[player];

  return (
    <div className="flex flex-col items-center gap-1">
      <motion.div
        className="relative rounded-full"
        style={{
          backgroundColor: cfg.glow,
          border: `2px solid ${cfg.color}66`,
        }}
        animate={pulse ? { scale: [1, 1.08, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <QFace player={player} size={size} />
      </motion.div>
      {showLabel && (
        <span className="text-[10px] text-[var(--text-tertiary)] font-medium">
          {cfg.label}
        </span>
      )}
    </div>
  );
}
