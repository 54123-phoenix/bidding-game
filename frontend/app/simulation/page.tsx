"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react";
import { API_BASE } from "@/lib/api";

export default function SimulationPage() {
  const [file, setFile] = useState<File | null>(null);
  const [jobText, setJobText] = useState("");
  const [strategy, setStrategy] = useState("balanced");
  const [market, setMarket] = useState("normal");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!file) { setError("请选择简历文件"); return; }
    if (!jobText.trim()) { setError("请粘贴岗位描述 JSON"); return; }

    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("source_type", "pdf");

      const uploadResp = await fetch(`${API_BASE}/api/upload`, { method: "POST", body: formData });
      const uploadData = await uploadResp.json();
      if (uploadData.status !== "ok") { setError(uploadData.message); setLoading(false); return; }

      const simResp = await fetch(`${API_BASE}/api/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume: uploadData.resume,
          job: JSON.parse(jobText),
          strategy,
          market_condition: market,
        }),
      });
      const data = await simResp.json();
      if (data.status === "ok") setResult(data);
      else setError(data.message || "模拟失败");
    } catch (e: any) {
      setError(e.message || "无法连接后端。请先启动: uvicorn api.main:app --port 8001");
    }
    setLoading(false);
  };

  return (
    <div className="product-shell min-h-[calc(100vh-56px)]">
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-8">
        <div className="text-xs font-semibold text-[var(--accent-cyan)]">实验沙盘</div>
        <h1 className="mt-2 text-3xl font-black text-[var(--text-primary)]">自定义模拟</h1>
        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">上传你的简历 PDF，粘贴目标岗位的 JSON 描述，运行定制化的四角色博弈模拟。</p>
      </div>

      <div className="surface-raised space-y-4 mb-6 rounded-3xl p-5">
        <div>
          <label className="block text-sm text-slate-400 mb-1">上传简历（PDF）</label>
          <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="surface-base w-full rounded-2xl px-4 py-3 text-sm" />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">岗位描述（JSON 格式）</label>
          <textarea value={jobText} onChange={(e) => setJobText(e.target.value)}
            placeholder='{"title": "后端开发工程师", "company": "字节跳动", "level": "P7", "required_skills": ["Go", "Kubernetes", ...], "salary_range": [500, 900]}'
            rows={6} className="surface-base w-full rounded-2xl px-4 py-3 text-sm font-mono outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-cyan)]/40" />
        </div>
        <div className="flex gap-4">
          <select value={strategy} onChange={(e) => setStrategy(e.target.value)}
            className="surface-base rounded-xl px-4 py-2 text-sm">
            <option value="balanced">策略：稳健型</option>
            <option value="aggressive">策略：激进型</option>
            <option value="conservative">策略：保守型</option>
          </select>
          <select value={market} onChange={(e) => setMarket(e.target.value)}
            className="surface-base rounded-xl px-4 py-2 text-sm">
            <option value="normal">市场：正常</option>
            <option value="hot">市场：热门</option>
            <option value="cool">市场：冷淡</option>
          </select>
        </div>
        <button onClick={handleSubmit} disabled={loading}
          className="primary-action rounded-2xl px-6 py-3 font-medium transition disabled:opacity-50">
          {loading ? "模拟运行中..." : "开始模拟"}
        </button>
      </div>

      {error && <div className="surface-base mb-6 rounded-2xl p-4 text-sm text-red-300">{error}</div>}

      {result && (
        <div className="surface-raised rounded-3xl p-6">
          <h2 className="text-lg font-semibold mb-4 text-emerald-400">模拟结果</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="surface-base rounded-2xl p-3 text-center">
              <div className="text-xs text-slate-400">结果</div>
              <div className={`text-xl font-bold ${result.game.outcome === "accepted" ? "text-emerald-400" : "text-red-400"}`}>
                {result.game.outcome === "accepted" ? "已录取" : result.game.outcome === "rejected" ? "已拒绝" : "超时"}
              </div>
            </div>
            <div className="surface-base rounded-2xl p-3 text-center">
              <div className="text-xs text-slate-400">成功率</div>
              <div className="text-xl font-bold text-cyan-400">{(result.game.success_probability * 100).toFixed(0)}%</div>
            </div>
            <div className="surface-base rounded-2xl p-3 text-center">
              <div className="text-xs text-slate-400">最终薪资</div>
              <div className="text-xl font-bold text-white">{result.game.final_salary}K</div>
            </div>
            <div className="surface-base rounded-2xl p-3 text-center">
              <div className="text-xs text-slate-400">谈判轮次</div>
              <div className="text-xl font-bold text-white">{result.game.negotiation_rounds}</div>
            </div>
          </div>
          <p className="text-sm text-slate-400">{result.game.recommendation}</p>

          {result.equilibrium && (
            <div className="mt-4 pt-4 border-t border-slate-800">
              <h3 className="text-sm font-semibold text-purple-400 mb-2">均衡策略</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="surface-base rounded-2xl p-3">
                  <span className="text-slate-500">候选人：</span>
                  要价 {result.equilibrium.candidate_strategy.opening_salary_ask}K
                  （{result.equilibrium.candidate_strategy.stance === "firm" ? "强硬" : "灵活"}）
                </div>
                <div className="surface-base rounded-2xl p-3">
                  <span className="text-slate-500">HR：</span>
                  出价 {result.equilibrium.hr_strategy.opening_offer}K
                  （上限 {result.equilibrium.hr_strategy.max_final_offer}K）
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
    </div>
  );
}
