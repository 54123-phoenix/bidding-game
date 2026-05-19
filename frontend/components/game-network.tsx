"use client";

import { useRef, useState } from "react";
import { motion, useTransform, type MotionValue } from "framer-motion";

interface NodeDef {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
  privateInfo: string;
}

const NODES: NodeDef[] = [
  {
    id: "market",
    label: "M",
    x: 400,
    y: 80,
    color: "#10b981",
    privateInfo: "供需比 1.3 · 热门技能: AI/大模型",
  },
  {
    id: "candidate",
    label: "C",
    x: 160,
    y: 340,
    color: "#3b82f6",
    privateInfo: "真实能力 85% · 薪资底线 38K",
  },
  {
    id: "hr",
    label: "H",
    x: 640,
    y: 340,
    color: "#8b5cf6",
    privateInfo: "真实预算 90K · 紧急度: 高",
  },
  {
    id: "interviewer",
    label: "I",
    x: 400,
    y: 520,
    color: "#f59e0b",
    privateInfo: "评分严格度 72% · 风险偏好: 保守",
  },
];

const EDGES = [
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 2],
  [1, 3],
  [2, 3],
];

function Edge({
  x1,
  y1,
  x2,
  y2,
  delay,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  delay: number;
}) {
  return (
    <g>
      {/* base line */}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="rgba(148,163,184,0.15)"
        strokeWidth={1}
      />
      {/* animated flow */}
      <motion.line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="rgba(34,211,238,0.4)"
        strokeWidth={1.5}
        strokeDasharray="6 20"
        animate={{ strokeDashoffset: [0, -52] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "linear", delay }}
      />
      {/* particle dot */}
      <motion.circle
        r={3}
        fill="rgba(34,211,238,0.8)"
        filter="url(#glow)"
        animate={{
          cx: [x1, x2, x1],
          cy: [y1, y2, y1],
        }}
        transition={{
          duration: 4 + delay * 2,
          repeat: Infinity,
          ease: "easeInOut",
          delay,
        }}
      />
    </g>
  );
}

function GameNode({
  node,
  mouseX,
  mouseY,
  index,
}: {
  node: NodeDef;
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
  index: number;
}) {
  const [hovered, setHovered] = useState(false);

  // Parallax: nodes shift toward mouse slightly
  const dx = useTransform(mouseX, [0, 1], [(index % 2 === 0 ? -12 : 12), (index % 2 === 0 ? 12 : -12)]);
  const dy = useTransform(mouseY, [0, 1], [(index < 2 ? -8 : 8), (index < 2 ? 8 : -8)]);

  return (
    <motion.g
      style={{ x: dx, y: dy }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="cursor-pointer"
    >
      {/* outer pulse ring */}
      <motion.circle
        cx={node.x}
        cy={node.y}
        r={42}
        fill="none"
        stroke={node.color}
        strokeWidth={1}
        strokeOpacity={0.3}
        animate={{ r: [42, 56, 42], strokeOpacity: [0.3, 0.05, 0.3] }}
        transition={{ duration: 2.5 + index * 0.5, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* middle ring */}
      <motion.circle
        cx={node.x}
        cy={node.y}
        r={36}
        fill="none"
        stroke={node.color}
        strokeWidth={0.5}
        strokeOpacity={0.15}
        animate={{ r: [36, 44, 36], strokeOpacity: [0.15, 0.02, 0.15] }}
        transition={{ duration: 2 + index * 0.3, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* main circle */}
      <circle cx={node.x} cy={node.y} r={28} fill="rgba(15,23,42,0.95)" stroke={node.color} strokeWidth={2} />
      {/* glow on hover */}
      {hovered && (
        <motion.circle
          cx={node.x}
          cy={node.y}
          r={30}
          fill="none"
          stroke={node.color}
          strokeWidth={3}
          strokeOpacity={0.6}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      )}
      {/* icon letter */}
      <text
        x={node.x}
        y={node.y}
        textAnchor="middle"
        dominantBaseline="central"
        fill={node.color}
        fontSize={18}
        fontWeight="bold"
        style={{ fontFamily: "system-ui, sans-serif" }}
      >
        {node.label}
      </text>
      {/* tooltip */}
      {hovered && (
        <motion.g initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <rect
            x={node.x - 90}
            y={node.y + 40}
            width={180}
            height={36}
            rx={8}
            fill="rgba(15,23,42,0.95)"
            stroke="rgba(71,85,105,0.5)"
          />
          <text
            x={node.x}
            y={node.y + 58}
            textAnchor="middle"
            fill="rgba(203,213,225,0.9)"
            fontSize={11}
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            {node.privateInfo}
          </text>
        </motion.g>
      )}
    </motion.g>
  );
}

interface Props {
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
}

export default function GameNetwork({ mouseX, mouseY }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Shift entire network for parallax depth
  const driftX = useTransform(mouseX, [0, 1], [10, -10]);
  const driftY = useTransform(mouseY, [0, 1], [6, -6]);

  return (
    <div ref={containerRef} className="absolute inset-0 flex items-center justify-center pointer-events-none [&>svg]:pointer-events-auto">
      <motion.svg
        viewBox="0 0 800 600"
        className="w-full max-w-3xl"
        style={{ x: driftX, y: driftY }}
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="nodeGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* edges */}
        {EDGES.map(([a, b], i) => (
          <Edge
            key={`${a}-${b}`}
            x1={NODES[a].x}
            y1={NODES[a].y}
            x2={NODES[b].x}
            y2={NODES[b].y}
            delay={i * 0.4}
          />
        ))}

        {/* nodes */}
        {NODES.map((node, i) => (
          <GameNode key={node.id} node={node} mouseX={mouseX} mouseY={mouseY} index={i} />
        ))}

        {/* central label */}
        <text
          x={400}
          y={310}
          textAnchor="middle"
          fill="rgba(148,163,184,0.4)"
          fontSize={10}
          style={{ fontFamily: "system-ui, sans-serif" }}
        >
          INFORMATION ASYMMETRY
        </text>
      </motion.svg>
    </div>
  );
}
