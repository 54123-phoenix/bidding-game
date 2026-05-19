"use client";

import { useState, useEffect, useRef } from "react";

/**
 * Typewriter hook — progressively reveals text character by character.
 *
 * Setting `speed` to 0 reveals all text instantly.
 * When `trigger` increments, the effect restarts with the latest `text`.
 */
export function useTypewriter(
  text: string,
  speed: number = 30,
  trigger: number = 0
): string {
  const [displayed, setDisplayed] = useState("");
  const idxRef = useRef(0);

  useEffect(() => {
    // Reset on trigger change
    setDisplayed("");
    idxRef.current = 0;
  }, [trigger, text]);

  useEffect(() => {
    if (speed <= 0) {
      setDisplayed(text);
      return;
    }
    if (idxRef.current >= text.length) return;

    const timer = setInterval(() => {
      idxRef.current += 1;
      setDisplayed(text.slice(0, idxRef.current));
      if (idxRef.current >= text.length) clearInterval(timer);
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed, trigger]);

  return displayed;
}
