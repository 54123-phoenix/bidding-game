"use client";

import { motion } from "framer-motion";
import NumberTicker from "@/components/number-ticker";

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface NarrativeResultsProps {
  outcome: string;
  outcomeMessage: string;
  finalSalary: number | null;
  negotiationRounds: number;
  successProbability: number;
  candidatePayoff: number;
  equilibrium?: {
    candidate_strategy?: { opening_salary_ask?: number; stance?: string };
    candidate_expected_payoff?: number;
    hr_expected_payoff?: number;
    converged?: boolean;
    solver_iterations?: number;
  } | null;
  informationAsymmetryCost?: number;
  recommendation?: string;
  terminationReason?: string;
  hrPersona?: { name: string; tagline: string };
  onChat: (msg: string) => void;
  onRestart: () => void;
  onHome?: () => void;
  hideStats?: boolean;
}

// ═══════════════════════════════════════════════════════════
// Narrative Generator
// ═══════════════════════════════════════════════════════════

function generateNarrative(
  outcome: string,
  personaName: string,
  terminationReason: string
): { title: string; story: string } {
  if (outcome === "accepted") {
    return {
      title: "谈判成功！",
      story: `在这场博弈中，你和HR ${personaName} 经过多轮博弈，最终找到了双方都能接受的价格。每一轮的要价和还价背后，都是不完备信息下的策略较量——你猜她的预算，她猜你的底线。恭喜你在信息不对称中做出了正确的判断。`,
    };
  }

  if (terminationReason === "hr_patience_exhausted") {
    return {
      title: "HR 失去了耐心",
      story: `HR ${personaName} 最初是带着诚意来的，但随着谈判的推进，她的耐心逐渐消磨殆尽。在博弈论中，耐心本身就是一种议价能力——当一方的耐心耗尽，博弈就走向了破裂。想想是哪些信号消耗了她的耐心？下一次，也许更早释放诚意会更好。`,
    };
  }

  if (terminationReason === "candidate_patience_exhausted") {
    return {
      title: "你选择了退出",
      story: `经过几轮交锋，你判断继续谈下去已经没有足够的价值。这是一个理性的选择——当预期收益低于底线时，退出本身就是最优策略。但如果你对HR的信念稍有偏差，也许错过了本可以达成的交易。`,
    };
  }

  return {
    title: "谈判破裂",
    story: `双方始终未能弥合薪资差距。在简化策略响应框架下，这意味着交易区间没有重叠——双方的信息不对称成本太高，使得交易无法达成。`,
  };
}

// ═══════════════════════════════════════════════════════════
// NarrativeResults
// ═══════════════════════════════════════════════════════════

export default function NarrativeResults({
  outcome,
  outcomeMessage,
  finalSalary,
  negotiationRounds,
  successProbability,
  candidatePayoff,
  equilibrium,
  informationAsymmetryCost = 0,
  recommendation = "",
  terminationReason = "",
  hrPersona,
  onChat,
  onRestart,
  onHome,
  hideStats,
}: NarrativeResultsProps) {
  const narrative = generateNarrative(
    outcome,
    hrPersona?.name || "HR",
    terminationReason
  );
  const isAccepted = outcome === "accepted";

  const quickQs = isAccepted
    ? ["我哪里做得好？", "还能拿到更高的薪资吗？", "入职后如何快速晋升？", "我的隐藏优势是什么？"]
    : ["我为什么失败了？", "应该提升哪些技能？", "我的薪资要求合理吗？", "换个对手会有不同结果吗？"];

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* Outcome Banner */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          className="text-6xl mb-4"
          initial={{ rotate: -10, scale: 0 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.2 }}
        >
          {isAccepted ? "🎉" : "💔"}
        </motion.div>
        <motion.h1
          className={`text-2xl font-bold mb-2 ${
            isAccepted ? "text-emerald-400" : "text-red-400"
          }`}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {outcomeMessage}
        </motion.h1>
      </motion.div>

      {/* Key Stats — hidden when inside GameResultsView (stats shown at top level) */}
      {!hideStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="结果"
            value={isAccepted ? "已录取" : "已拒绝"}
            color={isAccepted ? "text-emerald-400" : "text-red-400"}
            delay={0.5}
          />
          <StatCard
            label="最终薪资"
            value={finalSalary ? `${finalSalary}K` : "—"}
            color="text-white"
            delay={0.6}
          />
          <StatCard
            label="谈判轮次"
            value={`${negotiationRounds}`}
            color="text-white"
            delay={0.7}
          />
          <StatCard
            label="成功率"
            value={`${Math.round(successProbability * 100)}%`}
            color="text-cyan-400"
            delay={0.8}
          />
        </div>
      )}

      {/* Story Narrative */}
      <motion.div
        className="surface-raised rounded-3xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="ai-chip rounded-full px-2 py-0.5 text-[10px] font-bold">AI 战术复盘</span>
          <span className="strategy-chip rounded-full px-2 py-0.5 text-[10px] font-bold">可解释结果</span>
        </div>
        <h2 className="text-sm font-semibold text-slate-300 mb-3">
          {narrative.title}
        </h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          {narrative.story}
        </p>

        {/* Game Theory Analysis */}
        {equilibrium && (
          <div className="mt-5 pt-4 border-t border-slate-800">
            <h3 className="text-xs font-semibold text-purple-400 mb-3">
              博弈论分析
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)]/40 p-3">
                <span className="text-slate-500">均衡最优要价</span>
                <div className="text-white font-mono mt-1">
                  {equilibrium.candidate_strategy?.opening_salary_ask || "—"}K
                </div>
              </div>
              <div className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)]/40 p-3">
                <span className="text-slate-500">你的收益</span>
                <div className="text-white font-mono mt-1">
                  {candidatePayoff.toFixed(3)}
                </div>
              </div>
              <div className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)]/40 p-3">
                <span className="text-slate-500">均衡预期收益</span>
                <div className="text-cyan-400 font-mono mt-1">
                  {(equilibrium.candidate_expected_payoff || 0).toFixed(3)}
                </div>
              </div>
              <div className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)]/40 p-3">
                <span className="text-slate-500">信息不对称成本</span>
                <div className="text-amber-400 font-mono mt-1">
                  {informationAsymmetryCost.toFixed(3)}
                </div>
              </div>
            </div>
            {equilibrium.converged && (
              <p className="text-[11px] text-slate-600 mt-2">
                {equilibrium.solver_iterations} 次迭代形成简化策略响应结果
              </p>
            )}
          </div>
        )}
      </motion.div>

      {/* Recommendation */}
      {recommendation && (
        <motion.div
          className={`surface-base rounded-3xl p-5 text-sm ${
            isAccepted
              ? ""
              : ""
          }`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <span className="font-semibold">
            {isAccepted ? "策略点评：" : "失败分析："}
          </span>
          <span className="text-slate-400">{recommendation}</span>
        </motion.div>
      )}

      {/* Quick Questions */}
      <motion.div
        className="surface-base overflow-hidden rounded-3xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <div className="px-5 py-3 border-b border-slate-800 flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-cyan-600 flex items-center justify-center text-[10px] font-bold">
            AI
          </div>
          <span className="text-sm font-medium">追问顾问</span>
        </div>
        <div className="px-5 py-3 flex flex-wrap gap-2">
          {quickQs.map((q) => (
            <button
              key={q}
              onClick={() => onChat(q)}
              className="text-xs px-3 py-1.5 rounded-full border border-slate-700 hover:border-cyan-700 hover:text-cyan-400 text-slate-400 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Dual CTAs */}
      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          onClick={onRestart}
          className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-medium transition-colors shadow-lg shadow-cyan-600/20"
        >
          再来一局
        </button>
        {onHome && (
          <button
            onClick={onHome}
            className="px-8 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg font-medium transition-colors text-slate-300"
          >
            返回首页
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// StatCard
// ═══════════════════════════════════════════════════════════

function StatCard({
  label,
  value,
  color,
  delay,
}: {
  label: string;
  value: string;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      className="bg-slate-800/50 rounded-xl p-4 text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
    </motion.div>
  );
}
