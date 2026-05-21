"use client";

import GameResultsView from "./GameResultsView";
import ParallelUniverses from "./ParallelUniverses";

interface PlayResultsStepProps {
  finalResult: Record<string, unknown>;
  outcomeMessage: string;
  equilibrium: Record<string, unknown> | null;
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
        terminationReason={String((finalResult as any).termination_reason || "")}
        onChat={onChat}
        onRestart={onRestart}
        onHome={onHome}
      />

      {Boolean((finalResult as Record<string, unknown>)?.parallel_universes) && (
        <ParallelUniverses
          baseUniverse={(finalResult.parallel_universes as any).base_universe}
          alternatives={(finalResult.parallel_universes as any).alternative_universes || []}
          comparisonSummary={(finalResult.parallel_universes as any).comparison_summary || ""}
          keyInsight={(finalResult.parallel_universes as any).key_insight || ""}
        />
      )}
    </div>
  );
}
