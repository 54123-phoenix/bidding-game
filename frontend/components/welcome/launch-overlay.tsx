"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

const PROGRESS_STEPS = [
  { label: "解析场景信息", icon: "🔍" },
  { label: "提取简历信号", icon: "📄" },
  { label: "生成 HR 人格模型", icon: "🎭" },
  { label: "初始化博弈引擎", icon: "⚙️" },
  { label: "进入谈判场景", icon: "⚔️" },
];

const TIPS = [
  "HR 的耐心值受简历信号强度影响，而非你的自信程度。",
  "激进策略适合 HR 耐心高、岗位紧急的情况。",
  "保守策略稳扎稳打，但可能错过溢价空间。",
  "每轮报价都会消耗双方的耐心，谨慎出牌。",
  "外部 Offer 是最强的谈判筹码，但使用时机很关键。",
  "HR 也在评估你的稳定性，频繁跳槽信号会降低耐心。",
];

interface LaunchOverlayProps {
  isActive: boolean;
}

export default function LaunchOverlay({ isActive }: LaunchOverlayProps) {
  const [step, setStep] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setStep(0);
      return;
    }
    const interval = setInterval(() => {
      setStep((s) => (s < PROGRESS_STEPS.length - 1 ? s + 1 : s));
    }, 600);
    return () => clearInterval(interval);
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setTipIndex((i) => (i + 1) % TIPS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
          style={{ backgroundColor: "rgba(8, 10, 16, 0.97)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Grid background */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(34,211,238,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.3) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          {/* Scan line */}
          <motion.div
            className="absolute left-0 right-0 h-[2px]"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(34,211,238,0.6) 50%, transparent 100%)",
              boxShadow: "0 0 20px rgba(34,211,238,0.3)",
            }}
            initial={{ top: "0%" }}
            animate={{ top: "100%" }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
            }}
          />

          {/* Center content */}
          <div className="relative z-10 flex flex-col items-center max-w-md w-full px-6">
            {/* Title */}
            <motion.h2
              className="text-xl font-bold text-slate-200 mb-8 tracking-wide"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              系统初始化中
            </motion.h2>

            {/* Progress steps */}
            <div className="w-full space-y-3 mb-8">
              {PROGRESS_STEPS.map((s, i) => {
                const isDone = i < step;
                const isCurrent = i === step;
                return (
                  <motion.div
                    key={s.label}
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{
                      opacity: isDone || isCurrent ? 1 : 0.3,
                      x: 0,
                    }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 transition-all duration-300 ${
                        isDone
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : isCurrent
                            ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                            : "bg-slate-800 text-slate-600 border border-slate-700"
                      }`}
                    >
                      {isDone ? "✓" : s.icon}
                    </div>
                    <span
                      className={`text-sm transition-all duration-300 ${
                        isCurrent
                          ? "text-cyan-400 font-medium"
                          : isDone
                            ? "text-slate-400"
                            : "text-slate-600"
                      }`}
                    >
                      {s.label}
                    </span>
                    {isCurrent && (
                      <motion.div
                        className="ml-auto w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      />
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Progress bar */}
            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mb-6">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                initial={{ width: "0%" }}
                animate={{
                  width: `${((step + 1) / PROGRESS_STEPS.length) * 100}%`,
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>

            {/* Tip */}
            <AnimatePresence mode="wait">
              <motion.p
                key={tipIndex}
                className="text-xs text-slate-500 text-center leading-relaxed h-10"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.3 }}
              >
                {TIPS[tipIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
