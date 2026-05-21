"use client";

import { motion } from "framer-motion";
import PlayerIcon from "@/components/player-icon";
import GameHUD from "./GameHUD";
import HRAvatar from "./HRAvatar";
import ChatBubblePanel from "./ChatBubble";
import SalaryTugOfWar from "./SalaryTugOfWar";
import InfoCardHand from "./InfoCardHand";
import DeliberationPanel from "./DeliberationPanel";
import FreeTextNegotiation from "./FreeTextNegotiation";

type NegotiationMode = "buttons" | "freeText";

interface PlayNegotiationStepProps {
  negotiationMode: NegotiationMode;
  setNegotiationMode: (m: NegotiationMode) => void;
  resumeData: Record<string, unknown> | null;
  jobData: Record<string, unknown> | null;
  gameState: Record<string, unknown> | null;
  gameRound: number;
  hrPersona: Record<string, unknown> | null;
  hrPatience: number;
  hrThinking: boolean;
  gameLoading: boolean;
  actions: Record<string, unknown>[];
  infoCards: any[];
  trustState: { hr_trust_in_candidate: number; trust_label: string } | null;
  infoNarrative: string;
  streamingText: string;
  streamingPhase: "analyze" | "decide" | null;
  prompt: string;
  options: { action: string; salary?: number; label: string; color: string }[];
  hrDeliberation: Record<string, unknown> | null;
  counterSalary: number | null;
  setCounterSalary: (s: number | null) => void;
  showCounterInput: boolean;
  setShowCounterInput: (s: boolean) => void;
  handleAct: (actionType: string, salaryAmount?: number, message?: string) => void;
  handleInfoReveal: (cardId: string, value: string | number) => Promise<void>;
  handleInfoFake: (cardId: string, value: string | number) => Promise<void>;
  handleInfoConceal: (cardId: string) => Promise<void>;
}

export default function PlayNegotiationStep({
  negotiationMode, setNegotiationMode,
  resumeData, jobData, gameState,
  gameRound, hrPersona, hrPatience, hrThinking, gameLoading,
  actions, infoCards, trustState, infoNarrative,
  streamingText, streamingPhase, prompt, options,
  hrDeliberation,
  counterSalary, setCounterSalary, showCounterInput, setShowCounterInput,
  handleAct, handleInfoReveal, handleInfoFake, handleInfoConceal,
}: PlayNegotiationStepProps) {
  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Player info bar */}
      <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-panel)] p-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "var(--candidate-blue-glow)", border: "1px solid var(--candidate-blue)40" }}>
                <PlayerIcon player="candidate" size={22} />
              </div>
              <span className="text-[var(--text-primary)] font-medium">
                {resumeData?.name ? String(resumeData.name) : "候选人"}
              </span>
            </div>
            <span className="text-[var(--text-tertiary)]">→</span>
            <span className="text-[var(--text-primary)] font-medium">
              {jobData?.title ? String(jobData.title) : ""}
            </span>
            <span className="text-[var(--text-tertiary)]">
              @ {jobData?.company ? String(jobData.company) : ""}
            </span>
          </div>
          <span className="text-xs text-[var(--text-tertiary)] bg-[var(--bg-elev)] rounded-full px-3 py-1 border border-[var(--border-hairline)]">
            第 {gameRound + 1}/{((gameState as any)?.max_rounds as number) || 5} 轮
          </span>
        </div>
      </div>

      <GameHUD
        publicOffer={(gameState as any)?.public_offer as number | null}
        hrPatience={hrPatience}
        marketAdjustment={(gameState as any)?.market_adjustment as number}
        competitionIntensity={(gameState as any)?.competition_intensity as number}
        interviewerRec={(gameState as any)?.interviewer_recommendation as string}
        overallScore={((gameState as any)?.scores as Record<string, number>)?.overall || 0.5}
        round={gameRound}
        maxRounds={((gameState as any)?.max_rounds as number) || 5}
        candidateReservationWage={38}
        hrPersona={hrPersona as any}
      />

      {infoCards.length > 0 && (
        <InfoCardHand
          cards={infoCards}
          trust={trustState?.hr_trust_in_candidate ?? 0.5}
          trustLabel={trustState?.trust_label ?? "谨慎信任"}
          onReveal={handleInfoReveal}
          onFake={handleInfoFake}
          onConceal={handleInfoConceal}
          disabled={gameLoading || hrThinking}
        />
      )}

      {infoNarrative && (
        <motion.div
          className="rounded-lg border border-[var(--accent-cyan)]/20 bg-[var(--accent-cyan-glow)] px-4 py-2 text-xs text-[var(--text-secondary)]"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {infoNarrative}
        </motion.div>
      )}

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
            actions={actions as any[]}
            hrPersona={hrPersona as any}
            isThinking={hrThinking}
            hrPatience={hrPatience}
            streamingText={streamingText || undefined}
            streamingPhase={streamingPhase}
          />

          <SalaryTugOfWar
            actions={actions as any[]}
            currentOffer={(gameState as any)?.public_offer as number | null}
            salaryRange={jobData?.salary_range as [number, number] | undefined}
          />

          {/* Negotiation Mode Switcher */}
          <div className="flex items-center justify-between px-1">
            <div className="inline-flex rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elev)] p-0.5">
              <button
                onClick={() => setNegotiationMode("buttons")}
                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                  negotiationMode === "buttons"
                    ? "bg-[var(--accent-cyan)] text-[var(--bg-canvas)]"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                }`}
              >
                按钮模式
              </button>
              <button
                onClick={() => setNegotiationMode("freeText")}
                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                  negotiationMode === "freeText"
                    ? "bg-[var(--accent-cyan)] text-[var(--bg-canvas)]"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                }`}
              >
                自由话术
              </button>
            </div>
            <span className="text-[10px] text-[var(--text-tertiary)]">
              {negotiationMode === "buttons" ? "选择预设选项进行谈判" : "用自然语言与HR谈判"}
            </span>
          </div>

          {/* Input area */}
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
            ) : negotiationMode === "freeText" ? (
              <div className="p-4">
                <FreeTextNegotiation
                  onSend={(text) => {
                    const salary =
                      text.match(/(\d{2,3})\s*[k千K/]/)?.[1]
                        ? parseInt(text.match(/(\d{2,3})\s*[k千K/]/)![1], 10)
                        : text.match(/(?:期望|底线|至少|不低于|要|给|到)\s*(\d{2,3})/)?.[1]
                        ? parseInt(text.match(/(?:期望|底线|至少|不低于|要|给|到)\s*(\d{2,3})/)![1], 10)
                        : undefined;
                    if (/接受|同意|好的|可以|没问题/.test(text)) {
                      handleAct("accept", undefined, text);
                    } else if (/拒绝|算了|不考虑|抱歉/.test(text)) {
                      handleAct("reject", undefined, text);
                    } else {
                      handleAct("counter_offer", salary, text);
                    }
                  }}
                  onAccept={() => handleAct("accept")}
                  onReject={() => handleAct("reject")}
                  disabled={gameLoading}
                  hrThinking={hrThinking}
                />
              </div>
            ) : showCounterInput ? (
              <div className="flex items-center gap-3 p-4">
                <input
                  type="number"
                  value={counterSalary || ""}
                  onChange={(e) => setCounterSalary(Number(e.target.value))}
                  placeholder="输入期望薪资 (K/年)"
                  autoFocus
                  className="bg-[var(--bg-elev)] border border-[var(--border-hairline)] rounded-lg px-4 py-2.5 text-sm flex-1 focus:outline-none focus:border-[var(--accent-cyan)]/50 text-[var(--text-primary)]"
                />
                <button
                  onClick={() => {
                    if (counterSalary && counterSalary > 0) {
                      handleAct("counter_offer", counterSalary);
                      setCounterSalary(null);
                    }
                  }}
                  className="px-5 py-2.5 bg-[var(--accent-cyan)] hover:brightness-110 rounded-lg text-sm font-bold text-[var(--bg-canvas)] transition-all"
                >
                  确认还价
                </button>
                <button
                  onClick={() => setShowCounterInput(false)}
                  className="px-4 py-2.5 bg-[var(--bg-elev)] hover:bg-[var(--bg-card)] rounded-lg text-sm text-[var(--text-secondary)] border border-[var(--border-hairline)]"
                >
                  取消
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3 justify-center p-4">
                {(options as any[]).map((opt) => {
                  const isAccept = opt.action === "accept";
                  const isReject = opt.action === "reject";
                  const isCounter = opt.action === "counter_offer";
                  return (
                    <motion.button
                      key={opt.action + (opt.salary || "")}
                      onClick={() => {
                        if (isCounter && opt.salary) handleAct("counter_offer", opt.salary);
                        else if (isCounter) {
                          setShowCounterInput(true);
                          setCounterSalary(((gameState as any)?.public_offer || 30) + 5);
                        } else handleAct(opt.action);
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
                  onClick={() => {
                    setShowCounterInput(true);
                    setCounterSalary(((gameState as any)?.public_offer || 30) + 5);
                  }}
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
  );
}
