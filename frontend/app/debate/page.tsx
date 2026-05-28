"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import NumberTicker from "@/components/number-ticker";
import { API_BASE } from "@/lib/api";
import PlayerIcon from "@/components/player-icon";

const DEMOS = [
  { label: "强匹配 — P7 Go/K8s → 字节跳动后端", resume: "res-diana-zhao", job: "job-bytedance-backend" },
  { label: "弱匹配 — P5 初级 → P8 架构师", resume: "res-john-chen", job: "job-ali-staff-architect" },
  { label: "跨领域 — NLP → ML平台", resume: "res-ryan-sun", job: "job-bytedance-ml-platform" },
  { label: "专家匹配 — P9 专家 → P8 架构师", resume: "res-thomas-lin", job: "job-ali-staff-architect" },
];

const SEVERITY_COLORS: Record<string, string> = {
  critical: "border-red-500/50 bg-red-950/20",
  major: "border-orange-500/50 bg-orange-950/20",
  minor: "border-yellow-500/50 bg-yellow-950/20",
  info: "border-emerald-500/50 bg-emerald-950/20",
};

const SEVERITY_LABELS: Record<string, string> = {
  critical: "严重瓶颈",
  major: "主要短板",
  minor: "次要不足",
  info: "优势",
};

function TraceTree({ trace, depth = 0 }: { trace: any; depth?: number }) {
  const [expanded, setExpanded] = useState(depth === 0);

  return (
    <div className="ml-0" style={{ marginLeft: depth * 16 }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-left w-full hover:bg-slate-800/30 rounded px-1 py-0.5 transition-colors"
      >
        <span className="text-xs text-slate-600">{expanded ? "▼" : "▶"}</span>
        <span className="text-xs text-slate-400">{trace.label || "计算步骤"}</span>
        <span className="text-xs font-mono font-bold text-cyan-400">{trace.final_value !== undefined ? (trace.final_value > 1 ? trace.final_value : `${(trace.final_value * 100).toFixed(0)}%`) : ""}</span>
        {trace.deterministic !== undefined && (
          <span className={`text-[10px] px-1 rounded ${trace.deterministic ? "bg-emerald-900/50 text-emerald-400" : "bg-amber-900/50 text-amber-400"}`}>
            {trace.deterministic ? "确定性" : "LLM辅助"}
          </span>
        )}
      </button>

      {expanded && (
        <div className="mt-1 space-y-1">
          {trace.formula && (
            <div className="text-[10px] text-slate-600 ml-6 mb-1 font-mono">
              公式: {trace.formula}
            </div>
          )}

          {/* Steps */}
          {(trace.steps || []).map((step: any, i: number) => (
            <TraceTree key={i} trace={step} depth={depth + 1} />
          ))}

          {/* Evidence */}
          {(trace.evidence || []).length > 0 && (
            <div className="ml-6 mt-1 space-y-0.5">
              {trace.evidence.map((e: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-[10px]">
                  <span className={e.matched ? "text-emerald-500" : "text-red-500"}>
                    {e.matched ? "✓" : "✗"}
                  </span>
                  <span className="text-slate-500 font-mono">{e.source}</span>
                  {e.value && <span className="text-slate-400">= {e.value}</span>}
                  {e.note && <span className="text-slate-600">({e.note})</span>}
                </div>
              ))}
            </div>
          )}

          {/* Confidence */}
          {trace.confidence_lower !== undefined && (
            <div className="text-[10px] text-slate-600 ml-6 mt-1">
              置信区间: [{trace.confidence_lower?.toFixed(2)}, {trace.confidence_upper?.toFixed(2)}]
            </div>
          )}

          {/* Failure conditions */}
          {(trace.failure_conditions || []).length > 0 && (
            <div className="ml-6 mt-1">
              <div className="text-[10px] text-amber-500 mb-0.5">失效条件:</div>
              {trace.failure_conditions.map((cond: string, i: number) => (
                <div key={i} className="text-[10px] text-slate-600 ml-2">• {cond}</div>
              ))}
            </div>
          )}

          {trace.code_ref && (
            <div className="text-[10px] text-slate-700 ml-6 font-mono">源码: {trace.code_ref}</div>
          )}
        </div>
      )}
    </div>
  );
}

function ClaimCard({ claim, defaultExpanded }: { claim: any; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded || false);

  return (
    <div className={`surface-base rounded-2xl p-4 ${SEVERITY_COLORS[claim.severity] || ""}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              claim.type === "strength" ? "bg-emerald-900/50 text-emerald-300" :
              claim.type === "weakness" ? "bg-red-900/50 text-red-300" :
              "bg-amber-900/50 text-amber-300"
            }`}>
              {SEVERITY_LABELS[claim.severity] || ""}
            </span>
            <span className="text-sm font-semibold text-white">{claim.headline}</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">{claim.body}</p>
        </div>
        {(claim.traces || []).length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[10px] text-slate-600 hover:text-cyan-400 transition-colors shrink-0 ml-2"
          >
            {expanded ? "收起证据 ▲" : "查看证据 ▼"}
          </button>
        )}
      </div>

      {expanded && (claim.traces || []).map((trace: any, i: number) => (
        <div key={i} className="mt-3 pt-3 border-t border-slate-700/50">
          <TraceTree trace={trace} />
        </div>
      ))}
    </div>
  );
}

function AlternativeCard({ alt }: { alt: any }) {
  return (
    <div className={`surface-base rounded-2xl p-3 ${alt.significant ? "border-cyan-700/50 bg-cyan-950/10" : ""}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-white">{alt.description}</span>
        {alt.significant && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-900/50 text-cyan-300">推荐</span>
        )}
      </div>
      <div className="flex items-center gap-4 text-xs">
        <div>
          <span className="text-slate-500">调整后成功率：</span>
          <span className="font-mono font-bold text-cyan-400">{(alt.new_probability * 100).toFixed(0)}%</span>
        </div>
        <div>
          <span className="text-slate-500">边际增益：</span>
          <span className={`font-mono font-bold ${alt.marginal_effect > 0 ? "text-emerald-400" : "text-red-400"}`}>
            {alt.marginal_effect > 0 ? "+" : ""}{(alt.marginal_effect * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

export default function DebatePage() {
  const [selected, setSelected] = useState(0);
  const [strategy, setStrategy] = useState("balanced");
  const [market, setMarket] = useState("normal");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"diagnosis" | "game" | "alternatives">("diagnosis");

  const run = async () => {
    setLoading(true);
    setError("");
    try {
      const demo = DEMOS[selected];
      const resp = await fetch(
        `${API_BASE}/api/debate/proposal?resume_key=${demo.resume}&job_key=${demo.job}&strategy=${strategy}&market=${market}`
      );
      const data = await resp.json();
      if (data.status === "ok") setResult(data);
      else setError(data.message || "未知错误");
    } catch (e: any) {
      setError(e.message || "无法连接后端");
    }
    setLoading(false);
  };

  const proposal = result?.proposal;
  const sim = result?.simulation;
  const eq = result?.equilibrium;

  return (
    <div className="product-shell min-h-[calc(100vh-56px)]">
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs font-semibold text-[var(--accent-cyan)]">评审解释页</div>
          <h1 className="mt-2 text-3xl font-black text-[var(--text-primary)]">策略辩论</h1>
          <p className="text-slate-500 text-sm mt-2">AI 出示证据 → 你质询 → AI 辩护 → 达成共识</p>
        </div>
        <div className="surface-base rounded-full px-3 py-1 text-[10px] text-slate-500">
          {proposal ? `确定性 ${proposal.deterministic_pct}%` : "待运行"}
        </div>
      </div>

      {/* Controls */}
      <div className="surface-raised rounded-3xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select value={selected} onChange={(e) => setSelected(Number(e.target.value))}
            className="surface-base rounded-xl px-3 py-2 text-sm w-full">
            {DEMOS.map((d, i) => (<option key={i} value={i}>{d.label}</option>))}
          </select>
          <select value={strategy} onChange={(e) => setStrategy(e.target.value)}
            className="surface-base rounded-xl px-3 py-2 text-sm">
            <option value="balanced">策略：稳健型</option>
            <option value="aggressive">策略：激进型</option>
            <option value="conservative">策略：保守型</option>
          </select>
          <select value={market} onChange={(e) => setMarket(e.target.value)}
            className="surface-base rounded-xl px-3 py-2 text-sm">
            <option value="normal">市场：正常</option>
            <option value="hot">市场：热门</option>
            <option value="cool">市场：冷淡</option>
          </select>
          <motion.button
            onClick={run} disabled={loading}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            className="primary-action rounded-xl px-6 py-2 text-sm font-medium transition disabled:opacity-50">
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="flex gap-1">
                  {[0,1,2].map(i => (
                    <motion.span key={i} className="w-1.5 h-1.5 rounded-full bg-white"
                      animate={{opacity:[0.3,1,0.3]}} transition={{duration:1,repeat:Infinity,delay:i*0.2}} />
                  ))}
                </span>
                运行中...
              </span>
            ) : "生成策略提案"}
          </motion.button>
        </div>
      </div>

      {error && <div className="surface-base mb-6 rounded-2xl p-4 text-sm text-red-300">{error}</div>}

      {result && proposal && (
        <div className="space-y-6">
          {/* Top bar: Candidate → Job + Key metrics */}
          <motion.div
            className="surface-raised rounded-3xl p-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex flex-wrap items-center gap-4 text-sm mb-3">
              <div className="flex items-center gap-2">
                <PlayerIcon player="candidate" size={34} />
                <span className="text-white font-medium">{result.candidate.name}</span>
              </div>
              <span className="text-slate-600 text-lg">→</span>
              <div className="flex items-center gap-2">
                <PlayerIcon player="hr" size={28} />
                <div>
                  <span className="text-white font-medium">{result.job.title}</span>
                  <span className="text-slate-500 ml-2">@ {result.job.company}（{result.job.level}）</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="surface-base rounded-2xl p-2 text-center">
                <div className="text-[10px] text-slate-500">成功率</div>
                <div className="text-lg font-bold text-cyan-400">
                  <NumberTicker target={Math.round(sim.success_probability * 100)} suffix="%" duration={1.2} autoStart />
                </div>
              </div>
                <div className="surface-base rounded-2xl p-2 text-center">
                <div className="text-[10px] text-slate-500">结果</div>
                <div className={`text-lg font-bold ${sim.outcome === "accepted" ? "text-emerald-400" : "text-red-400"}`}>
                  {sim.outcome === "accepted" ? "已录取" : sim.outcome === "rejected" ? "已拒绝" : "超时"}
                </div>
              </div>
                <div className="surface-base rounded-2xl p-2 text-center">
                <div className="text-[10px] text-slate-500">预期薪资</div>
                <div className="text-lg font-bold text-white">
                  <NumberTicker target={sim.final_salary} suffix="K" duration={1} autoStart />
                </div>
              </div>
                <div className="surface-base rounded-2xl p-2 text-center">
                <div className="text-[10px] text-slate-500">均衡类型</div>
                <div className="text-sm font-bold text-purple-400">{eq.equilibrium_type === "pure_bne" ? "纯策略BNE" : eq.equilibrium_type}</div>
              </div>
                <div className="surface-base rounded-2xl p-2 text-center">
                <div className="text-[10px] text-slate-500">可靠性</div>
                <div className="text-lg font-bold text-emerald-400">
                  <NumberTicker target={proposal.deterministic_pct} suffix="%" duration={1.5} autoStart />
                </div>
                <div className="text-[10px] text-slate-600">确定性计算</div>
              </div>
            </div>
          </motion.div>

          {/* AI Summary */}
          <div className="surface-focus rounded-3xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">AI</div>
              <div>
                <p className="text-sm text-slate-300 leading-relaxed mb-2">{proposal.summary_text}</p>
                <p className="text-sm text-cyan-300 font-medium">{proposal.recommendation}</p>
              </div>
            </div>
          </div>

          {/* Tab navigation */}
          <div className="flex gap-2 border-b border-slate-800">
            {([
              ["diagnosis", "诊断报告", `优势${proposal.strengths.length} · 短板${proposal.weaknesses.length}`],
              ["game", "博弈过程", `${sim.negotiation_rounds}轮谈判`],
              ["alternatives", "替代方案", `${proposal.alternatives.length}个选项`],
            ] as const).map(([key, label, subtitle]) => (
              <button key={key} onClick={() => setTab(key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  tab === key ? "border-cyan-500 text-cyan-400" : "border-transparent text-slate-500 hover:text-slate-300"
                }`}>
                {label} <span className="text-[10px] text-slate-600 ml-1">{subtitle}</span>
              </button>
            ))}
          </div>

          {/* Tab: Diagnosis */}
          <AnimatePresence mode="wait">
          {tab === "diagnosis" && (
            <motion.div
              key="diagnosis"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Strengths */}
              <div>
                <h3 className="text-sm font-semibold text-emerald-400 mb-3">优势</h3>
                <div className="space-y-3">
                  {proposal.strengths.map((s: any) => (
                    <ClaimCard key={s.id} claim={s} />
                  ))}
                  {proposal.strengths.length === 0 && (
                    <div className="text-xs text-slate-600">无显著优势</div>
                  )}
                </div>
              </div>

              {/* Weaknesses */}
              <div>
                <h3 className="text-sm font-semibold text-red-400 mb-3">短板</h3>
                <div className="space-y-3">
                  {proposal.weaknesses.map((w: any) => (
                    <ClaimCard key={w.id} claim={w} defaultExpanded />
                  ))}
                  {proposal.weaknesses.length === 0 && (
                    <div className="text-xs text-slate-600">未检测到显著短板</div>
                  )}
                </div>
              </div>

              {/* P(offer) trace */}
              {proposal.success_probability_trace && (
                <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-cyan-400 mb-3">
                    P(offer) = {sim.success_probability.toFixed(0)}% — 完整计算链
                  </h3>
                  <TraceTree trace={proposal.success_probability_trace} />
                </div>
              )}
            </motion.div>
          )}

          {/* Tab: Game Process */}
          {tab === "game" && (
            <motion.div
              key="game"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="space-y-4">
              {/* Agent cards in a row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {([
                  { role: "market" as const, label: "市场环境", info: [
                    `供需比: ${sim.final_state.market_adjustment?.toFixed(2) || "1.00"}`,
                    `竞争强度: ${((sim.final_state.competition_intensity || 0) * 100).toFixed(0)}%`,
                  ]},
                  { role: "interviewer" as const, label: "面试官", info: [
                    `综合评分: ${(sim.final_state.scores?.overall || sim.final_state.scores?.skill || 0.5).toFixed(2)}`,
                    `推荐: ${sim.final_state.action_history?.find((a: any) => a.player === "interviewer")?.params?.recommendation || "N/A"}`,
                  ]},
                  { role: "candidate" as const, label: "候选人", info: [
                    `真实能力: ${((sim.final_state.candidate_type?.true_ability || 0) * 100).toFixed(0)}%`,
                    `底线薪资: ${sim.final_state.candidate_type?.reservation_wage || 0}K`,
                  ]},
                  { role: "hr" as const, label: "HR", info: [
                    `预算上限: ${sim.final_state.hr_type?.true_budget || 0}K`,
                    `紧急程度: ${((sim.final_state.hr_type?.urgency || 0) * 100).toFixed(0)}%`,
                  ]},
                ] as const).map((agent, idx) => (
                  <motion.div
                    key={agent.role}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="border border-slate-700/50 rounded-lg p-3 bg-slate-800/30"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <PlayerIcon player={agent.role} size={28} />
                      <span className="text-xs font-semibold text-white">{agent.label}</span>
                    </div>
                    {agent.info.map((item, i) => (
                      <div key={i} className="text-[10px] text-slate-400">{item}</div>
                    ))}
                    <div className="mt-2 text-[10px] text-slate-600">私有信息不可见</div>
                  </motion.div>
                ))}
              </div>

              {/* Round timeline */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-slate-400 mb-3">谈判轮次回放</h3>
                {(sim.final_state.action_history || []).length === 0 && (
                  <div className="text-xs text-slate-600">无谈判记录</div>
                )}
                {(() => {
                  const actions = sim.final_state.action_history || [];
                  const rounds = new Map<number, any[]>();
                  actions.forEach((a: any) => {
                    const r = a.round;
                    if (!rounds.has(r)) rounds.set(r, []);
                    rounds.get(r)!.push(a);
                  });
                  return Array.from(rounds.entries()).map(([round, roundActions]: [number, any[]]) => (
                    <div key={round} className="mb-3 last:mb-0">
                      <div className="text-xs font-medium text-slate-500 mb-1">第 {round + 1} 轮</div>
                      <div className="space-y-1">
                        {roundActions.map((a: any, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-[11px]">
                            <div className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${
                              a.player === "candidate" ? "bg-blue-500" :
                              a.player === "hr" ? "bg-purple-500" :
                              a.player === "interviewer" ? "bg-amber-500" : "bg-emerald-500"
                            }`} />
                            <span className="text-slate-500 w-12 shrink-0">
                              {a.player === "candidate" ? "候选人" : a.player === "hr" ? "HR" : a.player === "interviewer" ? "面试官" : "市场"}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                              a.action_type === "accept" ? "bg-emerald-900/50 text-emerald-300" :
                              a.action_type === "reject" ? "bg-red-900/50 text-red-300" :
                              a.action_type === "offer" ? "bg-green-900/50 text-green-300" :
                              "bg-slate-800 text-slate-400"
                            }`}>
                              {a.action_type === "accept" ? "接受" : a.action_type === "reject" ? "拒绝" : a.action_type === "offer" ? "报价" : a.action_type === "counter_offer" ? "还价" : a.action_type === "evaluate" ? "评估" : a.action_type === "signal" ? "信号" : a.action_type}
                            </span>
                            <span className="text-slate-400 flex-1 line-clamp-1">{a.reasoning}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </motion.div>
          )}

          {/* Tab: Alternatives */}
          {tab === "alternatives" && (
            <motion.div
              key="alternatives"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-slate-400 mb-3">替代策略（按边际增益排序）</h3>
                <div className="space-y-2">
                  {proposal.alternatives.map((alt: any, i: number) => (
                    <AlternativeCard key={i} alt={alt} />
                  ))}
                  {proposal.alternatives.length === 0 && (
                    <div className="text-xs text-slate-600">暂无替代方案数据</div>
                  )}
                </div>
              </div>

              {/* Equilibrium detail */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-purple-400 mb-3">策略响应分析 — 建议策略</h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="text-slate-400 mb-1">候选人均衡策略</div>
                    <div className="space-y-1">
                      <div><span className="text-slate-500">要价：</span><span className="text-white font-mono">{proposal.equilibrium_summary.candidate_ask}K</span></div>
                      <div><span className="text-slate-500">姿态：</span><span className="text-white">{proposal.equilibrium_summary.candidate_stance === "firm" ? "强硬" : "灵活"}</span></div>
                      <div><span className="text-slate-500">预期收益：</span><span className="font-mono text-blue-400">{proposal.equilibrium_summary.candidate_payoff?.toFixed(3)}</span></div>
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="text-slate-400 mb-1">HR均衡策略</div>
                    <div className="space-y-1">
                      <div><span className="text-slate-500">出价：</span><span className="text-white font-mono">{proposal.equilibrium_summary.hr_offer}K</span></div>
                      <div><span className="text-slate-500">上限：</span><span className="text-white font-mono">{proposal.equilibrium_summary.hr_ceiling}K</span></div>
                      <div><span className="text-slate-500">预期收益：</span><span className="font-mono text-purple-400">{proposal.equilibrium_summary.hr_payoff?.toFixed(3)}</span></div>
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-slate-600 mt-2">
                  {proposal.equilibrium_summary.converged
                    ? `${proposal.equilibrium_summary.solver_iterations} 次迭代收敛` : "未收敛"}
                </div>
              </div>
            </motion.div>
          )}
          </AnimatePresence>

          {/* Footer: Final recommendation */}
          <div className={`surface-base rounded-3xl p-4 text-sm ${
            sim.outcome === "accepted" ? "bg-emerald-950/20 border-emerald-800" : "bg-red-950/20 border-red-800"
          }`}>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-cyan-600 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">AI</div>
              <div>
                <span className="font-semibold text-white">
                  {sim.outcome === "accepted" ? "最终建议" : "失败诊断"}
                </span>
                <p className="text-slate-400 mt-1 text-xs leading-relaxed">{sim.recommendation}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
