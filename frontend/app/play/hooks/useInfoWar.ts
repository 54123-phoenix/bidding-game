"use client";

import { useCallback, useState } from "react";
import { API_BASE } from "@/lib/api";
import type { InfoCardView, TrustStateView } from "./types";

export interface InfoPlayFeedback {
  cardId: string;
  actionType: "reveal" | "fake" | "conceal";
  label: string;
  narrative: string;
  trustAfter?: number;
}

export function useInfoWar(
  sessionId: string,
  setInfoCards: React.Dispatch<React.SetStateAction<InfoCardView[]>>,
  setTrustState: React.Dispatch<React.SetStateAction<TrustStateView | null>>,
  setInfoNarrative: React.Dispatch<React.SetStateAction<string>>,
) {
  const [lastInfoPlay, setLastInfoPlay] = useState<InfoPlayFeedback | null>(null);

  const applyResponse = useCallback((d: {
    status?: string;
    message?: string;
    info_cards?: InfoCardView[];
    trust_state?: TrustStateView;
    narrative?: string;
  }, feedback: Omit<InfoPlayFeedback, "narrative" | "trustAfter">) => {
    if (d.status && d.status !== "ok") {
      setInfoNarrative(String(d.message || "信息行动失败，请稍后重试。"));
      return;
    }
    if (d.info_cards) setInfoCards(d.info_cards);
    if (d.trust_state) setTrustState(d.trust_state);
    if (d.narrative) setInfoNarrative(d.narrative);
    setLastInfoPlay({
      ...feedback,
      narrative: String(d.narrative || "情报已进入谈判桌。"),
      trustAfter: typeof d.trust_state?.hr_trust_in_candidate === "number" ? d.trust_state.hr_trust_in_candidate : undefined,
    });
  }, [setInfoCards, setTrustState, setInfoNarrative]);

  const handleInfoReveal = useCallback(async (cardId: string, value: string | number) => {
    if (!sessionId) return;
    try {
      const r = await fetch(`${API_BASE}/api/game/info_act`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, action_type: "reveal", card_id: cardId, stated_value: value }),
      });
      const d = await r.json();
      applyResponse(d, { cardId, actionType: "reveal", label: "筹码强调" });
    } catch { setInfoNarrative("信息行动提交失败，请检查网络后重试。"); }
  }, [sessionId, applyResponse, setInfoNarrative]);

  const handleInfoFake = useCallback(async (cardId: string, fakeValue: string | number) => {
    if (!sessionId) return;
    try {
      const r = await fetch(`${API_BASE}/api/game/info_act`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, action_type: "fake", card_id: cardId, stated_value: fakeValue }),
      });
      const d = await r.json();
      applyResponse(d, { cardId, actionType: "fake", label: "叙事重组" });
    } catch { setInfoNarrative("信息行动提交失败，请检查网络后重试。"); }
  }, [sessionId, applyResponse, setInfoNarrative]);

  const handleInfoConceal = useCallback(async (cardId: string) => {
    if (!sessionId) return;
    try {
      const r = await fetch(`${API_BASE}/api/game/info_act`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, action_type: "conceal", card_id: cardId }),
      });
      const d = await r.json();
      applyResponse(d, { cardId, actionType: "conceal", label: "风险弱化" });
    } catch { setInfoNarrative("信息行动提交失败，请检查网络后重试。"); }
  }, [sessionId, applyResponse, setInfoNarrative]);

  return { handleInfoReveal, handleInfoFake, handleInfoConceal, lastInfoPlay };
}
