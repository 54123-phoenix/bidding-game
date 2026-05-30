"use client";

import { useState } from "react";

interface AdvisorToastProps {
  message: string;
  type: "tip" | "warning" | "danger";
  visible: boolean;
}

const STYLE: Record<AdvisorToastProps["type"], { prefix: string; cls: string }> = {
  tip: { prefix: "🤖 AI顾问：", cls: "border-blue-200 bg-blue-50 text-blue-900" },
  warning: { prefix: "⚠️ ", cls: "border-yellow-200 bg-yellow-50 text-yellow-900" },
  danger: { prefix: "🚨 HR耐心告急：", cls: "border-red-200 bg-red-50 text-red-900" },
};

export default function AdvisorToast({ message, type, visible }: AdvisorToastProps) {
  const [expanded, setExpanded] = useState(false);
  if (!visible || !message) return null;

  const meta = STYLE[type];
  const long = message.length > 60;
  const text = !expanded && long ? `${message.slice(0, 60)}...` : message;

  return (
    <div className="pointer-events-none sticky top-3 z-30 flex justify-center">
      <button
        type="button"
        onClick={() => long && setExpanded((v) => !v)}
        className={`pointer-events-auto slide-down max-w-3xl rounded-2xl border px-4 py-3 text-left text-sm font-semibold shadow-sm transition-opacity duration-[250ms] ${meta.cls}`}
      >
        <span>{meta.prefix}</span>
        <span>{text}</span>
        {!expanded && long && <span className="font-black">查看详情</span>}
      </button>
    </div>
  );
}

export type { AdvisorToastProps };
