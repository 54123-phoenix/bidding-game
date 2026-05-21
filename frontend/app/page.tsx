"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, LayoutDashboard } from "lucide-react";
import GameNetwork from "@/components/game-network";
import { Particles } from "@/components/ui/particles";
import ScenarioLauncher from "@/components/welcome/scenario-launcher";
import RecentSessions from "@/components/welcome/recent-sessions";
import LaunchOverlay from "@/components/welcome/launch-overlay";
import { listGames } from "@/lib/game-api";

export default function Home() {
  const router = useRouter();
  const heroRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const smX = useSpring(mouseX, { stiffness: 60, damping: 28 });
  const smY = useSpring(mouseY, { stiffness: 60, damping: 28 });
  const [isLaunching, setIsLaunching] = useState(false);
  const [hasSessions, setHasSessions] = useState(false);

  useEffect(() => {
    // Fetch sessions in background — don't block page render
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    listGames()
      .then((data) => {
        clearTimeout(timeout);
        if (data.status === "ok" && data.sessions.length > 0) {
          setHasSessions(true);
        }
      })
      .catch(() => {});

    return () => { clearTimeout(timeout); controller.abort(); };
  }, []);

  return (
    <div
      ref={heroRef}
      onMouseMove={(e) => {
        const r = heroRef.current?.getBoundingClientRect();
        if (!r) return;
        mouseX.set((e.clientX - r.left) / r.width);
        mouseY.set((e.clientY - r.top) / r.height);
      }}
      className="relative min-h-screen overflow-hidden"
      style={{ backgroundColor: "var(--bg-canvas)" }}
    >
      {/* Background layers */}
      <Particles
        className="absolute inset-0 z-0 opacity-40"
        quantity={80}
        staticity={30}
        ease={80}
        color="#22d3ee"
        size={0.5}
        vx={0.1}
        vy={0.1}
      />

      <div className="absolute inset-0 z-10 flex items-center justify-center opacity-30">
        <GameNetwork mouseX={smX} mouseY={smY} />
      </div>

      <div className="absolute inset-0 z-20 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(8,10,16,0.9)_100%)]" />

      {/* Top right: Dashboard link if has sessions */}
      {hasSessions && (
        <motion.div
          className="absolute top-4 right-4 z-30"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-cyan-400 bg-slate-900/60 border border-slate-800 hover:border-cyan-500/20 transition"
          >
            <LayoutDashboard size={12} />
            投递管理中心
            <ArrowRight size={10} />
          </Link>
        </motion.div>
      )}

      {/* Main content */}
      <div className="relative z-30 min-h-screen flex flex-col px-4 py-16">
        {/* Title block */}
        <motion.div
          className="text-center mt-8 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Badge */}
          <motion.div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs mb-6"
            style={{
              borderColor: "var(--accent-cyan)30",
              backgroundColor: "var(--accent-cyan-glow)",
              color: "var(--accent-cyan)",
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ backgroundColor: "var(--accent-cyan)" }}
              />
              <span
                className="relative inline-flex rounded-full h-1.5 w-1.5"
                style={{ backgroundColor: "var(--accent-cyan)" }}
              />
            </span>
            贝叶斯博弈引擎 v2.0
          </motion.div>

          {/* Title */}
          <motion.h1
            className="text-4xl md:text-6xl font-bold tracking-tight mb-4"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <span className="bg-gradient-to-r from-[var(--accent-cyan)] via-[var(--candidate-blue)] to-[var(--hr-purple)] bg-clip-text text-transparent">
              谈判模拟系统
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="text-sm md:text-base max-w-md mx-auto leading-relaxed"
            style={{ color: "var(--text-tertiary)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            在不完备信息的条件下，与 AI 驱动的 HR 进行多轮薪资博弈
          </motion.p>
        </motion.div>

        {/* Center content */}
        <div className="flex-1 flex flex-col items-center justify-center w-full">
          <ScenarioLauncher
            onLaunch={() => setIsLaunching(true)}
            onScreeningFail={() => setIsLaunching(false)}
          />
          <RecentSessions onContinue={() => setIsLaunching(true)} />
        </div>

        {/* Footer hint */}
        <motion.p
          className="text-center mt-auto pt-8 text-[10px] text-slate-700"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          基于贝叶斯博弈论与 LLM 推理引擎 · 每次模拟都是独特的谈判体验
        </motion.p>
      </div>

      {/* Launch overlay */}
      <LaunchOverlay isActive={isLaunching} />
    </div>
  );
}
