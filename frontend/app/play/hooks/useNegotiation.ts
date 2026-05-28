"use client";

import { useState, useCallback } from "react";
import { API_BASE } from "@/lib/api";
import type {
  DeliberationView,
  DeliberationOptionView,
  FinalResultView,
  GameOption,
  GameStateView,
  InfoCardView,
  NegotiationParams,
  RoundActionView,
  TrustStateView,
} from "./types";
import type { RoundInsight } from "../components/RoundInsightPanel";

interface StreamEvent {
  type?: string;
  phase?: "analyze" | "decide";
  text?: string;
  options?: DeliberationOptionView[] | GameOption[];
  result?: DeliberationView;
  final_result?: FinalResultView;
  equilibrium?: Record<string, unknown>;
  message?: string;
  game_state?: GameStateView;
  last_hr_action?: RoundActionView;
  hr_deliberation?: DeliberationView;
  hr_patience?: number;
  info_cards?: InfoCardView[];
  trust_state?: TrustStateView;
  info_narrative?: string;
  round_insight?: RoundInsight;
  round?: number;
  prompt?: string;
}

function isDeliberationOptions(options: DeliberationOptionView[] | GameOption[] | undefined): options is DeliberationOptionView[] {
  return Array.isArray(options) && options.every((option) => "expected_utility" in option && "risk_level" in option);
}

export function useNegotiation(p: NegotiationParams) {
  const [gameLoading, setGameLoading] = useState(false);
  const [counterSalary, setCounterSalary] = useState<number | null>(null);
  const [showCounterInput, setShowCounterInput] = useState(false);

  const handleSSEEvent = useCallback((event: StreamEvent) => {
    switch (event.type) {
      case "phase":
        if (event.phase) p.setStreamingPhase(event.phase);
        break;
      case "chunk":
        p.setStreamingText((prev: string) => prev + String(event.text || ""));
        break;
      case "options":
        p.setHrDeliberation({
          situation: "",
          options: isDeliberationOptions(event.options) ? event.options : [],
          selected_index: 0,
          confidence: 0.5,
        });
        break;
      case "done":
        if (event.result) p.setHrDeliberation(event.result);
        p.setStreamingPhase(null);
        p.setHrThinking(false);
        break;
      case "game_over":
        if (event.round_insight) p.setRoundInsight(event.round_insight);
        p.setFinalResult(event.final_result || null);
        p.setEquilibrium(event.equilibrium || null);
        p.setOutcomeMessage(String(event.message || ""));
        if (event.game_state) p.setGameState(event.game_state);
        p.setStep(3);
        p.saveToHistory(
          event.final_result || null,
          event.equilibrium || null,
          String(event.message || "")
        );
        {
          const fr = event.final_result || {};
          if (fr.outcome === "accepted") {
            p.tryUnlockAchievement("deal_closed");
            if (p.gameRound + 1 <= 3) p.tryUnlockAchievement("speed_demon");
            if (p.hrPatience < 0.3) p.tryUnlockAchievement("comeback");
            const salaryRange = p.jobData?.salary_range as [number, number] | undefined;
            if (salaryRange && typeof fr.final_salary === "number" && fr.final_salary > (salaryRange[0] + salaryRange[1]) / 2) {
              p.tryUnlockAchievement("high_roller");
            }
          }
        }
        break;
      case "round_complete":
        if (event.last_hr_action) p.setActions((prev) => [...prev, event.last_hr_action as RoundActionView]);
        if (event.hr_deliberation) p.setHrDeliberation(event.hr_deliberation);
        if (event.hr_patience !== undefined) p.setHrPatience(event.hr_patience);
        if (event.info_cards) p.setInfoCards(event.info_cards);
        if (event.trust_state) p.setTrustState(event.trust_state);
        if (event.info_narrative) p.setInfoNarrative(String(event.info_narrative));
        if (event.round_insight) p.setRoundInsight(event.round_insight);
        if (event.game_state) p.setGameState(event.game_state);
        if (typeof event.round === "number") p.setGameRound(event.round);
        p.setPrompt(String(event.prompt || ""));
        p.setOptions((event.options || []) as GameOption[]);
        p.setStreamingText("");
        p.setStreamingPhase(null);
        break;
      case "error":
        p.setError(String(event.message || "未知错误"));
        break;
    }
  }, []);

  const handleAct = useCallback(async (actionType: string, salaryAmount?: number, message?: string) => {
    setGameLoading(true); setShowCounterInput(false); p.setHrThinking(true);
    p.setStreamingText(""); p.setStreamingPhase(null); p.setHrDeliberation(null);
    p.setRoundInsight(null);

    const reasoning = message || (actionType === "accept" ? "接受报价" : actionType === "reject" ? "拒绝报价" : `还价 ${salaryAmount}K`);
    p.setActions((prev) => [...prev, {
      player: "candidate", action_type: actionType,
      params: salaryAmount ? { salary_ask: salaryAmount } : {},
      reasoning,
      round: p.gameRound,
    }]);

    try {
      const body: Record<string, unknown> = { session_id: p.sessionId, action_type: actionType, salary_amount: salaryAmount || null };
      if (message) body.message = message;
      const r = await fetch(`${API_BASE}/api/game/act/stream`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!r.ok) {
        const errText = await r.text();
        p.setError(`服务器错误 (${r.status}): ${errText.slice(0, 200)}`);
        setGameLoading(false); p.setHrThinking(false);
        return;
      }

      const reader = r.body?.getReader();
      if (!reader) {
        p.setError("浏览器不支持流式响应");
        setGameLoading(false); p.setHrThinking(false);
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
          try {
            const event = JSON.parse(line.slice(6)) as StreamEvent;
            handleSSEEvent(event);
          } catch {}
        }
      }

      if (buffer.startsWith("data: ")) {
        try {
          const event = JSON.parse(buffer.slice(6)) as StreamEvent;
          handleSSEEvent(event);
        } catch {}
      }
    } catch (e: unknown) {
      p.setError(e instanceof Error ? e.message : "连接失败");
    }
    setGameLoading(false);
  }, []);

  return {
    gameLoading, counterSalary, setCounterSalary, showCounterInput, setShowCounterInput,
    handleAct,
  };
}
