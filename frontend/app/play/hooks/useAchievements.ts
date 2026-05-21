"use client";

import { useRef, useCallback } from "react";
import { useState } from "react";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

const ACHIEVEMENTS: Achievement[] = [
  { id: "first_counter", title: "初次还价", description: "你进行了第一次还价", icon: "⚔️", rarity: "common" },
  { id: "gap_5k", title: "近在咫尺", description: "双方报价差距在5K以内", icon: "🎯", rarity: "rare" },
  { id: "marathon", title: "马拉松谈判", description: "谈判持续到最后一轮", icon: "🏃", rarity: "rare" },
  { id: "patience_master", title: "耐心大师", description: "HR耐心保持在高位", icon: "🧘", rarity: "common" },
  { id: "deal_closed", title: "达成协议", description: "成功与HR达成薪资协议", icon: "🤝", rarity: "epic" },
  { id: "speed_demon", title: "速战速决", description: "3轮内达成协议", icon: "⚡", rarity: "legendary" },
  { id: "comeback", title: "逆风翻盘", description: "HR耐心低于0.3时仍达成协议", icon: "🔥", rarity: "legendary" },
  { id: "high_roller", title: "高薪猎人", description: "达成薪资高于区间中位数", icon: "💎", rarity: "epic" },
];

export function useAchievements() {
  const [achievement, setAchievement] = useState<Achievement | null>(null);
  const unlockedAchievements = useRef<Set<string>>(new Set());

  const tryUnlockAchievement = useCallback((id: string) => {
    if (unlockedAchievements.current.has(id)) return;
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    if (!a) return;
    unlockedAchievements.current.add(id);
    setAchievement(a);
    setTimeout(() => setAchievement(null), 4500);
  }, []);

  const resetAchievements = useCallback(() => {
    unlockedAchievements.current = new Set();
    setAchievement(null);
  }, []);

  return {
    ACHIEVEMENTS,
    achievement,
    setAchievement,
    tryUnlockAchievement,
    resetAchievements,
  };
}
