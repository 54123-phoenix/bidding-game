"use client";

import { useState, useCallback } from "react";
import { API_BASE } from "@/lib/api";

export interface ChatMessage {
  role: "user" | "advisor";
  text: string;
}

export function useDebrief(sessionId: string) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const handleAutoDebrief = useCallback(async () => {
    setChatLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/debrief/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, message: "" }),
      });
      const d = await r.json();
      if (d.reply) setChatMessages([{ role: "advisor", text: d.reply }]);
    } catch {}
    setChatLoading(false);
  }, [sessionId]);

  const handleChat = useCallback(async (msg?: string, input?: string) => {
    const text = (msg || input || "").trim();
    if (!text) return;
    setChatMessages((p) => [...p, { role: "user", text }]);
    setChatInput(""); setChatLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/debrief/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, message: text }),
      });
      const d = await r.json();
      setChatMessages((p) => [...p, { role: "advisor", text: d.reply || d.message || "抱歉，暂时无法回答。" }]);
    } catch { setChatMessages((p) => [...p, { role: "advisor", text: "网络错误，请重试。" }]); }
    setChatLoading(false);
  }, [sessionId]);

  return {
    chatMessages, setChatMessages,
    chatInput, setChatInput,
    chatLoading, setChatLoading,
    handleAutoDebrief, handleChat,
  };
}
