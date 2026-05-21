"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ShimmerButton } from "@/components/ui/shimmer-button";

interface PlaySetupStepProps {
  setupMode: "quick" | "custom";
  setSetupMode: (m: "quick" | "custom") => void;
  resumePreview: Record<string, unknown> | null;
  resumeData: Record<string, unknown> | null;
  setResumeData: (d: Record<string, unknown> | null) => void;
  file: File | null;
  loading: boolean;
  progress: string;
  strategy: string;
  setStrategy: (s: string) => void;
  market: string;
  setMarket: (m: string) => void;
  model: string;
  setModel: (m: string) => void;
  jdText: string;
  setJdText: (t: string) => void;
  handleQuickDemo: () => void;
  handleFileChange: (f: File | null) => void;
  handleStartNegotiation: () => void;
  setResumePreview: (d: Record<string, unknown> | null) => void;
  setFile: (f: File | null) => void;
}

function ResumePreview({ data }: { data: Record<string, unknown> }) {
  const skills = (data.skills as string[]) || [];
  const education = (data.education as Array<Record<string, unknown>>) || [];
  const experience = (data.experience as Array<Record<string, unknown>>) || [];
  return (
    <div className="bg-[var(--bg-elev)] border border-[var(--border-hairline)] rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {String(data.name || "未知")}
        </span>
        <span className="text-[10px] text-[var(--state-success)] bg-[var(--accent-green-glow)] px-2 py-0.5 rounded-full border border-[var(--accent-green)]/20">
          解析成功
        </span>
      </div>
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {skills.slice(0, 10).map((s, i) => (
            <span key={i} className="text-[10px] bg-[var(--bg-card)] text-[var(--text-secondary)] px-1.5 py-0.5 rounded border border-[var(--border-hairline)]">
              {s}
            </span>
          ))}
          {skills.length > 10 && <span className="text-[10px] text-[var(--text-tertiary)]">+{skills.length - 10}</span>}
        </div>
      )}
      {education.length > 0 && (
        <div className="text-xs text-[var(--text-secondary)]">
          {String(education[0].school || "")} · {String(education[0].degree || "")} · {String(education[0].major || "")}
        </div>
      )}
      {experience.length > 0 && (
        <div className="text-xs text-[var(--text-secondary)]">
          {String(experience[0].company || "")} · {String(experience[0].title || "")} · {String(experience[0].start_date || "")} ~ {String(experience[0].end_date || "至今")}
        </div>
      )}
    </div>
  );
}

export default function PlaySetupStep({
  setupMode, setSetupMode,
  resumePreview, resumeData, setResumeData,
  file, loading, progress,
  strategy, setStrategy, market, setMarket, model, setModel,
  jdText, setJdText,
  handleQuickDemo, handleFileChange, handleStartNegotiation,
  setResumePreview, setFile,
}: PlaySetupStepProps) {
  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="text-center mb-2">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">AI 薪资谈判模拟</h1>
        <p className="text-[var(--text-tertiary)] text-sm">上传简历 + 粘贴岗位 → 四角色不完备信息博弈谈判</p>
      </div>

      {/* Mode Switcher */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elev)] p-1">
          <button
            onClick={() => setSetupMode("quick")}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
              setupMode === "quick"
                ? "bg-[var(--accent-cyan)] text-[var(--bg-canvas)] shadow-md"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            }`}
          >
            ⚡ 快速体验
          </button>
          <button
            onClick={() => setSetupMode("custom")}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
              setupMode === "custom"
                ? "bg-[var(--accent-cyan)] text-[var(--bg-canvas)] shadow-md"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            }`}
          >
            ⚙️ 自定义设置
          </button>
        </div>
      </div>

      {/* Quick Mode */}
      <AnimatePresence mode="wait">
        {setupMode === "quick" && (
          <motion.div
            key="quick"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="text-center space-y-4"
          >
            <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-panel)] p-8">
              <div className="text-4xl mb-3">👨‍💻</div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">预置示例场景</h3>
              <p className="text-sm text-[var(--text-tertiary)] mb-2">阿里巴巴 P7 后端工程师 vs 字节跳动 HR</p>
              <div className="flex justify-center gap-2 mb-6">
                <span className="text-xs bg-[var(--bg-elev)] px-2 py-1 rounded border border-[var(--border-hairline)] text-[var(--text-secondary)]">Go</span>
                <span className="text-xs bg-[var(--bg-elev)] px-2 py-1 rounded border border-[var(--border-hairline)] text-[var(--text-secondary)]">Kubernetes</span>
                <span className="text-xs bg-[var(--bg-elev)] px-2 py-1 rounded border border-[var(--border-hairline)] text-[var(--text-secondary)]">微服务</span>
              </div>
              <ShimmerButton
                onClick={handleQuickDemo}
                shimmerColor="#22d3ee"
                background="linear-gradient(135deg, #0891b2, #2563eb)"
                borderRadius="12px"
                className="px-10 py-3 font-semibold text-sm shadow-lg shadow-cyan-600/20"
              >
                <span className="flex items-center gap-2">
                  一键开始体验
                  <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>→</motion.span>
                </span>
              </ShimmerButton>
            </div>
            <p className="text-xs text-[var(--text-tertiary)]">使用预置的示例简历和岗位，快速了解完整流程</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Mode */}
      <AnimatePresence mode="wait">
        {setupMode === "custom" && (
          <motion.div
            key="custom"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-panel)] p-6 space-y-5"
          >
            {!resumePreview ? (
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">1. 上传简历（PDF）</label>
                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                    file
                      ? "border-[var(--accent-cyan)] bg-[var(--accent-cyan-glow)]"
                      : "border-[var(--border-strong)] hover:border-[var(--text-tertiary)]"
                  }`}
                >
                  <input
                    type="file" accept=".pdf,.txt"
                    onChange={(e) => { const f = e.target.files?.[0] || null; handleFileChange(f); }}
                    className="hidden" id="resume-upload"
                  />
                  <label htmlFor="resume-upload" className="cursor-pointer">
                    {file ? (
                      <div>
                        <div className="text-[var(--accent-cyan)] font-medium">{file.name}</div>
                        <div className="text-xs text-[var(--text-tertiary)] mt-1">
                          {(file.size / 1024).toFixed(1)} KB · 点击重新选择
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-[var(--text-tertiary)] mb-1">拖拽或点击上传 PDF 简历</div>
                        <div className="text-xs text-[var(--text-tertiary)]">选择文件后自动解析</div>
                      </div>
                    )}
                  </label>
                </div>
                {loading && !resumePreview && (
                  <div className="mt-3 text-center text-xs text-[var(--accent-cyan)]">{progress}</div>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">1. 简历解析结果</label>
                <ResumePreview data={resumePreview} />
                <button
                  onClick={() => { setResumePreview(null); setFile(null); setResumeData(null); }}
                  className="mt-2 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                >
                  重新上传
                </button>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">2. 粘贴岗位描述</label>
              <textarea
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                placeholder={
                  "直接粘贴招聘网站上的岗位描述（自然语言即可）\n\n例如：字节跳动招聘后端开发工程师（P7），负责微服务架构设计。\n要求精通Go/Python，熟悉Kubernetes，3-5年经验。薪资50-80万/年。"
                }
                rows={6}
                className="bg-[var(--bg-elev)] border border-[var(--border-hairline)] rounded-lg px-4 py-3 w-full text-sm placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-cyan)]/50 resize-none text-[var(--text-primary)]"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-[var(--text-tertiary)] mb-1">谈判策略</label>
                <select
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                  className="bg-[var(--bg-elev)] border border-[var(--border-hairline)] rounded-lg px-3 py-2 text-sm w-full text-[var(--text-primary)]"
                >
                  <option value="balanced">稳健型 — 适中要价，循序渐进</option>
                  <option value="aggressive">激进型 — 高开高要，强势谈判</option>
                  <option value="conservative">保守型 — 低调务实，以稳为主</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-tertiary)] mb-1">市场环境</label>
                <select
                  value={market}
                  onChange={(e) => setMarket(e.target.value)}
                  className="bg-[var(--bg-elev)] border border-[var(--border-hairline)] rounded-lg px-3 py-2 text-sm w-full text-[var(--text-primary)]"
                >
                  <option value="normal">正常 — 供需平衡</option>
                  <option value="hot">热门 — 候选人市场，对你有利</option>
                  <option value="cool">冷淡 — 雇主市场，对企业有利</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-tertiary)] mb-1">AI 模型</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="bg-[var(--bg-elev)] border border-[var(--border-hairline)] rounded-lg px-3 py-2 text-sm w-full text-[var(--text-primary)]"
                >
                  <option value="qwen-turbo">Qwen Turbo — 最快响应</option>
                  <option value="qwen-plus">Qwen Plus — 平衡（推荐）</option>
                  <option value="qwen-max">Qwen Max — 最强推理</option>
                </select>
              </div>
            </div>

            <ShimmerButton
              onClick={handleStartNegotiation}
              disabled={!resumePreview || !jdText.trim() || loading}
              shimmerColor="#22d3ee"
              background="linear-gradient(135deg, #0891b2, #2563eb)"
              borderRadius="12px"
              className="w-full py-3 font-semibold text-base disabled:opacity-50"
            >
              开始薪资博弈
            </ShimmerButton>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
