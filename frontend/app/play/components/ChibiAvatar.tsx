"use client";

interface ChibiAvatarProps {
  role: "candidate" | "hr";
  mood: "confident" | "nervous" | "happy" | "stern" | "thinking";
  speechBubble?: string;
  className?: string;
}

const EXPRESSION: Record<ChibiAvatarProps["mood"], { brows: string; mouth: string }> = {
  confident: {
    brows: "M34 31 Q41 28 48 31 M64 31 Q71 28 78 31",
    mouth: "M49 56 Q56 62 65 56",
  },
  nervous: {
    brows: "M34 29 Q41 33 48 31 M64 31 Q71 33 78 29",
    mouth: "M53 59 Q57 56 61 59",
  },
  happy: {
    brows: "M34 31 Q41 29 48 31 M64 31 Q71 29 78 31",
    mouth: "M48 55 Q56 66 66 55",
  },
  stern: {
    brows: "M34 30 L49 34 M63 34 L79 30",
    mouth: "M51 59 L64 59",
  },
  thinking: {
    brows: "M34 32 Q41 28 48 32 M64 30 Q72 34 80 30",
    mouth: "M53 58 Q58 61 63 58",
  },
};

function truncateBubble(text: string) {
  return text.length > 12 ? `${text.slice(0, 12)}...` : text;
}

export default function ChibiAvatar({ role, mood, speechBubble, className = "" }: ChibiAvatarProps) {
  const isCandidate = role === "candidate";
  const expression = EXPRESSION[mood];
  const suit = isCandidate ? "#4F7EFF" : "#FF6B6B";
  const accent = isCandidate ? "#233E9F" : "#B64248";
  const hair = isCandidate ? "#2B2524" : "#4B2A22";

  return (
    <div className={`relative inline-block h-[110px] w-[90px] ${className}`}>
      {speechBubble && (
        <div className="absolute -top-2 left-1/2 z-10 max-w-[116px] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white px-2 py-1 text-center text-[10px] font-bold leading-tight text-slate-700 shadow-sm">
          {truncateBubble(speechBubble)}
          <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-slate-200 bg-white" />
        </div>
      )}

      <svg viewBox="0 0 90 110" role="img" aria-label={isCandidate ? "候选人" : "HR"} className="h-full w-full drop-shadow-sm">
        <ellipse cx="45" cy="105" rx="28" ry="5" fill="#CBD5E1" opacity="0.45" />

        <path d="M25 70 Q45 58 65 70 L70 101 Q45 108 20 101 Z" fill={suit} />
        <path d="M42 70 L36 101 M48 70 L54 101" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M41 72 L45 82 L49 72" fill="#FFFFFF" opacity="0.95" />
        <path d="M45 80 L40 100 L50 100 Z" fill={isCandidate ? "#DBEAFE" : "#FFE4E6"} opacity="0.9" />

        <path d="M25 75 Q13 83 16 96" stroke={suit} strokeWidth="8" strokeLinecap="round" fill="none" />
        <path d="M65 75 Q76 82 73 96" stroke={suit} strokeWidth="8" strokeLinecap="round" fill="none" />

        {isCandidate ? (
          <g>
            <rect x="9" y="86" width="20" height="15" rx="3" fill="#5B4636" />
            <path d="M14 86 Q19 79 24 86" fill="none" stroke="#5B4636" strokeWidth="3" strokeLinecap="round" />
            <path d="M11 92 H27" stroke="#C7A17A" strokeWidth="1.5" />
          </g>
        ) : (
          <g transform="rotate(-8 72 86)">
            <rect x="63" y="73" width="19" height="27" rx="3" fill="#F8FAFC" stroke="#64748B" strokeWidth="1.5" />
            <rect x="68" y="70" width="9" height="5" rx="2" fill="#64748B" />
            <path d="M67 81 H78 M67 87 H78 M67 93 H75" stroke="#94A3B8" strokeWidth="1.4" strokeLinecap="round" />
          </g>
        )}

        <circle cx="45" cy="42" r="27" fill="#FFD9B3" />
        <path d="M20 39 Q24 13 45 15 Q68 13 72 39 Q58 27 45 28 Q31 27 20 39" fill={hair} />
        <path d="M26 39 Q26 24 38 18 Q34 31 24 43" fill={hair} opacity="0.95" />
        <path d="M64 38 Q66 25 55 18 Q58 31 70 43" fill={hair} opacity="0.95" />

        <path d={expression.brows} stroke="#3F2D25" strokeWidth="3" strokeLinecap="round" fill="none" />
        <circle cx="40" cy="42" r="2.5" fill="#241A16" />
        <circle cx="66" cy="42" r="2.5" fill="#241A16" />
        {isCandidate && (
          <g fill="none" stroke="#1E293B" strokeWidth="1.7">
            <circle cx="40" cy="42" r="7" />
            <circle cx="66" cy="42" r="7" />
            <path d="M47 42 H59" />
          </g>
        )}
        {!isCandidate && <path d="M56 47 Q58 50 55 52" stroke="#D18B71" strokeWidth="1.5" strokeLinecap="round" fill="none" />}
        <path d={expression.mouth} stroke="#8A3A3A" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        {mood === "thinking" && (
          <g fill={isCandidate ? "#4F7EFF" : "#FF6B6B"} opacity="0.85">
            <circle cx="74" cy="17" r="2" />
            <circle cx="80" cy="11" r="1.7" />
            <circle cx="84" cy="6" r="1.3" />
          </g>
        )}
      </svg>
    </div>
  );
}

export type { ChibiAvatarProps };
