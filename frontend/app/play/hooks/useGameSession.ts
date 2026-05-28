"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getGameState } from "@/lib/game-api";
import type {
  FinalResultView,
  GameOption,
  GameStateView,
  HRPersonaView,
  InfoCardView,
  JobView,
  ResumeView,
  RoundActionView,
  TrustStateView,
} from "./types";

const LS_KEY = "bidding_game_session";
const HISTORY_KEY = "bidding_history";
const TUTORIAL_KEY = "bidding_tutorial_done";

export interface GameSession {
  sessionId: string;
  step: number;
  resumeData: ResumeView | null;
  jobData: JobView | null;
  finalResult: FinalResultView | null;
  equilibrium: Record<string, unknown> | null;
  outcomeMessage: string;
  actions: RoundActionView[];
  gameState: GameStateView | null;
  gameRound: number;
  chatMessages: { role: "user" | "advisor"; text: string }[];
  options: GameOption[];
  prompt: string;
  hrPersona: HRPersonaView | null;
  hrPatience: number;
  strategy: string;
  market: string;
  model: string;
  infoCards: InfoCardView[];
  trustState: TrustStateView | null;
  infoNarrative: string;
  savedAt: number;
}

function isSessionExpired(savedAt: number): boolean {
  const TTL = 4 * 60 * 60 * 1000; // 4 hours
  return Date.now() - savedAt > TTL;
}

export function useGameSession() {
  const [sessionId, setSessionId] = useState("");
  const [step, setStep] = useState(1);
  const [resumeData, setResumeData] = useState<ResumeView | null>(null);
  const [jobData, setJobData] = useState<JobView | null>(null);
  const [finalResult, setFinalResult] = useState<FinalResultView | null>(null);
  const [equilibrium, setEquilibrium] = useState<Record<string, unknown> | null>(null);
  const [outcomeMessage, setOutcomeMessage] = useState("");
  const [actions, setActions] = useState<RoundActionView[]>([]);
  const [gameState, setGameState] = useState<GameStateView | null>(null);
  const [gameRound, setGameRound] = useState(0);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "advisor"; text: string }[]>([]);
  const [options, setOptions] = useState<GameOption[]>([]);
  const [prompt, setPrompt] = useState("");
  const [hrPersona, setHrPersona] = useState<HRPersonaView | null>(null);
  const [hrPatience, setHrPatience] = useState(1.0);
  const [strategy, setStrategy] = useState("balanced");
  const [market, setMarket] = useState("normal");
  const [model, setModel] = useState("qwen-turbo");
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(() => {
    try {
      return Boolean(localStorage.getItem(TUTORIAL_KEY));
    } catch {
      return true;
    }
  });
  const [infoCards, setInfoCards] = useState<InfoCardView[]>([]);
  const [trustState, setTrustState] = useState<TrustStateView | null>(null);
  const [infoNarrative, setInfoNarrative] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);

  const isRestored = useRef(false);
  const syncingRef = useRef(false);

  const completeTutorial = useCallback(() => {
    setHasCompletedTutorial(true);
    try { localStorage.setItem(TUTORIAL_KEY, "1"); } catch {}
  }, []);

  const skipTutorial = useCallback(() => {
    setHasCompletedTutorial(true);
    try { localStorage.setItem(TUTORIAL_KEY, "1"); } catch {}
  }, []);

  const buildSession = useCallback((): GameSession => ({
    sessionId, step, resumeData, jobData, finalResult, equilibrium,
    outcomeMessage, actions, gameState, gameRound, chatMessages,
    options, prompt, hrPersona, hrPatience, strategy, market, model,
    infoCards, trustState, infoNarrative, savedAt: Date.now(),
  }), [sessionId, step, resumeData, jobData, finalResult, equilibrium,
    outcomeMessage, actions, gameState, gameRound, chatMessages,
    options, prompt, hrPersona, hrPatience, strategy, market, model,
    infoCards, trustState, infoNarrative]);

  const saveSession = useCallback(() => {
    if (!sessionId) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(buildSession()));
    } catch {}
  }, [sessionId, buildSession]);

  const saveToHistory = useCallback((
    fr: FinalResultView | null,
    eq: Record<string, unknown> | null,
    msg: string
  ) => {
    if (!sessionId) return;
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      const history: Array<Record<string, unknown>> = raw ? JSON.parse(raw) : [];
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

  const applySnapshot = useCallback((d: GameSession) => {
    setSessionId(d.sessionId);
    setStep(d.step);
    setResumeData(d.resumeData);
    setJobData(d.jobData);
    if (d.finalResult) setFinalResult(d.finalResult);
    if (d.equilibrium) setEquilibrium(d.equilibrium);
    setOutcomeMessage(d.outcomeMessage || "");
    setActions(d.actions || []);
    setGameState(d.gameState);
    setGameRound(d.gameRound || 0);
    setChatMessages(d.chatMessages || []);
    setOptions(d.options || []);
    setPrompt(d.prompt || "");
    setHrPersona(d.hrPersona || null);
    setHrPatience(d.hrPatience ?? 1.0);
    if (d.strategy) setStrategy(d.strategy);
    if (d.market) setMarket(d.market);
    if (d.model) setModel(d.model);
    if (d.infoCards) setInfoCards(d.infoCards);
    if (d.trustState) setTrustState(d.trustState);
    if (d.infoNarrative) setInfoNarrative(d.infoNarrative);
  }, []);

  const syncFromServer = useCallback(async (sid: string) => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    try {
      const data = await getGameState(sid);
      if (data.status === "ok") {
        if (data.game_state) setGameState(data.game_state);
        if (data.round !== undefined) setGameRound(data.round);
        if (data.round_actions) setActions(data.round_actions as RoundActionView[]);
        if (data.prompt) setPrompt(data.prompt);
        if (data.options) setOptions(data.options as GameOption[]);
        if (data.hr_persona) setHrPersona(data.hr_persona as HRPersonaView);
        if (data.hr_patience !== undefined) setHrPatience(data.hr_patience);
        if (data.info_cards) setInfoCards(data.info_cards);
        if (data.trust_state) setTrustState(data.trust_state);
        if (data.info_narrative) setInfoNarrative(data.info_narrative);
        if (data.final_result) {
          setFinalResult(data.final_result);
          if (data.equilibrium) setEquilibrium(data.equilibrium);
          setOutcomeMessage(data.message || "");
          if (data.outcome) setStep(3);
        }
      } else {
        setSessionExpired(true);
        setStep(1);
      }
    } catch {
      // Server unreachable — keep using local snapshot
    }
    syncingRef.current = false;
  }, []);

  const restoreSession = useCallback((): boolean => {
    if (isRestored.current) return false;
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw) as GameSession;
      if (!d.sessionId) return false;
      if (d.step === 3) return false;

      // Check expiry
      if (d.savedAt && isSessionExpired(d.savedAt)) {
        setSessionExpired(true);
        localStorage.removeItem(LS_KEY);
        return false;
      }

      applySnapshot(d);
      isRestored.current = true;

      // Background sync for step 2 (in-progress game)
      if (d.step === 2) {
        syncFromServer(d.sessionId);
      }

      return true;
    } catch { return false; }
  }, [applySnapshot, syncFromServer]);

  const loadHistorySession = useCallback((id: string) => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return;
      const history = JSON.parse(raw) as Array<Record<string, unknown>>;
      const item = history.find((h) => h.id === id || h.sessionId === id);
      if (!item) return;
      setSessionId(String(item.sessionId || id));
      setResumeData((item.resumeData as ResumeView) || null);
      setJobData((item.jobData as JobView) || null);
      setFinalResult((item.finalResult as FinalResultView) || null);
      setEquilibrium((item.equilibrium as Record<string, unknown>) || null);
      setOutcomeMessage(String(item.outcomeMessage || ""));
      setActions((item.actions as RoundActionView[]) || []);
      setChatMessages((item.chatMessages as { role: "user" | "advisor"; text: string }[]) || []);
      setHrPersona((item.hrPersona as HRPersonaView) || null);
      setHrPatience((item.hrPatience as number) ?? 1.0);
      setGameRound((Number(item.negotiationRounds) || 1) - 1);
      setStep(3);
    } catch {}
  }, []);

  const clearSession = useCallback(() => {
    setSessionId(""); setStep(1); setResumeData(null); setJobData(null);
    setFinalResult(null); setEquilibrium(null); setOutcomeMessage("");
    setActions([]); setGameState(null); setGameRound(0);
    setChatMessages([]); setOptions([]); setPrompt("");
    setHrPersona(null); setHrPatience(1.0);
    setInfoCards([]); setTrustState(null); setInfoNarrative("");
    setSessionExpired(false);
    try { localStorage.removeItem(LS_KEY); } catch {}
  }, []);

  const dismissExpired = useCallback(() => setSessionExpired(false), []);

  // Auto-save on state changes
  useEffect(() => { if (sessionId) saveSession(); }, [saveSession, sessionId]);

  return {
    sessionId, setSessionId,
    step, setStep,
    resumeData, setResumeData,
    jobData, setJobData,
    finalResult, setFinalResult,
    equilibrium, setEquilibrium,
    outcomeMessage, setOutcomeMessage,
    actions, setActions,
    gameState, setGameState,
    gameRound, setGameRound,
    chatMessages, setChatMessages,
    options, setOptions,
    prompt, setPrompt,
    hrPersona, setHrPersona,
    hrPatience, setHrPatience,
    strategy, setStrategy,
    market, setMarket,
    model, setModel,
    hasCompletedTutorial, completeTutorial, skipTutorial,
    infoCards, setInfoCards,
    trustState, setTrustState,
    infoNarrative, setInfoNarrative,
    sessionExpired, dismissExpired,
    syncFromServer,
    saveSession, saveToHistory, restoreSession, loadHistorySession, clearSession,
  };
}
