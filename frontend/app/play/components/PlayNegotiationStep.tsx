"use client";

import { motion } from "framer-motion";
import GameHUD from "./GameHUD";
import HRAvatar from "./HRAvatar";
import ChatBubblePanel from "./ChatBubble";
import SalaryTugOfWar from "./SalaryTugOfWar";
import InfoCardHand from "./InfoCardHand";
import DeliberationPanel from "./DeliberationPanel";
import RoundInsightPanel, { type RoundInsight } from "./RoundInsightPanel";
import SituationRail from "./SituationRail";
import MissionBriefing from "./MissionBriefing";
import NegotiationActionComposer from "./NegotiationActionComposer";
import type { InfoPlayFeedback } from "../hooks/useInfoWar";
import type {
  DeliberationView,
  GameOption,
  GameStateView,
  HRPersonaView,
  InfoCardView,
  JobView,
  ResumeView,
  RoundActionView,
  TrustStateView,
} from "../hooks/types";

type NegotiationMode = "buttons" | "freeText";

interface PlayNegotiationStepProps {
  negotiationMode: NegotiationMode;
  setNegotiationMode: (m: NegotiationMode) => void;
  resumeData: ResumeView | null;
  jobData: JobView | null;
  gameState: GameStateView | null;
  gameRound: number;
  hrPersona: HRPersonaView | null;
  hrPatience: number;
  hrThinking: boolean;
  gameLoading: boolean;
  actions: RoundActionView[];
  infoCards: InfoCardView[];
  trustState: TrustStateView | null;
  infoNarrative: string;
  lastInfoPlay: InfoPlayFeedback | null;
  roundInsight: RoundInsight | null;
  streamingText: string;
  streamingPhase: "analyze" | "decide" | null;
  prompt: string;
  options: GameOption[];
  hrDeliberation: DeliberationView | null;
  counterSalary: number | null;
  setCounterSalary: (s: number | null) => void;
  showCounterInput: boolean;
  setShowCounterInput: (s: boolean) => void;
  handleAct: (actionType: string, salaryAmount?: number, message?: string) => Promise<void>;
  handleInfoReveal: (cardId: string, value: string | number) => Promise<void>;
  handleInfoFake: (cardId: string, value: string | number) => Promise<void>;
  handleInfoConceal: (cardId: string) => Promise<void>;
}

export default function PlayNegotiationStep({
  negotiationMode, setNegotiationMode,
  resumeData, jobData, gameState,
  gameRound, hrPersona, hrPatience, hrThinking, gameLoading,
  actions, infoCards, trustState, infoNarrative, lastInfoPlay, roundInsight,
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
      <div className="hidden 2xl:block">
        <MissionBriefing
          resumeData={resumeData}
          jobData={jobData}
          gameState={gameState}
          gameRound={gameRound}
        />
      </div>

      <GameHUD
        publicOffer={gameState?.public_offer ?? null}
        hrPatience={hrPatience}
        marketAdjustment={gameState?.market_adjustment ?? 1}
        competitionIntensity={gameState?.competition_intensity ?? 0.5}
        interviewerRec={gameState?.interviewer_recommendation || "待评估"}
        overallScore={gameState?.scores?.overall || 0.5}
        round={gameRound}
        maxRounds={gameState?.max_rounds || 5}
        candidateReservationWage={gameState?.candidate_reservation_wage ?? null}
        hrPersona={hrPersona}
      />

      <div className="grid gap-4 xl:grid-cols-[240px_minmax(560px,1fr)_320px]">
        <div className="hidden xl:block space-y-4">
          {hrPersona && (
            <HRAvatar
              persona={hrPersona}
              patience={hrPatience}
              isThinking={hrThinking}
            />
          )}
          <SituationRail
            gameState={gameState}
            hrPatience={hrPatience}
            trustState={trustState}
            round={gameRound}
            maxRounds={gameState?.max_rounds || 5}
          />
        </div>

        <div className="min-w-0 space-y-4">
          <div className="xl:hidden grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
            {hrPersona && (
              <HRAvatar
                persona={hrPersona}
                patience={hrPatience}
                isThinking={hrThinking}
              />
            )}
            <SituationRail
              gameState={gameState}
              hrPatience={hrPatience}
              trustState={trustState}
              round={gameRound}
              maxRounds={gameState?.max_rounds || 5}
            />
          </div>

          <ChatBubblePanel
            actions={actions}
            hrPersona={hrPersona}
            isThinking={hrThinking}
            hrPatience={hrPatience}
            streamingText={streamingText || undefined}
            streamingPhase={streamingPhase}
          />

          <SalaryTugOfWar
            actions={actions}
            currentOffer={gameState?.public_offer ?? null}
            salaryRange={jobData?.salary_range as [number, number] | undefined}
          />

          {hrDeliberation && !hrThinking && (
            <DeliberationPanel
              situation={!streamingText ? String(hrDeliberation?.situation || "") : ""}
              options={hrDeliberation?.options || []}
              selectedIndex={hrDeliberation?.selected_index || 0}
              confidence={hrDeliberation?.confidence || 0.5}
              onSelect={() => {}}
              onCustom={() => {}}
              loading={gameLoading && !streamingText}
              streamingText={streamingText || undefined}
              streamingPhase={streamingPhase}
            />
          )}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <NegotiationActionComposer
            negotiationMode={negotiationMode}
            setNegotiationMode={setNegotiationMode}
            prompt={prompt}
            options={options}
            gameLoading={gameLoading}
            hrThinking={hrThinking}
            showCounterInput={showCounterInput}
            setShowCounterInput={setShowCounterInput}
            counterSalary={counterSalary}
            setCounterSalary={setCounterSalary}
            currentOffer={gameState?.public_offer ?? null}
            handleAct={handleAct}
          />

          <RoundInsightPanel insight={roundInsight} />

          {infoCards.length > 0 && (
            <InfoCardHand
              cards={infoCards}
              trust={trustState?.hr_trust_in_candidate ?? 0.5}
              trustLabel={trustState?.trust_label ?? "谨慎信任"}
              onReveal={handleInfoReveal}
              onFake={handleInfoFake}
              onConceal={handleInfoConceal}
              lastPlay={lastInfoPlay}
              disabled={gameLoading || hrThinking}
            />
          )}

          {infoNarrative && (
            <motion.div
              className="surface-base rounded-2xl px-4 py-3 text-xs leading-relaxed text-[var(--text-secondary)]"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {infoNarrative}
            </motion.div>
          )}
        </aside>
      </div>
    </motion.div>
  );
}
