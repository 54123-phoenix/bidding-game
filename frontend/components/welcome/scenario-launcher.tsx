"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Upload, FileText, Zap, Shield, Scale, Sparkles } from "lucide-react";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { uploadResume, parseJD, parseResumeText, initGame } from "@/lib/game-api";

const STRATEGIES = [
  { key: "aggressive", label: "激进", icon: Zap, desc: "追求最高溢价", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  { key: "balanced", label: "稳健", icon: Scale, desc: "攻守平衡", color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
  { key: "conservative", label: "保守", icon: Shield, desc: "稳扎稳打", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
];

const QUICK_SCENARIOS = [
  {
    id: "algo-byte",
    title: "算法工程师",
    company: "字节跳动",
    level: "3-1",
    salaryRange: "60-90W",
    icon: "🧮",
    gradient: "from-cyan-500/10 to-blue-500/10",
    borderColor: "border-cyan-500/20",
    hoverBorder: "hover:border-cyan-500/40",
    scenario: "我想模拟字节跳动 3-1 算法工程师的薪资谈判，我有 5 年经验，擅长推荐系统和机器学习，期望年薪 80-100W",
    presetResume: {
      resume_id: "res-algo-demo",
      name: "候选人",
      education: [{ school: "985院校", degree: "硕士", major: "计算机科学", graduation_year: 2020 }],
      skills: ["推荐系统", "机器学习", "Python", "TensorFlow"],
      summary: "5年算法工程师经验，擅长推荐系统和机器学习",
      experience: [{ company: "某大厂", title: "算法工程师", description: "负责推荐系统优化，QPS提升30%", tech_stack: ["Python", "TensorFlow", "Spark"] }],
    },
    presetJob: {
      job_id: "job-algo-demo",
      title: "算法工程师",
      company: "字节跳动",
      level: "3-1",
      salary_range: [600, 900],
      location: "北京",
      required_skills: ["推荐系统", "机器学习", "编程能力"],
      description: "字节跳动3-1算法工程师，负责推荐系统",
      min_experience_years: 3,
    },
  },
  {
    id: "pm-tencent",
    title: "产品经理",
    company: "腾讯",
    level: "10-12级",
    salaryRange: "40-70W",
    icon: "📱",
    gradient: "from-emerald-500/10 to-teal-500/10",
    borderColor: "border-emerald-500/20",
    hoverBorder: "hover:border-emerald-500/40",
    scenario: "我想模拟腾讯 10 级产品经理的薪资谈判，我有 3 年产品经验，负责过日活百万级产品，期望年薪 50-65W",
    presetResume: {
      resume_id: "res-pm-demo",
      name: "候选人",
      education: [{ school: "211院校", degree: "本科", major: "工商管理", graduation_year: 2022 }],
      skills: ["产品规划", "数据分析", "用户增长", "Axure"],
      summary: "3年产品经理经验，负责过日活百万级产品",
      experience: [{ company: "某互联网公司", title: "产品经理", description: "负责用户增长，DAU从50万提升至150万", tech_stack: ["Axure", "SQL", "Python"] }],
    },
    presetJob: {
      job_id: "job-pm-demo",
      title: "产品经理",
      company: "腾讯",
      level: "10级",
      salary_range: [400, 700],
      location: "深圳",
      required_skills: ["产品规划", "数据分析", "跨部门协作"],
      description: "腾讯10级产品经理",
      min_experience_years: 2,
    },
  },
  {
    id: "ds-alibaba",
    title: "数据科学家",
    company: "阿里巴巴",
    level: "P6-P7",
    salaryRange: "50-80W",
    icon: "📊",
    gradient: "from-amber-500/10 to-orange-500/10",
    borderColor: "border-amber-500/20",
    hoverBorder: "hover:border-amber-500/40",
    scenario: "我想模拟阿里巴巴 P6 数据科学家的薪资谈判，擅长 AB 测试和因果推断，期望年薪 60-80W",
    presetResume: {
      resume_id: "res-ds-demo",
      name: "候选人",
      education: [{ school: "985院校", degree: "硕士", major: "统计学", graduation_year: 2021 }],
      skills: ["AB测试", "因果推断", "SQL", "Python", "统计学"],
      summary: "4年数据科学经验，擅长AB测试和因果推断",
      experience: [{ company: "某电商平台", title: "数据科学家", description: "设计并执行AB测试，提升转化率15%", tech_stack: ["Python", "SQL", "Spark"] }],
    },
    presetJob: {
      job_id: "job-ds-demo",
      title: "数据科学家",
      company: "阿里巴巴",
      level: "P6",
      salary_range: [500, 800],
      location: "杭州",
      required_skills: ["AB测试", "因果推断", "统计分析"],
      description: "阿里巴巴P6数据科学家",
      min_experience_years: 3,
    },
  },
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleQuickLaunch = useCallback(
    (scenario: (typeof QUICK_SCENARIOS)[0]) => {
      setScenarioText(scenario.scenario);
      doLaunch(
        scenario.scenario,
        null,
        "",
        strategy,
        scenario.presetResume,
        scenario.presetJob
      );
    },
    [doLaunch, strategy]
  );

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Main Input */}
      <motion.div
        className="relative rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        {/* Textarea */}
        <textarea
          value={scenarioText}
          onChange={(e) => setScenarioText(e.target.value)}
          placeholder="描述你想模拟的谈判场景... 例如：我想模拟字节跳动 3-1 算法工程师的薪资谈判，目标年薪 90W，有 5 年经验"
          className="w-full bg-transparent text-slate-200 placeholder:text-slate-600 text-sm p-4 resize-none outline-none min-h-[100px]"
          disabled={loading}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.metaKey) {
              handleLaunch();
            }
          }}
        />

        {/* Bottom toolbar */}
        <div className="flex items-center gap-2 px-3 pb-2 flex-wrap">
          {/* Resume upload */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition ${
              resumeFile
                ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20"
                : "text-slate-400 hover:text-cyan-400 hover:bg-slate-800/50"
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
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition ${
              showJdInput
                ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20"
                : "text-slate-400 hover:text-cyan-400 hover:bg-slate-800/50"
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
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition ${
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
                className="w-full bg-slate-950/50 text-slate-300 placeholder:text-slate-600 text-xs p-3 resize-none outline-none border-t border-slate-800"
                disabled={loading}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Launch button */}
      <motion.div
        className="mt-4 flex justify-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <ShimmerButton
          onClick={handleLaunch}
          disabled={loading || !hasInput}
          shimmerColor="#22d3ee"
          background={hasInput ? "linear-gradient(135deg, #0891b2, #2563eb)" : "linear-gradient(135deg, #334155, #475569)"}
          borderRadius="12px"
          className="px-10 py-3.5 font-semibold text-sm shadow-lg shadow-cyan-600/20 disabled:opacity-50"
        >
          <span className="flex items-center gap-2">
            <Sparkles size={14} />
            {loading ? "初始化中..." : !hasInput ? "请先描述场景或上传简历" : "启动模拟"}
            {!loading && hasInput && (
              <motion.span
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                →
              </motion.span>
            )}
          </span>
        </ShimmerButton>
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

      {/* Quick scenarios */}
      <motion.div
        className="mt-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="w-1 h-3 rounded-full bg-gradient-to-b from-cyan-400 to-blue-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            快速场景
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {QUICK_SCENARIOS.map((scenario, i) => (
            <motion.button
              key={scenario.id}
              onClick={() => handleQuickLaunch(scenario)}
              disabled={loading}
              className={`text-left rounded-xl border p-3 transition-all group ${scenario.borderColor} ${scenario.hoverBorder} bg-slate-900/40 hover:bg-slate-800/60`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 + i * 0.08 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <div
                className={`absolute inset-0 rounded-xl bg-gradient-to-br ${scenario.gradient} opacity-0 group-hover:opacity-100 transition-opacity`}
              />
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg">{scenario.icon}</span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {scenario.salaryRange}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-slate-200 mb-0.5">
                  {scenario.title}
                </h3>
                <p className="text-[10px] text-slate-500">
                  {scenario.company} · {scenario.level}
                </p>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
