"use client";

import { useState, useCallback } from "react";
import { API_BASE } from "@/lib/api";
import type { NegotiationParams } from "./types";

export interface GameState {
  round: number; max_rounds: number;
  public_offer: number | null; public_status: string;
  competition_intensity: number; market_adjustment: number;
  scores: Record<string, number>; interviewer_recommendation: string;
}

export interface RoundAction {
  player: string; action_type: string; params: Record<string, unknown>;
  reasoning: string; round: number;
}

export function useNegotiation(p: NegotiationParams) {
  const [gameLoading, setGameLoading] = useState(false);
  const [counterSalary, setCounterSalary] = useState<number | null>(null);
  const [showCounterInput, setShowCounterInput] = useState(false);

  const handleSSEEvent = useCallback((event: Record<string, unknown>) => {
    switch (event.type) {
      case "phase":
        p.setStreamingPhase(event.phase as "analyze" | "decide");
        break;
      case "chunk":
        p.setStreamingText((prev: string) => prev + String(event.text || ""));
        break;
      case "options":
        p.setHrDeliberation({
          situation: "",
          options: event.options || [],
          selected_index: 0,
          confidence: 0.5,
        });
        break;
      case "done":
        if (event.result) p.setHrDeliberation(event.result as Record<string, unknown>);
        p.setStreamingPhase(null);
        p.setHrThinking(false);
        break;
      case "game_over":
        p.setFinalResult((event.final_result as Record<string, unknown>) || null);
        p.setEquilibrium((event.equilibrium as Record<string, unknown>) || null);
        p.setOutcomeMessage(String(event.message || ""));
        p.setGameState(event.game_state as Record<string, unknown>);
        p.setStep(3);
        p.saveToHistory(
          (event.final_result as Record<string, unknown>) || null,
          (event.equilibrium as Record<string, unknown>) || null,
          String(event.message || "")
        );
        {
          const fr = (event.final_result as Record<string, unknown>) || {};
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
        if (event.last_hr_action) p.setActions((prev) => [...prev, event.last_hr_action as Record<string, unknown>]);
        if (event.hr_deliberation) p.setHrDeliberation(event.hr_deliberation as Record<string, unknown>);
        if (event.hr_patience !== undefined) p.setHrPatience(event.hr_patience as number);
        if (event.info_cards) p.setInfoCards(event.info_cards as any[]);
        if (event.trust_state) p.setTrustState(event.trust_state as { hr_trust_in_candidate: number; trust_label: string });
        if (event.info_narrative) p.setInfoNarrative(String(event.info_narrative));
        p.setGameState(event.game_state as Record<string, unknown>);
        p.setGameRound(event.round as number);
        p.setPrompt(String(event.prompt || ""));
        p.setOptions((event.options || []) as Record<string, unknown>[]);
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
            const event = JSON.parse(line.slice(6));
            handleSSEEvent(event);
          } catch {}
        }
      }

      if (buffer.startsWith("data: ")) {
        try {
          const event = JSON.parse(buffer.slice(6));
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
