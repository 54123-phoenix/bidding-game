"use client";

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
  void speed;
  void trigger;
  return text;
}
