"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import NumberTicker from "@/components/number-ticker";
import PlayerIcon from "@/components/player-icon";

const DEMOS = [
  { label: "强匹配 — P7 Go/K8s → 字节跳动后端", resume: "res-diana-zhao", job: "job-bytedance-backend" },
  { label: "弱匹配 — P5 初级 → P8 架构师 (能力错配)", resume: "res-john-chen", job: "job-ali-staff-architect" },
  { label: "跨领域 — NLP工程师 → ML平台", resume: "res-ryan-sun", job: "job-bytedance-ml-platform" },
  { label: "专家匹配 — P9 专家 → P8 架构师", resume: "res-thomas-lin", job: "job-ali-staff-architect" },
];

const AGENT_LABELS: Record<string, string> = {
  candidate: "候选人",
  hr: "HR",
  interviewer: "面试官",
  market: "市场",
};

const AGENT_ICONS: Record<string, string> = {
  candidate: "C",
  hr: "H",
  interviewer: "I",
  market: "M",
};

const ACTION_LABELS: Record<string, string> = {
  offer: "报价",
  counter_offer: "还价",
  accept: "接受",
  reject: "拒绝",
  wait: "等待",
  evaluate: "评估",
  signal: "市场信号",
};

const PRIVATE_LABELS: Record<string, string> = {
  supply_demand_ratio: "供需比",
  salary_trend: "薪资趋势",
  hot_skills: "热门技能",
  strictness: "评分严格度",
  preferred_skill_style: "技能偏好",
  risk_tolerance: "风险偏好",
  true_ability: "真实能力",
  reservation_wage: "薪资底线",
  career_ambition: "职业野心",
  true_budget: "真实预算",
  urgency: "紧急程度",
  internal_equity_constraint: "内部公平约束",
};

function ActionBadge({ action }: { action: any }) {
  const actionColors: Record<string, string> = {
    offer: "bg-green-900/50 text-green-300 border-green-700",
    counter_offer: "bg-yellow-900/50 text-yellow-300 border-yellow-700",
    accept: "bg-emerald-900/50 text-emerald-300 border-emerald-700",
    reject: "bg-red-900/50 text-red-300 border-red-700",
    wait: "bg-slate-800 text-slate-400 border-slate-700",
    evaluate: "bg-amber-900/50 text-amber-300 border-amber-700",
    signal: "bg-cyan-900/50 text-cyan-300 border-cyan-700",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${actionColors[action.action_type] || "bg-slate-800 border-slate-700"}`}>
      {ACTION_LABELS[action.action_type] || action.action_type}
    </span>
  );
}

function AgentCard({ role, actions, privateInfo }: { role: string; actions: any[]; privateInfo?: any }) {
  const myActions = actions.filter((a) => a.player === role);
  const lastAction = myActions[myActions.length - 1];
  const colorMap: Record<string, string> = {
    candidate: "border-blue-700/50 bg-blue-950/20",
    hr: "border-purple-700/50 bg-purple-950/20",
    interviewer: "border-amber-700/50 bg-amber-950/20",
    market: "border-emerald-700/50 bg-emerald-950/20",
  };

  return (
    <motion.div
      className={`border rounded-xl p-4 ${colorMap[role] || "border-slate-700 bg-slate-900"}`}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="flex items-center gap-2 mb-3">
        <PlayerIcon player={role as any} size={34} />
        <div>
          <div className="text-sm font-semibold text-white">{AGENT_LABELS[role]}</div>
          <div className="text-xs text-slate-500">私有信息不可见</div>
        </div>
      </div>
      {privateInfo && (
        <div className="text-xs text-slate-500 space-y-0.5 mb-2 bg-slate-800/50 rounded-lg p-2">
          {Object.entries(privateInfo).map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span>{PRIVATE_LABELS[k] || k}</span>
              <span className="text-slate-400">
                {typeof v === "number"
                  ? (v > 1 && k.includes("budget") || k.includes("wage") || k.includes("salary")
                      ? `${v}K`
                      : k.includes("budget") || k.includes("equity")
                      ? `${v}K`
                      : k.includes("ratio")
                      ? v.toFixed(2)
                      : `${(v * 100).toFixed(0)}%`)
                  : String(v)}
              </span>
            </div>
          ))}
        </div>
      )}
      {lastAction && (
        <div className="mt-2 pt-2 border-t border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <ActionBadge action={lastAction} />
            <span className="text-xs text-slate-500">第{lastAction.round + 1}轮</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{lastAction.reasoning}</p>
        </div>
      )}
    </motion.div>
  );
}

function RoundTimeline({ actions }: { actions: any[] }) {
  const rounds = new Map<number, any[]>();
  actions.forEach((a) => {
    const r = a.round;
    if (!rounds.has(r)) rounds.set(r, []);
    rounds.get(r)!.push(a);
  });

  const [expandedRound, setExpandedRound] = useState<number | null>(0);

  return (
    <div className="space-y-2">
      {Array.from(rounds.entries()).map(([round, roundActions]) => (
        <div key={round} className="border border-slate-700/50 rounded-lg overflow-hidden">
          <button
            onClick={() => setExpandedRound(expandedRound === round ? null : round)}
            className="w-full flex items-center justify-between px-4 py-2 bg-slate-800/50 hover:bg-slate-800 transition-colors text-left"
          >
            <span className="text-sm font-medium">
              第 {round + 1} 轮
              <span className="text-xs text-slate-500 ml-2">
                {roundActions.length} 个动作
              </span>
            </span>
            <span className="text-xs text-slate-500">{expandedRound === round ? "收起 ▲" : "展开 ▼"}</span>
          </button>
          <AnimatePresence>
            {expandedRound === round && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="px-4 py-2 space-y-1.5 border-t border-slate-700/30">
                  {roundActions.map((a, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="flex items-start gap-3 text-sm py-1.5"
                    >
                      <div className="flex items-center gap-1.5 min-w-0 shrink-0">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                          a.player === "candidate" ? "bg-blue-500" :
                          a.player === "hr" ? "bg-purple-500" :
                          a.player === "interviewer" ? "bg-amber-500" : "bg-emerald-500"
                        }`} />
                        <span className="text-xs text-slate-500 w-14 shrink-0">{AGENT_LABELS[a.player]}</span>
                      </div>
                      <ActionBadge action={a} />
                      <span className="text-xs text-slate-400 min-w-0 flex-1 line-clamp-2">{a.reasoning}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

function EvalBars({ dimensions, composite }: { dimensions: any[]; composite: number }) {
  const DIM_LABELS: Record<string, string> = {
    skill_match: "技能匹配",
    experience_fit: "经验匹配",
    school_signal: "学历信号",
    competition_signal: "竞赛信号",
    company_pedigree: "公司背书",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2 mb-2">
        <span className="text-3xl font-bold text-cyan-400">
          <NumberTicker target={Math.round(composite * 100)} suffix="%" duration={1.5} autoStart />
        </span>
        <span className="text-sm text-slate-500 mb-1">综合评分</span>
      </div>
      {dimensions.map((d, idx) => (
        <div key={d.dimension}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-400">{DIM_LABELS[d.dimension] || d.dimension}</span>
            <span className="text-slate-300 font-mono">{(d.score * 100).toFixed(0)}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${d.score * 100}%` }}
              transition={{ duration: 0.8, delay: 0.2 + idx * 0.1, ease: "easeOut" }}
              style={{
                background: d.score > 0.7
                  ? "linear-gradient(90deg, #22d3ee, #3b82f6)"
                  : d.score > 0.4
                  ? "linear-gradient(90deg, #f59e0b, #f97316)"
                  : "linear-gradient(90deg, #ef4444, #f97316)",
              }}
            />
          </div>
          <p className="text-xs text-slate-600 mt-0.5 truncate">{d.reasoning}</p>
        </div>
      ))}
    </div>
  );
}

function ResultsPanel({ result }: { result: any }) {
  const sim = result.simulation;
  const eq = result.equilibrium;
  const isAccepted = sim.outcome === "accepted";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <motion.div
        className="bg-slate-800/50 rounded-lg p-3 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="text-xs text-slate-500 mb-1">结果</div>
        <div className={`text-xl font-bold ${isAccepted ? "text-emerald-400" : "text-red-400"}`}>
          {isAccepted ? "已录取" : sim.outcome === "rejected" ? "已拒绝" : "超时"}
        </div>
      </motion.div>
      <motion.div
        className="bg-slate-800/50 rounded-lg p-3 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="text-xs text-slate-500 mb-1">最终薪资</div>
        <div className="text-xl font-bold text-white">
          <NumberTicker target={sim.final_salary} suffix="K" duration={1.2} autoStart />
        </div>
        <div className="text-xs text-slate-500">{(sim.final_salary / 10).toFixed(0)}万/年</div>
      </motion.div>
      <motion.div
        className="bg-slate-800/50 rounded-lg p-3 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="text-xs text-slate-500 mb-1">成功率</div>
        <div className="text-xl font-bold text-cyan-400">
          <NumberTicker target={Math.round(sim.success_probability * 100)} suffix="%" duration={1.5} autoStart />
        </div>
      </motion.div>
      <motion.div
        className="bg-slate-800/50 rounded-lg p-3 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <div className="text-xs text-slate-500 mb-1">谈判轮次</div>
        <div className="text-xl font-bold text-white">
          <NumberTicker target={sim.negotiation_rounds} duration={0.8} autoStart />
        </div>
      </motion.div>

      <motion.div
        className="bg-slate-800/50 rounded-lg p-3 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="text-xs text-slate-500 mb-1">候选人收益</div>
        <div className={`text-lg font-mono font-bold ${sim.candidate_payoff > 0.3 ? "text-emerald-400" : "text-yellow-400"}`}>
          {sim.candidate_payoff.toFixed(3)}
        </div>
      </motion.div>
      <motion.div
        className="bg-slate-800/50 rounded-lg p-3 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <div className="text-xs text-slate-500 mb-1">HR收益</div>
        <div className={`text-lg font-mono font-bold ${sim.hr_payoff > 0.3 ? "text-emerald-400" : "text-yellow-400"}`}>
          {sim.hr_payoff.toFixed(3)}
        </div>
      </motion.div>
      <motion.div
        className="bg-slate-800/50 rounded-lg p-3 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="text-xs text-slate-500 mb-1">信息不对称成本</div>
        <div className="text-lg font-mono font-bold text-amber-400">{sim.information_asymmetry_cost.toFixed(3)}</div>
      </motion.div>
      <motion.div
        className="bg-slate-800/50 rounded-lg p-3 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        <div className="text-xs text-slate-500 mb-1">均衡解</div>
        <div className="text-sm font-bold text-purple-400">
          {eq.equilibrium_type === "pure_bne" ? "纯策略BNE" : eq.equilibrium_type}
        </div>
        <div className="text-xs text-slate-500">{eq.solver_iterations} 次迭代</div>
      </motion.div>
    </div>
  );
}

export default function DemoPage() {
  const [selected, setSelected] = useState(0);
  const [strategy, setStrategy] = useState("balanced");
  const [market, setMarket] = useState("normal");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"board" | "timeline" | "eval">("board");

  const runDemo = async () => {
    setLoading(true);
    setError("");
    try {
      const demo = DEMOS[selected];
      const resp = await fetch(
        `http://localhost:8001/api/demo?resume_key=${demo.resume}&job_key=${demo.job}&strategy=${strategy}&market=${market}`
      );
      const data = await resp.json();
      if (data.status === "ok") setResult(data);
      else setError(data.message || "未知错误");
    } catch (e: any) {
      setError(e.message || "无法连接后端。请先启动: uvicorn api.main:app --port 8001");
    }
    setLoading(false);
  };

  const actions = result?.simulation?.final_state?.action_history || [];
  const candidateType = result?.simulation?.final_state?.candidate_type;
  const hrType = result?.simulation?.final_state?.hr_type;
  const interviewerType = result?.simulation?.final_state?.interviewer_type;
  const marketType = result?.simulation?.final_state?.market_type;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">职业博弈模拟</h1>
          <p className="text-slate-500 text-sm mt-1">四角色不完备信息贝叶斯博弈 · 多轮招聘谈判推演</p>
        </div>
        <div className="text-xs text-slate-600 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5">
          候选人 + HR + 面试官 + 市场环境
        </div>
      </div>

      {/* 控制面板 */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select value={selected} onChange={(e) => setSelected(Number(e.target.value))}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm w-full">
            {DEMOS.map((d, i) => (
              <option key={i} value={i}>{d.label}</option>
            ))}
          </select>
          <select value={strategy} onChange={(e) => setStrategy(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm">
            <option value="balanced">策略：稳健型</option>
            <option value="aggressive">策略：激进型</option>
            <option value="conservative">策略：保守型</option>
          </select>
          <select value={market} onChange={(e) => setMarket(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm">
            <option value="normal">市场：正常</option>
            <option value="hot">市场：热门</option>
            <option value="cool">市场：冷淡</option>
          </select>
          <button
            onClick={runDemo}
            disabled={loading}
            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded-lg font-medium transition-colors text-sm"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="flex gap-1">
                  {[0,1,2].map(i => (
                    <motion.span key={i} className="w-1.5 h-1.5 rounded-full bg-white"
                      animate={{opacity:[0.3,1,0.3]}} transition={{duration:1,repeat:Infinity,delay:i*0.2}} />
                  ))}
                </span>
                运行中...
              </span>
            ) : "开始模拟"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 mb-6 text-red-300 text-sm">{error}</div>
      )}

      {result && (
        <div className="space-y-6">
          {/* 候选人与岗位摘要 */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <PlayerIcon player="candidate" size={36} />
              <div>
                <span className="text-white font-medium">{result.candidate.name}</span>
                <span className="text-slate-500 ml-2">{result.candidate.skills?.slice(0, 4).join(" / ")}...</span>
              </div>
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

          {/* 结果面板 */}
          <ResultsPanel result={result} />

          {/* 详情切换 */}
          <div className="flex gap-2 border-b border-slate-800">
            {([
              ["board", "博弈面板"],
              ["timeline", "轮次回放"],
              ["eval", "评估与均衡"],
            ] as const).map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? "border-cyan-500 text-cyan-400"
                    : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* 博弈面板 */}
          <AnimatePresence mode="wait">
            {activeTab === "board" && (
            <motion.div
              key="board"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <AgentCard role="market" actions={actions} privateInfo={{
                supply_demand_ratio: marketType?.supply_demand_ratio,
                salary_trend: marketType?.salary_trend,
              }} />
              <AgentCard role="interviewer" actions={actions} privateInfo={{
                strictness: interviewerType?.strictness,
                preferred_skill_style: interviewerType?.preferred_skill_style,
                risk_tolerance: interviewerType?.risk_tolerance,
              }} />
              <AgentCard role="candidate" actions={actions} privateInfo={{
                true_ability: candidateType?.true_ability,
                reservation_wage: candidateType?.reservation_wage,
                career_ambition: candidateType?.career_ambition,
              }} />
              <AgentCard role="hr" actions={actions} privateInfo={{
                true_budget: hrType?.true_budget,
                urgency: hrType?.urgency,
                internal_equity_constraint: hrType?.internal_equity_constraint,
              }} />
            </motion.div>
          )}

          {/* 轮次回放 */}
          {activeTab === "timeline" && (
            <motion.div
              key="timeline"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <RoundTimeline actions={actions} />
            </motion.div>
          )}

          {/* 评估与均衡 */}
          {activeTab === "eval" && (
            <motion.div
              key="eval"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h2 className="text-sm font-semibold text-cyan-400 mb-4">多维度评估</h2>
                <EvalBars dimensions={result.evaluation.dimensions} composite={result.evaluation.composite} />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h2 className="text-sm font-semibold text-purple-400 mb-4">贝叶斯纳什均衡</h2>
                <div className="space-y-4 text-sm">
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="text-slate-400 text-xs mb-2">候选人最优策略</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-slate-500">要价：</span> <span className="text-white font-mono">{result.equilibrium.candidate_strategy.opening_salary_ask}K</span></div>
                      <div><span className="text-slate-500">姿态：</span> <span className="text-white">{result.equilibrium.candidate_strategy.stance === "firm" ? "强硬" : "灵活"}</span></div>
                      <div><span className="text-slate-500">底线：</span> <span className="text-white font-mono">{result.equilibrium.candidate_strategy.reservation_wage}K</span></div>
                      <div><span className="text-slate-500">让步至：</span> <span className="text-white font-mono">{result.equilibrium.candidate_strategy.willing_to_concede_to}K</span></div>
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="text-slate-400 text-xs mb-2">HR最优策略</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-slate-500">开价：</span> <span className="text-white font-mono">{result.equilibrium.hr_strategy.opening_offer}K</span></div>
                      <div><span className="text-slate-500">上限：</span> <span className="text-white font-mono">{result.equilibrium.hr_strategy.max_final_offer}K</span></div>
                      <div><span className="text-slate-500">预算：</span> <span className="text-white font-mono">{result.equilibrium.hr_strategy.budget_ceiling}K</span></div>
                      <div><span className="text-slate-500">紧急度：</span> <span className="text-white">{(result.equilibrium.hr_strategy.urgency * 100).toFixed(0)}%</span></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                      <div className="text-xs text-slate-500">候选人预期收益</div>
                      <div className="text-lg font-mono text-blue-400">{result.equilibrium.candidate_expected_payoff.toFixed(3)}</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                      <div className="text-xs text-slate-500">HR预期收益</div>
                      <div className="text-lg font-mono text-purple-400">{result.equilibrium.hr_expected_payoff.toFixed(3)}</div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600">
                    {result.equilibrium.converged
                      ? `${result.equilibrium.solver_iterations} 次迭代收敛`
                      : "未完全收敛"}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
          </AnimatePresence>

          {/* 策略建议 */}
          <div className={`border rounded-xl p-4 text-sm ${
            result.simulation.outcome === "accepted"
              ? "bg-emerald-950/20 border-emerald-800"
              : "bg-red-950/20 border-red-800"
          }`}>
            <span className="font-semibold">
              {result.simulation.outcome === "accepted" ? "策略建议：" : "失败分析："}
            </span>
            <span className="text-slate-400">{result.simulation.recommendation}</span>
          </div>
        </div>
      )}
    </div>
  );
}
