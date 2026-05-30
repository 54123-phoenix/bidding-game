export interface ReputationEvent {
  id: string;
  timestamp: number;
  actionType: "emphasize" | "reframe" | "downplay";
  label: string;
  delta: number;
  reason: string;
  trustAfter?: number;
}

export interface ReputationState {
  score: number;
  events: ReputationEvent[];
}

export const REPUTATION_KEY = "bidding_reputation";
const BASE_SCORE = 0.72;

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function safeParse(raw: string | null): ReputationState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ReputationState>;
    if (typeof parsed.score !== "number" || !Array.isArray(parsed.events)) return null;
    return { score: clamp(parsed.score), events: parsed.events as ReputationEvent[] };
  } catch {
    return null;
  }
}

export function loadReputation(): ReputationState {
  if (typeof window === "undefined") return { score: BASE_SCORE, events: [] };
  return safeParse(window.localStorage.getItem(REPUTATION_KEY)) || { score: BASE_SCORE, events: [] };
}

export function applyReputationEvent(event: Omit<ReputationEvent, "id" | "timestamp">): ReputationState {
  const current = loadReputation();
  const reverted = current.score + (BASE_SCORE - current.score) * 0.08;
  const nextEvent: ReputationEvent = {
    ...event,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
  };
  const next = {
    score: clamp(reverted + event.delta),
    events: [nextEvent, ...current.events].slice(0, 20),
  };
  if (typeof window !== "undefined") window.localStorage.setItem(REPUTATION_KEY, JSON.stringify(next));
  return next;
}

export function describeReputation(score: number): { label: string; tone: "good" | "neutral" | "risk" } {
  if (score >= 0.78) return { label: "可信筹码", tone: "good" };
  if (score >= 0.55) return { label: "稳定信誉", tone: "neutral" };
  return { label: "需修复", tone: "risk" };
}

export function reputationDeltaFor(actionType: "emphasize" | "reframe" | "downplay", trustAfter?: number, previousTrust = 0.5) {
  const trustDelta = typeof trustAfter === "number" ? trustAfter - previousTrust : 0;
  if (actionType === "emphasize") {
    return trustDelta > 0.005
      ? { delta: 0.02, reason: "高可信筹码提升了 HR 信任" }
      : { delta: 0.01, reason: "真实筹码进入谈判桌" };
  }
  if (actionType === "reframe") {
    return trustDelta < -0.005
      ? { delta: -0.04, reason: "重组表达降低了 HR 信任" }
      : { delta: 0.01, reason: "重组表达被暂时接受" };
  }
  return { delta: -0.01, reason: "弱化风险会降低长期透明度" };
}
