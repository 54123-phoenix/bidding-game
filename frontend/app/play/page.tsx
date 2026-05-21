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
import PlaySetupStep from "./components/PlaySetupStep";
import PlayNegotiationStep from "./components/PlayNegotiationStep";
import PlayResultsStep from "./components/PlayResultsStep";
import AchievementPopup from "./components/AchievementPopup";
import NegotiationArena from "./components/NegotiationArena";
import TutorialModal from "./components/TutorialModal";

type Step = 1 | 2 | 3;
type NegotiationMode = "buttons" | "freeText";

const STEP_CONFIG = [
  { label: "情报收集", icon: "🔍", sublabel: "输入信息" },
  { label: "薪资博弈", icon: "⚔️", sublabel: "谈判交锋" },
  { label: "战局复盘", icon: "📊", sublabel: "分析结果" },
];

function PlayContent() {
  const searchParams = useSearchParams();

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
  const [resumePreview, setResumePreview] = useState<Record<string, unknown> | null>(null);
  const [hrDeliberation, setHrDeliberation] = useState<Record<string, unknown> | null>(null);
  const [hrThinking, setHrThinking] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [streamingPhase, setStreamingPhase] = useState<"analyze" | "decide" | null>(null);
  const [setupMode, setSetupMode] = useState<"quick" | "custom">("custom");
  const [negotiationMode, setNegotiationMode] = useState<NegotiationMode>("buttons");

  const { ACHIEVEMENTS, achievement, setAchievement, tryUnlockAchievement, resetAchievements } = useAchievements();

  const setupParams = {
    resumeData, strategy, market, model,
    setResumeData, setJobData, setResumePreview,
    setSessionId, setGameState, setGameRound, setActions, setPrompt, setOptions,
    setHrPersona, setHrPatience, setInfoCards, setTrustState, setInfoNarrative,
    setStep, setError, setLoading, setProgress,
  };

  const { file, setFile, jdText, setJdText, handleQuickDemo, handleFileChange, handleStartNegotiation } = useSetup(setupParams);

  const negotiationParams = {
    sessionId, gameRound, jobData, hrPatience,
    setGameRound, setActions, setGameState, setPrompt, setOptions,
    setHrPatience, setHrDeliberation, setHrThinking, setStreamingText, setStreamingPhase,
    setInfoCards, setTrustState, setInfoNarrative,
    setFinalResult, setEquilibrium, setOutcomeMessage, setStep,
    saveToHistory, tryUnlockAchievement, setError,
  };

  const { gameLoading, counterSalary, setCounterSalary, showCounterInput, setShowCounterInput, handleAct } = useNegotiation(negotiationParams);

  const { handleInfoReveal, handleInfoFake, handleInfoConceal } = useInfoWar(
    sessionId, setInfoCards, setTrustState, setInfoNarrative
  );

  const { chatMessages, setChatMessages, chatInput, setChatInput, chatLoading, setChatLoading, handleAutoDebrief, handleChat } = useDebrief(sessionId);

  const handleGoHome = () => { window.location.href = "/"; };

  const handleRestart = () => {
    clearSession();
    setFile(null); setJdText(""); setResumePreview(null);
    setHrDeliberation(null); setHrThinking(false);
    setStreamingText(""); setStreamingPhase(null);
    setChatMessages([]); setChatInput("");
    resetAchievements();
    setError(""); setLoading(false); setProgress("");
  };

  // Session recovery on mount
  useEffect(() => {
    const quick = searchParams.get("quick");
    const review = searchParams.get("review");
    const session = searchParams.get("session");

    if (quick === "1") { handleQuickDemo(); return; }
    if (review) { loadHistorySession(review); return; }

    if (session) {
      setSessionId(session);
      setLoading(true); setProgress("正在恢复会话...");
      syncFromServer(session).then(() => {
        setLoading(false); setProgress("");
      });
      return;
    }

    // Auto-restore from localStorage (with background server sync)
    restoreSession();
  }, []);

  // Achievement checks
  useEffect(() => {
    if (actions.length > 0) {
      const lastAction = actions[actions.length - 1] as any;
      if (lastAction.action_type === "counter_offer") tryUnlockAchievement("first_counter");
    }
    if (gameState && actions.length > 0) {
      const lastPair = actions.filter((a: any) => a.player === "candidate" || a.player === "hr");
      if (lastPair.length >= 2) {
        const candSalary = ((lastPair.filter((a: any) => a.player === "candidate").slice(-1)[0] as any)?.params?.salary_ask ?? 0) as number;
        const hrSalary = ((lastPair.filter((a: any) => a.player === "hr").slice(-1)[0] as any)?.params?.salary_offer ?? 0) as number;
        if (candSalary && hrSalary && Math.abs(candSalary - hrSalary) <= 5) tryUnlockAchievement("gap_5k");
      }
    }
    if (gameRound + 1 >= ((gameState as any)?.max_rounds || 5)) tryUnlockAchievement("marathon");
    if (hrPatience >= 0.8 && gameRound > 0) tryUnlockAchievement("patience_master");
  }, [actions, gameState, gameRound, hrPatience, tryUnlockAchievement]);

  const hrPersonaView = hrPersona
    ? { name: String((hrPersona as any).name || ""), tagline: String((hrPersona as any).tagline || "") }
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
        maxRounds={((gameState as any)?.max_rounds as number) || 5}
        isThinking={hrThinking}
        outcome={step === 3 ? (finalResult?.outcome === "accepted" ? "accepted" : "rejected") : null}
      >
        <AchievementPopup achievement={achievement} onDismiss={() => setAchievement(null)} />

        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Step indicator */}
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

          {/* Error banner */}
          {error && (
            <motion.div
              className="mb-6 p-4 rounded-xl border border-[var(--state-danger)]/30 bg-[var(--state-danger)]/10 text-[var(--state-danger)] text-sm"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {error}
            </motion.div>
          )}

          {/* Session expired banner */}
          {sessionExpired && (
            <motion.div
              className="mb-6 p-4 rounded-xl border border-[var(--interviewer-amber)]/30 bg-[var(--interviewer-amber)]/10 text-[var(--interviewer-amber)] text-sm flex items-center justify-between"
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

          {/* Step content */}
          {step === 1 && !loading && (
            <PlaySetupStep
              setupMode={setupMode}
              setSetupMode={setSetupMode}
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
              handleQuickDemo={handleQuickDemo}
              handleFileChange={handleFileChange}
              handleStartNegotiation={handleStartNegotiation}
              setResumePreview={setResumePreview}
              setFile={setFile}
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
              hrPersona={hrPersona}
              hrPatience={hrPatience}
              hrThinking={hrThinking}
              gameLoading={gameLoading}
              actions={actions}
              infoCards={infoCards}
              trustState={trustState}
              infoNarrative={infoNarrative}
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
