"use client";

import { motion } from "framer-motion";

type TacticalBackdropMood = "neutral" | "thinking" | "success" | "danger";

interface TacticalBackdropProps {
  mood?: TacticalBackdropMood;
  intensity?: "quiet" | "normal";
}

export default function TacticalBackdrop({
  mood = "neutral",
  intensity = "normal",
}: TacticalBackdropProps) {
  const moodGlow = {
    neutral: "radial-gradient(circle at 50% 110%, rgba(34,211,238,0.10) 0%, transparent 52%)",
    thinking: "radial-gradient(circle at 82% 26%, var(--hr-purple-glow), transparent 58%)",
    success: "radial-gradient(circle at 50% 52%, var(--accent-green-glow), transparent 58%)",
    danger: "radial-gradient(circle at 50% 52%, rgba(251,113,133,0.15), transparent 58%)",
  }[mood];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div
        className={intensity === "quiet" ? "absolute inset-0 opacity-20" : "absolute inset-0 opacity-25"}
        style={{
          backgroundImage: `
            radial-gradient(circle at 12% 24%, var(--candidate-blue-glow) 0%, transparent 42%),
            radial-gradient(circle at 88% 28%, var(--hr-purple-glow) 0%, transparent 44%),
            ${moodGlow}
          `,
        }}
      />

      <div className={intensity === "quiet" ? "absolute inset-0 quiet-grid opacity-[0.18]" : "absolute inset-0 quiet-grid opacity-35"} />

      <div className="absolute left-1/2 top-16 h-[520px] w-[760px] -translate-x-1/2 rounded-full bg-cyan-400/10 blur-[120px]" />

      {mood === "thinking" && (
        <motion.div
          className="absolute inset-0"
          style={{ background: "radial-gradient(circle at 80% 30%, var(--hr-purple-glow), transparent 60%)" }}
          animate={{ opacity: [0.1, 0.25, 0.1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      <div
        className="absolute bottom-0 left-0 right-0 h-32"
        style={{ background: "linear-gradient(to top, var(--bg-canvas), transparent)" }}
      />
    </div>
  );
}
