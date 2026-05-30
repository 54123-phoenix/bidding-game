"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, BarChart3, LayoutDashboard, PlayCircle, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import RecentSessions from "@/components/welcome/recent-sessions";
import TacticalBackdrop from "@/components/ui/tactical-backdrop";
import { listGames } from "@/lib/game-api";
import { EMPTY_PROFILE, loadUserProfile, type UserProfile } from "@/lib/user-profile";

export default function Home() {
  const [hasSessions, setHasSessions] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);

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

    const profileTimer = window.setTimeout(() => {
      setProfile(loadUserProfile());
    }, 0);

    return () => { clearTimeout(timeout); window.clearTimeout(profileTimer); controller.abort(); };
  }, []);

  const profileComplete = Boolean(profile.name && profile.resume);

  return (
      <div className="product-shell tactical-home relative min-h-screen overflow-hidden bg-[#05070a]">
      <TacticalBackdrop intensity="quiet" />

      <header className="relative z-40 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 md:px-8">
        <div className="text-sm font-black tracking-tight text-white md:text-base">薪资谈判教练</div>
        <nav className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/demo" className="rounded-full px-3 py-1.5 transition hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50">演示</Link>
          <Link
            href="/dashboard"
            className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 transition hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50"
          >
            仪表盘
          </Link>
        </nav>
      </header>

      {/* Main content */}
      <div className="relative z-30 mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-6xl flex-col px-5 pb-8 pt-8 md:px-8 lg:justify-center">
        <section className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <motion.div
              className="surface-base mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs text-[var(--accent-cyan)]"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: "var(--accent-cyan)" }} />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: "var(--accent-cyan)" }} />
              </span>
              教练模式 · HR 视角 · 可带走话术
            </motion.div>

            <motion.h1
              className="mb-4 max-w-2xl text-4xl font-black tracking-tight text-white md:text-6xl"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              你的薪资谈判教练。
            </motion.h1>

            <motion.p
              className="max-w-xl text-base leading-7 text-white opacity-35 md:text-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              模拟 HR 压价，解释每一步为什么该坚持或让步，并生成下次面试可用的谈判备忘录。
            </motion.p>

          <motion.div
            className="mt-7 w-full max-w-2xl"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Link href="/profile" className="group surface-raised relative block overflow-hidden rounded-3xl border-cyan-300/10 p-5 transition hover:border-cyan-300/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(34,211,238,0.16),transparent_35%),radial-gradient(circle_at_90%_10%,rgba(110,231,183,0.10),transparent_30%)]" />
              <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
                    <UserRound size={22} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-black text-white">用户信息管理</h2>
                      <span className={profileComplete ? "rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-0.5 text-[10px] font-bold text-emerald-200" : "rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-0.5 text-[10px] font-bold text-amber-200"}>
                        {profileComplete ? "已保存默认简历" : "建议先完善"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-6 text-slate-500">
                      {profileComplete
                        ? `${profile.name} · ${profile.targetRole || "目标岗位未填写"}。教练模式可直接使用档案简历。`
                        : "完善个人信息和默认简历后，教练模式能基于你的真实筹码给建议。"}
                    </p>
                  </div>
                </div>
                <div className="inline-flex shrink-0 items-center gap-1 text-xs font-black text-cyan-200">
                  {profileComplete ? "更新档案" : "完善档案"} <ArrowRight size={13} className="transition group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          </motion.div>
          <motion.div
            className="mt-4 grid w-full max-w-2xl gap-3 sm:grid-cols-2"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <Link href="/demo" className="group surface-raised relative overflow-hidden rounded-3xl p-5 transition hover:border-cyan-300/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.14),transparent_38%)] opacity-80" />
              <div className="relative z-10">
                <PlayCircle className="mb-5 text-cyan-200" size={24} />
                <div className="text-xl font-black text-white">观看演示</div>
                <div className="mt-2 text-xs leading-6 text-slate-500">不用登录，快速了解教练如何拆解 HR 报价和下一步动作。</div>
                <div className="mt-5 inline-flex items-center gap-1 text-xs font-black text-cyan-200">进入演示 <ArrowRight size={13} className="transition group-hover:translate-x-1" /></div>
              </div>
            </Link>
            <Link href="/dashboard" className="group surface-raised relative overflow-hidden rounded-3xl p-5 transition hover:border-emerald-300/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/50">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(110,231,183,0.12),transparent_38%)] opacity-80" />
              <div className="relative z-10">
                <LayoutDashboard className="mb-5 text-emerald-200" size={24} />
                <div className="text-xl font-black text-white">进入仪表盘</div>
                <div className="mt-2 text-xs leading-6 text-slate-500">管理档案、历史记录，并开始带教练提示的谈薪练习。</div>
                <div className="mt-5 inline-flex items-center gap-1 text-xs font-black text-emerald-200">进入产品 <ArrowRight size={13} className="transition group-hover:translate-x-1" /></div>
              </div>
            </Link>
          </motion.div>
          <motion.div
            className="mt-7 grid w-full max-w-3xl gap-3 md:grid-cols-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
          >
            <HeroProof icon={<Sparkles size={15} />} label="过程教练" value="每轮给出下一步建议" />
            <HeroProof icon={<BarChart3 size={15} />} label="可解释" value="同步展示 HR 如何看你" />
            <HeroProof icon={<ShieldCheck size={15} />} label="可带走" value="生成面试可用备忘录" />
          </motion.div>
          </div>

          <div className="order-first lg:order-none">
            <InteractiveMascot />
          </div>

          {hasSessions && <RecentSessions />}
        </section>

        {/* Footer hint */}
        <motion.p
          className="text-center mt-auto pt-8 text-[10px] text-slate-700"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          本系统用于训练与演示，不替代真实 offer、薪资调研或法律/职业咨询。
        </motion.p>
      </div>

    </div>
  );
}

function InteractiveMascot() {
  const [mood, setMood] = useState<"idle" | "coach" | "think">("idle");
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const avatarSeed = mood === "think" ? "market-analyst" : mood === "coach" ? "career-coach" : "negotiation-guide";
  const copy = {
    idle: "我可以先带你看演示，也可以直接开始谈薪练习。",
    coach: "教练模式会解释 HR 怎么看你，并给下一步建议。",
    think: "演示是预设剧本；真实练习会基于你的档案和岗位生成建议。",
  }[mood];

  return (
    <motion.button
      type="button"
      onClick={() => setMood((current) => current === "idle" ? "coach" : current === "coach" ? "think" : "idle")}
      onMouseEnter={() => setMood("coach")}
      onMouseLeave={() => setMood("idle")}
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setPointer({
          x: (event.clientX - rect.left) / rect.width - 0.5,
          y: (event.clientY - rect.top) / rect.height - 0.5,
        });
      }}
      className="group relative mx-auto block w-full max-w-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50"
      initial={{ opacity: 0, scale: 0.92, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 0.22, type: "spring", stiffness: 180, damping: 16 }}
      aria-label="切换谈薪伙伴提示"
    >
      <motion.div
        className="relative mx-auto min-h-[520px] overflow-hidden rounded-[2.5rem] border border-amber-200/25 bg-gradient-to-br from-amber-100/95 via-cyan-100/85 to-rose-100/95 p-6 text-left shadow-[0_24px_100px_rgba(251,191,36,0.20)]"
        animate={{
          rotateX: pointer.y * -5,
          rotateY: pointer.x * 7,
          y: mood === "coach" ? -4 : 0,
        }}
        transition={{ type: "spring", stiffness: 150, damping: 12 }}
      >
        <div className="pointer-events-none absolute -left-16 -top-16 h-44 w-44 rounded-full bg-white/45 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 right-0 h-52 w-52 rounded-full bg-cyan-300/25 blur-3xl" />
        <motion.div
          className="relative mx-auto grid h-[410px] w-full max-w-[420px] place-items-center rounded-[2rem] bg-white/55 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.16)]"
          animate={{
            x: pointer.x * 18,
            y: pointer.y * 16,
            rotate: mood === "think" ? -4 : mood === "coach" ? 4 : pointer.x * 3,
          }}
          transition={{ type: "spring", stiffness: 140, damping: 14 }}
        >
          <img
            src={`https://api.dicebear.com/9.x/notionists/svg?seed=${avatarSeed}&backgroundColor=ffd5dc,c0aede,b6e3f4&radius=18`}
            alt="谈薪助手头像"
            className="h-full w-full rounded-[1.5rem] object-contain transition duration-300 group-hover:scale-[1.03]"
          />
        </motion.div>
        <motion.div
          className="pointer-events-none absolute left-[46%] top-[34%] h-3 w-3 rounded-full bg-cyan-950/65 shadow-[0_0_10px_rgba(8,47,73,0.3)]"
          animate={{ x: pointer.x * 10, y: pointer.y * 8 }}
        />
        <motion.div
          className="pointer-events-none absolute left-[55%] top-[34%] h-3 w-3 rounded-full bg-cyan-950/65 shadow-[0_0_10px_rgba(8,47,73,0.3)]"
          animate={{ x: pointer.x * 10, y: pointer.y * 8 }}
        />
        <div className="relative z-10 mx-auto -mt-1 max-w-sm text-center">
          <div className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Negotiation Buddy</div>
          <div className="text-2xl font-black text-slate-950">谈薪助手</div>
          <div className="mt-2 text-sm font-bold leading-6 text-slate-700">鼠标靠近时，我会跟着你的视线移动。</div>
        </div>
      </motion.div>
      <div className="mx-auto -mt-4 max-w-sm rounded-2xl border border-cyan-300/15 bg-cyan-300/10 px-4 py-2 text-xs font-bold leading-6 text-cyan-100 shadow-lg backdrop-blur">
        {copy}
      </div>
      <div className="mt-2 text-[10px] text-slate-600">点击我切换提示</div>
    </motion.button>
  );
}

function HeroProof({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="surface-base rounded-2xl px-4 py-3">
      <div className="flex items-center gap-2 text-xs font-bold text-[var(--accent-cyan)]">
        {icon}
        {label}
      </div>
      <div className="mt-1.5 text-xs leading-relaxed text-[var(--text-tertiary)]">{value}</div>
    </div>
  );
}
