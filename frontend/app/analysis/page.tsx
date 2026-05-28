"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react";
import { API_BASE } from "@/lib/api";

const DIM_LABELS: Record<string, string> = {
  skill_match: "技能匹配",
  experience_fit: "经验匹配",
  school_signal: "学历信号",
  competition_signal: "竞赛信号",
  company_pedigree: "公司背书",
};

export default function AnalysisPage() {
  const [resumeJson, setResumeJson] = useState("");
  const [jobJson, setJobJson] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const runAnalysis = async () => {
    if (!resumeJson.trim() || !jobJson.trim()) {
      setError("请同时粘贴简历和岗位 JSON 数据");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const resp = await fetch(`${API_BASE}/api/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume: JSON.parse(resumeJson), job: JSON.parse(jobJson) }),
      });
      const data = await resp.json();
      if (data.status === "ok") setResult(data);
      else setError(data.message || "分析失败");
    } catch (e: any) {
      setError(e.message || "无法连接后端。请先启动: uvicorn api.main:app --port 8001");
    }
    setLoading(false);
  };

  return (
    <div className="product-shell min-h-[calc(100vh-56px)]">
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8">
        <div className="text-xs font-semibold text-[var(--accent-cyan)]">专业分析报告</div>
        <h1 className="mt-2 text-3xl font-black text-[var(--text-primary)]">多维评估报告</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">基于中国互联网行业特有的评估体系，对候选人与岗位的匹配度进行结构化分析。动态博弈维度会在谈判复盘中呈现。</p>
      </div>

      <div className="surface-raised grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 rounded-3xl p-5">
        <div>
          <label className="block text-sm text-slate-400 mb-1">简历数据（JSON）</label>
          <textarea value={resumeJson} onChange={(e) => setResumeJson(e.target.value)}
            placeholder='{"name": "...", "skills": [...], "education": [...], "experience": [...], "competitions": [...]}'
            rows={8} className="surface-base w-full rounded-2xl px-4 py-3 text-sm font-mono outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-cyan)]/40" />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">岗位数据（JSON）</label>
          <textarea value={jobJson} onChange={(e) => setJobJson(e.target.value)}
            placeholder='{"title": "...", "company": "...", "level": "P7", "required_skills": [...], "optional_skills": [...]}'
            rows={8} className="surface-base w-full rounded-2xl px-4 py-3 text-sm font-mono outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-cyan)]/40" />
        </div>
      </div>

      <button onClick={runAnalysis} disabled={loading}
        className="primary-action mb-8 rounded-2xl px-6 py-3 font-medium transition disabled:opacity-50">
        {loading ? "分析中..." : "开始分析"}
      </button>

      {error && <div className="surface-base mb-6 rounded-2xl p-4 text-sm text-red-300">{error}</div>}

      {result && (
        <div className="surface-raised rounded-3xl p-6">
          <div className="flex items-end gap-3 mb-6">
            <span className="text-4xl font-bold text-cyan-400">{(result.composite_score * 100).toFixed(0)}%</span>
            <span className="text-sm text-slate-500 mb-1">综合评分（{result.dimension_count} 个维度）</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {result.dimensions.map((d: any) => (
              <div key={d.dimension} className="surface-base rounded-2xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-sm font-medium text-white">
                      {DIM_LABELS[d.dimension] || d.dimension}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">权重 {(d.weight * 100).toFixed(0)}%</div>
                  </div>
                  <div className="text-2xl font-bold text-cyan-400">{(d.score * 100).toFixed(0)}%</div>
                </div>

                {/* 进度条 */}
                <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${d.score * 100}%`,
                      background: d.score > 0.7
                        ? "linear-gradient(90deg, #22d3ee, #3b82f6)"
                        : d.score > 0.4
                        ? "linear-gradient(90deg, #f59e0b, #f97316)"
                        : "linear-gradient(90deg, #ef4444, #f97316)",
                    }}
                  />
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">{d.reasoning}</p>

                {d.evidence && d.evidence.length > 0 && (
                  <ul className="mt-2 space-y-0.5">
                    {d.evidence.map((e: string, i: number) => (
                      <li key={i} className="text-xs text-slate-600">{e}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
