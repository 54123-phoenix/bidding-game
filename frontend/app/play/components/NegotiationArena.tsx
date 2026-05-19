"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

interface NegotiationArenaProps {
  children: ReactNode;
  round: number;
  maxRounds: number;
  isThinking?: boolean;
  outcome?: "accepted" | "rejected" | null;
}

export default function NegotiationArena({
  children,
  round,
  maxRounds,
  isThinking = false,
  outcome,
}: NegotiationArenaProps) {
  return (
    <motion.div
      className="relative min-h-[calc(100vh-80px)] overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <div className="absolute inset-0 bg-[var(--bg-canvas)]" />

      <div className="absolute inset-0 opacity-30">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 30%, var(--candidate-blue-glow) 0%, transparent 50%),
              radial-gradient(circle at 80% 70%, var(--hr-purple-glow) 0%, transparent 50%)
            `,
          }}
        />
      </div>

      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(var(--border-hairline) 1px, transparent 1px),
            linear-gradient(90deg, var(--border-hairline) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {isThinking && (
        <motion.div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            background: "radial-gradient(circle at 80% 30%, var(--hr-purple-glow), transparent 60%)",
          }}
          animate={{ opacity: [0.1, 0.25, 0.1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {outcome && (
        <motion.div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            background: outcome === "accepted"
              ? "radial-gradient(circle at 50% 50%, var(--accent-green-glow), transparent 60%)"
              : "radial-gradient(circle at 50% 50%, rgba(251,113,133,0.15), transparent 60%)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        />
      )}

      <div className="relative z-10">
        {children}
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none z-0"
        style={{
          background: "linear-gradient(to top, var(--bg-canvas), transparent)",
        }}
      />
    </motion.div>
  );
}
