"use client";

interface RoundAction {
  player: string;
  action_type: string;
  params: Record<string, unknown>;
  reasoning: string;
  round: number;
}

interface SalaryTugOfWarProps {
  actions?: RoundAction[];
  currentOffer?: number | null;
  salaryRange?: [number, number] | null;
  reservationWage?: number;
  candidateOffer?: number | null;
  hrOffer?: number | null;
  marketMin?: number;
  marketMax?: number;
  marketMedian?: number;
}

function salaryFrom(action: RoundAction) {
  const value = action.params?.salary_offer ?? action.params?.salary_ask ?? action.params?.salary_amount ?? action.params?.accepted_salary;
  return typeof value === "number" ? value : null;
}

function deriveOffers(actions: RoundAction[] = [], currentOffer?: number | null) {
  let candidate: number | null = null;
  let hr: number | null = currentOffer ?? null;
  for (const action of actions) {
    const salary = salaryFrom(action);
    if (salary === null) continue;
    if (action.player === "candidate") candidate = salary;
    if (action.player === "hr") hr = salary;
  }
  return { candidate, hr };
}

function pct(value: number, min: number, max: number) {
  if (max <= min) return 50;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

export default function SalaryTugOfWar({
  actions = [],
  currentOffer = null,
  salaryRange,
  candidateOffer,
  hrOffer,
  marketMin,
  marketMax,
  marketMedian,
}: SalaryTugOfWarProps) {
  const derived = deriveOffers(actions, currentOffer);
  const candidate = candidateOffer ?? derived.candidate;
  const hr = hrOffer ?? derived.hr;
  const rangeMin = marketMin ?? salaryRange?.[0] ?? Math.min(candidate ?? 45, hr ?? 45, 30);
  const rangeMax = marketMax ?? salaryRange?.[1] ?? Math.max(candidate ?? 70, hr ?? 70, 100);
  const median = marketMedian ?? Math.round((rangeMin + rangeMax) / 2);

  if (candidate === null && hr === null) return null;

  const candidateValue = candidate ?? median;
  const hrValue = hr ?? median;
  const candidatePct = pct(candidateValue, rangeMin, rangeMax);
  const hrPct = pct(hrValue, rangeMin, rangeMax);
  const marketPct = pct(median, rangeMin, rangeMax);
  const left = Math.min(candidatePct, hrPct);
  const width = Math.abs(candidatePct - hrPct);
  const agreed = candidate !== null && hr !== null && candidate === hr;

  return (
    <section className="cyber-glass relative overflow-hidden rounded-3xl p-5 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,106,0,0.16),transparent_32%),radial-gradient(circle_at_80%_100%,rgba(0,224,255,0.14),transparent_34%)]" />
      <div className="absolute inset-0 quiet-grid opacity-30" />
      <svg className="pointer-events-none absolute right-4 top-3 h-20 w-36 opacity-40" viewBox="0 0 200 120" fill="none" aria-hidden="true">
        <path d="M40 60 Q100 30 160 60" stroke="url(#tugCurve)" strokeWidth="12" strokeLinecap="round" className="math-curve" />
        <circle cx="40" cy="60" r="18" fill="#FF6A00" opacity="0.88" />
        <circle cx="160" cy="60" r="18" fill="#00E0FF" opacity="0.88" />
        <defs>
          <linearGradient id="tugCurve" x1="40" x2="160" y1="60" y2="60" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF6A00" />
            <stop offset="0.55" stopColor="#FACC15" />
            <stop offset="1" stopColor="#00E0FF" />
          </linearGradient>
        </defs>
      </svg>
      <div className="relative z-10 mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black">薪资拉锯</h3>
          <p className="text-[11px] font-semibold text-slate-400">市场区间 {rangeMin}K - {rangeMax}K</p>
        </div>
        {agreed && <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-300 shadow-[0_0_18px_rgba(52,211,153,0.18)]">✅ 达成一致</span>}
      </div>

      <div className="relative z-10 h-20">
        <div className="absolute left-0 right-0 top-8 h-3 rounded-full border border-white/10 bg-white/10">
          <div
            className="absolute top-0 h-3 rounded-full bg-gradient-to-r from-[#FF6A00] via-[#FACC15] to-[#00E0FF] shadow-[0_0_24px_rgba(0,224,255,0.22)] transition-all duration-[400ms] ease-out"
            style={{ left: `${left}%`, width: `${Math.max(width, agreed ? 2 : 4)}%` }}
          />
        </div>

        <Anchor label="市场" value={median} pct={marketPct} color="#94A3B8" small />
        <Anchor label="HR" value={hrValue} pct={hrPct} color="#00E0FF" />
        <Anchor label="我" value={candidateValue} pct={candidatePct} color="#FF6A00" />
      </div>

      <div className="relative z-10 grid grid-cols-3 gap-2">
        <ValueBox label="HR出价" value={hr} color="#00E0FF" />
        <ValueBox label="市场中位" value={median} color="#64748B" />
        <ValueBox label="我的出价" value={candidate} color="#FF6A00" />
      </div>
    </section>
  );
}

function Anchor({ label, value, pct: position, color, small = false }: { label: string; value: number; pct: number; color: string; small?: boolean }) {
  return (
    <div
      className="absolute top-5 flex -translate-x-1/2 flex-col items-center transition-all duration-[400ms] ease-out"
      style={{ left: `${position}%` }}
    >
      <div
        className={small ? "flex h-7 w-7 items-center justify-center rounded-full border-2 bg-black text-[9px] font-black shadow-[0_0_14px_rgba(255,255,255,0.08)]" : "flex h-10 w-10 items-center justify-center rounded-full border-4 bg-black text-xs font-black shadow-[0_0_18px_currentColor]"}
        style={{ borderColor: color, color }}
      >
        {label}
      </div>
      <span className="mt-1 rounded-full border border-white/10 bg-black/70 px-1.5 text-[10px] font-black shadow-sm" style={{ color }}>{value}K</span>
    </div>
  );
}

function ValueBox({ label, value, color }: { label: string; value: number | null; color: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-center backdrop-blur-sm">
      <div className="text-[10px] font-bold text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-black tabular-nums transition-all duration-[400ms]" style={{ color }}>{value === null ? "--" : `${value}K`}</div>
    </div>
  );
}
