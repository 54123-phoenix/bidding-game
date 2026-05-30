"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { listGames, type GameSession } from "@/lib/game-api";
import { getDemoGameSessions, seedDemoHistoryIfEmpty } from "@/lib/demo-history";
import { Play, Clock, Trophy, XCircle, Minus, TrendingUp, User, Building2, ArrowRight, Loader2, RefreshCw, UserRound } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────

interface FunnelStats {
  total: number;
  passed: number;
  negotiating: number;
  success: number;
  rejected: number;
}

const REPLAY_ROUNDS = [
  {
    label: "Round 1",
    text: "HR 首轮压价，候选人保留锚点。",
    tag: "风险低",
    note: "当前局势稳定。继续保持锚点，避免过早亮出外部 Offer。",
    points: [[160, 45], [230, 118], [160, 205], [70, 130]],
  },
  {
    label: "Round 2",
    text: "HR 压低预算口径，候选人补充项目影响力。",
    tag: "承压",
    note: "风险外扩，耐心内收。应减少解释性话术，改用可验证的项目贡献。",
    points: [[158, 58], [218, 116], [160, 224], [94, 130]],
  },
  {
    label: "Round 3",
    text: "释放外部 Offer，换取总包上调。",
    tag: "关键",
    note: "筹码扩张，风险回落。下一步应锁定总包结构，而非继续追逐口头涨幅。",
    points: [[158, 42], [252, 112], [160, 188], [78, 130]],
  },
];

// ── Status helpers ─────────────────────────────────────────────────

function statusConfig(status: string) {
  switch (status) {
    case "accepted":
      return { label: "谈判成功", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: Trophy };
    case "rejected":
      return { label: "谈判破裂", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", icon: XCircle };
    case "negotiating":
      return { label: "谈判中", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: Clock };
    default:
      return { label: "初筛中", color: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/20", icon: Minus };
  }
}

// ── Funnel Bar ─────────────────────────────────────────────────────

function FunnelBar({ stats }: { stats: FunnelStats }) {
  const items = [
    { label: "投递", value: stats.total, color: "bg-slate-600" },
    { label: "初筛通过", value: stats.passed, color: "bg-blue-500" },
    { label: "谈判中", value: stats.negotiating, color: "bg-amber-500" },
    { label: "成功", value: stats.success, color: "bg-emerald-500" },
  ];

  return (
    <div className="flex items-center gap-1 h-2">
      {items.map((item, i) => {
        const pct = stats.total > 0 ? (item.value / stats.total) * 100 : 0;
        return (
          <motion.div
            key={item.label}
            className={`h-full rounded-full ${item.color}`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, delay: i * 0.1 }}
            title={`${item.label}: ${item.value}`}
          />
        );
      })}
    </div>
  );
}

// ── Session Card ───────────────────────────────────────────────────

function SessionCard({ session, isActive, onClick }: { session: GameSession; isActive: boolean; onClick: () => void }) {
  const cfg = statusConfig(session.status);
  const Icon = cfg.icon;

  return (
    <motion.button
      onClick={onClick}
      className={`w-full text-left rounded-2xl border p-3 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:translate-x-3 ${
        isActive
          ? "bg-white/[0.04] border-white/25"
          : "bg-white/[0.025] border-white/[0.05] hover:border-white/25"
      }`}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-200 truncate">{session.job_title}</span>
            {session.job_level && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">{session.job_level}</span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <Building2 size={10} className="text-slate-600 shrink-0" />
            <span className="text-xs text-slate-500 truncate">{session.job_company}</span>
          </div>
        </div>
        <div className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
          <Icon size={10} />
          {cfg.label}
        </div>
      </div>

      <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-600">
        <span className="flex items-center gap-1">
          <User size={10} />
          {session.candidate_name}
        </span>
        <span className="flex items-center gap-1">
          <TrendingUp size={10} />
          {session.strategy === "aggressive" ? "激进" : session.strategy === "conservative" ? "保守" : "稳健"}
        </span>
        {session.public_offer && (
          <span className="font-mono text-cyan-400">{session.public_offer}k</span>
        )}
      </div>

      <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
          style={{ width: `${(session.round / session.max_rounds) * 100}%` }}
        />
      </div>
    </motion.button>
  );
}

// ── Detail Panel ───────────────────────────────────────────────────

function DetailPanel({ session, replayStep, onStep }: { session: GameSession | null; replayStep: number; onStep: () => void }) {
  if (!session) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-600">
        <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-4">
          <Play size={24} className="text-slate-700" />
        </div>
        <p className="text-sm">选择一个投递查看详情</p>
        <p className="text-xs text-slate-700 mt-1">或创建新的谈判模拟</p>
      </div>
    );
  }

  const cfg = statusConfig(session.status);
  const Icon = cfg.icon;

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-5 space-y-5">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
              <Icon size={10} className="inline mr-1" />
              {cfg.label}
            </span>
            <span className="text-[10px] text-slate-600">Round {session.round}/{session.max_rounds}</span>
          </div>
          <h2 className="text-xl font-bold text-white">{session.job_title}</h2>
          <p className="text-sm text-slate-500">{session.job_company} · {session.job_level}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-3 text-center">
            <div className="text-lg font-bold text-cyan-400 font-mono">{session.public_offer ?? "--"}</div>
            <div className="text-[10px] text-slate-600 uppercase tracking-wider mt-0.5">当前报价</div>
          </div>
          <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-3 text-center">
            <div className="text-lg font-bold text-slate-300 font-mono">{session.round}</div>
            <div className="text-[10px] text-slate-600 uppercase tracking-wider mt-0.5">已进行回合</div>
          </div>
          <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-3 text-center">
            <div className="text-lg font-bold text-slate-300">
              {session.strategy === "aggressive" ? "激进" : session.strategy === "conservative" ? "保守" : "稳健"}
            </div>
            <div className="text-[10px] text-slate-600 uppercase tracking-wider mt-0.5">策略</div>
          </div>
        </div>

        {/* Continue Button */}
        {session.status === "negotiating" && (
          <Link
            href={`/play?session=${session.session_id}`}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-cyan-600 text-white font-bold text-sm hover:bg-cyan-500 transition"
          >
            继续谈判 <ArrowRight size={14} />
          </Link>
        )}

        {/* Replay Button */}
        {session.status !== "negotiating" && (
          <Link
            href={`/play?review=${session.session_id}`}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-sm hover:bg-slate-700 transition border border-slate-700"
          >
            查看回放 <ArrowRight size={14} />
          </Link>
        )}

        {/* Session Info */}
        <div className="rounded-xl bg-white/[0.025] border border-white/[0.05] p-3 space-y-2">
          <div className="text-[10px] text-slate-600 uppercase tracking-wider font-bold">会话信息</div>
          <div className="text-xs text-slate-500 font-mono">ID: {session.session_id}</div>
          <div className="text-xs text-slate-500">候选人: {session.candidate_name}</div>
        </div>

        <div className="rounded-xl bg-white/[0.025] border border-white/[0.05] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Round Replay</div>
            <button
              onClick={onStep}
              disabled={replayStep >= REPLAY_ROUNDS.length - 1}
              className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-bold text-slate-300 transition hover:border-white/25 disabled:cursor-default disabled:opacity-30"
            >
              步进推演 &gt;
            </button>
          </div>
          <div className="space-y-2">
            {REPLAY_ROUNDS.slice(0, replayStep + 1).map((round, index) => (
              <motion.div
                key={round.label}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: index === replayStep ? 1 : 0.3, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="grid grid-cols-[64px_1fr_auto] items-center gap-2 border-b border-white/[0.05] pb-2 text-xs text-slate-400"
              >
                <b className="text-slate-300">{round.label}</b>
                <TypewriterText text={round.text} active={index === replayStep} />
                <b className="text-slate-400">{round.tag}</b>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TypewriterText({ text, active }: { text: string; active: boolean }) {
  const [display, setDisplay] = useState(active ? "" : text);

  useEffect(() => {
    if (!active) {
      return;
    }
    const timers = [...text].map((_, index) => window.setTimeout(() => setDisplay(text.slice(0, index + 1)), index * 18));
    return () => timers.forEach(window.clearTimeout);
  }, [active, text]);

  return <span>{display}</span>;
}

// ── AI Advisor Panel ───────────────────────────────────────────────

function AIAdvisorPanel({ session, replayStep }: { session: GameSession | null; replayStep: number }) {
  if (!session) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-700 px-4">
        <div className="w-12 h-12 rounded-xl bg-slate-800/30 flex items-center justify-center mb-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>
        </div>
        <p className="text-xs text-center">选择投递后，AI顾问将分析你的谈判策略</p>
      </div>
    );
  }

  const tips = [
    session.status === "negotiating" && "HR还在等待你的下一步，当前局势微妙。",
    session.status === "accepted" && "恭喜！你的策略奏效了。可以复盘看看哪些出牌最关键。",
    session.status === "rejected" && "谈判破裂不意味着失败。分析HR的耐心消耗曲线，找出出牌时机问题。",
    session.strategy === "aggressive" && "激进策略适合HR耐心高、岗位紧急的情况。",
    session.strategy === "conservative" && "保守策略稳扎稳打，但可能错过溢价空间。",
  ].filter(Boolean);

  const points = REPLAY_ROUNDS[replayStep].points;
  const pointString = points.map((point) => point.join(",")).join(" ");
  const [trust, leverage, risk, patience] = points;

  return (
    <div className="h-full overflow-y-auto p-4">
        <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-400"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
        </div>

        <div className="relative mb-4 h-[220px]">
          <svg viewBox="0 0 330 260" className="absolute inset-0 h-full w-full" aria-hidden="true">
            <polygon points={pointString} className="fill-slate-500/10 stroke-slate-500/70 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" strokeWidth="1.5" />
            <line x1={trust[0]} y1={trust[1]} x2={leverage[0]} y2={leverage[1]} className="stroke-slate-500/50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" />
            <line x1={leverage[0]} y1={leverage[1]} x2={risk[0]} y2={risk[1]} className="stroke-slate-500/50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" />
            <line x1={risk[0]} y1={risk[1]} x2={patience[0]} y2={patience[1]} className="stroke-slate-500/50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" />
            <line x1={patience[0]} y1={patience[1]} x2={trust[0]} y2={trust[1]} className="stroke-slate-500/50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" />
          </svg>
          <RadarNode point={trust} label="信任" value="72" />
          <RadarNode point={leverage} label="筹码" value="84" />
          <RadarNode point={risk} label="风险" value={replayStep === 1 ? "46" : replayStep === 2 ? "31" : "28"} />
          <RadarNode point={patience} label="耐心" value={replayStep === 1 ? "44" : "61"} />
        </div>

        <div className="mb-4 rounded-lg border border-white/[0.05] bg-white/[0.025] p-3 text-xs leading-relaxed text-slate-400">
          {REPLAY_ROUNDS[replayStep].note}
        </div>
        <span className="text-sm font-bold text-slate-300">AI 顾问</span>
      </div>

      <div className="space-y-3">
        {tips.map((tip, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="rounded-lg bg-slate-900/50 border border-slate-800 p-3"
          >
            <p className="text-xs text-slate-400 leading-relaxed">{tip}</p>
          </motion.div>
        ))}

        <div className="rounded-lg bg-slate-900/30 border border-slate-800/50 p-3">
          <div className="text-[10px] text-slate-600 uppercase tracking-wider font-bold mb-2">建议操作</div>
          <div className="space-y-1.5">
            <button className="w-full text-left text-xs text-slate-400 hover:text-cyan-400 transition py-1">
              → 对比同岗位不同策略
            </button>
            <button className="w-full text-left text-xs text-slate-400 hover:text-cyan-400 transition py-1">
              → 查看信号强度分析
            </button>
            <button className="w-full text-left text-xs text-slate-400 hover:text-cyan-400 transition py-1">
              → 获取改进建议
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RadarNode({ point, label, value }: { point: number[]; label: string; value: string }) {
  return (
    <div
      className="absolute grid h-[58px] w-[58px] place-items-center rounded-full border border-white/[0.06] bg-white/[0.02] text-center text-[10px] font-bold leading-tight text-slate-400 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
      style={{ left: point[0] - 29, top: point[1] - 29 }}
    >
      {label}<br />{value}
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────

export default function DashboardPage() {
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replayStep, setReplayStep] = useState(0);

  const selectedSession = sessions.find((s) => s.session_id === selectedId) || null;

  const stats: FunnelStats = {
    total: sessions.length,
    passed: sessions.filter((s) => s.status !== "rejected" || s.round > 0).length,
    negotiating: sessions.filter((s) => s.status === "negotiating").length,
    success: sessions.filter((s) => s.status === "accepted").length,
    rejected: sessions.filter((s) => s.status === "rejected").length,
  };

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listGames();
      if (data.status === "ok" && data.sessions.length > 0) {
        setSessions(data.sessions);
        if (!selectedId) {
          setSelectedId(data.sessions[0].session_id);
        }
      } else {
        seedDemoHistoryIfEmpty();
        const demoSessions = getDemoGameSessions();
        setSessions(demoSessions);
        if (!selectedId) setSelectedId(demoSessions[0]?.session_id || null);
      }
    } catch {
      seedDemoHistoryIfEmpty();
      const demoSessions = getDemoGameSessions();
      setSessions(demoSessions);
      if (!selectedId) setSelectedId(demoSessions[0]?.session_id || null);
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSessions();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadSessions]);

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col bg-[#05070a]">
      {/* Top: Funnel + Stats */}
      <div className="border-b border-white/[0.05] bg-white/[0.025] px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <div className="text-sm font-bold text-white">投递概览</div>
              <div className="flex items-center gap-3 text-[10px] text-slate-500">
                <span>总投递 {stats.total}</span>
                <span className="text-emerald-400">成功 {stats.success}</span>
                <span className="text-rose-400">破裂 {stats.rejected}</span>
                <span className="text-amber-400">进行中 {stats.negotiating}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadSessions}
                className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-800 hover:text-slate-300"
                title="刷新"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              </button>
              <Link
                href="/profile"
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-bold text-slate-400 transition hover:text-cyan-200"
              >
                <UserRound size={12} /> 用户信息
              </Link>
              <Link
                href="/play"
                className="primary-action flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition"
              >
                <Play size={12} /> 新投递
              </Link>
            </div>
          </div>
          <FunnelBar stats={stats} />
        </div>
      </div>

      {/* Three-column layout */}
      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1">
        {/* Left: Session List */}
        <div className="w-72 border-r border-white/[0.05] flex flex-col">
          <div className="px-3 py-2 border-b border-white/[0.05] flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">投递列表</span>
            <span className="text-[10px] text-slate-600">{sessions.length} 条</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading && sessions.length === 0 && (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-slate-600" />
              </div>
            )}
            {error && (
              <div className="text-center py-6">
                <p className="text-xs text-rose-400 mb-2">{error}</p>
                <button onClick={loadSessions} className="text-xs text-cyan-400 hover:underline">重试</button>
              </div>
            )}
            {!loading && !error && sessions.length === 0 && (
              <div className="text-center py-8">
                <p className="text-xs text-slate-600 mb-3">暂无投递记录</p>
                <Link href="/play" className="text-xs text-cyan-400 hover:underline">开始第一次谈判 →</Link>
              </div>
            )}
            <AnimatePresence>
              {sessions.map((session) => (
                <SessionCard
                  key={session.session_id}
                  session={session}
                  isActive={session.session_id === selectedId}
                  onClick={() => {
                    setSelectedId(session.session_id);
                    setReplayStep(0);
                  }}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Center: Detail */}
        <div className="flex-1 border-r border-white/[0.05]">
          <DetailPanel session={selectedSession} replayStep={replayStep} onStep={() => setReplayStep((step) => Math.min(step + 1, REPLAY_ROUNDS.length - 1))} />
        </div>

        {/* Right: AI Advisor */}
        <div className="w-64">
          <AIAdvisorPanel session={selectedSession} replayStep={replayStep} />
        </div>
      </div>
    </div>
  );
}
