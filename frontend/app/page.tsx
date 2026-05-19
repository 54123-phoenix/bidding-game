"use client";

import { useRef, useEffect, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  animate,
  useInView,
  AnimatePresence,
} from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import GameNetwork from "@/components/game-network";
import { Particles } from "@/components/ui/particles";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import PlayerIcon from "@/components/player-icon";

const STATS = [
  { value: 4, label: "博弈角色", icon: "🎭" },
  { value: 12, label: "维评估体系", icon: "📊" },
  { value: 95, label: "均衡精度", suffix: "%", icon: "🎯" },
  { value: 3, label: "策略模式", icon: "⚡" },
];

const ROLE_CARDS = [
  {
    icon: "C",
    role: "candidate" as const,
    title: "候选人",
    className: "候选人",
    desc: "你的真实能力、薪资底线、外部Offer——只有你自己知道",
    color: "var(--candidate-blue)",
    glow: "var(--candidate-blue-glow)",
    privateItems: ["真实能力 85%（不可观察）", "薪资底线 38K/年", "外部Offer竞品报价"],
    stats: { atk: 75, def: 60, spd: 80, luk: 55 },
  },
  {
    icon: "H",
    role: "hr" as const,
    title: "HR",
    className: "谈判官",
    desc: "掌握真实预算与紧急程度，在公平与利益间博弈",
    color: "var(--hr-purple)",
    glow: "var(--hr-purple-glow)",
    privateItems: ["真实预算 90K/年", "紧急程度：高", "候选人池质量不明"],
    stats: { atk: 80, def: 85, spd: 60, luk: 70 },
  },
  {
    icon: "M",
    role: "market" as const,
    title: "市场环境",
    className: "环境变量",
    desc: "供需比、薪资趋势、热门技能溢价——无形之手",
    color: "var(--market-emerald)",
    glow: "#34d39933",
    privateItems: ["供需比 1.3（候选人市场）", "AI/大模型技能溢价", "薪资趋势上行"],
    stats: { atk: 50, def: 90, spd: 40, luk: 85 },
  },
  {
    icon: "I",
    role: "interviewer" as const,
    title: "面试官",
    className: "暗影裁判",
    desc: "评分严格度与隐性偏见，你的命运在暗处被衡量",
    color: "var(--interviewer-amber)",
    glow: "#fbbf2433",
    privateItems: ["评分严格度 72%", "隐含风险偏好：保守", "隐性评估偏差存在"],
    stats: { atk: 65, def: 70, spd: 50, luk: 90 },
  },
];

const GAME_FEATURES = [
  {
    icon: "🧠",
    title: "贝叶斯推理",
    desc: "每位参与者基于信念更新策略，信息不对称下的理性博弈",
  },
  {
    icon: "⚔️",
    title: "多轮交锋",
    desc: "报价、还价、施压、妥协——真实谈判的完整博弈树",
  },
  {
    icon: "🎭",
    title: "角色人格",
    desc: "铁面判官、焦虑招募、老狐狸——不同HR人格带来不同挑战",
  },
  {
    icon: "📈",
    title: "纳什均衡",
    desc: "求解贝叶斯纳什均衡，揭示信息不对称的真实代价",
  },
];

function StatItem({ value, label, suffix = "", icon }: { value: number; label: string; suffix?: string; icon: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (isInView) {
      const ctrl = animate(0, value, {
        duration: 2,
        ease: [0.32, 0.72, 0, 1],
        onUpdate: (v) => setVal(Math.round(v)),
      });
      return () => ctrl.stop();
    }
  }, [isInView, value]);

  return (
    <div ref={ref} className="text-center flex flex-col items-center gap-1.5">
      <span className="text-lg">{icon}</span>
      <div className="text-2xl md:text-3xl font-bold font-mono tabular-nums" style={{ color: "var(--accent-cyan)" }}>
        {val}{suffix}
      </div>
      <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>{label}</div>
    </div>
  );
}

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <div ref={ref} className="flex items-center gap-2">
      <span className="text-[9px] w-6 text-right font-mono" style={{ color: "var(--text-tertiary)" }}>{label}</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-elev)" }}>
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={isInView ? { width: `${value}%` } : {}}
          transition={{ duration: 1.2, ease: [0.32, 0.72, 0, 1], delay: 0.3 }}
        />
      </div>
      <span className="text-[9px] w-5 font-mono" style={{ color: "var(--text-tertiary)" }}>{value}</span>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const heroRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const smX = useSpring(mouseX, { stiffness: 60, damping: 28 });
  const smY = useSpring(mouseY, { stiffness: 60, damping: 28 });
  const [history, setHistory] = useState<Array<Record<string, any>>>([]);
  const [hoveredRole, setHoveredRole] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("bidding_history");
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
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
      className="overflow-hidden"
      style={{ backgroundColor: "var(--bg-canvas)" }}
    >
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden">
        <Particles
          className="absolute inset-0 z-0"
          quantity={120}
          staticity={30}
          ease={80}
          color="#22d3ee"
          size={0.6}
          vx={0.1}
          vy={0.1}
        />

        <div className="absolute inset-0 z-10 flex items-center justify-center opacity-50">
          <GameNetwork mouseX={smX} mouseY={smY} />
        </div>

        <div className="absolute inset-0 z-20 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(8,10,16,0.85)_100%)]" />

        <motion.div
          className="relative z-30 text-center max-w-3xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm mb-8"
            style={{
              borderColor: "var(--accent-cyan)30",
              backgroundColor: "var(--accent-cyan-glow)",
              color: "var(--accent-cyan)",
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: "var(--accent-cyan)" }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: "var(--accent-cyan)" }} />
            </span>
            Bayesian Game Engine v2.0
          </motion.div>

          <motion.h1
            className="text-5xl md:text-7xl font-bold tracking-tight mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <span className="bg-gradient-to-r from-[var(--accent-cyan)] via-[var(--candidate-blue)] to-[var(--hr-purple)] bg-clip-text text-transparent">
              AI 薪资博弈
            </span>
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl mb-3"
            style={{ color: "var(--text-secondary)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            进入不完备信息的谈判竞技场
          </motion.p>
          <motion.p
            className="text-sm mb-10 max-w-xl mx-auto leading-relaxed"
            style={{ color: "var(--text-tertiary)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            四位博弈参与者各自持有私有信息，在信息不对称条件下进行多轮策略博弈。
            你能在这场博弈中拿到最优薪资吗？
          </motion.p>

          <motion.div
            className="flex gap-4 justify-center flex-wrap"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Link href="/play?quick=1">
              <ShimmerButton
                shimmerColor="#22d3ee"
                background="linear-gradient(135deg, #0891b2, #2563eb)"
                borderRadius="12px"
                className="px-10 py-4 font-semibold text-lg shadow-lg shadow-cyan-600/20"
              >
                <span className="flex items-center gap-2">
                  ⚔️ 进入竞技场
                  <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>→</motion.span>
                </span>
              </ShimmerButton>
            </Link>
            <Link href="/play">
              <ShimmerButton
                shimmerColor="#94a3b8"
                background="rgba(30,41,59,0.9)"
                borderRadius="12px"
                className="px-10 py-4 font-semibold text-lg border border-[var(--border-strong)]"
              >
                🎯 自定义对局
              </ShimmerButton>
            </Link>
          </motion.div>
          <motion.p
            className="text-xs mt-3"
            style={{ color: "var(--text-tertiary)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            快速体验使用预置数据，无需上传简历
          </motion.p>
        </motion.div>

        <div className="relative z-30 mt-16 md:mt-24">
          <div
            className="flex flex-wrap items-center justify-center gap-6 md:gap-12 px-8 py-5 rounded-2xl backdrop-blur border"
            style={{
              backgroundColor: "var(--bg-panel)CC",
              borderColor: "var(--border-hairline)",
            }}
          >
            {STATS.map((s, i) => (
              <div key={s.label} className="flex items-center gap-3">
                <StatItem value={s.value} label={s.label} suffix={s.suffix ?? ""} icon={s.icon} />
                {i < STATS.length - 1 && <div className="w-px h-10 hidden md:block" style={{ backgroundColor: "var(--border-hairline)" }} />}
              </div>
            ))}
          </div>
        </div>

        <motion.div className="absolute bottom-8 z-30" animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }}>
          <div className="w-5 h-8 rounded-full border flex items-start justify-center p-1" style={{ borderColor: "var(--border-strong)" }}>
            <motion.div
              className="w-1 h-2.5 rounded-full"
              style={{ backgroundColor: "var(--accent-cyan)" }}
              animate={{ y: [0, 12, 0], opacity: [0.8, 0.2, 0.8] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </section>

      <section className="relative z-30 max-w-6xl mx-auto px-4 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={{ duration: 0.7 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border mb-4"
            style={{ borderColor: "var(--border-hairline)", backgroundColor: "var(--bg-panel)" }}>
            <span className="text-xs">🎭</span>
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>角色档案</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>
            不完备信息的四方博弈
          </h2>
          <p className="text-sm max-w-lg mx-auto" style={{ color: "var(--text-tertiary)" }}>
            每位参与者掌握私有信息，在信息不对称中策略性博弈
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {ROLE_CARDS.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              onMouseEnter={() => setHoveredRole(card.title)}
              onMouseLeave={() => setHoveredRole(null)}
              className="group"
            >
              <motion.div
                className="relative overflow-hidden rounded-2xl border p-5 transition-all cursor-default"
                style={{
                  borderColor: hoveredRole === card.title ? `${card.color}40` : "var(--border-hairline)",
                  backgroundColor: "var(--bg-panel)",
                  boxShadow: hoveredRole === card.title ? `0 0 30px ${card.glow}` : "none",
                }}
                animate={hoveredRole === card.title ? { scale: 1.01 } : { scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    background: `radial-gradient(circle at 50% 0%, ${card.glow}, transparent 70%)`,
                  }}
                />

                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center border"
                        style={{
                          backgroundColor: `${card.glow}`,
                          borderColor: `${card.color}30`,
                        }}
                      >
                        <PlayerIcon player={card.role} size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{card.title}</h3>
                        <span className="text-[10px]" style={{ color: card.color }}>{card.className}</span>
                      </div>
                    </div>
                    <span
                      className="text-[9px] px-2 py-0.5 rounded-full border font-mono"
                      style={{
                        color: "var(--text-tertiary)",
                        borderColor: "var(--border-hairline)",
                        backgroundColor: "var(--bg-elev)",
                      }}
                    >
                      私有信息
                    </span>
                  </div>

                  <p className="text-xs mb-4 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{card.desc}</p>

                  <div className="space-y-1.5 mb-4">
                    {card.privateItems.map((item) => (
                      <div key={item} className="flex items-center gap-2 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                        <div className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: card.color }} />
                        {item}
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t" style={{ borderColor: "var(--border-hairline)" }}>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      <StatBar label="ATK" value={card.stats.atk} color={card.color} />
                      <StatBar label="DEF" value={card.stats.def} color={card.color} />
                      <StatBar label="SPD" value={card.stats.spd} color={card.color} />
                      <StatBar label="LUK" value={card.stats.luk} color={card.color} />
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="relative z-30 max-w-5xl mx-auto px-4 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={{ duration: 0.7 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border mb-4"
            style={{ borderColor: "var(--border-hairline)", backgroundColor: "var(--bg-panel)" }}>
            <span className="text-xs">⚙️</span>
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>核心机制</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>
            博弈引擎
          </h2>
          <p className="text-sm max-w-lg mx-auto" style={{ color: "var(--text-tertiary)" }}>
            基于博弈论与AI推理的薪资谈判模拟
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {GAME_FEATURES.map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="rounded-xl border p-5 group hover:border-[var(--accent-cyan)]/30 transition-all"
              style={{
                borderColor: "var(--border-hairline)",
                backgroundColor: "var(--bg-panel)",
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 border"
                  style={{
                    backgroundColor: "var(--accent-cyan-glow)",
                    borderColor: "var(--accent-cyan)20",
                  }}
                >
                  {feat.icon}
                </div>
                <div>
                  <h3 className="font-bold text-sm mb-1" style={{ color: "var(--text-primary)" }}>{feat.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-tertiary)" }}>{feat.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {history.length > 0 && (
        <section className="relative z-30 max-w-5xl mx-auto px-4 pb-24">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-120px" }}
            transition={{ duration: 0.7 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border mb-4"
              style={{ borderColor: "var(--border-hairline)", backgroundColor: "var(--bg-panel)" }}>
              <span className="text-xs">📜</span>
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>战斗记录</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>
              历史对局
            </h2>
            <p className="text-sm max-w-lg mx-auto" style={{ color: "var(--text-tertiary)" }}>
              点击卡片回看过往的薪资谈判博弈结果
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {history.slice(0, 6).map((item, i) => {
              const isAccepted = item.outcome === "accepted";
              const date = new Date(item.timestamp).toLocaleDateString("zh-CN", {
                month: "short", day: "numeric",
              });
              return (
                <motion.button
                  key={item.id}
                  onClick={() => router.push(`/play?review=${item.id}`)}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="text-left rounded-xl border p-5 transition-all w-full"
                  style={{
                    backgroundColor: "var(--bg-panel)",
                    borderColor: "var(--border-hairline)",
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>{date}</span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-bold border"
                      style={{
                        color: isAccepted ? "var(--state-success)" : "var(--state-danger)",
                        borderColor: isAccepted ? "var(--accent-green)30" : "var(--state-danger)30",
                        backgroundColor: isAccepted ? "var(--accent-green-glow)" : "rgba(251,113,133,0.1)",
                      }}
                    >
                      {isAccepted ? "✓ 达成协议" : "✗ 谈判破裂"}
                    </span>
                  </div>
                  <div className="text-sm font-semibold mb-1 truncate" style={{ color: "var(--text-primary)" }}>
                    {item.jobTitle || "岗位"} @ {item.jobCompany || "公司"}
                  </div>
                  <div className="text-xs mb-3 truncate" style={{ color: "var(--text-tertiary)" }}>
                    {item.resumeName || "候选人"} · {item.jobLevel || ""}
                  </div>
                  <div className="flex items-center gap-4 text-xs" style={{ color: "var(--text-secondary)" }}>
                    {item.finalSalary ? (
                      <span className="font-mono font-bold" style={{ color: "var(--accent-cyan)" }}>
                        {item.finalSalary}K/年
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-tertiary)" }}>—</span>
                    )}
                    <span style={{ color: "var(--border-strong)" }}>|</span>
                    <span>{item.negotiationRounds || 0} 轮交锋</span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </section>
      )}

      <section className="relative z-30 max-w-3xl mx-auto px-4 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="rounded-2xl border p-10"
          style={{
            backgroundColor: "var(--bg-panel)",
            borderColor: "var(--border-hairline)",
          }}
        >
          <div className="text-4xl mb-4">🏟️</div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>
            准备好了吗？
          </h2>
          <p className="text-sm mb-8 max-w-md mx-auto" style={{ color: "var(--text-tertiary)" }}>
            进入竞技场，与AI驱动的HR进行一场真实的薪资博弈。
            你的每一次报价、每一次妥协，都将影响最终结果。
          </p>
          <Link href="/play?quick=1">
            <ShimmerButton
              shimmerColor="#22d3ee"
              background="linear-gradient(135deg, #0891b2, #2563eb)"
              borderRadius="12px"
              className="px-12 py-4 font-semibold text-lg shadow-lg shadow-cyan-600/20"
            >
              <span className="flex items-center gap-2">
                ⚔️ 开始博弈
                <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>→</motion.span>
              </span>
            </ShimmerButton>
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
