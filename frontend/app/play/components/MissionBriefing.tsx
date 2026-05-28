"use client";

import { motion } from "framer-motion";
import PlayerIcon from "@/components/player-icon";
import { VISUAL_ASSETS } from "@/lib/visual-assets";
import type { GameStateView, JobView, ResumeView } from "../hooks/types";

interface MissionBriefingProps {
  resumeData: ResumeView | null;
  jobData: JobView | null;
  gameState: GameStateView | null;
  gameRound: number;
}

export default function MissionBriefing({ resumeData, jobData, gameState, gameRound }: MissionBriefingProps) {
  const maxRounds = gameState?.max_rounds || 5;
  const salaryRange = jobData?.salary_range;

  return (
    <motion.header
      className="relative overflow-hidden rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-panel)] p-4 shadow-[0_24px_90px_rgba(0,0,0,0.22)]"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,var(--candidate-blue-glow),transparent_34%),radial-gradient(circle_at_100%_0%,var(--hr-purple-glow),transparent_36%)] opacity-70" />
      <img
        src={VISUAL_ASSETS.missionBrief}
        alt=""
        aria-hidden="true"
        width={480}
        height={300}
        className="pointer-events-none absolute -right-16 -top-20 hidden w-72 opacity-25 mix-blend-screen lg:block"
      />
      <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border"
            style={{ backgroundColor: "var(--candidate-blue-glow)", borderColor: "var(--candidate-blue)40" }}
          >
            <PlayerIcon player="candidate" size={26} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--accent-cyan)]">Mission Briefing</div>
            <h2 className="truncate text-lg font-black text-[var(--text-primary)]">
              {resumeData?.name ? String(resumeData.name) : "候选人"} 正在争取 {jobData?.title ? String(jobData.title) : "目标岗位"}
            </h2>
            <p className="truncate text-xs text-[var(--text-tertiary)]">
              {jobData?.company ? String(jobData.company) : "未知公司"} · {jobData?.level ? String(jobData.level) : "未知职级"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 lg:min-w-[360px]">
          <BriefStat label="回合" value={`${gameRound + 1}/${maxRounds}`} />
          <BriefStat label="预算区间" value={salaryRange ? `${salaryRange[0]}-${salaryRange[1]}K` : "未知"} />
          <BriefStat label="当前报价" value={gameState?.public_offer ? `${gameState.public_offer}K` : "待报价"} accent />
        </div>
      </div>
    </motion.header>
  );
}

function BriefStat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elev)]/70 px-3 py-2">
      <div className="text-[9px] text-[var(--text-tertiary)]">{label}</div>
      <div className={accent ? "mt-1 truncate text-sm font-black text-[var(--accent-cyan)]" : "mt-1 truncate text-sm font-bold text-[var(--text-secondary)]"}>
        {value}
      </div>
    </div>
  );
}
