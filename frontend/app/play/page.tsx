"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import PlayerIcon from "@/components/player-icon";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import DeliberationPanel from "./components/DeliberationPanel";
import NarrativeResults from "./components/NarrativeResults";
import ChatBubblePanel from "./components/ChatBubble";
import GameHUD from "./components/GameHUD";
import SalaryTugOfWar from "./components/SalaryTugOfWar";
import HRAvatar from "./components/HRAvatar";
import NegotiationArena from "./components/NegotiationArena";
import AchievementPopup, { useAchievements } from "./components/AchievementPopup";

const API = "http://localhost:8001";
const LS_KEY = "bidding_game_session";
const HISTORY_KEY = "bidding_history";

type Step = 1 | 2 | 3;

interface GameState {
  round: number; max_rounds: number;
  public_offer: number | null; public_status: string;
  competition_intensity: number; market_adjustment: number;
  scores: Record<string, number>; interviewer_recommendation: string;
}

interface RoundAction {
  player: string; action_type: string; params: Record<string, unknown>;
  reasoning: string; round: number;
}

interface ChatMessage { role: "user" | "advisor"; text: string; }

const DEMO_RESUME = {
  resume_id: "demo-quick", name: "体验用户", email: "demo@example.com",
  summary: "4年Go后端开发经验，熟悉微服务架构",
  skills: ["Go", "Python", "Kubernetes", "Docker", "MySQL", "Redis", "Kafka", "gRPC", "Linux", "微服务"],
  skill_levels: {"Go": "精通", "Python": "熟练", "Kubernetes": "熟练", "Redis": "熟练"},
  education: [{school: "浙江大学", degree: "硕士", major: "计算机科学与技术", graduation_year: 2022}],
  experience: [
    {company: "阿里巴巴", title: "后端开发工程师",
     description: "负责电商系统微服务架构设计，QPS从5k提升至50k。设计多级缓存方案，P99延迟降低82%。带领3人团队完成核心链路重构。",
     tech_stack: ["Go", "Kubernetes", "Redis", "Kafka", "MySQL"], start_date: "2022-07-01", end_date: "2026-05-01"},
  ],
  projects: [{name: "微服务化改造", description: "QPS 50k+, P99<50ms, 降低延迟82%", tech_stack: ["Go", "Kubernetes"]}],
  competitions: [], certifications: [],
};
const DEMO_JOB = {
  job_id: "demo-quick-job", title: "高级后端工程师", company: "字节跳动", level: "P7",
  required_skills: ["Go", "Kubernetes", "Redis", "Kafka", "MySQL", "微服务"],
  optional_skills: ["Docker", "Linux"],
  salary_range: [500, 900],
  description: "负责后端微服务架构设计与高并发系统开发",
};
const DEMO_JD_TEXT = "字节跳动招聘高级后端工程师（P7），负责微服务架构设计与高并发系统开发。要求精通Go，熟悉Kubernetes、Redis、Kafka，3-5年经验。薪资50-90万/年。";

const STEP_CONFIG = [
  { label: "情报收集", icon: "🔍", sublabel: "输入信息" },
  { label: "薪资博弈", icon: "⚔️", sublabel: "谈判交锋" },
  { label: "战局复盘", icon: "📊", sublabel: "分析结果" },
];

function PlayContent() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState("");
  const [achievement, setAchievement] = useState<{
    id: string; title: string; description: string; icon: string; rarity: "common" | "rare" | "epic" | "legendary";
  } | null>(null);
  const { ACHIEVEMENTS } = useAchievements();
  const unlockedAchievements = useRef<Set<string>>(new Set());

  const [file, setFile] = useState<File | null>(null);
  const [jdText, setJdText] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [resumePreview, setResumePreview] = useState<Record<string, unknown> | null>(null);

  const [sessionId, setSessionId] = useState("");
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameRound, setGameRound] = useState(0);
  const [actions, setActions] = useState<RoundAction[]>([]);
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState<{ action: string; salary?: number; label: string; color: string }[]>([]);
  const [gameLoading, setGameLoading] = useState(false);
  const [counterSalary, setCounterSalary] = useState<number | null>(null);
  const [showCounterInput, setShowCounterInput] = useState(false);

  const [finalResult, setFinalResult] = useState<Record<string, any> | null>(null);
  const [equilibrium, setEquilibrium] = useState<Record<string, any> | null>(null);
  const [outcomeMessage, setOutcomeMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const [resumeData, setResumeData] = useState<Record<string, unknown> | null>(null);
  const [jobData, setJobData] = useState<Record<string, unknown> | null>(null);
  const [hrPersona, setHrPersona] = useState<Record<string, unknown> | null>(null);
  const [hrPatience, setHrPatience] = useState(1.0);
  const [hrDeliberation, setHrDeliberation] = useState<Record<string, unknown> | null>(null);
  const [hrThinking, setHrThinking] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [streamingPhase, setStreamingPhase] = useState<"analyze" | "decide" | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  const [strategy, setStrategy] = useState("balanced");
  const [market, setMarket] = useState("normal");
  const [model, setModel] = useState("qwen-plus");

  const tryUnlockAchievement = useCallback((id: string) => {
    if (unlockedAchievements.current.has(id)) return;
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    if (!a) return;
    unlockedAchievements.current.add(id);
    setAchievement(a);
    setTimeout(() => setAchievement(null), 4500);
  }, [ACHIEVEMENTS]);

  const saveSession = useCallback(() => {
    if (!sessionId) return;
    const data = { sessionId, step, resumeData, jobData, finalResult, equilibrium, outcomeMessage, actions, gameState, gameRound, chatMessages, options, prompt, hrPersona, hrPatience };
    try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
  }, [sessionId, step, resumeData, jobData, finalResult, equilibrium, outcomeMessage, actions, gameState, gameRound, chatMessages, options, prompt]);

  const saveToHistory = useCallback((fr: Record<string, any> | null, eq: Record<string, any> | null, msg: string) => {
    if (!sessionId) return;
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      const history: Array<Record<string, any>> = raw ? JSON.parse(raw) : [];
      const idx = history.findIndex((h) => h.sessionId === sessionId);
      const entry = {
        id: sessionId, sessionId, timestamp: Date.now(),
        resumeName: String(resumeData?.name || "未知"),
        jobTitle: String(jobData?.title || ""),
        jobCompany: String(jobData?.company || ""),
        jobLevel: String(jobData?.level || ""),
        outcome: String(fr?.outcome || "unknown"),
        finalSalary: fr?.final_salary ?? null,
        negotiationRounds: Number(fr?.negotiation_rounds || 0),
        successProbability: Number(fr?.success_probability || 0),
        resumeData, jobData, finalResult: fr, equilibrium: eq, outcomeMessage: msg,
        chatMessages, actions, hrPersona, hrPatience, strategy, marketCondition: market,
      };
      if (idx >= 0) history[idx] = entry;
      else history.unshift(entry);
      if (history.length > 20) history.length = 20;
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {}
  }, [sessionId, resumeData, jobData, chatMessages, actions, hrPersona, hrPatience, strategy, market]);

  const handleGoHome = useCallback(() => { window.location.href = "/"; }, []);

  const restoreSession = useCallback(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      if (!d.sessionId) return false;
      if (d.step === 3) return false;
      setSessionId(d.sessionId); setStep(d.step); setResumeData(d.resumeData); setJobData(d.jobData);
      setFinalResult(d.finalResult); setEquilibrium(d.equilibrium); setOutcomeMessage(d.outcomeMessage || "");
      setActions(d.actions || []); setGameState(d.gameState); setGameRound(d.gameRound || 0);
      setChatMessages(d.chatMessages || []); setOptions(d.options || []); setPrompt(d.prompt || "");
      setHrPersona(d.hrPersona || null); setHrPatience(d.hrPatience ?? 1.0);
      return true;
    } catch { return false; }
  }, []);

  const loadHistorySession = useCallback((id: string) => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return;
      const history = JSON.parse(raw) as Array<Record<string, any>>;
      const item = history.find((h) => h.id === id || h.sessionId === id);
      if (!item) return;
      setSessionId(item.sessionId || id);
      setResumeData(item.resumeData || null); setJobData(item.jobData || null);
      setFinalResult(item.finalResult || null); setEquilibrium(item.equilibrium || null);
      setOutcomeMessage(item.outcomeMessage || ""); setActions(item.actions || []);
      setChatMessages(item.chatMessages || []); setHrPersona(item.hrPersona || null);
      setHrPatience(item.hrPatience ?? 1.0); setGameRound((item.negotiationRounds || 1) - 1);
      setStep(3);
    } catch {}
  }, []);

  useEffect(() => {
    const quick = searchParams.get("quick");
    const review = searchParams.get("review");
    if (quick === "1") { handleQuickDemo(); return; }
    if (review) { loadHistorySession(review); return; }
    restoreSession();
  }, []);

  useEffect(() => { if (sessionId) saveSession(); }, [saveSession, sessionId]);
  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [chatMessages]);

  useEffect(() => {
    if (actions.length > 0) {
      const lastAction = actions[actions.length - 1];
      if (lastAction.action_type === "counter_offer") tryUnlockAchievement("first_counter");
    }
    if (gameState && actions.length > 0) {
      const lastPair = actions.filter(a => a.player === "candidate" || a.player === "hr");
      if (lastPair.length >= 2) {
        const candSalary = lastPair.filter(a => a.player === "candidate").slice(-1)[0]?.params?.salary_ask as number;
        const hrSalary = lastPair.filter(a => a.player === "hr").slice(-1)[0]?.params?.salary_offer as number;
        if (candSalary && hrSalary && Math.abs(candSalary - hrSalary) <= 5) tryUnlockAchievement("gap_5k");
      }
    }
    if (gameRound + 1 >= (gameState?.max_rounds || 5)) tryUnlockAchievement("marathon");
    if (hrPatience >= 0.8 && gameRound > 0) tryUnlockAchievement("patience_master");
  }, [actions, gameState, gameRound, hrPatience, tryUnlockAchievement]);

  const handleQuickDemo = async () => {
    setLoading(true); setError(""); setProgress("准备中...");
    try {
      setProgress("正在解析简历...");
      const fd = new FormData();
      const demoText = `姓名: ${DEMO_RESUME.name}\n技能: ${DEMO_RESUME.skills.join(", ")}\n教育: ${DEMO_RESUME.education[0].school} ${DEMO_RESUME.education[0].degree}\n公司: ${DEMO_RESUME.experience[0].company} ${DEMO_RESUME.experience[0].title}\n${DEMO_RESUME.experience[0].description}`;
      fd.append("file", new Blob([demoText], {type: "text/plain"}), "demo.txt");
      fd.append("source_type", "text");
      const u = await fetch(`${API}/api/upload`, { method: "POST", body: fd });
      const ud = await u.json();
      if (ud.status !== "ok") { setError(ud.message || "解析失败"); setLoading(false); return; }
      setResumeData(ud.resume); setResumePreview(ud.resume);

      setProgress("正在分析岗位...");
      const jd = new FormData(); jd.append("jd_text", DEMO_JD_TEXT);
      const jr = await fetch(`${API}/api/jd/parse`, { method: "POST", body: jd });
      const jdd = await jr.json();
      if (jdd.status !== "ok") { setError(jdd.message || "JD解析失败"); setLoading(false); return; }
      setJobData(jdd.job);

      setProgress("正在初始化博弈...");
      const ir = await fetch(`${API}/api/game/init`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume: ud.resume, job: jdd.job, strategy: "balanced", market_condition: "normal", model }),
      });
      const id = await ir.json();
      if (id.status !== "ok") { setError(id.message || "初始化失败"); setLoading(false); return; }

      setSessionId(id.session_id); setGameState(id.game_state); setGameRound(id.round);
      setActions(id.round_actions || []); setPrompt(id.prompt); setOptions(id.options || []);
      setHrPersona(id.hr_persona || null); setHrPatience(id.hr_patience ?? 1.0);
      setStep(2); saveSession();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "连接失败"); }
    setLoading(false); setProgress("");
  };

  const handleFileChange = async (f: File | null) => {
    setFile(f);
    if (!f) { setResumePreview(null); setResumeData(null); return; }
    setLoading(true); setError(""); setProgress("正在解析简历...");
    try {
      const fd = new FormData(); fd.append("file", f); fd.append("source_type", f.name.endsWith(".pdf") ? "pdf" : "text");
      const u = await fetch(`${API}/api/upload`, { method: "POST", body: fd });
      const ud = await u.json();
      if (ud.status !== "ok") { setError(ud.message || "简历解析失败"); setLoading(false); return; }
      setResumeData(ud.resume); setResumePreview(ud.resume);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "上传失败"); }
    setLoading(false); setProgress("");
  };

  const handleStartNegotiation = async () => {
    if (!resumeData) { setError("请先上传简历"); return; }
    if (!jdText.trim()) { setError("请粘贴岗位描述"); return; }
    if (jdText.trim().length < 20) { setError("岗位描述太短，请粘贴完整的招聘信息"); return; }

    setLoading(true); setError(""); setProgress("正在分析岗位...");
    try {
      const jd = new FormData(); jd.append("jd_text", jdText);
      const jr = await fetch(`${API}/api/jd/parse`, { method: "POST", body: jd });
      const jdd = await jr.json();
      if (jdd.status !== "ok") { setError(jdd.message || "岗位解析失败"); setLoading(false); return; }
      setJobData(jdd.job);

      setProgress("正在初始化博弈...");
      const ir = await fetch(`${API}/api/game/init`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume: resumeData, job: jdd.job, strategy, market_condition: market, model }),
      });
      const id = await ir.json();
      if (id.status !== "ok") { setError(id.message || "初始化失败"); setLoading(false); return; }

      setSessionId(id.session_id); setGameState(id.game_state); setGameRound(id.round);
      setActions(id.round_actions || []); setPrompt(id.prompt); setOptions(id.options || []);
      setHrPersona(id.hr_persona || null); setHrPatience(id.hr_patience ?? 1.0);
      setStep(2); saveSession();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "连接失败"); }
    setLoading(false); setProgress("");
  };

  const handleAct = async (actionType: string, salaryAmount?: number) => {
    setGameLoading(true); setShowCounterInput(false); setHrThinking(true);
    setStreamingText(""); setStreamingPhase(null); setHrDeliberation(null);

    setActions((p) => [...p, {
      player: "candidate", action_type: actionType,
      params: salaryAmount ? { salary_ask: salaryAmount } : {},
      reasoning: actionType === "accept" ? "接受报价" : actionType === "reject" ? "拒绝报价" : `还价 ${salaryAmount}K`,
      round: gameRound,
    }]);

    try {
      const r = await fetch(`${API}/api/game/act/stream`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, action_type: actionType, salary_amount: salaryAmount || null }),
      });

      if (!r.ok) {
        const errText = await r.text();
        setError(`服务器错误 (${r.status}): ${errText.slice(0, 200)}`);
        setGameLoading(false); setHrThinking(false);
        return;
      }

      const reader = r.body?.getReader();
      if (!reader) {
        setError("浏览器不支持流式响应，请使用现代浏览器");
        setGameLoading(false); setHrThinking(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6);
          try {
            const event = JSON.parse(jsonStr);
            handleSSEEvent(event, actionType, salaryAmount);
          } catch {}
        }
      }

      if (buffer.startsWith("data: ")) {
        try {
          const event = JSON.parse(buffer.slice(6));
          handleSSEEvent(event, actionType, salaryAmount);
        } catch {}
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "连接失败");
    }
    setGameLoading(false);
  };

  const handleSSEEvent = (event: Record<string, any>, _actionType: string, _salaryAmount?: number) => {
    switch (event.type) {
      case "phase":
        setStreamingPhase(event.phase);
        break;
      case "chunk":
        setStreamingText((prev) => prev + event.text);
        break;
      case "options":
        setHrDeliberation({
          situation: "",
          options: event.options || [],
          selected_index: 0,
          confidence: 0.5,
        });
        break;
      case "decision":
        break;
      case "done":
        if (event.result) setHrDeliberation(event.result);
        setStreamingPhase(null);
        setHrThinking(false);
        break;
      case "game_over":
        setFinalResult(event.final_result || null);
        setEquilibrium(event.equilibrium || null);
        setOutcomeMessage(event.message || "");
        setGameState(event.game_state);
        setStep(3);
        saveSession();
        saveToHistory(event.final_result, event.equilibrium, event.message || "");
        if (event.final_result?.outcome === "accepted") {
          tryUnlockAchievement("deal_closed");
          if (gameRound + 1 <= 3) tryUnlockAchievement("speed_demon");
          if (hrPatience < 0.3) tryUnlockAchievement("comeback");
          const salaryRange = jobData?.salary_range as [number, number] | undefined;
          if (salaryRange && event.final_result.final_salary > (salaryRange[0] + salaryRange[1]) / 2) {
            tryUnlockAchievement("high_roller");
          }
        }
        setTimeout(() => handleAutoDebrief(event.final_result, event.equilibrium, event.message || ""), 500);
        break;
      case "round_complete":
        if (event.last_hr_action) setActions((p) => [...p, event.last_hr_action]);
        if (event.hr_deliberation) setHrDeliberation(event.hr_deliberation);
        if (event.hr_patience !== undefined) setHrPatience(event.hr_patience);
        setGameState(event.game_state);
        setGameRound(event.round);
        setPrompt(event.prompt);
        setOptions(event.options || []);
        setStreamingText("");
        setStreamingPhase(null);
        break;
      case "error":
        setError(event.message || "未知错误");
        break;
    }
  };

  const handleAutoDebrief = async (fr: Record<string, any> | null, eq: Record<string, any> | null, msg: string) => {
    setChatLoading(true);
    try {
      const r = await fetch(`${API}/api/debrief/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, message: "" }),
      });
      const d = await r.json();
      if (d.reply) setChatMessages([{ role: "advisor", text: d.reply }]);
    } catch {}
    setChatLoading(false);
  };

  const handleChat = async (msg?: string) => {
    const text = (msg || chatInput).trim();
    if (!text) return;
    setChatMessages((p) => [...p, { role: "user", text }]);
    setChatInput(""); setChatLoading(true);
    try {
      const r = await fetch(`${API}/api/debrief/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, message: text }),
      });
      const d = await r.json();
      setChatMessages((p) => [...p, { role: "advisor", text: d.reply || d.message || "抱歉，暂时无法回答。" }]);
    } catch { setChatMessages((p) => [...p, { role: "advisor", text: "网络错误，请重试。" }]); }
    setChatLoading(false);
  };

  const handleRestart = () => {
    setStep(1); setFile(null); setJdText(""); setSessionId(""); setGameState(null);
    setActions([]); setFinalResult(null); setEquilibrium(null); setError("");
    setChatMessages([]); setChatInput(""); setResumePreview(null);
    setHrPersona(null); setHrPatience(1.0); setHrDeliberation(null);
    unlockedAchievements.current = new Set();
    try { localStorage.removeItem(LS_KEY); } catch {}
  };

  return (
    <NegotiationArena
      round={gameRound}
      maxRounds={gameState?.max_rounds || 5}
      isThinking={hrThinking}
      outcome={step === 3 ? (finalResult?.outcome === "accepted" ? "accepted" : "rejected") : null}
    >
      <AchievementPopup achievement={achievement} onDismiss={() => setAchievement(null)} />

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEP_CONFIG.map((cfg, i) => {
            const s = (i + 1) as Step;
            const active = step >= s;
            const done = step > s;
            return (
              <div key={s} className="flex items-center gap-2">
                <motion.div
                  className="flex items-center gap-2.5 px-4 py-2 rounded-xl border transition-all cursor-default"
                  style={{
                    borderColor: active ? "var(--accent-cyan)40" : "var(--border-hairline)",
                    backgroundColor: active ? "var(--accent-cyan-glow)" : "transparent",
                    boxShadow: active ? "0 0 20px var(--accent-cyan-glow)" : "none",
                  }}
                  animate={active ? { scale: [1, 1.02, 1] } : {}}
                  transition={{ duration: 0.5 }}
                >
                  <span className="text-base">{cfg.icon}</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold" style={{ color: active ? "var(--accent-cyan)" : "var(--text-tertiary)" }}>
                      {cfg.label}
                    </span>
                    <span className="text-[9px]" style={{ color: active ? "var(--text-secondary)" : "var(--text-tertiary)" }}>
                      {cfg.sublabel}
                    </span>
                  </div>
                  {done && (
                    <motion.span
                      className="text-[10px] text-[var(--state-success)]"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring" }}
                    >
                      ✓
                    </motion.span>
                  )}
                </motion.div>
                {s < 3 && (
                  <motion.div
                    className="h-px rounded"
                    initial={{ width: 0 }}
                    animate={{ width: done ? 32 : 16 }}
                    style={{ backgroundColor: done ? "var(--accent-cyan)60" : "var(--border-hairline)" }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <motion.div
            className="mb-6 p-4 rounded-xl border border-[var(--state-danger)]/30 bg-[var(--state-danger)]/10 text-[var(--state-danger)] text-sm"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error}
          </motion.div>
        )}

        {loading && (
          <motion.div
            className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-panel)] p-10 text-center mb-6"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <motion.div
              className="inline-flex items-center justify-center w-20 h-20 rounded-2xl border border-[var(--accent-cyan)]/20 mb-5"
              style={{ backgroundColor: "var(--accent-cyan-glow)" }}
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            >
              <span className="text-3xl">⚙️</span>
            </motion.div>
            <div className="text-[var(--text-secondary)] text-sm font-medium mb-3">{progress || "处理中..."}</div>
            <div className="flex justify-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-[var(--accent-cyan)]"
                  animate={{ opacity: [0.2, 1, 0.2], y: [0, -4, 0] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.25 }}
                />
              ))}
            </div>
            <div className="text-xs text-[var(--text-tertiary)] mt-4">模型响应可能需要 10-30 秒</div>
          </motion.div>
        )}

        {step === 1 && !loading && (
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

            <div className="text-center">
              <ShimmerButton
                onClick={handleQuickDemo}
                shimmerColor="#22d3ee"
                background="linear-gradient(135deg, #0891b2, #2563eb)"
                borderRadius="12px"
                className="mx-auto px-10 py-4 font-semibold text-base shadow-lg shadow-cyan-600/20"
              >
                <span className="flex items-center gap-2">
                  ⚡ 快速体验
                  <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>→</motion.span>
                </span>
              </ShimmerButton>
              <p className="text-xs text-[var(--text-tertiary)] mt-2">使用预置的示例简历和岗位，一键体验完整流程</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-[var(--border-hairline)]" />
              <span className="text-xs text-[var(--text-tertiary)]">或自定义</span>
              <div className="flex-1 h-px bg-[var(--border-hairline)]" />
            </div>

            <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-panel)] p-6 space-y-5">
              {!resumePreview ? (
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">1. 上传简历（PDF）</label>
                  <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                    file ? "border-[var(--accent-cyan)] bg-[var(--accent-cyan-glow)]" : "border-[var(--border-strong)] hover:border-[var(--text-tertiary)]"
                  }`}>
                    <input
                      type="file" accept=".pdf,.txt"
                      onChange={(e) => { const f = e.target.files?.[0] || null; handleFileChange(f); }}
                      className="hidden" id="resume-upload"
                    />
                    <label htmlFor="resume-upload" className="cursor-pointer">
                      {file ? (
                        <div>
                          <div className="text-[var(--accent-cyan)] font-medium">{file.name}</div>
                          <div className="text-xs text-[var(--text-tertiary)] mt-1">{(file.size / 1024).toFixed(1)} KB · 点击重新选择</div>
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
                  <button onClick={() => { setResumePreview(null); setFile(null); setResumeData(null); }}
                    className="mt-2 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors">重新上传</button>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">2. 粘贴岗位描述</label>
                <textarea value={jdText} onChange={(e) => setJdText(e.target.value)}
                  placeholder={"直接粘贴招聘网站上的岗位描述（自然语言即可）\n\n例如：字节跳动招聘后端开发工程师（P7），负责微服务架构设计。\n要求精通Go/Python，熟悉Kubernetes，3-5年经验。薪资50-80万/年。"}
                  rows={6}
                  className="bg-[var(--bg-elev)] border border-[var(--border-hairline)] rounded-lg px-4 py-3 w-full text-sm placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-cyan)]/50 resize-none text-[var(--text-primary)]" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-[var(--text-tertiary)] mb-1">谈判策略</label>
                  <select value={strategy} onChange={(e) => setStrategy(e.target.value)}
                    className="bg-[var(--bg-elev)] border border-[var(--border-hairline)] rounded-lg px-3 py-2 text-sm w-full text-[var(--text-primary)]">
                    <option value="balanced">稳健型 — 适中要价，循序渐进</option>
                    <option value="aggressive">激进型 — 高开高要，强势谈判</option>
                    <option value="conservative">保守型 — 低调务实，以稳为主</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-tertiary)] mb-1">市场环境</label>
                  <select value={market} onChange={(e) => setMarket(e.target.value)}
                    className="bg-[var(--bg-elev)] border border-[var(--border-hairline)] rounded-lg px-3 py-2 text-sm w-full text-[var(--text-primary)]">
                    <option value="normal">正常 — 供需平衡</option>
                    <option value="hot">热门 — 候选人市场，对你有利</option>
                    <option value="cool">冷淡 — 雇主市场，对企业有利</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-tertiary)] mb-1">AI 模型</label>
                  <select value={model} onChange={(e) => setModel(e.target.value)}
                    className="bg-[var(--bg-elev)] border border-[var(--border-hairline)] rounded-lg px-3 py-2 text-sm w-full text-[var(--text-primary)]">
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
                ⚔️ 开始薪资博弈
              </ShimmerButton>
            </div>
          </motion.div>
        )}

        {step === 2 && gameState && (
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-panel)] p-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "var(--candidate-blue-glow)", border: "1px solid var(--candidate-blue)40" }}>
                      <PlayerIcon player="candidate" size={22} />
                    </div>
                    <span className="text-[var(--text-primary)] font-medium">{resumeData?.name ? String(resumeData.name) : "候选人"}</span>
                  </div>
                  <span className="text-[var(--text-tertiary)]">→</span>
                  <span className="text-[var(--text-primary)] font-medium">{jobData?.title ? String(jobData.title) : ""}</span>
                  <span className="text-[var(--text-tertiary)]">@ {jobData?.company ? String(jobData.company) : ""}</span>
                </div>
                <span className="text-xs text-[var(--text-tertiary)] bg-[var(--bg-elev)] rounded-full px-3 py-1 border border-[var(--border-hairline)]">
                  第 {gameRound + 1}/{gameState.max_rounds} 轮
                </span>
              </div>
            </div>

            <GameHUD
              publicOffer={gameState.public_offer}
              hrPatience={hrPatience}
              marketAdjustment={gameState.market_adjustment}
              competitionIntensity={gameState.competition_intensity}
              interviewerRec={gameState.interviewer_recommendation}
              overallScore={gameState.scores?.overall || 0.5}
              round={gameRound}
              maxRounds={gameState.max_rounds}
              candidateReservationWage={38}
              hrPersona={hrPersona as any}
            />

            <div className="flex gap-4">
              <div className="hidden lg:block w-56 shrink-0">
                {hrPersona && (
                  <HRAvatar
                    persona={hrPersona as any}
                    patience={hrPatience}
                    isThinking={hrThinking}
                  />
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-4">
                <ChatBubblePanel
                  actions={actions}
                  hrPersona={hrPersona as any}
                  isThinking={hrThinking}
                  hrPatience={hrPatience}
                  streamingText={streamingText || undefined}
                  streamingPhase={streamingPhase}
                />

                <SalaryTugOfWar
                  actions={actions}
                  currentOffer={gameState.public_offer}
                  salaryRange={jobData?.salary_range as [number, number] | undefined}
                />

                <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-panel)] overflow-hidden">
                  {prompt && !gameLoading && !hrThinking && (
                    <div className="px-5 py-3 border-b border-[var(--border-hairline)] bg-[var(--bg-elev)]/50">
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{prompt}</p>
                    </div>
                  )}
                  {gameLoading ? (
                    <div className="text-center py-6">
                      <div className="flex items-center justify-center gap-2">
                        <motion.div
                          className="w-5 h-5 rounded-full border-2 border-[var(--hr-purple)] border-t-transparent"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                        <span className="text-[var(--text-tertiary)] text-sm">HR 正在思考对策...</span>
                      </div>
                    </div>
                  ) : showCounterInput ? (
                    <div className="flex items-center gap-3 p-4">
                      <input type="number" value={counterSalary || ""} onChange={(e) => setCounterSalary(Number(e.target.value))}
                        placeholder="输入期望薪资 (K/年)" autoFocus
                        className="bg-[var(--bg-elev)] border border-[var(--border-hairline)] rounded-lg px-4 py-2.5 text-sm flex-1 focus:outline-none focus:border-[var(--accent-cyan)]/50 text-[var(--text-primary)]" />
                      <button onClick={() => { if (counterSalary && counterSalary > 0) { handleAct("counter_offer", counterSalary); setCounterSalary(null); } }}
                        className="px-5 py-2.5 bg-[var(--accent-cyan)] hover:brightness-110 rounded-lg text-sm font-bold text-[var(--bg-canvas)] transition-all">
                        确认还价
                      </button>
                      <button onClick={() => setShowCounterInput(false)}
                        className="px-4 py-2.5 bg-[var(--bg-elev)] hover:bg-[var(--bg-card)] rounded-lg text-sm text-[var(--text-secondary)] border border-[var(--border-hairline)]">
                        取消
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-3 justify-center p-4">
                      {options.map((opt) => {
                        const isAccept = opt.action === "accept";
                        const isReject = opt.action === "reject";
                        const isCounter = opt.action === "counter_offer";
                        return (
                          <motion.button
                            key={opt.action + (opt.salary || "")}
                            onClick={() => {
                              if (isCounter && opt.salary) handleAct("counter_offer", opt.salary);
                              else if (isCounter) { setShowCounterInput(true); setCounterSalary((gameState.public_offer || 30) + 5); }
                              else handleAct(opt.action);
                            }}
                            className="relative px-7 py-3.5 rounded-xl font-bold text-sm transition-all overflow-hidden"
                            style={{
                              backgroundColor: isAccept ? "var(--state-success)" : isReject ? "var(--state-danger)" : "var(--accent-cyan)",
                              color: isAccept || isCounter ? "var(--bg-canvas)" : isReject ? "var(--text-primary)" : "var(--bg-canvas)",
                              boxShadow: isAccept
                                ? "0 0 20px var(--accent-green-glow)"
                                : isCounter
                                ? "0 0 20px var(--accent-cyan-glow)"
                                : isReject
                                ? "0 0 10px rgba(251,113,133,0.2)"
                                : "none",
                            }}
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.97 }}
                          >
                            {isAccept && (
                              <motion.div
                                className="absolute inset-0 rounded-xl"
                                animate={{ boxShadow: ["0 0 0px rgba(190,242,100,0)", "0 0 25px rgba(190,242,100,0.4)", "0 0 0px rgba(190,242,100,0)"] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              />
                            )}
                            {isCounter && (
                              <motion.div
                                className="absolute inset-0 rounded-xl"
                                animate={{ boxShadow: ["0 0 0px rgba(34,211,238,0)", "0 0 20px rgba(34,211,238,0.3)", "0 0 0px rgba(34,211,238,0)"] }}
                                transition={{ duration: 2.5, repeat: Infinity }}
                              />
                            )}
                            <span className="relative z-10 flex items-center gap-1.5">
                              {isAccept && "🤝 "}{isReject && "🚪 "}{isCounter && "⚔️ "}{opt.label}
                            </span>
                          </motion.button>
                        );
                      })}
                      <motion.button
                        onClick={() => { setShowCounterInput(true); setCounterSalary((gameState.public_offer || 30) + 5); }}
                        className="px-6 py-3.5 rounded-xl font-medium text-sm bg-[var(--bg-elev)] hover:bg-[var(--bg-card)] border border-[var(--border-hairline)] text-[var(--text-secondary)]"
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        ✏️ 自定义金额...
                      </motion.button>
                    </div>
                  )}
                </div>

                {hrDeliberation && !hrThinking && (
                  <DeliberationPanel
                    situation={!streamingText ? String((hrDeliberation as any)?.situation || "") : ""}
                    options={(hrDeliberation as any)?.options || []}
                    selectedIndex={(hrDeliberation as any)?.selected_index || 0}
                    confidence={(hrDeliberation as any)?.confidence || 0.5}
                    onSelect={() => {}}
                    onCustom={() => {}}
                    loading={gameLoading && !streamingText}
                    streamingText={streamingText || undefined}
                    streamingPhase={streamingPhase}
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}

        {step === 3 && finalResult && (
          <NarrativeResults
            outcome={String(finalResult.outcome || "rejected")}
            outcomeMessage={outcomeMessage}
            finalSalary={typeof finalResult.final_salary === "number" ? finalResult.final_salary : null}
            negotiationRounds={Number(finalResult.negotiation_rounds || 0)}
            successProbability={Number(finalResult.success_probability || 0)}
            candidatePayoff={Number(finalResult.candidate_payoff || 0)}
            equilibrium={equilibrium as any}
            informationAsymmetryCost={Number(finalResult.information_asymmetry_cost || 0)}
            recommendation={String(finalResult.recommendation || "")}
            terminationReason={String((finalResult as any).termination_reason || "")}
            hrPersona={hrPersona ? { name: String((hrPersona as any).name || ""), tagline: String((hrPersona as any).tagline || "") } : undefined}
            onChat={(msg) => handleChat(msg)}
            onRestart={handleRestart}
            onHome={handleGoHome}
          />
        )}
      </div>
    </NegotiationArena>
  );
}

function ResumePreview({ data }: { data: Record<string, unknown> }) {
  const skills = (data.skills as string[]) || [];
  const education = (data.education as Array<Record<string, unknown>>) || [];
  const experience = (data.experience as Array<Record<string, unknown>>) || [];
  return (
    <div className="bg-[var(--bg-elev)] border border-[var(--border-hairline)] rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--text-primary)]">{String(data.name || "未知")}</span>
        <span className="text-[10px] text-[var(--state-success)] bg-[var(--accent-green-glow)] px-2 py-0.5 rounded-full border border-[var(--accent-green)]/20">解析成功</span>
      </div>
      {skills.length > 0 && <div className="flex flex-wrap gap-1">{skills.slice(0, 10).map((s, i) => (
        <span key={i} className="text-[10px] bg-[var(--bg-card)] text-[var(--text-secondary)] px-1.5 py-0.5 rounded border border-[var(--border-hairline)]">{s}</span>
      ))}{skills.length > 10 && <span className="text-[10px] text-[var(--text-tertiary)]">+{skills.length - 10}</span>}</div>}
      {education.length > 0 && <div className="text-xs text-[var(--text-secondary)]">{String(education[0].school || "")} · {String(education[0].degree || "")} · {String(education[0].major || "")}</div>}
      {experience.length > 0 && <div className="text-xs text-[var(--text-secondary)]">{String(experience[0].company || "")} · {String(experience[0].title || "")} · {String(experience[0].start_date || "")} ~ {String(experience[0].end_date || "至今")}</div>}
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto px-4 py-24 text-center text-[var(--text-tertiary)]">加载中...</div>}>
      <PlayContent />
    </Suspense>
  );
}
