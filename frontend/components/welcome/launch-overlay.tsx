"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const CHIPS = ["ByteDance · Algorithm", "Tencent · Product", "Alibaba · Data", "Meituan · Backend"];

interface LaunchOverlayProps {
  isActive: boolean;
}

export default function LaunchOverlay({ isActive }: LaunchOverlayProps) {
  const [phase, setPhase] = useState(0);
  const [lineA, setLineA] = useState("");
  const [lineB, setLineB] = useState("");
  const [rightStatus, setRightStatus] = useState("");
  const wasActiveRef = useRef(false);

  useEffect(() => {
    if (!isActive) {
      wasActiveRef.current = false;
      return;
    }
    const isNewActivation = !wasActiveRef.current;
    wasActiveRef.current = true;

    const timers = [
      window.setTimeout(() => {
        if (isNewActivation) {
          setLineA("");
          setLineB("");
          setRightStatus("");
        }
        setPhase(1);
      }, 0),
      window.setTimeout(() => {
        setPhase(2);
        typeInto("策略矩阵生成中...", setLineA, 32);
        window.setTimeout(() => typeInto("对抗风格预测完毕...", setLineB, 32), 360);
      }, 800),
      window.setTimeout(() => {
        setPhase(3);
        typeInto("信用与风险大盘初始化成功 (28%)", setRightStatus, 24);
      }, 1600),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [isActive]);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="fixed inset-0 z-[100] overflow-hidden bg-[#04060a]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="pointer-events-none absolute inset-0 quiet-grid opacity-[0.018]" />
          <div className="absolute left-1/2 top-8 z-20 w-[min(760px,calc(100%-80px))] -translate-x-1/2 overflow-hidden text-center text-[13px] font-black tracking-[0.08em] text-[#00f3ff] [text-shadow:0_0_6px_rgba(0,243,255,0.6)] animate-[holo-breath_2.4s_ease-in-out_infinite]">
            <span className="inline-block animate-[holo-marquee_9s_linear_infinite] whitespace-nowrap pl-[100%]">
              [SYSTEM] 正在构建谈判策略沙盘 / Deploying Sandbox ... [SYSTEM] 正在构建谈判策略沙盘 / Deploying Sandbox ...
            </span>
          </div>

          <svg className="pointer-events-none absolute inset-0 z-[2] h-full w-full" viewBox="0 0 1440 820" preserveAspectRatio="none" aria-hidden="true">
            <path className="holo-link-base" d="M260 420 C430 310, 515 540, 710 410" />
            <path className="holo-link-base" d="M730 420 C910 300, 990 560, 1180 390" />
            <path className="holo-link-energy" d="M260 420 C430 310, 515 540, 710 410" />
            <path className="holo-link-energy [animation-delay:.42s]" d="M730 420 C910 300, 990 560, 1180 390" />
          </svg>

          <section className="relative z-[3] mx-auto grid min-h-screen w-[min(1180px,calc(100%-68px))] grid-cols-[300px_1fr_320px] items-center gap-6 pt-16">
            <aside className={`holo-card ${phase >= 1 ? "is-active" : ""}`}>
              <HoloHeader left="Case Files" right="01" />
              <div className="grid gap-2.5 p-[18px]">
                {CHIPS.map((chip, index) => (
                  <div key={chip} className={`rounded-2xl border border-white/[0.04] bg-white/[0.025] px-4 py-3.5 font-bold text-white/70 ${phase >= 1 ? "scan-green" : ""}`} style={{ animationDelay: `${index * 90}ms` }}>
                    {chip}
                  </div>
                ))}
              </div>
              <div className="absolute inset-x-[18px] bottom-[18px] min-h-10 border-t border-white/[0.04] pt-3.5 font-mono text-xs tracking-[0.05em] text-emerald-300/80">
                {phase >= 1 ? "[PARSING FILES: 100%]" : ""}
              </div>
            </aside>

            <section className={`holo-card ${phase >= 2 ? "is-active" : ""}`}>
              <HoloHeader left="Main Status" right="Matrix" />
              <div className="absolute left-1/2 top-[52%] h-[190px] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-cyan-300/15 bg-[linear-gradient(rgba(0,243,255,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(0,243,255,0.055)_1px,transparent_1px),rgba(0,243,255,0.025)] bg-[length:22px_22px] [transform:translate(-50%,-50%)_perspective(900px)_rotateX(62deg)]" />
              <div className="absolute inset-x-5 bottom-6 grid gap-2 font-mono text-[13px] text-white/70">
                <div className="min-h-[18px]">{lineA}</div>
                <div className="min-h-[18px]">{lineB}</div>
              </div>
            </section>

            <aside className={`holo-card ${phase >= 3 ? "is-active" : ""}`}>
              <HoloHeader left="Signal Board" right="AI" />
              <div className="relative mx-auto mt-12 h-[230px] w-[230px] rounded-full border border-white/[0.05] bg-[radial-gradient(circle,transparent_28%,rgba(255,255,255,0.03)_29%,transparent_30%,transparent_52%,rgba(255,255,255,0.025)_53%,transparent_54%),conic-gradient(from_0deg,rgba(0,243,255,0.18),transparent_24%,transparent_100%)] animate-[radar-sweep_2.8s_linear_infinite]">
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center font-black text-white/70">Risk<br />{phase >= 3 ? "28%" : "--"}</div>
              </div>
              <div className="absolute inset-x-[18px] bottom-[18px] text-[13px] leading-6 text-white/65">{rightStatus}</div>
            </aside>
          </section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function HoloHeader({ left, right }: { left: string; right: string }) {
  return (
    <header className="flex items-center justify-between px-[18px] pb-2.5 pt-[18px] text-xs font-black uppercase tracking-[0.1em] text-white/55">
      <span>{left}</span>
      <span>{right}</span>
    </header>
  );
}

function typeInto(text: string, setter: (value: string) => void, speed: number) {
  setter("");
  [...text].forEach((char, index) => {
    window.setTimeout(() => setter(text.slice(0, index + 1)), index * speed);
  });
}
