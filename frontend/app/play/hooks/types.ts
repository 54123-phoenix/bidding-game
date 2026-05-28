import type React from "react";
import type { RoundInsight } from "../components/RoundInsightPanel";
import type { Universe } from "../components/ParallelUniverses";

/** Reusable parameter types for play page hooks */
export type Step = 1 | 2 | 3;
export type NegotiationMode = "buttons" | "freeText";

export interface TrustStateView {
  hr_trust_in_candidate: number;
  trust_label: string;
}

export interface InfoCardView {
  card_id: string;
  card_type: string;
  icon: string;
  description: string;
  true_value: string | number;
  revealed_value?: string | number | null;
  reveal_state: "hidden" | "revealed" | "faked" | "probed";
  verifiability: number;
  trust_impact: number;
  salary_impact: number;
}

export interface GameOption {
  action: string;
  label: string;
  salary?: number;
  color: string;
}

export interface RoundActionView {
  player: string;
  action_type: string;
  params: Record<string, unknown>;
  reasoning: string;
  confidence?: number;
  round: number;
  timestamp?: string;
}

export interface GameStateView {
  round: number;
  max_rounds: number;
  public_offer: number | null;
  public_status: string;
  competition_intensity: number;
  market_adjustment: number;
  scores: Record<string, number>;
  interviewer_recommendation: string;
  candidate_reservation_wage?: number;
}

export interface HRPersonaView {
  name: string;
  archetype: string;
  tagline: string;
  greeting?: string;
  avatar_expression: string;
  avatar_color: string;
  tone_style?: string;
}

export interface DeliberationView {
  situation?: string;
  options?: DeliberationOptionView[];
  selected_index?: number;
  confidence?: number;
}

export interface DeliberationOptionView {
  action: string;
  salary?: number;
  label: string;
  expected_utility: number;
  risk_level: "low" | "medium" | "high";
  best_case: string;
  worst_case: string;
  opponent_projections?: {
    action: string;
    probability: number;
    reasoning: string;
  }[];
  future?: {
    promotion: string;
    salary_trajectory: string;
    exit_value: string;
    opportunity_cost: string;
    risk: string;
  } | null;
}

export interface ResumeView extends Record<string, unknown> {
  resume_id?: string;
  name?: string;
  skills?: string[];
  education?: Array<Record<string, unknown>>;
  experience?: Array<Record<string, unknown>>;
}

export interface JobView extends Record<string, unknown> {
  job_id?: string;
  title?: string;
  company?: string;
  level?: string;
  salary_range?: [number, number];
}

export interface FinalResultView extends Record<string, unknown> {
  outcome?: string;
  final_salary?: number | null;
  negotiation_rounds?: number;
  success_probability?: number;
  termination_reason?: string;
  parallel_universes?: {
    base_universe?: Universe;
    alternative_universes?: Universe[];
    comparison_summary?: string;
    key_insight?: string;
  };
  final_state?: FinalStateView;
  evaluation?: EvaluationView;
}

export interface FinalStateView {
  action_history?: RoundActionView[];
  scores?: Record<string, number>;
  candidate_type?: Record<string, unknown>;
  hr_type?: Record<string, unknown>;
  interviewer_type?: Record<string, unknown>;
  market_type?: Record<string, unknown>;
}

export interface EvaluationView {
  dimensions?: Array<{ dimension: string; score: number; reasoning?: string }>;
  composite?: number;
}

export type PlayerRole = "candidate" | "hr" | "interviewer" | "market";

export interface EquilibriumView extends Record<string, unknown> {
  equilibrium_type?: string;
  solver_iterations?: number;
  candidate_expected_payoff?: number;
  hr_expected_payoff?: number;
  converged?: boolean;
  candidate_strategy?: {
    opening_salary_ask?: number;
    stance?: string;
    reservation_wage?: number;
    willing_to_concede_to?: number;
  };
  hr_strategy?: {
    opening_offer?: number;
    max_final_offer?: number;
    budget_ceiling?: number;
    urgency?: number;
  };
}

/** Bundled parameters for useSetup hook */
export interface SetupParams {
  // Input state (read)
  resumeData: ResumeView | null;
  strategy: string;
  market: string;
  model: string;
  // Input setters
  setResumeData: (d: ResumeView | null) => void;
  setJobData: (d: JobView | null) => void;
  setResumePreview: (d: ResumeView | null) => void;
  // Game init setters
  setSessionId: (s: string) => void;
  setGameState: (s: GameStateView | null) => void;
  setGameRound: (r: number) => void;
  setActions: React.Dispatch<React.SetStateAction<RoundActionView[]>>;
  setPrompt: (p: string) => void;
  setOptions: (o: GameOption[]) => void;
  setHrPersona: (p: HRPersonaView | null) => void;
  setHrPatience: (p: number) => void;
  setInfoCards: (c: InfoCardView[]) => void;
  setTrustState: (t: TrustStateView | null) => void;
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
  jobData: JobView | null;
  hrPatience: number;
  // Setters
  setGameRound: (r: number) => void;
  setActions: React.Dispatch<React.SetStateAction<RoundActionView[]>>;
  setGameState: (s: GameStateView | null) => void;
  setPrompt: (p: string) => void;
  setOptions: (o: GameOption[]) => void;
  setHrPatience: (p: number) => void;
  setHrDeliberation: (d: DeliberationView | null) => void;
  setHrThinking: (t: boolean) => void;
  setStreamingText: React.Dispatch<React.SetStateAction<string>>;
  setStreamingPhase: (p: "analyze" | "decide" | null) => void;
  setInfoCards: (c: InfoCardView[]) => void;
  setTrustState: (t: TrustStateView | null) => void;
  setInfoNarrative: (n: string) => void;
  setRoundInsight: (i: RoundInsight | null) => void;
  setFinalResult: (r: FinalResultView | null) => void;
  setEquilibrium: (e: Record<string, unknown> | null) => void;
  setOutcomeMessage: (m: string) => void;
  setStep: (s: number) => void;
  saveToHistory: (fr: FinalResultView | null, eq: Record<string, unknown> | null, msg: string) => void;
  tryUnlockAchievement: (id: string) => void;
  setError: (e: string) => void;
}
