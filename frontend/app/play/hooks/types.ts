import type React from "react";

/** Reusable parameter types for play page hooks */
export type Step = 1 | 2 | 3;
export type NegotiationMode = "buttons" | "freeText";

/** Bundled parameters for useSetup hook */
export interface SetupParams {
  // Input state (read)
  resumeData: Record<string, unknown> | null;
  strategy: string;
  market: string;
  model: string;
  // Input setters
  setResumeData: (d: Record<string, unknown> | null) => void;
  setJobData: (d: Record<string, unknown> | null) => void;
  setResumePreview: (d: Record<string, unknown> | null) => void;
  // Game init setters
  setSessionId: (s: string) => void;
  setGameState: (s: Record<string, unknown> | null) => void;
  setGameRound: (r: number) => void;
  setActions: React.Dispatch<React.SetStateAction<Record<string, unknown>[]>>;
  setPrompt: (p: string) => void;
  setOptions: (o: Record<string, unknown>[]) => void;
  setHrPersona: (p: Record<string, unknown> | null) => void;
  setHrPatience: (p: number) => void;
  setInfoCards: (c: any[]) => void;
  setTrustState: (t: { hr_trust_in_candidate: number; trust_label: string } | null) => void;
  setInfoNarrative: (n: string) => void;
  // Flow
  setStep: (s: number) => void;
  setError: (e: string) => void;
  setLoading: (l: boolean) => void;
  setProgress: (p: string) => void;
}

/** Bundled parameters for useNegotiation hook */
export interface NegotiationParams {
  // Session
  sessionId: string;
  gameRound: number;
  jobData: Record<string, unknown> | null;
  hrPatience: number;
  // Setters
  setGameRound: (r: number) => void;
  setActions: React.Dispatch<React.SetStateAction<Record<string, unknown>[]>>;
  setGameState: (s: Record<string, unknown> | null) => void;
  setPrompt: (p: string) => void;
  setOptions: (o: Record<string, unknown>[]) => void;
  setHrPatience: (p: number) => void;
  setHrDeliberation: (d: Record<string, unknown> | null) => void;
  setHrThinking: (t: boolean) => void;
  setStreamingText: React.Dispatch<React.SetStateAction<string>>;
  setStreamingPhase: (p: "analyze" | "decide" | null) => void;
  setInfoCards: (c: any[]) => void;
  setTrustState: (t: { hr_trust_in_candidate: number; trust_label: string } | null) => void;
  setInfoNarrative: (n: string) => void;
  setFinalResult: (r: Record<string, unknown> | null) => void;
  setEquilibrium: (e: Record<string, unknown> | null) => void;
  setOutcomeMessage: (m: string) => void;
  setStep: (s: number) => void;
  saveToHistory: (fr: Record<string, unknown> | null, eq: Record<string, unknown> | null, msg: string) => void;
  tryUnlockAchievement: (id: string) => void;
  setError: (e: string) => void;
}
