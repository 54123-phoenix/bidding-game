"use client";

import { motion, AnimatePresence } from "framer-motion";

interface AchievementPopupProps {
  achievement: {
    id: string;
    title: string;
    description: string;
    icon: string;
    rarity: "common" | "rare" | "epic" | "legendary";
  } | null;
  onDismiss?: () => void;
}

const RARITY_STYLES: Record<string, { border: string; glow: string; bg: string; label: string; labelColor: string }> = {
  common: {
    border: "#8b95a5",
    glow: "#8b95a530",
    bg: "linear-gradient(135deg, #1a2233, #151b26)",
    label: "普通",
    labelColor: "#8b95a5",
  },
  rare: {
    border: "#60a5fa",
    glow: "#60a5fa40",
    bg: "linear-gradient(135deg, #1a2233, #0e1a2e)",
    label: "稀有",
    labelColor: "#60a5fa",
  },
  epic: {
    border: "#c084fc",
    glow: "#c084fc40",
    bg: "linear-gradient(135deg, #1a1533, #150e26)",
    label: "史诗",
    labelColor: "#c084fc",
  },
  legendary: {
    border: "#fbbf24",
    glow: "#fbbf2450",
    bg: "linear-gradient(135deg, #2a1f0e, #1a1508)",
    label: "传说",
    labelColor: "#fbbf24",
  },
};

export default function AchievementPopup({ achievement, onDismiss }: AchievementPopupProps) {
  if (!achievement) return null;

  const style = RARITY_STYLES[achievement.rarity] || RARITY_STYLES.common;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed top-8 right-8 z-50 cursor-pointer"
        initial={{ opacity: 0, x: 100, scale: 0.8 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 100, scale: 0.8 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        onClick={onDismiss}
      >
        <motion.div
          className="relative overflow-hidden rounded-xl border-2 px-5 py-4 min-w-[280px] backdrop-blur-xl"
          style={{
            borderColor: style.border,
            background: style.bg,
            boxShadow: `0 0 30px ${style.glow}, 0 8px 32px rgba(0,0,0,0.5)`,
          }}
          animate={{
            boxShadow: [
              `0 0 30px ${style.glow}, 0 8px 32px rgba(0,0,0,0.5)`,
              `0 0 50px ${style.glow}, 0 8px 32px rgba(0,0,0,0.5)`,
              `0 0 30px ${style.glow}, 0 8px 32px rgba(0,0,0,0.5)`,
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="absolute top-0 right-0 w-20 h-20 opacity-10">
            <div
              className="w-full h-full"
              style={{
                background: `radial-gradient(circle at top right, ${style.border}, transparent 70%)`,
              }}
            />
          </div>

          <div className="flex items-start gap-3 relative z-10">
            <motion.div
              className="text-3xl shrink-0"
              initial={{ rotate: -20, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.2 }}
            >
              {achievement.icon}
            </motion.div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                  style={{ color: style.labelColor, backgroundColor: `${style.labelColor}15` }}>
                  {style.label}
                </span>
              </div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] leading-tight">
                {achievement.title}
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                {achievement.description}
              </p>
            </div>
          </div>

          <motion.div
            className="absolute bottom-0 left-0 h-0.5"
            style={{ backgroundColor: style.border }}
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: 4, ease: "linear" }}
            onAnimationComplete={onDismiss}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function useAchievements() {
  const ACHIEVEMENTS = [
    { id: "first_counter", title: "初次还价", description: "第一次对HR的报价提出还价", icon: "⚔️", rarity: "common" as const },
    { id: "gap_5k", title: "缩小差距", description: "将薪资差距缩小到5K以内", icon: "🎯", rarity: "rare" as const },
    { id: "deal_closed", title: "成交！", description: "成功达成薪资协议", icon: "🤝", rarity: "epic" as const },
    { id: "high_roller", title: "高薪猎人", description: "最终薪资超过岗位薪资带中位数", icon: "💎", rarity: "legendary" as const },
    { id: "patience_master", title: "耐心大师", description: "HR耐心始终保持在80%以上", icon: "🧘", rarity: "rare" as const },
    { id: "comeback", title: "绝地反击", description: "在HR耐心低于30%时成功达成协议", icon: "🔥", rarity: "epic" as const },
    { id: "speed_demon", title: "速战速决", description: "3轮以内达成协议", icon: "⚡", rarity: "rare" as const },
    { id: "marathon", title: "持久战", description: "谈判进行到最后一轮", icon: "🏃", rarity: "common" as const },
  ];

  return { ACHIEVEMENTS };
}
