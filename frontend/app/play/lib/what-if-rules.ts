export type WhatIfPosture = "firm" | "balanced" | "close_fast";

export interface WhatIfInput {
  baseSuccessProbability: number;
  baseFinalSalary: number | null;
  selectedSalary: number | null;
  salaryDelta: number;
  posture: WhatIfPosture;
  marketHeat: number;
  hrPatienceEstimate: number;
}

export interface WhatIfResult {
  successProbability: number;
  finalSalary: number | null;
  breakRisk: number;
  trustDelta: number;
  explanation: string;
}

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function estimateWhatIf(input: WhatIfInput): WhatIfResult {
  const marketBuffer = input.marketHeat >= 0.7 ? 0.65 : input.marketHeat <= 0.35 ? 1.25 : 1;
  const patiencePenalty = input.hrPatienceEstimate < 0.35 ? 1.4 : input.hrPatienceEstimate > 0.65 ? 0.8 : 1;
  const postureEffect = {
    firm: { success: -0.05, salary: 1.18, risk: 0.08, trust: -0.025, label: "强硬姿态会提高薪资上限，但也更容易触发 HR 的破裂判断" },
    balanced: { success: 0, salary: 0.85, risk: 0, trust: 0, label: "稳健姿态会保留让步空间，适合训练可成交区间" },
    close_fast: { success: 0.07, salary: 0.48, risk: -0.08, trust: 0.025, label: "快成交姿态能提高确定性，但会牺牲一部分薪资上行" },
  }[input.posture];

  const askPressure = input.salaryDelta / 10;
  const successDelta = -askPressure * 0.12 * marketBuffer * patiencePenalty + postureEffect.success;
  const riskDelta = askPressure * 0.14 * marketBuffer * patiencePenalty + postureEffect.risk;
  const trustDelta = -askPressure * 0.045 * patiencePenalty + postureEffect.trust;
  const salaryMove = input.salaryDelta * postureEffect.salary;
  const baseSalary = input.baseFinalSalary ?? input.selectedSalary;
  const finalSalary = baseSalary === null ? null : Math.max(0, Math.round(baseSalary + salaryMove));
  const successProbability = clamp(input.baseSuccessProbability + successDelta);
  const breakRisk = clamp((1 - input.baseSuccessProbability) + riskDelta);
  const roundedTrustDelta = Math.round(trustDelta * 100) / 100;
  const direction = input.salaryDelta > 0 ? `多要 ${input.salaryDelta}K` : input.salaryDelta < 0 ? `少要 ${Math.abs(input.salaryDelta)}K` : "保持原报价";
  const salaryPhrase = finalSalary === null ? "最终薪资无法估计" : `最终薪资约 ${finalSalary}K`;

  return {
    successProbability,
    finalSalary,
    breakRisk,
    trustDelta: roundedTrustDelta,
    explanation: `${direction} 时，${salaryPhrase}，成交概率约 ${pct(successProbability)}，破裂风险约 ${pct(breakRisk)}。${postureEffect.label}。`,
  };
}
