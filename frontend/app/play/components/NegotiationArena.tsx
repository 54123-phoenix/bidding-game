"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import TacticalBackdrop from "@/components/ui/tactical-backdrop";

interface NegotiationArenaProps {
  children: ReactNode;
  round: number;
  maxRounds: number;
  isThinking?: boolean;
  outcome?: "accepted" | "rejected" | null;
}

export default function NegotiationArena({
  children,
  isThinking = false,
  outcome,
}: NegotiationArenaProps) {
  const mood = outcome === "accepted" ? "success" : outcome === "rejected" ? "danger" : isThinking ? "thinking" : "neutral";

  return (
    <motion.div
      className="product-shell relative min-h-[calc(100vh-80px)] overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <TacticalBackdrop mood={mood} />

      <div className="relative z-10">
        {children}
      </div>

    </motion.div>
  );
}
