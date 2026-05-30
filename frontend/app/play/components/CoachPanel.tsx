"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { InfoPlayFeedback } from "../hooks/useInfoWar";
import type { GameStateView, InfoCardView, RoundActionView, TrustStateView } from "../hooks/types";
import type { RoundInsight } from "./RoundInsightPanel";

interface CoachPanelProps {
  actions: RoundActionView[];
  gameState: GameStateView | null;
  hrPatience: number;
  trustState: TrustStateView | null;
  roundInsight: RoundInsight | null;
  infoCards: InfoCardView[];
  lastInfoPlay: InfoPlayFeedback | null;
  disabled?: boolean;
  defaultOpen?: boolean;
}

interface HRProfile {
  label: string;
  strategy: string;
}

type Severity = "tip" | "warning" | "danger";
type Band = "weak" | "medium" | "strong";
type BottomLine = "loose" | "stable" | "firm";
type Certainty = "low" | "medium" | "high";

interface CoachAdvice {
  severity: Severity;
  verdict: string;
  why: string;
  recommendedMove: string;
  profile: HRProfile;
  belief: {
    trust: number;
    patience: number;
    externalOptions: Band;
    bottomLine: BottomLine;
    acceptanceCertainty: Certainty;
  };
}

const SEVERITY_META: Record<Severity, { label: string; cls: string; dot: string }> = {
  tip: { label: "可推进", cls: "border-[var(--accent-cyan)]/25 bg-[var(--accent-cyan-glow)] text-[var(--accent-cyan)]", dot: "bg-[var(--accent-cyan)]" },
  warning: { label: "需控节奏", cls: "border-amber-300/25 bg-amber-300/10 text-amber-200", dot: "bg-amber-300" },
  danger: { label: "高压", cls: "border-rose-300/25 bg-rose-300/10 text-rose-200", dot: "bg-rose-300" },
};

function salaryOf(action: RoundActionView | undefined) {
  const value = action?.params?.salary_offer ?? action?.params?.salary_ask ?? action?.params?.salary_amount ?? action?.params?.accepted_salary;
  return typeof value === "number" ? value : null;
}

function latestBy(actions: RoundActionView[], player: string) {
  return [...actions].reverse().find((action) => action.player === player);
}

function latestSalaryBy(actions: RoundActionView[], player: string) {
  return [...actions].reverse().find((action) => action.player === player && salaryOf(action) !== null);
}

function hasBudgetSignal(action: RoundActionView | undefined) {
  const text = `${action?.action_type || ""} ${action?.reasoning || ""}`.toLowerCase();
  return /预算|budget|内部公平|带宽|审批|上限|ceiling|equity/.test(text);
}

function band(value: number): Band {
  if (value >= 0.7) return "strong";
  if (value >= 0.4) return "medium";
  return "weak";
}

function estimateBottomLine(actions: RoundActionView[]): BottomLine {
  const asks = actions
    .filter((action) => action.player === "candidate")
    .map((action) => salaryOf(action))
    .filter((value): value is number => value !== null);
  if (asks.length < 2) return "stable";
  const first = asks[0];
  const last = asks[asks.length - 1];
  const concession = first - last;
  if (concession <= 2) return "firm";
  if (concession >= 8) return "loose";
  return "stable";
}

function estimateCertainty(hrPatience: number, trust: number, lastCandidateAction: RoundActionView | undefined): Certainty {
  if (lastCandidateAction?.action_type === "accept") return "high";
  if (hrPatience < 0.3 || trust < 0.35) return "low";
  if (hrPatience > 0.6 && trust > 0.6) return "high";
  return "medium";
}

function labelBand(value: Band) {
  return value === "strong" ? "强" : value === "medium" ? "中" : "弱";
}

function labelBottomLine(value: BottomLine) {
  return value === "firm" ? "强硬" : value === "stable" ? "稳定" : "松动";
}

function labelCertainty(value: Certainty) {
  return value === "high" ? "高" : value === "medium" ? "中" : "低";
}

function inferHRProfile({ actions, hrPatience, trust, gameState }: { actions: RoundActionView[]; hrPatience: number; trust: number; gameState: GameStateView | null }): HRProfile {
  const latestHr = latestBy(actions, "hr");
  const text = `${latestHr?.action_type || ""} ${latestHr?.reasoning || ""}`.toLowerCase();
  const competition = gameState?.competition_intensity ?? 0.45;

  if (hasBudgetSignal(latestHr)) {
    return { label: "预算守门人", strategy: "少争单点现金，改拆总包、职级和评审周期。" };
  }
  if (competition >= 0.7 && hrPatience >= 0.45) {
    return { label: "抢人型 HR", strategy: "用入职确定性换报价上调，给出条件式承诺。" };
  }
  if (trust < 0.4 || /风险|risk|验证|背调|稳定/.test(text)) {
    return { label: "风险规避型 HR", strategy: "先补可验证证据，再提出更高锚点。" };
  }
  if (/技术|技能|项目|架构|能力|owner/.test(text)) {
    return { label: "技术导向型 HR", strategy: "把项目指标、owner 范围和岗位价值绑定。" };
  }
  return { label: "均衡谈判型 HR", strategy: "先举证再锚定，保持小步收敛。" };
}

function buildAdvice({ actions, gameState, hrPatience, trustState, roundInsight, infoCards, lastInfoPlay }: CoachPanelProps): CoachAdvice {
  const trust = trustState?.hr_trust_in_candidate ?? 0.5;
  const lastHr = latestBy(actions, "hr");
  const lastCandidate = latestBy(actions, "candidate");
  const latestHrSalary = latestSalaryBy(actions, "hr");
  const latestCandidateSalary = latestSalaryBy(actions, "candidate");
  const hrSalary = salaryOf(latestHrSalary);
  const candidateSalary = salaryOf(latestCandidateSalary);
  const offerGap = hrSalary !== null && candidateSalary !== null ? candidateSalary - hrSalary : null;
  const externalOptions = band(Math.max(gameState?.competition_intensity ?? 0.45, gameState?.market_adjustment ?? 0.45));
  const bottomLine = estimateBottomLine(actions);
  const acceptanceCertainty = estimateCertainty(hrPatience, trust, lastCandidate);
  const playableCards = infoCards.filter((card) => card.reveal_state === "hidden");
  const highCredibilityCard = playableCards.find((card) => card.verifiability >= 0.65 && card.trust_impact >= 0);
  const belief = { trust, patience: hrPatience, externalOptions, bottomLine, acceptanceCertainty };
  const profile = inferHRProfile({ actions, hrPatience, trust, gameState });

  if (actions.length === 0) {
    return {
      severity: "tip",
      verdict: "开局先建立可信筹码。",
      why: "HR 还没有形成稳定判断。先说明岗位匹配证据，再给合理高位锚点，能避免报价显得突兀。",
      recommendedMove: "先强调一个可验证项目成果，再提出接近岗位上沿但留有让步空间的锚点。",
      profile,
      belief,
    };
  }

  if (hrPatience < 0.3) {
    return {
      severity: "danger",
      verdict: "HR 耐心偏低，转向成交条件。",
      why: "继续拉扯现金会放大破裂风险。此时更适合减少解释，把谈判从单点月薪切到总包和入职条件。",
      recommendedMove: "提出“现金 + 签字费 + 职级评审 + 绩效周期”的组合方案，或确认可接受 offer 的最后条件。",
      profile,
      belief,
    };
  }

  if (trust < 0.35) {
    return {
      severity: "danger",
      verdict: "先修复可信度，再谈上浮。",
      why: "HR 对你的信任偏低。继续强硬报价会被解释为高风险信号，而不是高价值信号。",
      recommendedMove: highCredibilityCard ? "优先打出高可信筹码卡，选择“强调”而不是重组表达。" : "补充可验证项目数据，例如规模、指标、owner 范围，再回到薪资。",
      profile,
      belief,
    };
  }

  if (hasBudgetSignal(lastHr)) {
    return {
      severity: "warning",
      verdict: "预算口径已出现，拆总包。",
      why: "HR 已经把谈判从价值判断转向审批约束。继续单点加现金，会让对方更容易用预算上限拒绝。",
      recommendedMove: "把诉求拆成现金、签字费、职级、期权/奖金、晋升评审周期，争取总价值而不是只争月薪。",
      profile,
      belief,
    };
  }

  if (offerGap !== null && offerGap >= 8 && trust >= 0.45) {
    return {
      severity: "warning",
      verdict: "先补筹码，不要立刻让步。",
      why: `当前报价差约 ${offerGap}K，HR 可能正在测试你的底线。你还有一定信任基础，直接让步会强化“你可被压价”的判断。`,
      recommendedMove: highCredibilityCard ? "先打出一张高可信筹码卡，再给一个小幅收敛的新报价。" : "先补充项目影响力，再把报价收敛到更容易审批的区间。",
      profile,
      belief,
    };
  }

  if (externalOptions === "strong" && hrPatience >= 0.45) {
    return {
      severity: "tip",
      verdict: "市场筹码可用，换取上调。",
      why: "当前外部选择信号较强，HR 更在意你是否会被其他机会截走。用入职确定性换报价上调更有效。",
      recommendedMove: "表达“如果 package 到达目标区间，我可以优先推进/尽快确认”的条件式承诺。",
      profile,
      belief,
    };
  }

  if (roundInsight?.next_advice) {
    return {
      severity: roundInsight.risk_level === "high" ? "danger" : roundInsight.risk_level === "medium" ? "warning" : "tip",
      verdict: roundInsight.turning_point ? "这是关键转折点。" : "按当前节奏稳步推进。",
      why: roundInsight.hr_interpretation || "系统正在根据 HR 话术、报价变化和信任状态推断局势。",
      recommendedMove: roundInsight.next_advice,
      profile,
      belief,
    };
  }

  if (lastInfoPlay) {
    return {
      severity: "tip",
      verdict: "筹码已进入谈判桌。",
      why: lastInfoPlay.narrative,
      recommendedMove: "观察 HR 下一轮报价。如果信任上升，可以提出更清晰的薪资锚点；如果信任下降，先补充验证证据。",
      profile,
      belief,
    };
  }

  return {
    severity: "tip",
    verdict: "先举证，再锚定。",
    why: "薪资锚点需要被真实项目成果支撑。先建立价值感，再谈数字，能减少 HR 的防御性压价。",
    recommendedMove: "用一句话连接“项目结果 → 岗位价值 → 薪资诉求”，再选择报价或筹码卡。",
    profile,
    belief,
  };
}

export default function CoachPanel(props: CoachPanelProps) {
  const [open, setOpen] = useState(props.defaultOpen ?? true);
  const advice = buildAdvice(props);
  const meta = SEVERITY_META[advice.severity];

  return (
    <motion.section
      className="surface-base relative overflow-hidden rounded-3xl"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(34,211,238,0.12),transparent_34%),radial-gradient(circle_at_100%_100%,rgba(168,85,247,0.10),transparent_34%)]" />
      <div className="relative z-10 p-4">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-start justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-cyan)]/50"
          aria-expanded={open}
        >
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--accent-cyan)]">Coach Mode</div>
            <h3 className="mt-1 text-base font-black text-[var(--text-primary)]">{advice.verdict}</h3>
            {!open && (
              <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[var(--text-tertiary)]">
                {advice.recommendedMove}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black ${meta.cls}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
              {meta.label}
            </span>
            <span className="text-xs text-[var(--text-tertiary)]">{open ? "收起" : "展开"}</span>
          </div>
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              className="mt-4 space-y-3"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.24 }}
            >
              <div className="rounded-2xl border border-[var(--hr-purple)]/15 bg-[var(--hr-purple-glow)] px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-black text-[var(--hr-purple)]">你面对的 HR 画像</div>
                    <div className="mt-1 text-sm font-black text-[var(--text-primary)]">{advice.profile.label}</div>
                  </div>
                  <span className="rounded-full border border-[var(--hr-purple)]/20 px-2 py-1 text-[10px] font-black text-[var(--hr-purple)]">应对策略</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">{advice.profile.strategy}</p>
              </div>
              <CoachBlock label="为什么" value={advice.why} tone="purple" />
              <CoachBlock label="推荐动作" value={advice.recommendedMove} tone="cyan" />
              <div className="grid grid-cols-2 gap-2">
                <BeliefMetric
                  label="信任"
                  value={`${Math.round(advice.belief.trust * 100)}%`}
                  explanation="来自筹码可信度、回应一致性和 HR 验证结果。"
                />
                <BeliefMetric
                  label="耐心"
                  value={`${Math.round(advice.belief.patience * 100)}%`}
                  explanation="耐心越低，继续拉扯现金越容易破裂。"
                />
                <BeliefMetric
                  label="外部选择"
                  value={labelBand(advice.belief.externalOptions)}
                  explanation="市场热度越强，HR 越担心你被其他机会截走。"
                />
                <BeliefMetric
                  label="底线强度"
                  value={labelBottomLine(advice.belief.bottomLine)}
                  explanation="报价让步越小，HR 越会判断你底线强。"
                />
                <BeliefMetric
                  label="入职确定性"
                  value={labelCertainty(advice.belief.acceptanceCertainty)}
                  explanation="成交条件越明确，HR 越愿意用上调换确定性。"
                  wide
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}

function CoachBlock({ label, value, tone }: { label: string; value: string; tone: "cyan" | "purple" }) {
  return (
    <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)]/45 px-4 py-3">
      <div className={tone === "cyan" ? "text-[10px] font-black text-[var(--accent-cyan)]" : "text-[10px] font-black text-[var(--hr-purple)]"}>{label}</div>
      <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">{value}</p>
    </div>
  );
}

function BeliefMetric({ label, value, explanation, wide = false }: { label: string; value: string; explanation: string; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elev)]/55 px-3 py-2 text-center" : "rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elev)]/55 px-3 py-2 text-center"}>
      <div className="text-[9px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{label}</div>
      <div className="mt-1 text-sm font-black text-[var(--text-primary)]">{value}</div>
      <div className="mt-1 text-[9px] leading-relaxed text-[var(--text-tertiary)]">{explanation}</div>
    </div>
  );
}
