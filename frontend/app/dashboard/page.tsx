"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { listGames, type GameSession } from "@/lib/game-api";
import { Play, Clock, Trophy, XCircle, Minus, TrendingUp, User, Building2, ArrowRight, Loader2, RefreshCw } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────

interface FunnelStats {
  total: number;
  passed: number;
  negotiating: number;
  success: number;
  rejected: number;
}

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
      className={`w-full text-left rounded-xl border p-3 transition-all ${
        isActive
          ? "bg-slate-800/80 border-cyan-500/30 shadow-lg shadow-cyan-500/5"
          : "bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50"
      }`}
      whileHover={{ scale: 1.01 }}
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

function DetailPanel({ session }: { session: GameSession | null }) {
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
        <div className="rounded-xl bg-slate-900/30 border border-slate-800/50 p-3 space-y-2">
          <div className="text-[10px] text-slate-600 uppercase tracking-wider font-bold">会话信息</div>
          <div className="text-xs text-slate-500 font-mono">ID: {session.session_id}</div>
          <div className="text-xs text-slate-500">候选人: {session.candidate_name}</div>
        </div>
      </div>
    </div>
  );
}

// ── AI Advisor Panel ───────────────────────────────────────────────

function AIAdvisorPanel({ session }: { session: GameSession | null }) {
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

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-400"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
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

// ── Main Dashboard ─────────────────────────────────────────────────

export default function DashboardPage() {
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      if (data.status === "ok") {
        setSessions(data.sessions);
        if (data.sessions.length > 0 && !selectedId) {
          setSelectedId(data.sessions[0].session_id);
        }
      } else {
        setError(data.message || "加载失败");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "网络错误");
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  return (
    <div className="h-[calc(100vh-56px)] bg-[#050508] flex flex-col">
      {/* Top: Funnel + Stats */}
      <div className="border-b border-slate-800/60 bg-[#0a0c10] px-4 py-3">
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
                className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition"
                title="刷新"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              </button>
              <Link
                href="/play"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-cyan-600 text-white text-xs font-bold hover:bg-cyan-500 transition"
              >
                <Play size={12} /> 新投递
              </Link>
            </div>
          </div>
          <FunnelBar stats={stats} />
        </div>
      </div>

      {/* Three-column layout */}
      <div className="flex-1 flex min-h-0 max-w-7xl mx-auto w-full">
        {/* Left: Session List */}
        <div className="w-72 border-r border-slate-800/60 flex flex-col">
          <div className="px-3 py-2 border-b border-slate-800/60 flex items-center justify-between">
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
                  onClick={() => setSelectedId(session.session_id)}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Center: Detail */}
        <div className="flex-1 border-r border-slate-800/60">
          <DetailPanel session={selectedSession} />
        </div>

        {/* Right: AI Advisor */}
        <div className="w-64">
          <AIAdvisorPanel session={selectedSession} />
        </div>
      </div>
    </div>
  );
}
