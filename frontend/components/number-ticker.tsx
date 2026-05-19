"use client";

import { useRef, useEffect, useState } from "react";
import { animate, useInView } from "framer-motion";

interface Props {
  target: number;
  suffix?: string;
  prefix?: string;
  className?: string;
  duration?: number;
  autoStart?: boolean;
  decimals?: number;
}

export default function NumberTicker({
  target,
  suffix = "",
  prefix = "",
  className = "",
  duration = 1.8,
  autoStart = true,
  decimals = 0,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const [val, setVal] = useState(0);

  useEffect(() => {
    const shouldAnimate = autoStart || isInView;
    if (!shouldAnimate) return;
    const ctrl = animate(0, target, {
      duration,
      ease: [0.32, 0.72, 0, 1],
      onUpdate: (v) => setVal(Number(v.toFixed(decimals))),
    });
    return () => ctrl.stop();
  }, [isInView, target, autoStart, duration, decimals]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {prefix}
      {val}
      {suffix}
    </span>
  );
}
