"use client";

import { motion } from "framer-motion";

export interface RoundInsight {
  round: number;
  hr_interpretation: string;
  situation_delta: {
    trust_level?: number;
    hr_patience?: number;
    patience_delta?: number;
    offer_delta?: number | null;
  };
  next_advice: string;
  risk_level: "low" | "medium" | "high";
  turning_point: boolean;
}

const RISK_META = {
  low: { label: "稳态", color: "var(--state-success)", bg: "rgba(190,242,100,0.10)" },
  medium: { label: "拉扯", color: "var(--interviewer-amber)", bg: "rgba(251,191,36,0.10)" },
  high: { label: "高压", color: "var(--state-danger)", bg: "rgba(251,113,133,0.10)" },
};

function fmtPct(v: number | undefined) {
  if (v === undefined || Number.isNaN(v)) return "--";
  return `${Math.round(v * 100)}%`;
}

function fmtDelta(v: number | null | undefined) {
  if (v === null || v === undefined || Number.isNaN(v)) return "--";
  if (v === 0) return "持平";
  return `${v > 0 ? "+" : ""}${v}K`;
}

function extractInsightTokens(text: string) {
  const source = text.toLowerCase();
  const tokens: string[] = [];
  const add = (v: string) => { if (!tokens.includes(v)) tokens.push(v); };
  if (/信任|trust/.test(source)) add("信任变化");
  if (/耐心|patience/.test(source)) add("耐心变化");
  if (/预算|budget|报价|offer|薪资/.test(source)) add("价格信号");
  if (/风险|risk|破裂|拒绝/.test(source)) add("破局风险");
  if (/让步|concede|妥协/.test(source)) add("让步空间");
  if (tokens.length === 0) add("话术信号");
  return tokens.slice(0, 4);
}

export default function RoundInsightPanel({ insight }: { insight: RoundInsight | null }) {
  if (!insight) return null;

  const risk = RISK_META[insight.risk_level] || RISK_META.medium;
  const patienceDelta = insight.situation_delta.patience_delta;
  const evidenceTokens = extractInsightTokens(`${insight.hr_interpretation} ${insight.next_advice}`);

  return (
    <motion.section
      className="surface-base overflow-hidden rounded-3xl"
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_100%_100%,rgba(168,85,247,0.12),transparent_36%)]" />
      <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-[var(--accent-cyan)] via-[var(--hr-purple)] to-transparent" />

      <div className="relative z-10 p-4 md:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.28em] text-[var(--accent-cyan)]">AI Interception</div>
            <h3 className="mt-1 text-base font-bold text-[var(--text-primary)]">实时拦截分析</h3>
          </div>
          <div className="flex items-center gap-2">
            {insight.turning_point && (
              <span className="rounded-full border border-[var(--interviewer-amber)]/35 bg-[var(--interviewer-amber)]/10 px-2.5 py-1 text-[10px] font-bold text-[var(--interviewer-amber)]">
                关键转折点
              </span>
            )}
            <span
              className="rounded-full border px-2.5 py-1 text-[10px] font-bold"
              style={{ color: risk.color, background: risk.bg, borderColor: `${risk.color}55` }}
            >
              {risk.label}
            </span>
          </div>
        </div>

        <div className="grid gap-3 2xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elev)]/55 p-4">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold text-[var(--hr-purple)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--hr-purple)] shadow-[0_0_12px_var(--hr-purple-glow)]" />
              HR 心理映射
            </div>
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{insight.hr_interpretation}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {evidenceTokens.map((token) => (
                <span key={token} className="ai-chip rounded-full px-2 py-0.5 text-[9px] font-bold">
                  证据: {token}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elev)]/40 p-3">
            <Metric label="信任" value={fmtPct(insight.situation_delta.trust_level)} />
            <Metric label="耐心" value={fmtPct(insight.situation_delta.hr_patience)} />
            <Metric
              label="报价差"
              value={fmtDelta(insight.situation_delta.offer_delta)}
              tone={typeof insight.situation_delta.offer_delta === "number" && insight.situation_delta.offer_delta < 0 ? "danger" : "normal"}
            />
            <div className="col-span-3 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)]/35 px-3 py-2 text-[10px] text-[var(--text-tertiary)]">
              HR 耐心变化：<span className={patienceDelta && patienceDelta < 0 ? "text-[var(--state-danger)]" : "text-[var(--state-success)]"}>
                {patienceDelta === undefined ? "--" : `${patienceDelta > 0 ? "+" : ""}${Math.round(patienceDelta * 100)}%`}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-[var(--accent-cyan)]/15 bg-[var(--accent-cyan-glow)] px-4 py-3">
          <div className="mb-1 flex items-center gap-2 text-[11px] font-bold text-[var(--accent-cyan)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-cyan)] shadow-[0_0_12px_var(--accent-cyan-glow)]" />
            策略锦囊
          </div>
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{insight.next_advice}</p>
          <div className="mt-2 grid gap-2 text-[10px] text-[var(--text-tertiary)] sm:grid-cols-3">
            <span className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)]/35 px-2 py-1">输入: HR话术 + 报价变化</span>
            <span className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)]/35 px-2 py-1">推断: {risk.label}态势</span>
            <span className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)]/35 px-2 py-1">输出: 下一步策略</span>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function Metric({ label, value, tone = "normal" }: { label: string; value: string; tone?: "normal" | "danger" }) {
  return (
    <div className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)]/35 px-2.5 py-2 text-center">
      <div className="text-[9px] text-[var(--text-tertiary)]">{label}</div>
      <div className={tone === "danger" ? "mt-1 text-sm font-bold text-[var(--state-danger)]" : "mt-1 text-sm font-bold text-[var(--accent-cyan)]"}>
        {value}
      </div>
    </div>
  );
}
