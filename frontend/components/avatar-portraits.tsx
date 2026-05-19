"use client";

import { motion, useMotionValue, useMotionTemplate, useTransform, useMotionValueEvent, type MotionValue } from "framer-motion";

// ═══════════════════════════════════════════════════
// Distance → clarity hook
// ═══════════════════════════════════════════════════
function useCursorDistance(
  mouseX: MotionValue<number>,
  mouseY: MotionValue<number>,
  tx: number,
  ty: number,
  threshold = 0.3,
) {
  const clarity = useMotionValue(0);

  const update = () => {
    const x = mouseX.get();
    const y = mouseY.get();
    const dist = Math.sqrt((x - tx) ** 2 + (y - ty) ** 2);
    clarity.set(Math.max(0, Math.min(1, 1 - dist / threshold)));
  };

  useMotionValueEvent(mouseX, "change", update);
  useMotionValueEvent(mouseY, "change", update);

  return clarity;
}

// ═══════════════════════════════════════════════════
// Single geometric avatar portrait
// ═══════════════════════════════════════════════════
interface PortraitDef {
  id: string;
  letter: string;
  label: string;
  color: string;
  glowColor: string;
  targetX: number; // normalized 0–1
  targetY: number;
  privateInfo: string;
  shape: "diamond" | "square" | "circle" | "hexagon";
  expression: "up" | "flat" | "skeptical" | "wavy";
}

const PORTRAITS: PortraitDef[] = [
  {
    id: "candidate",
    letter: "C",
    label: "候选人",
    color: "#3b82f6",
    glowColor: "rgba(59,130,246,",
    targetX: 0.18,
    targetY: 0.52,
    privateInfo: "真实能力 85% · 薪资底线 38K · 外部Offer待定",
    shape: "diamond",
    expression: "up",
  },
  {
    id: "hr",
    letter: "H",
    label: "HR",
    color: "#8b5cf6",
    glowColor: "rgba(139,92,246,",
    targetX: 0.82,
    targetY: 0.52,
    privateInfo: "真实预算 90K · 紧急度 高 · 候选池质量不明",
    shape: "square",
    expression: "flat",
  },
  {
    id: "interviewer",
    letter: "I",
    label: "面试官",
    color: "#f59e0b",
    glowColor: "rgba(245,158,11,",
    targetX: 0.5,
    targetY: 0.82,
    privateInfo: "评分严格度 72% · 隐性偏见 · 保守风险偏好",
    shape: "circle",
    expression: "skeptical",
  },
  {
    id: "market",
    letter: "M",
    label: "市场",
    color: "#10b981",
    glowColor: "rgba(16,185,129,",
    targetX: 0.5,
    targetY: 0.15,
    privateInfo: "供需比 1.3 · 热门技能溢价 · AI/大模型趋势",
    shape: "hexagon",
    expression: "wavy",
  },
];

// ── SVG face shapes ──

function DiamondFace({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 160 160" className="w-full h-full">
      {/* head */}
      <polygon points="80,10 150,80 80,150 10,80" fill="none" stroke={color} strokeWidth="1.5" opacity="0.6" />
      {/* eyes */}
      <circle cx="65" cy="67" r="5" fill={color} opacity="0.7" />
      <circle cx="95" cy="67" r="5" fill={color} opacity="0.7" />
      {/* eyebrows — angled up (ambitious) */}
      <line x1="55" y1="55" x2="72" y2="58" stroke={color} strokeWidth="1.5" opacity="0.5" />
      <line x1="105" y1="55" x2="88" y2="58" stroke={color} strokeWidth="1.5" opacity="0.5" />
      {/* mouth — upward curve */}
      <path d="M62,102 Q80,90 98,102" fill="none" stroke={color} strokeWidth="1.5" opacity="0.5" />
      {/* chin accent */}
      <polyline points="60,130 80,140 100,130" fill="none" stroke={color} strokeWidth="1" opacity="0.2" />
    </svg>
  );
}

function SquareFace({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 160 160" className="w-full h-full">
      {/* head */}
      <rect x="18" y="18" width="124" height="124" rx="18" fill="none" stroke={color} strokeWidth="1.5" opacity="0.6" />
      {/* eyes */}
      <circle cx="60" cy="65" r="5" fill={color} opacity="0.7" />
      <circle cx="100" cy="65" r="5" fill={color} opacity="0.7" />
      {/* eyebrows — flat (professional) */}
      <line x1="53" y1="54" x2="67" y2="54" stroke={color} strokeWidth="1.5" opacity="0.5" />
      <line x1="93" y1="54" x2="107" y2="54" stroke={color} strokeWidth="1.5" opacity="0.5" />
      {/* mouth — straight line */}
      <line x1="65" y1="100" x2="95" y2="100" stroke={color} strokeWidth="1.5" opacity="0.5" />
      {/* grid lines inside (structure) */}
      <line x1="18" y1="45" x2="142" y2="45" stroke={color} strokeWidth="0.5" opacity="0.1" />
      <line x1="80" y1="45" x2="80" y2="142" stroke={color} strokeWidth="0.5" opacity="0.1" />
    </svg>
  );
}

function CircleFace({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 160 160" className="w-full h-full">
      {/* head */}
      <circle cx="80" cy="80" r="62" fill="none" stroke={color} strokeWidth="1.5" opacity="0.6" />
      {/* eyes — one larger (magnifying) */}
      <circle cx="62" cy="65" r="5" fill={color} opacity="0.7" />
      <circle cx="98" cy="65" r="8" fill="none" stroke={color} strokeWidth="1.5" opacity="0.7" />
      <circle cx="98" cy="65" r="3" fill={color} opacity="0.4" />
      {/* eyebrow — one raised (skeptical) */}
      <line x1="55" y1="54" x2="69" y2="54" stroke={color} strokeWidth="1.5" opacity="0.5" />
      <path d="M90,54 Q98,50 108,56" fill="none" stroke={color} strokeWidth="1.5" opacity="0.5" />
      {/* mouth — skeptical curve */}
      <path d="M62,100 Q80,95 98,102" fill="none" stroke={color} strokeWidth="1.5" opacity="0.5" />
      {/* evaluation rings */}
      <circle cx="80" cy="80" r="40" fill="none" stroke={color} strokeWidth="0.5" opacity="0.15" />
      <circle cx="80" cy="80" r="52" fill="none" stroke={color} strokeWidth="0.5" opacity="0.08" />
    </svg>
  );
}

function HexagonFace({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 160 160" className="w-full h-full">
      {/* head */}
      <polygon points="80,12 148,50 148,110 80,148 12,110 12,50" fill="none" stroke={color} strokeWidth="1.5" opacity="0.6" />
      {/* eyes */}
      <circle cx="60" cy="68" r="4" fill={color} opacity="0.7" />
      <circle cx="100" cy="68" r="4" fill={color} opacity="0.7" />
      {/* mouth — wavy (market trends) */}
      <polyline points="58,102 68,96 78,104 88,94 98,102 108,96" fill="none" stroke={color} strokeWidth="1.5" opacity="0.5" />
      {/* trend line accents */}
      <polyline points="40,30 60,40 80,28 100,45 120,35" fill="none" stroke={color} strokeWidth="0.8" opacity="0.2" />
      <polyline points="30,130 50,125 70,132 90,122 110,128 130,120" fill="none" stroke={color} strokeWidth="0.8" opacity="0.15" />
    </svg>
  );
}

const FACE_MAP = {
  diamond: DiamondFace,
  square: SquareFace,
  circle: CircleFace,
  hexagon: HexagonFace,
};

// ── Single Portrait ──
function Portrait({
  portrait,
  mouseX,
  mouseY,
}: {
  portrait: PortraitDef;
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
}) {
  const clarity = useCursorDistance(mouseX, mouseY, portrait.targetX, portrait.targetY, 0.38);

  const blurPx = useTransform(clarity, [0, 1], [10, 0]);
  const blurFilter = useMotionTemplate`blur(${blurPx}px)`;
  const opacity = useTransform(clarity, [0, 1], [0.18, 0.9]);
  const scale = useTransform(clarity, [0, 1], [0.92, 1.04]);
  const glowAlpha = useTransform(clarity, [0, 1], [0, 0.45]);
  const infoY = useTransform(clarity, [0, 1], [12, 0]);
  const infoOpacity = useTransform(clarity, [0, 1], [0, 0.85]);

  const Face = FACE_MAP[portrait.shape];

  return (
    <motion.div
      className="absolute flex flex-col items-center gap-2"
      style={{
        left: `${portrait.targetX * 100}%`,
        top: `${portrait.targetY * 100}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      {/* Glow halo — fades in as cursor approaches */}
      <motion.div
        className="absolute -inset-8 rounded-full pointer-events-none"
        style={{
          opacity: glowAlpha,
          background: `radial-gradient(circle, ${portrait.glowColor}0.2) 0%, transparent 65%)`,
        }}
      />

      {/* Portrait container */}
      <motion.div
        className="relative w-36 h-36 md:w-44 md:h-44"
        style={{ filter: blurFilter, opacity, scale }}
      >
        {/* Glass backdrop */}
        <div
          className="absolute inset-0 rounded-3xl"
          style={{
            background: `radial-gradient(circle at center, ${portrait.glowColor}0.08), transparent 70%)`,
            border: `1px solid ${portrait.glowColor}0.15)`,
          }}
        />

        {/* SVG face */}
        <div className="absolute inset-0">
          <Face color={portrait.color} />
        </div>

        {/* Letter badge */}
        <div
          className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
          style={{
            backgroundColor: `${portrait.color}20`,
            color: portrait.color,
            border: `1px solid ${portrait.color}40`,
          }}
        >
          {portrait.letter}
        </div>
      </motion.div>

      {/* Label */}
      <motion.span
        className="text-xs text-slate-500 tracking-wider"
        style={{ opacity }}
      >
        {portrait.label}
      </motion.span>

      {/* Private info tooltip — appears on approach */}
      <motion.div
        className="absolute top-full mt-1.5 whitespace-nowrap"
        style={{ y: infoY, opacity: infoOpacity }}
      >
        <div
          className="px-3 py-1.5 rounded-lg text-[11px] backdrop-blur-md"
          style={{
            backgroundColor: `${portrait.color}10`,
            color: `${portrait.color}DD`,
            border: `1px solid ${portrait.color}30`,
          }}
        >
          {portrait.privateInfo}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Full set ──
interface Props {
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
}

export default function AvatarPortraits({ mouseX, mouseY }: Props) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {PORTRAITS.map((p) => (
        <Portrait key={p.id} portrait={p} mouseX={mouseX} mouseY={mouseY} />
      ))}
    </div>
  );
}
