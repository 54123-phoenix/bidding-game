"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { listGames, type GameSession } from "@/lib/game-api";
import { getDemoGameSessions, seedDemoHistoryIfEmpty } from "@/lib/demo-history";
import { Clock, Trophy, XCircle, ArrowRight, Play, Loader2 } from "lucide-react";

function statusStyle(status: string) {
  switch (status) {
    case "accepted":
      return { label: "成功", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: Trophy };
    case "rejected":
      return { label: "破裂", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", icon: XCircle };
    case "negotiating":
      return { label: "进行中", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: Clock };
    default:
      return { label: "初筛", color: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/20", icon: Play };
  }
}

interface RecentSessionsProps {
  onContinue?: (sessionId: string) => void;
}

export default function RecentSessions({ onContinue }: RecentSessionsProps) {
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await listGames();
      if (data.status === "ok" && data.sessions.length > 0) {
        setSessions(data.sessions.slice(0, 6));
      } else {
        seedDemoHistoryIfEmpty();
        setSessions(getDemoGameSessions().slice(0, 6));
      }
    } catch {
      seedDemoHistoryIfEmpty();
      setSessions(getDemoGameSessions().slice(0, 6));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (loading) {
    return (
      <motion.div
        className="mt-8 flex items-center justify-center gap-2 text-slate-600"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Loader2 size={14} className="animate-spin" />
        <span className="text-xs">加载记录...</span>
      </motion.div>
    );
  }

  if (sessions.length === 0) return null;

  return (
    <motion.div
      className="mx-auto mt-10 w-full max-w-3xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.7 }}
    >
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="text-xs font-semibold text-slate-500">
          最近模拟
        </span>
        <span className="text-[10px] text-slate-600 ml-auto">
          {sessions.length} 条
        </span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {sessions.map((session, i) => {
          const cfg = statusStyle(session.status);
          const Icon = cfg.icon;
          const isNegotiating = session.status === "negotiating";
          const href = isNegotiating
            ? `/play?session=${session.session_id}`
            : `/play?review=${session.session_id}`;

          return (
            <motion.div
              key={session.session_id}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.7 + i * 0.05 }}
            >
              <Link
                href={href}
                onClick={() => onContinue?.(session.session_id)}
                 className="surface-base group block min-w-[180px] rounded-2xl p-3 transition hover:border-slate-600/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-300 truncate max-w-[100px]">
                    {session.job_title}
                  </span>
                  <span
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium ${cfg.bg} ${cfg.color} border ${cfg.border}`}
                  >
                    <Icon size={9} />
                    {cfg.label}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 mb-2 truncate">
                  {session.job_company} · {session.job_level}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] text-slate-600">
                    <span>Round {session.round}/{session.max_rounds}</span>
                    {session.public_offer && (
                      <span className="font-mono text-cyan-400">
                        {session.public_offer}k
                      </span>
                    )}
                  </div>
                  <ArrowRight
                    size={12}
                    className="text-slate-600 group-hover:text-cyan-400 transition"
                  />
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
