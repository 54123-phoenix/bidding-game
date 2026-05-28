"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import type { ResumeView } from "../hooks/types";

interface PlaySetupStepProps {
  resumePreview: ResumeView | null;
  resumeData: ResumeView | null;
  setResumeData: (d: ResumeView | null) => void;
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
  handleFileChange: (f: File | null) => void;
  handleStartNegotiation: () => void;
  setResumePreview: (d: ResumeView | null) => void;
  setFile: (f: File | null) => void;
  profileResume?: ResumeView | null;
  useProfileResume?: () => void;
  usingProfileResume?: boolean;
  setUsingProfileResume?: (value: boolean) => void;
}

function ResumePreview({ data }: { data: ResumeView }) {
  const skills = (data.skills as string[]) || [];
  const education = (data.education as Array<Record<string, unknown>>) || [];
  const experience = (data.experience as Array<Record<string, unknown>>) || [];
  return (
    <div className="surface-base rounded-2xl p-4 space-y-2">
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

function SetupGuard({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-base rounded-2xl px-3 py-2.5">
      <div className="text-xs font-bold text-[var(--accent-cyan)]">{label}</div>
      <div className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">{value}</div>
    </div>
  );
}

export default function PlaySetupStep({
  resumePreview, setResumeData,
  file, loading, progress,
  strategy, setStrategy, market, setMarket, model, setModel,
  jdText, setJdText,
  handleFileChange, handleStartNegotiation,
  setResumePreview, setFile,
  profileResume, useProfileResume,
  usingProfileResume, setUsingProfileResume,
}: PlaySetupStepProps) {
  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="text-center mb-2">
        <div className="text-xs font-semibold text-[var(--accent-cyan)]">真实使用路径</div>
        <h1 className="mt-2 text-3xl font-black text-[var(--text-primary)] mb-2">准备你的真实谈薪模拟</h1>
        <p className="text-[var(--text-tertiary)] text-sm">使用档案简历或上传新简历 + 粘贴岗位 → 系统按你的输入生成谈判状态</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <SetupGuard label="真实输入" value="简历和 JD 会影响评分、报价区间和谈判建议" />
        <SetupGuard label="动态结果" value="解析失败、等待和不确定性都保留为真实体验的一部分" />
        <SetupGuard label="可信边界" value="输出用于训练，不等同真实市场薪资判断" />
      </div>

      <Link
        href="/demo"
        className="surface-base block rounded-2xl border border-amber-300/10 px-4 py-3 text-xs leading-relaxed text-[var(--text-tertiary)] transition hover:border-amber-300/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/40"
      >
        只是想先了解功能？观看预设自动演示，不需要上传简历。<span className="font-bold text-amber-200">播放演示 →</span>
      </Link>

      {/* Real Mode */}
      <AnimatePresence mode="wait">
          <motion.div
            key="real"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="surface-raised rounded-3xl p-6 space-y-5"
          >
            {profileResume && useProfileResume && (
              <div className="rounded-2xl border border-[var(--accent-cyan)]/20 bg-[var(--accent-cyan-glow)] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-bold text-[var(--text-primary)]">档案库简历可用</div>
                    <div className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                      已检测到用户档案中的默认简历，可直接导入，无需重复上传 PDF。
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={useProfileResume}
                    className="shrink-0 rounded-xl border border-[var(--accent-cyan)]/30 bg-[var(--accent-cyan)] px-4 py-2 text-xs font-black text-[var(--bg-canvas)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-cyan)]/50"
                  >
                    直接从档案库导入
                  </button>
                </div>
              </div>
            )}

            {!profileResume && !resumePreview && (
              <Link
                href="/profile"
                className="block rounded-2xl border border-amber-300/15 bg-amber-300/10 px-4 py-3 text-xs leading-relaxed text-amber-100 transition hover:border-amber-300/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/40"
              >
                还没有档案简历。先完善用户信息后，之后可直接从档案库导入。<span className="font-black">去完善档案 →</span>
              </Link>
            )}

            {!resumePreview ? (
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-sm font-medium text-[var(--text-secondary)]">1. 简历信息</label>
                </div>
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
                        <div className="text-[var(--text-tertiary)] mb-1">拖拽或点击上传 PDF / TXT 简历</div>
                        <div className="text-xs text-[var(--text-tertiary)]">没有档案简历时才需要上传</div>
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
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-sm font-medium text-[var(--text-secondary)]">1. 简历信息</label>
                  {usingProfileResume && (
                    <span className="rounded-full border border-[var(--accent-green)]/20 bg-[var(--accent-green-glow)] px-2 py-0.5 text-[10px] font-bold text-[var(--state-success)]">
                      来自用户档案
                    </span>
                  )}
                </div>
                <ResumePreview data={resumePreview} />
                <button
                  onClick={() => { setResumePreview(null); setFile(null); setResumeData(null); setUsingProfileResume?.(false); }}
                  className="mt-2 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                >
                  更换简历 / 上传新文件
                </button>
              </div>
            )}

            <div>
                <label htmlFor="jd-text" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">2. 粘贴岗位描述</label>
                <textarea
                  id="jd-text"
                  name="job-description"
                  value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                placeholder={
                  "直接粘贴招聘网站上的岗位描述（自然语言即可）\n\n例如：字节跳动招聘后端开发工程师（P7），负责微服务架构设计。\n要求精通Go/Python，熟悉Kubernetes，3-5年经验。薪资50-80万/年。"
                }
                rows={6}
                  className="surface-base w-full resize-none rounded-2xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-cyan)]/40"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-[var(--text-tertiary)] mb-1">谈判策略</label>
                <select
                  value={strategy}
                  name="strategy"
                  onChange={(e) => setStrategy(e.target.value)}
                  className="surface-base w-full rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-cyan)]/40"
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
                  name="market-condition"
                  onChange={(e) => setMarket(e.target.value)}
                  className="surface-base w-full rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-cyan)]/40"
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
                  name="llm-model"
                  onChange={(e) => setModel(e.target.value)}
                  className="surface-base w-full rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-cyan)]/40"
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
      </AnimatePresence>
    </motion.div>
  );
}
