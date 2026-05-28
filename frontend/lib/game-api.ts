/**
 * Game API client — all endpoints speak to the real backend.
 * No mocks, no hard-coded data.
 */

import { API_BASE } from "./api";
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
} from "@/app/play/hooks/types";

export interface GameSession {
  session_id: string;
  candidate_name: string;
  job_title: string;
  job_company: string;
  job_level: string;
  status: string;
  round: number;
  max_rounds: number;
  strategy: string;
  public_offer: number | null;
  created_at: string | null;
}

export interface GameListResponse {
  status: string;
  sessions: GameSession[];
  total: number;
  message?: string;
}

export interface GameInitRequest {
  resume: ResumeView;
  job: JobView;
  strategy?: string;
  market_condition?: string;
  model?: string | null;
}

export interface GameInitResponse {
  status: string;
  session_id?: string;
  round?: number;
  phase?: string;
  hr_persona?: HRPersonaView;
  hr_patience?: number;
  prompt?: string;
  options?: GameOption[];
  message?: string;
  screening?: Record<string, unknown>;
  // Fields from /api/game/state (session recovery)
  resume?: ResumeView;
  job?: JobView;
  game_state?: GameStateView;
  round_actions?: RoundActionView[];
  final_result?: FinalResultView;
  equilibrium?: Record<string, unknown>;
  outcome?: string;
  termination_reason?: string;
  info_cards?: InfoCardView[];
  trust_state?: TrustStateView;
  info_narrative?: string;
}

export interface GameActRequest {
  session_id: string;
  action_type: string;
  salary_amount?: number | null;
  message?: string | null;
}

export interface GameActResponse {
  status: string;
  session_id?: string;
  round?: number;
  phase?: string;
  outcome?: string;
  game_state?: GameStateView;
  final_result?: FinalResultView;
  message?: string;
  prompt?: string;
  options?: GameOption[];
}

export interface UploadResumeResponse {
  status: string;
  resume?: ResumeView | null;
  message?: string;
}

export interface ParseJDResponse {
  status: string;
  job?: JobView | null;
  message?: string;
}

/** Get game state by session_id (for /play page recovery). */
export async function getGameState(sessionId: string): Promise<GameInitResponse> {
  const res = await fetch(`${API_BASE}/api/game/state?session_id=${encodeURIComponent(sessionId)}`, { method: "GET" });
  if (!res.ok) throw new Error(`Failed to get game state: ${res.status}`);
  return res.json();
}

/** List all game sessions for the dashboard. */
export async function listGames(): Promise<GameListResponse> {
  const res = await fetch(`${API_BASE}/api/game/list`, { method: "GET" });
  if (!res.ok) throw new Error(`Failed to list games: ${res.status}`);
  return res.json();
}

/** Initialize a new game session. */
export async function initGame(payload: GameInitRequest): Promise<GameInitResponse> {
  const res = await fetch(`${API_BASE}/api/game/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to init game: ${res.status}`);
  return res.json();
}

/** Submit a player action. */
export async function actGame(payload: GameActRequest): Promise<GameActResponse> {
  const res = await fetch(`${API_BASE}/api/game/act`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to act: ${res.status}`);
  return res.json();
}

/** Upload and parse a resume file or Blob. */
export async function uploadResume(
  file: File | Blob,
  filename?: string,
  sourceType?: string
): Promise<UploadResumeResponse> {
  const form = new FormData();
  if (filename) {
    form.append("file", file, filename);
  } else {
    form.append("file", file);
  }
  if (sourceType) {
    form.append("source_type", sourceType);
  }
  const res = await fetch(`${API_BASE}/api/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json();
}

/** Parse natural language resume text. */
export async function parseResumeText(text: string): Promise<UploadResumeResponse> {
  const form = new FormData();
  form.append("resume_text", text);
  const res = await fetch(`${API_BASE}/api/resume/parse`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`Resume parse failed: ${res.status}`);
  return res.json();
}

/** Parse natural language JD text. */
export async function parseJD(text: string): Promise<ParseJDResponse> {
  const form = new FormData();
  form.append("jd_text", text);
  const res = await fetch(`${API_BASE}/api/jd/parse`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`JD parse failed: ${res.status}`);
  return res.json();
}
