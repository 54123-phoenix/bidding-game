"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface RoundAction {
  player: string;
  action_type: string;
  params: Record<string, unknown>;
  reasoning: string;
  round: number;
}

interface SalaryTugOfWarProps {
  actions: RoundAction[];
  currentOffer: number | null;
  salaryRange?: [number, number] | null;
  reservationWage?: number;
}

interface RoundPair {
  round: number;
  candidateSalary: number | null;
  hrSalary: number | null;
}

function extractPairs(
  actions: RoundAction[],
  currentOffer: number | null
): { pairs: RoundPair[]; domain: [number, number] } {
  const byRound = new Map<number, { candidate: number | null; hr: number | null }>();
  const allSalaries: number[] = [];

  for (const a of actions) {
    const amt =
      (a.params?.salary_offer as number) ??
      (a.params?.salary_ask as number) ??
      (a.params?.salary_amount as number) ??
      null;
    if (amt === null || amt === undefined) continue;
    allSalaries.push(amt);

    if (!byRound.has(a.round)) {
      byRound.set(a.round, { candidate: null, hr: null });
    }
    const slot = byRound.get(a.round)!;
    if (a.player === "candidate") slot.candidate = amt;
    if (a.player === "hr") slot.hr = amt;
  }

  if (currentOffer) allSalaries.push(currentOffer);

  const pairs: RoundPair[] = Array.from(byRound.entries())
    .sort(([a], [b]) => a - b)
    .map(([round, data]) => ({
      round,
      candidateSalary: data.candidate,
      hrSalary: data.hr,
    }));

  if (
    currentOffer &&
    pairs.length > 0 &&
    pairs[pairs.length - 1].hrSalary !== currentOffer
  ) {
    pairs.push({
      round: pairs[pairs.length - 1].round,
      candidateSalary: null,
      hrSalary: currentOffer,
    });
  }

  const min = Math.min(...allSalaries, 30);
  const max = Math.max(...allSalaries, 100);
  const pad = Math.max(Math.round((max - min) * 0.15), 10);
  const domain: [number, number] = [Math.max(0, min - pad), max + pad];

  return { pairs, domain };
}

function pct(value: number, [lo, hi]: [number, number]): number {
  if (hi <= lo) return 50;
  return ((value - lo) / (hi - lo)) * 100;
}

export default function SalaryTugOfWar({
  actions,
  currentOffer,
  salaryRange,
  reservationWage = 0,
}: SalaryTugOfWarProps) {
  const { pairs, domain } = useMemo(
    () => extractPairs(actions, currentOffer),
    [actions, currentOffer]
  );

  if (pairs.length < 1) return null;

  const last = pairs[pairs.length - 1];
  const gap =
    last.candidateSalary && last.hrSalary
      ? Math.abs(last.candidateSalary - last.hrSalary)
      : null;
  const isConverging = gap !== null && gap <= 5;
  const isAgreed = gap === 0;

  const axisMin = salaryRange ? Math.min(domain[0], salaryRange[0]) : domain[0];
  const axisMax = salaryRange ? Math.max(domain[1], salaryRange[1]) : domain[1];
  const axis: [number, number] = [axisMin, axisMax];

  return (
    <motion.div
      className="relative overflow-hidden rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-panel)]"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--candidate-blue-glow)] via-transparent to-[var(--hr-purple-glow)] opacity-20" />

      <div className="relative z-10 px-5 py-4">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <span className="text-[11px]">⚔️</span>
            </div>
            <span className="text-xs font-bold text-[var(--text-primary)] tracking-wide">
              薪资战场
            </span>
            {gap !== null && gap > 0 && !isConverging && (
              <motion.span
                className="text-[10px] text-amber-400 bg-amber-500/10 rounded-full px-2.5 py-0.5 border border-amber-500/20 font-mono"
                animate={{ opacity: [1, 0.6, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                差距 {gap}K
              </motion.span>
            )}
            {isConverging && !isAgreed && (
              <motion.span
                className="text-[10px] text-[var(--accent-cyan)] bg-[var(--accent-cyan-glow)] rounded-full px-2.5 py-0.5 border border-[var(--accent-cyan)]/20 font-mono"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                即将达成！仅差 {gap}K
              </motion.span>
            )}
            {isAgreed && (
              <motion.span
                className="text-[10px] text-[var(--state-success)] bg-[var(--accent-green-glow)] rounded-full px-2.5 py-0.5 border border-[var(--accent-green)]/20 font-bold"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                ✓ 达成一致
              </motion.span>
            )}
          </div>
          <div className="flex items-center gap-4 text-[10px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--candidate-blue)] shadow-[0_0_6px_var(--candidate-blue-glow)]" />
              <span className="text-[var(--text-tertiary)]">你的要价</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rotate-45 bg-[var(--hr-purple)] shadow-[0_0_6px_var(--hr-purple-glow)]" />
              <span className="text-[var(--text-tertiary)]">HR 报价</span>
            </span>
          </div>
        </div>

        <div className="relative h-24">
          <div className="absolute inset-x-0 top-0 flex justify-between px-0.5">
            {[0, 25, 50, 75, 100].map((pctTick) => {
              const val = Math.round(axis[0] + (axis[1] - axis[0]) * (pctTick / 100));
              return (
                <span
                  key={pctTick}
                  className="text-[9px] text-[var(--text-tertiary)] tabular-nums font-mono"
                >
                  {val}K
                </span>
              );
            })}
          </div>

          <div className="absolute top-8 inset-x-0 h-10">
            <div className="absolute inset-0 bg-[var(--bg-elev)] rounded-full border border-[var(--border-hairline)]" />

            {salaryRange && (
              <motion.div
                className="absolute top-0 bottom-0 rounded-full"
                style={{
                  left: `${pct(salaryRange[0], axis)}%`,
                  right: `${100 - pct(salaryRange[1], axis)}%`,
                  background: "linear-gradient(90deg, #34d39915, #34d39925, #34d39915)",
                  boxShadow: "0 0 8px #34d39910",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              />
            )}

            {reservationWage > 0 && (
              <div
                className="absolute top-0 bottom-0 w-px z-10"
                style={{
                  left: `${pct(reservationWage, axis)}%`,
                  background: "linear-gradient(to bottom, transparent, #fb7185, transparent)",
                }}
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[8px] text-red-400/80 whitespace-nowrap font-bold">
                  底线 {reservationWage}K
                </div>
              </div>
            )}
          </div>

          <AnimatePresence>
            {pairs.map((pair, i) => {
              const isLast = i === pairs.length - 1;
              const candPct = pair.candidateSalary ? pct(pair.candidateSalary, axis) : null;
              const hrPct = pair.hrSalary ? pct(pair.hrSalary, axis) : null;

              return (
                <div key={`${pair.round}-${i}`}>
                  {candPct !== null && hrPct !== null && (
                    <motion.div
                      className="absolute top-8 h-10"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      style={{
                        left: `${Math.min(candPct, hrPct)}%`,
                        width: `${Math.abs(candPct - hrPct)}%`,
                      }}
                    >
                      <div
                        className={`absolute inset-y-0 rounded-full transition-all duration-500 ${
                          isLast
                            ? isConverging
                              ? "bg-gradient-to-r from-[var(--candidate-blue)]/20 via-[var(--accent-cyan)]/15 to-[var(--hr-purple)]/20"
                              : "bg-gradient-to-r from-[var(--candidate-blue)]/15 to-[var(--hr-purple)]/15"
                            : "bg-[var(--bg-elev)]/30"
                        }`}
                      />
                      {isLast && gap !== null && gap > 0 && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                          <motion.span
                            className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full whitespace-nowrap border"
                            style={{
                              color: isConverging ? "var(--accent-cyan)" : "var(--state-warning)",
                              backgroundColor: isConverging ? "var(--accent-cyan-glow)" : "#fbbf2415",
                              borderColor: isConverging ? "var(--accent-cyan)33" : "#fbbf2433",
                            }}
                            initial={{ scale: 1.3, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.5, type: "spring" }}
                          >
                            {gap}K
                          </motion.span>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {candPct !== null && (
                    <motion.div
                      className="absolute flex flex-col items-center"
                      initial={{ opacity: 0, y: 10, scale: 0.5 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: i * 0.08, type: "spring", stiffness: 300 }}
                      style={{
                        left: `${candPct}%`,
                        top: "4px",
                        transform: "translateX(-50%)",
                        zIndex: isLast ? 20 : 5,
                      }}
                    >
                      <motion.div
                        className="rounded-full border-2"
                        style={{
                          width: isLast ? 14 : 10,
                          height: isLast ? 14 : 10,
                          backgroundColor: isLast ? "var(--candidate-blue)" : "var(--candidate-blue)99",
                          borderColor: isLast ? "var(--candidate-blue)" : "var(--candidate-blue)66",
                          boxShadow: isLast ? "0 0 12px var(--candidate-blue-glow), 0 0 24px var(--candidate-blue-glow)" : "none",
                        }}
                        animate={
                          isLast
                            ? { scale: [1, 1.25, 1], boxShadow: [
                                "0 0 12px var(--candidate-blue-glow), 0 0 24px var(--candidate-blue-glow)",
                                "0 0 20px var(--candidate-blue-glow), 0 0 40px var(--candidate-blue-glow)",
                                "0 0 12px var(--candidate-blue-glow), 0 0 24px var(--candidate-blue-glow)",
                              ] }
                            : {}
                        }
                        transition={isLast ? { duration: 2, repeat: Infinity } : {}}
                      />
                      {isLast && pair.candidateSalary && (
                        <motion.span
                          className="text-[10px] font-mono font-bold tabular-nums whitespace-nowrap mt-1 px-1.5 py-0.5 rounded"
                          style={{
                            color: "var(--candidate-blue)",
                            backgroundColor: "var(--candidate-blue-glow)",
                          }}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                        >
                          {pair.candidateSalary}K
                        </motion.span>
                      )}
                    </motion.div>
                  )}

                  {hrPct !== null && (
                    <motion.div
                      className="absolute flex flex-col items-center"
                      initial={{ opacity: 0, y: -10, scale: 0.5 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: i * 0.08 + 0.04, type: "spring", stiffness: 300 }}
                      style={{
                        left: `${hrPct}%`,
                        top: "32px",
                        transform: "translateX(-50%)",
                        zIndex: isLast ? 20 : 5,
                      }}
                    >
                      <motion.div
                        className="rotate-45 border-2"
                        style={{
                          width: isLast ? 14 : 10,
                          height: isLast ? 14 : 10,
                          backgroundColor: isLast ? "var(--hr-purple)" : "var(--hr-purple)99",
                          borderColor: isLast ? "var(--hr-purple)" : "var(--hr-purple)66",
                          boxShadow: isLast ? "0 0 12px var(--hr-purple-glow), 0 0 24px var(--hr-purple-glow)" : "none",
                        }}
                        animate={
                          isLast
                            ? { rotate: [45, 55, 45], boxShadow: [
                                "0 0 12px var(--hr-purple-glow), 0 0 24px var(--hr-purple-glow)",
                                "0 0 20px var(--hr-purple-glow), 0 0 40px var(--hr-purple-glow)",
                                "0 0 12px var(--hr-purple-glow), 0 0 24px var(--hr-purple-glow)",
                              ] }
                            : {}
                        }
                        transition={isLast ? { duration: 2, repeat: Infinity } : {}}
                      />
                      {isLast && pair.hrSalary && (
                        <motion.span
                          className="text-[10px] font-mono font-bold tabular-nums whitespace-nowrap mt-0.5 px-1.5 py-0.5 rounded"
                          style={{
                            color: "var(--hr-purple)",
                            backgroundColor: "var(--hr-purple-glow)",
                          }}
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                        >
                          {pair.hrSalary}K
                        </motion.span>
                      )}
                    </motion.div>
                  )}
                </div>
              );
            })}
          </AnimatePresence>
        </div>

        <div className="relative h-4 mt-1">
          {pairs.map((pair, i) => {
            const candPct = pair.candidateSalary ? pct(pair.candidateSalary, axis) : null;
            const hrPct = pair.hrSalary ? pct(pair.hrSalary, axis) : null;
            const mid =
              candPct !== null && hrPct !== null
                ? (candPct + hrPct) / 2
                : candPct ?? hrPct ?? 50;

            return (
              <motion.span
                key={`label-${i}`}
                className="absolute text-[8px] text-[var(--text-tertiary)] tabular-nums font-mono"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.08 }}
                style={{
                  left: `${mid}%`,
                  transform: "translateX(-50%)",
                }}
              >
                R{pair.round + 1}
              </motion.span>
            );
          })}
        </div>

        {salaryRange && (
          <div className="mt-2 pt-2 border-t border-[var(--border-hairline)] flex items-center gap-3 text-[9px] text-[var(--text-tertiary)]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-1 rounded-full bg-[var(--market-emerald)]/30" />
              岗位薪资带：{salaryRange[0]}K – {salaryRange[1]}K
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
