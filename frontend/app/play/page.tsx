"use client";

import { useEffect, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useGameSession } from "./hooks/useGameSession";
import { useSetup } from "./hooks/useSetup";
import { useNegotiation } from "./hooks/useNegotiation";
import { useInfoWar } from "./hooks/useInfoWar";
import { useDebrief } from "./hooks/useDebrief";
import { useAchievements } from "./hooks/useAchievements";
import { loadUserProfile } from "@/lib/user-profile";
import PlaySetupStep from "./components/PlaySetupStep";
import PlayNegotiationStep from "./components/PlayNegotiationStep";
import PlayResultsStep from "./components/PlayResultsStep";
import AchievementPopup from "./components/AchievementPopup";
import NegotiationArena from "./components/NegotiationArena";
import TutorialModal from "./components/TutorialModal";
import type { RoundInsight } from "./components/RoundInsightPanel";
import type { DeliberationView, ResumeView, RoundActionView } from "./hooks/types";

type Step = 1 | 2 | 3;
type NegotiationMode = "buttons" | "freeText";

const STEP_CONFIG = [
  { label: "情报收集", icon: "🔍", sublabel: "输入信息" },
  { label: "薪资博弈", icon: "⚔️", sublabel: "谈判交锋" },
  { label: "战局复盘", icon: "📊", sublabel: "分析结果" },
];

const SETUP_PHASES = [
  "读取简历证据",
  "校准岗位预算",
  "模拟 HR 立场",
  "生成开局战术",
];

function SetupLoadingPanel({ progress }: { progress: string }) {
  return (
    <motion.div
      className="surface-raised mb-6 overflow-hidden rounded-3xl p-6 md:p-8"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="grid gap-6 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
        <motion.div
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-[var(--accent-cyan)]/20 bg-[var(--accent-cyan-glow)] md:mx-0"
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        >
          <span className="text-3xl">⚙️</span>
        </motion.div>

        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--accent-cyan)]">Negotiation Engine</div>
          <div className="mt-2 text-lg font-black text-[var(--text-primary)]">正在搭建谈薪作战室</div>
          <div className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{progress || "模型正在解析输入并生成可追踪的谈判初始状态..."}</div>
        </div>
      </div>

      <div className="mt-6 grid gap-2 md:grid-cols-4">
        {SETUP_PHASES.map((phase, i) => (
          <div key={phase} className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-panel)]/70 p-3">
            <div className="flex items-center gap-2">
              <motion.span
                className="h-2 w-2 rounded-full bg-[var(--accent-cyan)]"
                animate={{ opacity: [0.25, 1, 0.25] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18 }}
              />
              <span className="text-xs font-bold text-[var(--text-secondary)]">{phase}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 text-xs text-[var(--text-tertiary)]">模型响应通常需要 10-30 秒，期间会保留真实等待和失败反馈。</div>
    </motion.div>
  );
}

function PlayContent() {
  const searchParams = useSearchParams();
  const quickDemo = searchParams.get("quick") === "1";

  const {
    sessionId, setSessionId, step, setStep,
    resumeData, setResumeData, jobData, setJobData,
    finalResult, setFinalResult, equilibrium, setEquilibrium,
    outcomeMessage, setOutcomeMessage,
    actions, setActions, gameState, setGameState,
    gameRound, setGameRound,
    options, setOptions, prompt, setPrompt,
    hrPersona, setHrPersona, hrPatience, setHrPatience,
    strategy, setStrategy, market, setMarket, model, setModel,
    hasCompletedTutorial, completeTutorial, skipTutorial,
    infoCards, setInfoCards,
    trustState, setTrustState,
    infoNarrative, setInfoNarrative,
    sessionExpired, dismissExpired, syncFromServer,
    saveToHistory, restoreSession, loadHistorySession, clearSession,
  } = useGameSession();

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [resumePreview, setResumePreview] = useState<ResumeView | null>(null);
  const [hrDeliberation, setHrDeliberation] = useState<DeliberationView | null>(null);
  const [hrThinking, setHrThinking] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [streamingPhase, setStreamingPhase] = useState<"analyze" | "decide" | null>(null);
  const [negotiationMode, setNegotiationMode] = useState<NegotiationMode>("buttons");
  const [roundInsight, setRoundInsight] = useState<RoundInsight | null>(null);
  const [profileResume, setProfileResume] = useState<ResumeView | null>(null);
  const [usingProfileResume, setUsingProfileResume] = useState(false);

  const { achievement, setAchievement, tryUnlockAchievement, resetAchievements } = useAchievements();

  const setupParams = {
    resumeData, strategy, market, model,
    setResumeData, setJobData, setResumePreview,
    setSessionId, setGameState, setGameRound, setActions, setPrompt, setOptions,
    setHrPersona, setHrPatience, setInfoCards, setTrustState, setInfoNarrative,
    setStep, setError, setLoading, setProgress,
  };

  const { file, setFile, jdText, setJdText, handleFileChange, handleStartNegotiation } = useSetup(setupParams);

  const negotiationParams = {
    sessionId, gameRound, jobData, hrPatience,
    setGameRound, setActions, setGameState, setPrompt, setOptions,
    setHrPatience, setHrDeliberation, setHrThinking, setStreamingText, setStreamingPhase,
    setInfoCards, setTrustState, setInfoNarrative, setRoundInsight,
    setFinalResult, setEquilibrium, setOutcomeMessage, setStep,
    saveToHistory, tryUnlockAchievement, setError,
  };

  const { gameLoading, counterSalary, setCounterSalary, showCounterInput, setShowCounterInput, handleAct } = useNegotiation(negotiationParams);

  const { handleInfoReveal, handleInfoFake, handleInfoConceal, lastInfoPlay } = useInfoWar(
    sessionId, setInfoCards, setTrustState, setInfoNarrative
  );

  const { setChatMessages, setChatInput, handleChat } = useDebrief(sessionId);

  const handleGoHome = () => { window.location.href = "/"; };

  const handleRestart = () => {
    clearSession();
    setFile(null); setJdText(""); setResumePreview(null);
    setHrDeliberation(null); setHrThinking(false);
    setStreamingText(""); setStreamingPhase(null);
    setRoundInsight(null);
    setChatMessages([]); setChatInput("");
    resetAchievements();
    setError(""); setLoading(false); setProgress("");
  };

  const useProfileResume = () => {
    if (!profileResume) return;
    setFile(null);
    setResumeData(profileResume);
    setResumePreview(profileResume);
    setUsingProfileResume(true);
  };

  // Session recovery on mount
  useEffect(() => {
    const review = searchParams.get("review");
    const session = searchParams.get("session");

    window.setTimeout(() => {
      const profile = loadUserProfile();
      setProfileResume(profile.resume);
      if (profile.resume && !resumePreview) {
        setFile(null);
        setResumeData(profile.resume);
        setResumePreview(profile.resume);
        setUsingProfileResume(true);
      }
      if (profile.preferredStrategy) setStrategy(profile.preferredStrategy);
    }, 0);

    if (quickDemo) { window.location.replace("/demo"); return; }
    if (review) { loadHistorySession(review); return; }

    if (session) {
      window.setTimeout(() => {
        setSessionId(session);
        setLoading(true); setProgress("正在恢复会话...");
        syncFromServer(session).then(() => {
          setLoading(false); setProgress("");
        });
      });
      return;
    }

    // Auto-restore from localStorage (with background server sync)
    restoreSession();
  }, []);

  // Achievement checks
  useEffect(() => {
    if (actions.length > 0) {
      const lastAction = actions[actions.length - 1];
      if (lastAction.action_type === "counter_offer") tryUnlockAchievement("first_counter");
    }
    if (gameState && actions.length > 0) {
      const lastPair = actions.filter((a: RoundActionView) => a.player === "candidate" || a.player === "hr");
      if (lastPair.length >= 2) {
        const candSalary = Number(lastPair.filter((a) => a.player === "candidate").slice(-1)[0]?.params?.salary_ask ?? 0);
        const hrSalary = Number(lastPair.filter((a) => a.player === "hr").slice(-1)[0]?.params?.salary_offer ?? 0);
        if (candSalary && hrSalary && Math.abs(candSalary - hrSalary) <= 5) tryUnlockAchievement("gap_5k");
      }
    }
    if (gameRound + 1 >= (gameState?.max_rounds || 5)) tryUnlockAchievement("marathon");
    if (hrPatience >= 0.8 && gameRound > 0) tryUnlockAchievement("patience_master");
  }, [actions, gameState, gameRound, hrPatience, tryUnlockAchievement]);

  const hrPersonaView = hrPersona
    ? { name: String(hrPersona.name || ""), tagline: String(hrPersona.tagline || "") }
    : undefined;

  return (
    <>
      {!hasCompletedTutorial && (
        <AnimatePresence>
          <TutorialModal onComplete={completeTutorial} onSkip={skipTutorial} />
        </AnimatePresence>
      )}

      <NegotiationArena
        round={gameRound}
        maxRounds={gameState?.max_rounds || 5}
        isThinking={hrThinking}
        outcome={step === 3 ? (finalResult?.outcome === "accepted" ? "accepted" : "rejected") : null}
      >
        <AchievementPopup achievement={achievement} onDismiss={() => setAchievement(null)} />

        <div className="mx-auto max-w-[1480px] px-4 py-6 md:px-6">
          {/* Step indicator */}
          <div className="mb-8 flex items-center justify-center gap-2">
            {STEP_CONFIG.map((cfg, i) => {
              const s = (i + 1) as Step;
              const active = step >= s;
              const done = step > s;
              return (
                <div key={s} className="flex items-center gap-2">
                  <motion.div
                    className="flex cursor-default items-center gap-2.5 rounded-full border px-4 py-2 transition-all"
                    style={{
                      borderColor: active ? "rgba(34,211,238,0.24)" : "rgba(148,163,184,0.10)",
                      backgroundColor: active ? "rgba(34,211,238,0.08)" : "rgba(14,18,25,0.52)",
                      boxShadow: "none",
                    }}
                  >
                    <span className="text-sm">{cfg.icon}</span>
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
                    <div className="h-px w-6 rounded bg-[var(--border-hairline)]" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Error banner */}
          {error && (
            <motion.div
              className="surface-base mb-6 rounded-2xl p-4 text-sm text-[var(--state-danger)]"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {error}
            </motion.div>
          )}

          {/* Session expired banner */}
          {sessionExpired && (
            <motion.div
              className="surface-base mb-6 flex items-center justify-between rounded-2xl p-4 text-sm text-[var(--interviewer-amber)]"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span>会话已过期（超过4小时），请重新开始。</span>
              <button
                onClick={dismissExpired}
                className="text-xs px-3 py-1 rounded border border-[var(--interviewer-amber)]/30 hover:bg-[var(--interviewer-amber)]/10 transition-colors"
              >
                知道了
              </button>
            </motion.div>
          )}

          {/* Loading */}
          {loading && <SetupLoadingPanel progress={progress} />}

          {/* Step content */}
          {step === 1 && !loading && (
            <PlaySetupStep
              resumePreview={resumePreview}
              resumeData={resumeData}
              setResumeData={setResumeData}
              file={file}
              loading={loading}
              progress={progress}
              strategy={strategy}
              setStrategy={setStrategy}
              market={market}
              setMarket={setMarket}
              model={model}
              setModel={setModel}
              jdText={jdText}
              setJdText={setJdText}
              handleFileChange={handleFileChange}
              handleStartNegotiation={handleStartNegotiation}
              setResumePreview={setResumePreview}
              setFile={setFile}
              profileResume={profileResume}
              useProfileResume={useProfileResume}
              usingProfileResume={usingProfileResume}
              setUsingProfileResume={setUsingProfileResume}
            />
          )}

          {step === 2 && gameState && (
            <PlayNegotiationStep
              negotiationMode={negotiationMode}
              setNegotiationMode={setNegotiationMode}
              resumeData={resumeData}
              jobData={jobData}
               gameState={gameState}
               gameRound={gameRound}
               strategy={strategy}
               market={market}
               hrPersona={hrPersona}
              hrPatience={hrPatience}
              hrThinking={hrThinking}
              gameLoading={gameLoading}
              actions={actions}
              infoCards={infoCards}
              trustState={trustState}
              infoNarrative={infoNarrative}
              lastInfoPlay={lastInfoPlay}
              roundInsight={roundInsight}
              streamingText={streamingText}
              streamingPhase={streamingPhase}
              prompt={prompt}
              options={options as { action: string; salary?: number; label: string; color: string }[]}
              hrDeliberation={hrDeliberation}
              counterSalary={counterSalary}
              setCounterSalary={setCounterSalary}
              showCounterInput={showCounterInput}
              setShowCounterInput={setShowCounterInput}
              handleAct={handleAct}
              handleInfoReveal={handleInfoReveal}
              handleInfoFake={handleInfoFake}
              handleInfoConceal={handleInfoConceal}
            />
          )}

          {step === 3 && finalResult && (
            <PlayResultsStep
               finalResult={finalResult}
               resumeData={resumeData}
               jobData={jobData}
               strategy={strategy}
               market={market}
               outcomeMessage={outcomeMessage}
              equilibrium={equilibrium}
              hrPersona={hrPersonaView}
              onChat={(msg) => handleChat(msg)}
              onRestart={handleRestart}
              onHome={handleGoHome}
            />
          )}
        </div>
      </NegotiationArena>
    </>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto px-4 py-24 text-center text-[var(--text-tertiary)]">加载中...</div>}>
      <PlayContent />
    </Suspense>
  );
}
