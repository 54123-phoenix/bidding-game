"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Upload, FileText, Zap, Shield, Scale, BadgeCheck, Brain, Gauge, PlayCircle } from "lucide-react";
import { uploadResume, parseJD, parseResumeText, initGame } from "@/lib/game-api";

const STRATEGIES = [
  { key: "aggressive", label: "激进", icon: Zap, desc: "追求最高溢价", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  { key: "balanced", label: "稳健", icon: Scale, desc: "攻守平衡", color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
  { key: "conservative", label: "保守", icon: Shield, desc: "稳扎稳打", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
];

interface ScenarioLauncherProps {
  onLaunch: () => void;
  onScreeningFail?: () => void;
}

export default function ScenarioLauncher({ onLaunch, onScreeningFail }: ScenarioLauncherProps) {
  const router = useRouter();
  const [scenarioText, setScenarioText] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jdText, setJdText] = useState("");
  const [strategy, setStrategy] = useState("balanced");
  const [showJdInput, setShowJdInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [buttonSpotlight, setButtonSpotlight] = useState({ x: 50, y: 50 });
  const [eyes, setEyes] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const foxRef = useRef<HTMLDivElement>(null);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) setResumeFile(file);
    },
    []
  );

  const doLaunch = useCallback(
    async (
      text: string,
      file: File | null,
      jd: string,
      strat: string,
      presetResume?: Record<string, unknown>,
      presetJob?: Record<string, unknown>
    ) => {
      if (!text.trim() && !jd.trim() && !presetResume && !file) {
        setError("请输入场景描述、粘贴 JD 或上传简历");
        return false;
      }

      setLoading(true);
      setError("");

      try {
        let resume: Record<string, unknown> | undefined = presetResume;
        let job: Record<string, unknown> | undefined = presetJob;

        // Build parallel tasks: resume parsing + job parsing
        const tasks: Array<Promise<unknown>> = [];
        const taskTypes: Array<"resume" | "job"> = [];

        if (!resume) {
          if (file) {
            tasks.push(uploadResume(file));
            taskTypes.push("resume");
          } else if (text.trim()) {
            tasks.push(parseResumeText(text.trim()));
            taskTypes.push("resume");
          }
        }

        if (!job) {
          const jdToParse = jd.trim() || text.trim();
          if (jdToParse) {
            tasks.push(parseJD(jdToParse));
            taskTypes.push("job");
          }
        }

        const results = await Promise.allSettled(tasks);

        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const type = taskTypes[i];
          if (result.status !== "fulfilled" || !result.value) continue;

          const response = result.value as Record<string, unknown>;
          if (type === "resume") {
            resume = (response.resume as Record<string, unknown>) || response;
          } else {
            job = (response.job as Record<string, unknown>) || response;
          }
        }

        // Fallback: if no job parsed but we have raw text, use it as description
        if (!job && (jd.trim() || text.trim())) {
          job = { description: jd.trim() || text.trim() };
        }

        if (!resume || Object.keys(resume).length === 0) {
          setError("无法解析简历信息，请尝试上传简历文件或更详细地描述你的背景");
          onScreeningFail?.();
          return false;
        }

        if (!job || Object.keys(job).length === 0) {
          setError("无法解析岗位信息，请粘贴 JD 或描述目标岗位");
          onScreeningFail?.();
          return false;
        }

        // Show initialization overlay only after data is ready
        onLaunch();

        const response = await initGame({
          resume,
          job,
          strategy: strat,
        });

        if (response.status === "screening_failed") {
          const s = response.screening as Record<string, unknown>;
          const score = Math.round(((s?.score as number) || 0) * 100);
          const feedback = String(s?.feedback || "简历与岗位匹配度不足");
          setError(
            `初筛未通过（匹配度 ${score}%）。${feedback}`
          );
          onScreeningFail?.();
          return false;
        }

        if (response.session_id) {
          router.push(`/play?session=${response.session_id}`);
          return true;
        } else {
          setError(response.message || "启动失败，请重试");
          onScreeningFail?.();
          return false;
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "网络错误，请检查后端服务");
        onScreeningFail?.();
        return false;
      } finally {
        setLoading(false);
      }
    },
    [onLaunch, router]
  );

  const hasInput = scenarioText.trim() || jdText.trim() || resumeFile;

  const handleLaunch = useCallback(() => {
    doLaunch(scenarioText, resumeFile, jdText, strategy);
  }, [doLaunch, scenarioText, resumeFile, jdText, strategy]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const foxRect = foxRef.current?.getBoundingClientRect();
    if (!foxRect) return;
    const dx = event.clientX - (foxRect.left + foxRect.width / 2);
    const dy = event.clientY - (foxRect.top + foxRect.height / 2);
    const distance = Math.max(1, Math.hypot(dx, dy));
    setEyes({ x: (dx / distance) * 5.8, y: (dy / distance) * 4.4 });
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl" onPointerMove={handlePointerMove}>
      {/* Main Input */}
      <motion.div
        className="relative overflow-visible rounded-3xl border border-white/[0.05] bg-[rgba(18,22,31,0.6)] backdrop-blur-[12px]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div ref={foxRef} className="pointer-events-none absolute -right-8 -top-24 z-10 hidden h-[148px] w-[168px] md:block">
          <svg viewBox="0 0 180 160" role="img" aria-label="Offer Fox mascot" className="h-full w-full">
            <defs>
              <linearGradient id="realFoxBody" x1="32" y1="8" x2="148" y2="152" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#f4a261" />
                <stop offset="1" stopColor="#a3471f" />
              </linearGradient>
            </defs>
            <path d="M126 95 C154 92 170 110 166 130 C146 130 130 120 116 110 Z" fill="#8f3b1b" opacity="0.96" />
            <path d="M42 58 L34 8 L72 46 Z" fill="#bd5626" />
            <path d="M138 58 L146 8 L108 46 Z" fill="#bd5626" />
            <path d="M48 39 L42 19 L61 48 Z" fill="#d9a06e" opacity="0.7" />
            <path d="M132 39 L138 19 L119 48 Z" fill="#d9a06e" opacity="0.7" />
            <path d="M28 82 C28 42 56 24 90 24 C124 24 152 42 152 82 C152 122 126 146 90 146 C54 146 28 122 28 82 Z" fill="url(#realFoxBody)" />
            <path d="M52 92 C58 62 73 50 90 50 C107 50 122 62 128 92 C119 120 105 132 90 132 C75 132 61 120 52 92 Z" fill="#e9c8a6" />
            <circle cx="70" cy="79" r="13" fill="#fffaf4" />
            <circle cx="110" cy="79" r="13" fill="#fffaf4" />
            <circle cx={70 + eyes.x} cy={79 + eyes.y} r="5" fill="#07090d" />
            <circle cx={110 + eyes.x} cy={79 + eyes.y} r="5" fill="#07090d" />
            <path d="M84 99 C88 94 92 94 96 99 C94 104 86 104 84 99 Z" fill="#07090d" />
            <path d="M72 113 C82 121 98 121 108 113" fill="none" stroke="#643019" strokeWidth="4" strokeLinecap="round" opacity="0.5" />
          </svg>
        </div>

        <div className="border-b border-white/[0.05] px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300/80">Real Simulation</div>
              <h2 className="mt-1 text-lg font-black text-white">开始真实模拟</h2>
            </div>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold text-emerald-300">
              用户输入驱动
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            上传你的简历、粘贴目标岗位，系统会按真实输入解析并生成一场可复盘的谈薪博弈。
          </p>
        </div>

        {/* Textarea */}
        <textarea
          value={scenarioText}
          onChange={(e) => setScenarioText(e.target.value)}
          aria-label="谈薪场景描述"
          placeholder="描述你的真实谈薪场景，例如：我想模拟字节跳动 3-1 算法工程师谈薪，5 年经验，目标年薪 90W。也可以直接上传简历或粘贴 JD。"
          className="min-h-[132px] w-full resize-none bg-transparent p-5 text-base leading-7 text-white outline-none placeholder:text-white/25"
          disabled={loading}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.metaKey) {
              handleLaunch();
            }
          }}
        />

        {/* Bottom toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.05] px-4 py-3">
          {/* Resume upload */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition ${
              resumeFile
                ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-cyan-300"
            }`}
          >
            <Upload size={12} />
            <span className="max-w-[120px] truncate">
              {resumeFile ? resumeFile.name : "上传简历"}
            </span>
          </button>

          {/* JD paste */}
          <button
            onClick={() => setShowJdInput(!showJdInput)}
            disabled={loading}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition ${
              showJdInput
                ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-cyan-300"
            }`}
          >
            <FileText size={12} />
            {showJdInput ? "收起 JD" : "粘贴 JD"}
          </button>

          <div className="flex-1" />

          {/* Strategy pills */}
          <div className="flex items-center gap-1">
            {STRATEGIES.map((s) => {
              const Icon = s.icon;
              const active = strategy === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => setStrategy(s.key)}
                  disabled={loading}
                    className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition ${
                    active
                      ? `${s.bg} ${s.color} border ${s.border}`
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                  title={s.desc}
                >
                  <Icon size={10} />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".pdf,.doc,.docx,.txt,.md"
          className="hidden"
        />

        {/* JD textarea */}
        <AnimatePresence>
          {showJdInput && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <textarea
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                placeholder="粘贴岗位描述 (JD)..."
                className="w-full resize-none border-t border-white/[0.05] bg-black/20 p-4 text-sm text-white/75 outline-none placeholder:text-white/25"
                disabled={loading}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Launch button */}
      <motion.div
        className="mt-5 flex justify-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <button
          onClick={handleLaunch}
          disabled={loading || !hasInput}
          onPointerMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            setButtonSpotlight({ x: event.clientX - rect.left, y: event.clientY - rect.top });
          }}
          className="group relative overflow-hidden rounded-xl border border-cyan-300/70 bg-[#161b22] px-12 py-3.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span
            className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100"
            style={{ background: `radial-gradient(circle at ${buttonSpotlight.x}px ${buttonSpotlight.y}px, rgba(0,243,255,0.28), transparent 38%)` }}
          />
          <span className="flex items-center gap-2">
            {loading ? "初始化中..." : !hasInput ? "请先描述场景或上传简历" : "开始真实模拟"}
            {!loading && hasInput && (
              <motion.span
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                →
              </motion.span>
            )}
          </span>
        </button>
      </motion.div>

      <motion.div
        className="mt-5 grid gap-2 text-left sm:grid-cols-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.46 }}
      >
        <TrustChip icon={<BadgeCheck size={13} />} title="真实可跑" desc="初始化后进入完整多轮谈判" />
        <TrustChip icon={<Gauge size={13} />} title="规则可追踪" desc="报价、耐心、信任来自状态变化" />
        <TrustChip icon={<Brain size={13} />} title="AI 有边界" desc="模型辅助表达，不伪装成真实市场数据" />
      </motion.div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.p
            className="text-xs text-rose-400 mt-3 text-center"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Demo path */}
      <motion.div
        className="mt-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <Link
          href="/demo"
          className="surface-base group relative block overflow-hidden rounded-3xl border border-amber-400/10 p-5 text-left transition hover:border-amber-300/30 hover:bg-slate-900/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/50"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(251,191,36,0.14),transparent_34%),radial-gradient(circle_at_80%_30%,rgba(34,211,238,0.10),transparent_28%)] opacity-70" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">
                <PlayCircle size={12} /> Demo Playback
              </div>
              <h3 className="text-lg font-black text-white">观看 90 秒功能演示</h3>
              <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-500">
                使用预设候选人与岗位，自动展示简历信号、HR 报价、情报牌、信任变化和复盘页。它是导览剧本，不代表真实分析结果。
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center justify-center rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-xs font-black text-amber-100 transition group-hover:bg-amber-300/15">
              播放演示 →
            </span>
          </div>
        </Link>
      </motion.div>
    </div>
  );
}

function TrustChip({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="surface-base rounded-2xl px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--accent-cyan)]">
        {icon}
        {title}
      </div>
      <div className="mt-1 text-[10px] leading-relaxed text-[var(--text-tertiary)]">{desc}</div>
    </div>
  );
}
