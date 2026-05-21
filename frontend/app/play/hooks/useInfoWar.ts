"use client";

import { useCallback } from "react";
import { API_BASE } from "@/lib/api";

export function useInfoWar(
  sessionId: string,
  setInfoCards: React.Dispatch<React.SetStateAction<any[]>>,
  setTrustState: React.Dispatch<React.SetStateAction<{ hr_trust_in_candidate: number; trust_label: string } | null>>,
  setInfoNarrative: React.Dispatch<React.SetStateAction<string>>,
) {
  const handleInfoReveal = useCallback(async (cardId: string, value: string | number) => {
    if (!sessionId) return;
    try {
      const r = await fetch(`${API_BASE}/api/game/info_act`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, action_type: "reveal", card_id: cardId, stated_value: value }),
      });
      const d = await r.json();
      if (d.info_cards) setInfoCards(d.info_cards);
      if (d.trust_state) setTrustState(d.trust_state);
      if (d.narrative) setInfoNarrative(d.narrative);
    } catch {}
  }, [sessionId, setInfoCards, setTrustState, setInfoNarrative]);

  const handleInfoFake = useCallback(async (cardId: string, fakeValue: string | number) => {
    if (!sessionId) return;
    try {
      const r = await fetch(`${API_BASE}/api/game/info_act`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, action_type: "fake", card_id: cardId, stated_value: fakeValue }),
      });
      const d = await r.json();
      if (d.info_cards) setInfoCards(d.info_cards);
      if (d.trust_state) setTrustState(d.trust_state);
      if (d.narrative) setInfoNarrative(d.narrative);
    } catch {}
  }, [sessionId, setInfoCards, setTrustState, setInfoNarrative]);

  const handleInfoConceal = useCallback(async (cardId: string) => {
    if (!sessionId) return;
    try {
      const r = await fetch(`${API_BASE}/api/game/info_act`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, action_type: "conceal", card_id: cardId }),
      });
      const d = await r.json();
      if (d.info_cards) setInfoCards(d.info_cards);
      if (d.trust_state) setTrustState(d.trust_state);
      if (d.narrative) setInfoNarrative(d.narrative);
    } catch {}
  }, [sessionId, setInfoCards, setTrustState, setInfoNarrative]);

  return { handleInfoReveal, handleInfoFake, handleInfoConceal };
}
