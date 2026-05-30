"use client";

import { useState } from "react";
import { API_BASE } from "@/lib/api";

interface ResumeInput extends Record<string, unknown> {
  name?: string;
}

interface JobInput extends Record<string, unknown> {
  title?: string;
  salary_range?: [number, number];
}

interface DimensionScore {
  dimension: string;
  score: number;
  weight?: number;
  reasoning?: string;
  evidence?: string[];
}

interface ReportResponse {
  status: string;
  composite_score: number;
  dimensions: DimensionScore[];
  dimension_count: number;
  message?: string;
}

interface DebateHighlight {
  icon: "✅" | "❌" | "💡";
  text: string;
  dimension: string;
  value: string;
}

interface DebateResponse {
  status?: string;
  proposal?: {
    strengths?: Array<{ title?: string; description?: string; score?: number; dimension?: string }>;
    weaknesses?: Array<{ title?: string; description?: string; score?: number; dimension?: string }>;
    recommendations?: Array<{ title?: string; description?: string; impact?: number; dimension?: string }>;
  };
}

const DIM_META: Record<string, { label: string; emoji: string }> = {
  skill_match: { label: "技能匹配", emoji: "🧠" },
  experience_fit: { label: "经验匹配", emoji: "🛠️" },
  school_signal: { label: "学历信号", emoji: "🎓" },
  competition_signal: { label: "竞赛信号", emoji: "🏅" },
  company_pedigree: { label: "公司背书", emoji: "🏢" },
};

function parseJsonObject<T extends Record<string, unknown>>(text: string, label: string): T {
  const value: unknown = JSON.parse(text);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} 必须是 JSON 对象`);
  }
  return value as T;
}

function scoreColor(score: number) {
  const pct = score * 100;
  if (pct >= 80) return { text: "text-blue-600", bar: "bg-blue-500", bg: "bg-blue-50" };
  if (pct >= 60) return { text: "text-yellow-600", bar: "bg-yellow-500", bg: "bg-yellow-50" };
  return { text: "text-red-600", bar: "bg-red-500", bg: "bg-red-50" };
}

function toHighlights(data: DebateResponse): DebateHighlight[] {
  const proposal = data.proposal;
  if (!proposal) return [];
  const strengths = (proposal.strengths || []).slice(0, 2).map((item) => ({
    icon: "✅" as const,
    text: item.description || item.title || "优势信号明确",
    dimension: item.dimension || "strength",
    value: typeof item.score === "number" ? `${Math.round(item.score * 100)}%` : "+",
  }));
  const weaknesses = (proposal.weaknesses || []).slice(0, 2).map((item) => ({
    icon: "❌" as const,
    text: item.description || item.title || "存在谈判风险",
    dimension: item.dimension || "weakness",
    value: typeof item.score === "number" ? `${Math.round(item.score * 100)}%` : "-",
  }));
  const recommendations = (proposal.recommendations || []).slice(0, 2).map((item) => ({
    icon: "💡" as const,
    text: item.description || item.title || "建议优化策略",
    dimension: item.dimension || "recommendation",
    value: typeof item.impact === "number" ? `+${Math.round(item.impact * 100)}%` : "建议",
  }));
  return [...strengths, ...weaknesses, ...recommendations].slice(0, 5);
}

export default function AnalysisPage() {
  const [resumeJson, setResumeJson] = useState("");
  const [jobJson, setJobJson] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReportResponse | null>(null);
  const [highlights, setHighlights] = useState<DebateHighlight[]>([]);
  const [error, setError] = useState("");
  const [advisorPrompt, setAdvisorPrompt] = useState("");

  const sendPrompt = (prompt: string) => setAdvisorPrompt(prompt);

  const runAnalysis = async () => {
    if (!resumeJson.trim() || !jobJson.trim()) {
      setError("请同时粘贴简历和岗位 JSON 数据");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const resume = parseJsonObject<ResumeInput>(resumeJson, "简历数据");
      const job = parseJsonObject<JobInput>(jobJson, "岗位数据");
      const resp = await fetch(`${API_BASE}/api/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, job }),
      });
      const data = (await resp.json()) as ReportResponse;
      if (data.status === "ok") setResult(data);
      else setError(data.message || "分析失败");

      fetch(`${API_BASE}/api/debate/proposal`)
        .then((r) => r.json() as Promise<DebateResponse>)
        .then((debate) => setHighlights(toHighlights(debate)))
        .catch(() => setHighlights([]));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "无法连接后端。请先启动: uvicorn api.main:app --port 8001");
    }
    setLoading(false);
  };

  const salaryRange = (() => {
    try {
      const job = parseJsonObject<JobInput>(jobJson || "{}", "岗位数据");
      return Array.isArray(job.salary_range) ? job.salary_range : null;
    } catch {
      return null;
    }
  })();
  const marketMedian = salaryRange ? Math.round((salaryRange[0] + salaryRange[1]) / 2) : 50;
  const finalSalary = result ? Math.round(marketMedian * (0.85 + result.composite_score * 0.35)) : 0;
  const deltaPct = result && marketMedian ? Math.round(((finalSalary - marketMedian) / marketMedian) * 100) : 0;
  const finalTrust = result ? Math.round(result.composite_score * 100) : 0;

  return (
    <main className="min-h-[calc(100vh-56px)] bg-slate-50 text-slate-950">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8">
          <div className="text-xs font-black text-[#4F7EFF]">游戏化复盘报告</div>
          <h1 className="mt-2 text-3xl font-black">谈判战报分析台</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">保留现有 `/api/report` 数据接入，将维度评分、亮点和下一步追问包装成更像赛后结算的复盘体验。</p>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:grid-cols-2">
          <InputBlock label="简历数据（JSON）" value={resumeJson} onChange={setResumeJson} placeholder='{"name":"...","skills":[...],"education":[...],"experience":[...]}' />
          <InputBlock label="岗位数据（JSON）" value={jobJson} onChange={setJobJson} placeholder='{"title":"...","company":"...","level":"P7","salary_range":[50,80]}' />
        </div>

        <button onClick={runAnalysis} disabled={loading} className="mb-8 rounded-2xl bg-[#4F7EFF] px-6 py-3 font-black text-white shadow-sm transition hover:brightness-105 disabled:opacity-50">
          {loading ? "生成战报中..." : "开始复盘"}
        </button>

        {error && <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}

        {result && (
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-6xl">{result.composite_score >= 0.6 ? "🏆" : "😔"}</div>
                  <h2 className="mt-3 text-sm font-black text-slate-500">最终成交薪资</h2>
                  <div className="mt-1 text-5xl font-black tracking-tight">¥{finalSalary}K</div>
                  <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-black ${deltaPct >= 0 ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700"}`}>
                    较市场中位数 {deltaPct >= 0 ? "+" : ""}{deltaPct}%
                  </span>
                </div>
                <div className="grid flex-1 grid-cols-2 gap-3 md:max-w-xl md:grid-cols-4">
                  <HeroStat label="轮次数" value="5" />
                  <HeroStat label="打出信号数" value={String(result.dimension_count)} />
                  <HeroStat label="最终信任度" value={`${finalTrust}%`} />
                  <HeroStat label="用时" value="即时" />
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {result.dimensions.map((dimension, index) => (
                <ScoreCard key={dimension.dimension} dimension={dimension} wide={index === result.dimensions.length - 1} />
              ))}
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-black">复盘亮点</h2>
                <span className="rounded-full bg-slate-50 px-3 py-1 text-[11px] font-bold text-slate-500">structured proposals</span>
              </div>
              <div className="space-y-3">
                {(highlights.length ? highlights : result.dimensions.slice(0, 5).map((d) => ({
                  icon: d.score >= 0.7 ? "✅" as const : d.score >= 0.5 ? "💡" as const : "❌" as const,
                  text: d.reasoning || `${DIM_META[d.dimension]?.label || d.dimension} 已完成评分`,
                  dimension: DIM_META[d.dimension]?.label || d.dimension,
                  value: `${Math.round(d.score * 100)}%`,
                }))).map((item, index) => (
                  <HighlightRow key={`${item.dimension}-${index}`} item={item} />
                ))}
              </div>
            </section>

            {advisorPrompt && (
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-bold text-blue-800">
                已发送追问：{advisorPrompt}
              </div>
            )}

            <div className="flex flex-col gap-3 pb-8 sm:flex-row">
              <button onClick={() => sendPrompt("分析这局谈判中信息战每张牌的收益...")} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5">
                🔍 深度分析信息战
              </button>
              <button onClick={() => sendPrompt("如果第X轮打出组合牌，结果如何变化...")} className="rounded-2xl bg-[#4F7EFF] px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5">
                🌌 模拟最优路径
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function InputBlock({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-slate-500">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={8}
        className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 font-mono text-sm text-slate-900 outline-none transition focus:border-[#4F7EFF] focus:bg-white"
      />
    </label>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
      <div className="text-[11px] font-bold text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-black">{value}</div>
    </div>
  );
}

function ScoreCard({ dimension, wide }: { dimension: DimensionScore; wide?: boolean }) {
  const meta = DIM_META[dimension.dimension] || { label: dimension.dimension, emoji: "📌" };
  const color = scoreColor(dimension.score);
  const score = Math.round(dimension.score * 100);
  return (
    <article className={`rounded-3xl border border-slate-100 bg-white p-5 shadow-sm ${wide ? "lg:col-span-3" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-2xl">{meta.emoji}</div>
          <h3 className="mt-2 text-sm font-black">{meta.label}</h3>
        </div>
        <div className={`rounded-2xl px-3 py-2 text-2xl font-black ${color.bg} ${color.text}`}>{score}</div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color.bar}`} style={{ width: `${score}%` }} />
      </div>
      <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-slate-500">{dimension.reasoning || "暂无解释"}</p>
    </article>
  );
}

function HighlightRow({ item }: { item: DebateHighlight }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <div className="text-xl">{item.icon}</div>
      <div className="min-w-0 flex-1">
        <div className="line-clamp-1 text-sm font-black text-slate-800">{item.text}</div>
        <div className="mt-0.5 text-xs font-semibold text-slate-500">{item.dimension}</div>
      </div>
      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700 shadow-sm">{item.value}</span>
    </div>
  );
}
