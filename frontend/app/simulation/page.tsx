"use client";

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
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">自定义模拟</h1>
      <p className="text-slate-400 mb-6">上传你的简历 PDF，粘贴目标岗位的 JSON 描述，运行定制化的四角色博弈模拟。</p>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm text-slate-400 mb-1">上传简历（PDF）</label>
          <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 w-full text-sm" />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">岗位描述（JSON 格式）</label>
          <textarea value={jobText} onChange={(e) => setJobText(e.target.value)}
            placeholder='{"title": "后端开发工程师", "company": "字节跳动", "level": "P7", "required_skills": ["Go", "Kubernetes", ...], "salary_range": [500, 900]}'
            rows={6} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 w-full text-sm font-mono" />
        </div>
        <div className="flex gap-4">
          <select value={strategy} onChange={(e) => setStrategy(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm">
            <option value="balanced">策略：稳健型</option>
            <option value="aggressive">策略：激进型</option>
            <option value="conservative">策略：保守型</option>
          </select>
          <select value={market} onChange={(e) => setMarket(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm">
            <option value="normal">市场：正常</option>
            <option value="hot">市场：热门</option>
            <option value="cool">市场：冷淡</option>
          </select>
        </div>
        <button onClick={handleSubmit} disabled={loading}
          className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded-lg font-medium transition-colors">
          {loading ? "模拟运行中..." : "开始模拟"}
        </button>
      </div>

      {error && <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 mb-6 text-red-300 text-sm">{error}</div>}

      {result && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 text-emerald-400">模拟结果</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <div className="text-xs text-slate-400">结果</div>
              <div className={`text-xl font-bold ${result.game.outcome === "accepted" ? "text-emerald-400" : "text-red-400"}`}>
                {result.game.outcome === "accepted" ? "已录取" : result.game.outcome === "rejected" ? "已拒绝" : "超时"}
              </div>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <div className="text-xs text-slate-400">成功率</div>
              <div className="text-xl font-bold text-cyan-400">{(result.game.success_probability * 100).toFixed(0)}%</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <div className="text-xs text-slate-400">最终薪资</div>
              <div className="text-xl font-bold text-white">{result.game.final_salary}K</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <div className="text-xs text-slate-400">谈判轮次</div>
              <div className="text-xl font-bold text-white">{result.game.negotiation_rounds}</div>
            </div>
          </div>
          <p className="text-sm text-slate-400">{result.game.recommendation}</p>

          {result.equilibrium && (
            <div className="mt-4 pt-4 border-t border-slate-800">
              <h3 className="text-sm font-semibold text-purple-400 mb-2">均衡策略</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-800/50 rounded p-2">
                  <span className="text-slate-500">候选人：</span>
                  要价 {result.equilibrium.candidate_strategy.opening_salary_ask}K
                  （{result.equilibrium.candidate_strategy.stance === "firm" ? "强硬" : "灵活"}）
                </div>
                <div className="bg-slate-800/50 rounded p-2">
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
  );
}
