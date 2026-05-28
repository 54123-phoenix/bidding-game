"use client";

import { motion } from "framer-motion";
import GameResultsView from "./GameResultsView";
import ParallelUniverses from "./ParallelUniverses";
import { VISUAL_ASSETS } from "@/lib/visual-assets";
import type { EquilibriumView, FinalResultView } from "../hooks/types";

interface PlayResultsStepProps {
  finalResult: FinalResultView;
  outcomeMessage: string;
  equilibrium: EquilibriumView | null;
  hrPersona?: { name: string; tagline: string };
  onChat: (msg: string) => void;
  onRestart: () => void;
  onHome: () => void;
}

export default function PlayResultsStep({
  finalResult,
  outcomeMessage,
  equilibrium,
  hrPersona,
  onChat,
  onRestart,
  onHome,
}: PlayResultsStepProps) {
  return (
    <div className="space-y-6">
      <GameResultsView
        finalResult={finalResult}
        outcomeMessage={outcomeMessage}
        equilibrium={equilibrium}
        hrPersona={hrPersona}
        recommendation={String(finalResult.recommendation || "")}
        terminationReason={String(finalResult.termination_reason || "")}
        onChat={onChat}
        onRestart={onRestart}
        onHome={onHome}
      />

      {finalResult.parallel_universes?.base_universe ? (
        <ParallelUniverses
          baseUniverse={finalResult.parallel_universes.base_universe}
          alternatives={finalResult.parallel_universes?.alternative_universes || []}
          comparisonSummary={finalResult.parallel_universes?.comparison_summary || ""}
          keyInsight={finalResult.parallel_universes?.key_insight || ""}
        />
      ) : (
        <motion.section
          className="surface-base relative overflow-hidden rounded-3xl p-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <img
            src={VISUAL_ASSETS.debriefLab}
            alt=""
            aria-hidden="true"
            width={480}
            height={300}
            className="pointer-events-none absolute -right-14 -top-20 hidden w-80 opacity-18 mix-blend-screen md:block"
          />
          <div className="relative z-10 max-w-2xl">
            <div className="text-[10px] uppercase tracking-[0.28em] text-[var(--text-tertiary)]">Counterfactual Lab</div>
            <h3 className="mt-1 text-base font-bold text-[var(--text-primary)]">反事实宇宙待生成</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
              当前回合已完成基础复盘。下一步可接入“保守策略、强硬策略、信息披露策略”的并行模拟，用来比较不同谈判路径的薪资与成交概率。
            </p>
          </div>
        </motion.section>
      )}
    </div>
  );
}
