"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ResultsGrid from "./ResultsGrid";
import AgentCard from "./AgentCard";
import OutcomeResultCard from "./OutcomeResultCard";
import RoundEvidenceTimeline from "./RoundEvidenceTimeline";
import RoundTimeline from "./RoundTimeline";
import EvalBars from "./EvalBars";
import NarrativeResults from "./NarrativeResults";
import CredibilityLedger from "./CredibilityLedger";
import type { EquilibriumView, EvaluationView, FinalResultView, FinalStateView, RoundActionView } from "../hooks/types";

type TabKey = "narrative" | "board" | "timeline" | "eval";

const TABS: { key: TabKey; label: string }[] = [
  { key: "narrative", label: "复盘叙事" },
  { key: "board", label: "博弈面板" },
  { key: "timeline", label: "轮次回放" },
  { key: "eval", label: "评估与均衡" },
];

function extractPlayerTypes(finalState: FinalStateView | undefined) {
  return {
    candidate: finalState?.candidate_type || null,
    hr: finalState?.hr_type || null,
    interviewer: finalState?.interviewer_type || null,
    market: finalState?.market_type || null,
  };
}

function extractScores(finalState: FinalStateView | undefined, evaluation?: EvaluationView) {
  if (evaluation?.dimensions) {
    return {
      dimensions: evaluation.dimensions,
      composite: evaluation.composite ?? 0,
    };
  }
  const scores = finalState?.scores || {};
  const dims = Object.entries(scores).map(([k, v]) => ({
    dimension: k,
    score: typeof v === "number" ? v : 0,
    reasoning: "",
  }));
  const composite =
    dims.length > 0
      ? dims.reduce((s, d) => s + d.score, 0) / dims.length
      : 0;
  return { dimensions: dims, composite };
}

function extractSalary(action: RoundActionView) {
  const value = action.params?.salary_offer ?? action.params?.salary_ask ?? action.params?.salary_amount ?? action.params?.accepted_salary;
  return typeof value === "number" ? value : null;
}

function buildWarReport(actions: RoundActionView[], finalSalary: number | null, outcome: string, successProbability: number) {
  const salaryActions = actions
    .map((action) => ({ action, salary: extractSalary(action) }))
    .filter((item): item is { action: RoundActionView; salary: number } => item.salary !== null);
  const firstSalary = salaryActions[0]?.salary ?? null;
  const lastSalary = finalSalary ?? salaryActions[salaryActions.length - 1]?.salary ?? null;
  const concessions = salaryActions.slice(1).map((item, index) => Math.abs(item.salary - salaryActions[index].salary));
  const largestMove = concessions.length ? Math.max(...concessions) : 0;
  const turningPoint = actions.find((action) => /accept|reject|counter_offer|offer/.test(action.action_type) && action.reasoning) || actions[actions.length - 1];
  const riskLevel = outcome === "accepted" ? "可控" : successProbability >= 0.5 ? "临界" : "高压";

  return {
    firstSalary,
    lastSalary,
    largestMove,
    riskLevel,
    turningPoint,
    signalCount: actions.filter((action) => action.action_type === "signal" || action.action_type === "evaluate").length,
  };
}

interface GameResultsViewProps {
  finalResult: FinalResultView;
  outcomeMessage: string;
  equilibrium: EquilibriumView | null;
  hrPersona?: { name: string; tagline: string };
  recommendation?: string;
  terminationReason?: string;
  onChat: (msg: string) => void;
  onRestart: () => void;
  onHome?: () => void;
}

export default function GameResultsView({
  finalResult,
  outcomeMessage,
  equilibrium,
  hrPersona,
  recommendation = "",
  terminationReason = "",
  onChat,
  onRestart,
  onHome,
}: GameResultsViewProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("narrative");

  const outcome = String(finalResult.outcome || "rejected");
  const finalSalary =
    typeof finalResult.final_salary === "number" ? finalResult.final_salary : null;
  const negotiationRounds = Number(finalResult.negotiation_rounds || 0);
  const successProbability = Number(finalResult.success_probability || 0);
  const candidatePayoff = Number(finalResult.candidate_payoff || 0);
  const hrPayoff = Number(finalResult.hr_payoff || 0);
  const informationAsymmetryCost = Number(
    finalResult.information_asymmetry_cost || 0
  );

  const finalState = finalResult.final_state || {};
  const actions: RoundActionView[] = finalState?.action_history || [];
  const warReport = buildWarReport(actions, finalSalary, outcome, successProbability);
  const players = extractPlayerTypes(finalState);
  const scoreData = extractScores(
    finalState,
    finalResult.evaluation
  );

  return (
    <div className="space-y-6">
      <OutcomeResultCard
        outcome={outcome}
        outcomeMessage={outcomeMessage}
        actionCount={actions.length}
        warReport={warReport}
      />

      {/* Results Grid */}
      <ResultsGrid
        outcome={outcome}
        finalSalary={finalSalary}
        successProbability={successProbability}
        negotiationRounds={negotiationRounds}
        candidatePayoff={candidatePayoff}
        hrPayoff={hrPayoff}
        informationAsymmetryCost={informationAsymmetryCost}
        equilibriumType={equilibrium?.equilibrium_type}
        solverIterations={equilibrium?.solver_iterations}
      />

      <CredibilityLedger finalResult={finalResult} equilibrium={equilibrium} />

      {/* Tab Switcher */}
      <div className="flex gap-2 border-b border-[var(--border-hairline)]"
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-[var(--accent-cyan)] text-[var(--accent-cyan)]"
                : "border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === "narrative" && (
          <motion.div
            key="narrative"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <NarrativeResults
              outcome={outcome}
              outcomeMessage={outcomeMessage}
              finalSalary={finalSalary}
              negotiationRounds={negotiationRounds}
              successProbability={successProbability}
              candidatePayoff={candidatePayoff}
              equilibrium={equilibrium}
              informationAsymmetryCost={informationAsymmetryCost}
              recommendation={recommendation}
              terminationReason={terminationReason}
              hrPersona={hrPersona}
              onChat={onChat}
              onRestart={onRestart}
              onHome={onHome}
              hideStats
            />
          </motion.div>
        )}

        {activeTab === "board" && (
          <motion.div
            key="board"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <AgentCard
              role="market"
              actions={actions}
              privateInfo={
                players.market
                  ? {
                      supply_demand_ratio: players.market.supply_demand_ratio,
                      salary_trend: players.market.salary_trend,
                    }
                  : undefined
              }
            />
            <AgentCard
              role="interviewer"
              actions={actions}
              privateInfo={
                players.interviewer
                  ? {
                      strictness: players.interviewer.strictness,
                      preferred_skill_style:
                        players.interviewer.preferred_skill_style,
                      risk_tolerance: players.interviewer.risk_tolerance,
                    }
                  : undefined
              }
            />
            <AgentCard
              role="candidate"
              actions={actions}
              privateInfo={
                players.candidate
                  ? {
                      true_ability: players.candidate.true_ability,
                      reservation_wage: players.candidate.reservation_wage,
                      career_ambition: players.candidate.career_ambition,
                    }
                  : undefined
              }
            />
            <AgentCard
              role="hr"
              actions={actions}
              privateInfo={
                players.hr
                  ? {
                      true_budget: players.hr.true_budget,
                      urgency: players.hr.urgency,
                      internal_equity_constraint:
                        players.hr.internal_equity_constraint,
                    }
                  : undefined
              }
            />
          </motion.div>
        )}

        {activeTab === "timeline" && (
          <motion.div
            key="timeline"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <div className="space-y-4">
              <RoundEvidenceTimeline actions={actions} />
              <RoundTimeline actions={actions} />
            </div>
          </motion.div>
        )}

        {activeTab === "eval" && (
          <motion.div
            key="eval"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <div className="surface-base rounded-3xl p-6"
            >
              <h2 className="text-sm font-semibold text-[var(--accent-cyan)] mb-4"
              >
                多维度评估
              </h2>
              <EvalBars
                dimensions={scoreData.dimensions}
                composite={scoreData.composite}
              />
            </div>
            <div className="surface-base rounded-3xl p-6"
            >
              <h2 className="text-sm font-semibold text-[var(--hr-purple)] mb-4"
              >
                策略响应分析
              </h2>
              <div className="space-y-4 text-sm">
                {equilibrium?.candidate_strategy && (
                  <div className="bg-[var(--bg-elev)]/50 rounded-lg p-3"
                  >
                    <div className="text-[var(--text-tertiary)] text-xs mb-2"
                    >
                      候选人最优策略
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs"
                    >
                      <div>
                        <span className="text-[var(--text-tertiary)]"
                        >
                          要价：
                        </span>{" "}
                        <span className="text-[var(--text-primary)] font-mono"
                        >
                          {equilibrium.candidate_strategy.opening_salary_ask ?? "--"}
                          K
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--text-tertiary)]"
                        >
                          姿态：
                        </span>{" "}
                        <span className="text-[var(--text-primary)]"
                        >
                          {equilibrium.candidate_strategy.stance === "firm"
                            ? "强硬"
                            : "灵活"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--text-tertiary)]"
                        >
                          底线：
                        </span>{" "}
                        <span className="text-[var(--text-primary)] font-mono"
                        >
                          {equilibrium.candidate_strategy.reservation_wage ?? "--"}K
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--text-tertiary)]"
                        >
                          让步至：
                        </span>{" "}
                        <span className="text-[var(--text-primary)] font-mono"
                        >
                          {
                            equilibrium.candidate_strategy
                              .willing_to_concede_to ?? "--"
                          }
                          K
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                {equilibrium?.hr_strategy && (
                  <div className="bg-[var(--bg-elev)]/50 rounded-lg p-3"
                  >
                    <div className="text-[var(--text-tertiary)] text-xs mb-2"
                    >
                      HR最优策略
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs"
                    >
                      <div>
                        <span className="text-[var(--text-tertiary)]"
                        >
                          开价：
                        </span>{" "}
                        <span className="text-[var(--text-primary)] font-mono"
                        >
                          {equilibrium.hr_strategy.opening_offer ?? "--"}K
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--text-tertiary)]"
                        >
                          上限：
                        </span>{" "}
                        <span className="text-[var(--text-primary)] font-mono"
                        >
                          {equilibrium.hr_strategy.max_final_offer ?? "--"}K
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--text-tertiary)]"
                        >
                          预算：
                        </span>{" "}
                        <span className="text-[var(--text-primary)] font-mono"
                        >
                          {equilibrium.hr_strategy.budget_ceiling ?? "--"}K
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--text-tertiary)]"
                        >
                          紧急度：
                        </span>{" "}
                        <span className="text-[var(--text-primary)]"
                        >
                          {typeof equilibrium.hr_strategy.urgency === "number" ? `${(equilibrium.hr_strategy.urgency * 100).toFixed(0)}%` : "--"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3"
                >
                  <div className="bg-[var(--bg-elev)]/50 rounded-lg p-3 text-center"
                  >
                    <div className="text-xs text-[var(--text-tertiary)]"
                    >
                      候选人预期收益
                    </div>
                    <div className="text-lg font-mono text-[var(--candidate-blue)]"
                    >
                      {equilibrium?.candidate_expected_payoff?.toFixed(3) ||
                        "—"}
                    </div>
                  </div>
                  <div className="bg-[var(--bg-elev)]/50 rounded-lg p-3 text-center"
                  >
                    <div className="text-xs text-[var(--text-tertiary)]"
                    >
                      HR预期收益
                    </div>
                    <div className="text-lg font-mono text-[var(--hr-purple)]"
                    >
                      {equilibrium?.hr_expected_payoff?.toFixed(3) || "—"}
                    </div>
                  </div>
                </div>
                {equilibrium?.converged !== undefined && (
                  <p className="text-xs text-[var(--text-tertiary)]"
                  >
                    {equilibrium.converged
                      ? `${equilibrium.solver_iterations} 次迭代收敛`
                      : "未完全收敛"}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
