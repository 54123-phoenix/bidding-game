"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TimelineEvent {
  year: number;
  month: number;
  event_type: string;
  title: string;
  description: string;
  salary: number | null;
  level: string | null;
  satisfaction: number | null;
  triggered_by: string;
  icon: string;
}

interface Universe {
  universe_id: string;
  universe_label: string;
  universe_emoji: string;
  trigger_decision: string;
  color: string;
  timeline: TimelineEvent[];
  final_assessment: string;
  regret_score: number;
  final_salary: number;
  final_satisfaction: number;
}

interface ParallelUniversesProps {
  baseUniverse: Universe;
  alternatives: Universe[];
  comparisonSummary: string;
  keyInsight: string;
}

export default function ParallelUniverses({
  baseUniverse,
  alternatives,
  comparisonSummary,
  keyInsight,
}: ParallelUniversesProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const allUniverses = [baseUniverse, ...alternatives];

  return (
    <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-panel)] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--border-hairline)] bg-[var(--bg-elev)]/50">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🌌</span>
          <span className="text-sm font-bold text-[var(--text-primary)]">平行宇宙</span>
        </div>
        <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
          {comparisonSummary || "如果你做出了不同的选择，职业生涯会如何发展？"}
        </p>
        {keyInsight && (
          <div className="mt-2 text-xs text-[var(--accent-cyan)] bg-[var(--accent-cyan-glow)] rounded-lg px-3 py-1.5 border border-[var(--accent-cyan)]/20">
            💡 {keyInsight}
          </div>
        )}
      </div>

      {/* Universe selector */}
      <div className="p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {allUniverses.map((u) => {
            const isActive = selectedId === u.universe_id;
            const isBase = u.universe_id === baseUniverse.universe_id;
            return (
              <motion.button
                key={u.universe_id}
                onClick={() => setSelectedId(isActive ? null : u.universe_id)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors"
                style={{
                  borderColor: isActive ? u.color : "var(--border-hairline)",
                  backgroundColor: isActive ? `${u.color}15` : "var(--bg-card)",
                  color: isActive ? u.color : "var(--text-secondary)",
                }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <span>{u.universe_emoji}</span>
                <span>{isBase ? "本宇宙" : u.universe_label}</span>
                {u.regret_score > 0.5 && (
                  <span className="text-[9px] px-1 py-0.5 rounded bg-[var(--state-danger)]/15 text-[var(--state-danger)]">
                    高遗憾
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Selected universe timeline */}
        <AnimatePresence mode="wait">
          {selectedId && (
            <motion.div
              key={selectedId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.25 }}
              className="space-y-3"
            >
              {(() => {
                const u = allUniverses.find((x) => x.universe_id === selectedId);
                if (!u) return null;
                return (
                  <>
                    {/* Universe stats */}
                    <div className="flex gap-3">
                      <StatBadge label="最终薪资" value={`${u.final_salary}K`} color={u.color} />
                      <StatBadge
                        label="满意度"
                        value={`${Math.round(u.final_satisfaction * 100)}%`}
                        color={u.color}
                      />
                      <StatBadge
                        label="遗憾指数"
                        value={`${Math.round(u.regret_score * 100)}%`}
                        color={u.regret_score > 0.5 ? "var(--state-danger)" : "var(--state-success)"}
                      />
                    </div>

                    {/* Trigger */}
                    <div className="text-xs text-[var(--text-tertiary)]">
                      触发决策: <span className="text-[var(--text-secondary)]">{u.trigger_decision}</span>
                    </div>

                    {/* Timeline */}
                    <div className="relative pl-4 border-l-2 space-y-4" style={{ borderColor: `${u.color}30` }}>
                      {u.timeline.map((event, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.06 }}
                          className="relative"
                        >
                          {/* Dot */}
                          <div
                            className="absolute -left-[21px] top-0.5 w-3 h-3 rounded-full border-2"
                            style={{
                              backgroundColor: "var(--bg-panel)",
                              borderColor: u.color,
                            }}
                          />
                          <div className="text-[10px] text-[var(--text-tertiary)] mb-0.5">
                            {event.year > 0 ? `${event.year}年后` : "入职时"} · {event.title}
                          </div>
                          <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
                            <span className="mr-1">{event.icon}</span>
                            {event.description}
                          </div>
                          {event.salary && (
                            <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                              薪资: {event.salary}K
                              {event.level && ` · ${event.level}`}
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>

                    {/* Assessment */}
                    {u.final_assessment && (
                      <div
                        className="text-xs leading-relaxed rounded-lg px-3 py-2 border"
                        style={{
                          backgroundColor: `${u.color}08`,
                          borderColor: `${u.color}20`,
                          color: "var(--text-secondary)",
                        }}
                      >
                        {u.final_assessment}
                      </div>
                    )}
                  </>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mini comparison chart */}
        {!selectedId && (
          <div className="space-y-2">
            <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">
              薪资对比
            </div>
            <div className="space-y-2">
              {allUniverses.map((u) => {
                const maxSalary = Math.max(...allUniverses.map((x) => x.final_salary), 1);
                const pct = (u.final_salary / maxSalary) * 100;
                const isBase = u.universe_id === baseUniverse.universe_id;
                return (
                  <div key={u.universe_id} className="flex items-center gap-3">
                    <span className="text-xs w-20 truncate text-[var(--text-secondary)]">
                      {u.universe_emoji} {isBase ? "本宇宙" : u.universe_label}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-[var(--bg-card)] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: u.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.1 }}
                      />
                    </div>
                    <span className="text-xs font-mono text-[var(--text-primary)] w-12 text-right">
                      {u.final_salary}K
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="flex-1 rounded-lg px-3 py-2 text-center border"
      style={{
        backgroundColor: `${color}08`,
        borderColor: `${color}20`,
      }}
    >
      <div className="text-[10px] text-[var(--text-tertiary)] mb-0.5">{label}</div>
      <div className="text-sm font-bold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
