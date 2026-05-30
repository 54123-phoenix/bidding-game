"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TutorialModalProps {
  onComplete: () => void;
  onSkip: () => void;
}

const PAGES = [
  {
    title: "欢迎来到薪资谈判教练",
    subtitle: "每轮告诉你下一步怎么谈",
    body: (
      <div className="space-y-3 text-sm text-[var(--text-secondary)] leading-relaxed">
        <p>
          这里不是单纯“赢一局”的游戏，而是帮你练习真实面试中的薪资判断：
          <strong className="text-[var(--text-primary)]">何时坚持、何时让步、何时换总包结构</strong>。
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elev)] p-3">
            <div className="text-xs font-bold text-[var(--accent-cyan)] mb-1">CoachPanel</div>
            <div className="text-[11px] text-[var(--text-tertiary)]">每轮给出下一步建议和理由</div>
          </div>
          <div className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elev)] p-3">
            <div className="text-xs font-bold text-[var(--hr-purple)] mb-1">HR 视角</div>
            <div className="text-[11px] text-[var(--text-tertiary)]">解释 HR 如何判断你的底线和可信度</div>
          </div>
          <div className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elev)] p-3">
            <div className="text-xs font-bold text-[var(--interviewer-amber)] mb-1">推荐动作</div>
            <div className="text-[11px] text-[var(--text-tertiary)]">告诉你该举证、报价、转总包或收口</div>
          </div>
          <div className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elev)] p-3">
            <div className="text-xs font-bold text-[var(--market-rose)] mb-1">可带走</div>
            <div className="text-[11px] text-[var(--text-tertiary)]">结束后生成备忘录、策略树和 What-if 复盘</div>
          </div>
        </div>
        <p className="text-[var(--text-tertiary)] text-xs">
          目标：让你离开时带着“下次真实面试怎么谈”的具体话术和判断标准。
        </p>
      </div>
    ),
    icon: "🧭",
  },
  {
    title: "谈薪筹码卡",
    subtitle: "组织真实经历，管理验证风险",
    body: (
      <div className="space-y-3 text-sm text-[var(--text-secondary)] leading-relaxed">
        <div className="flex items-start gap-3 rounded-lg border border-[var(--accent-cyan)]/20 bg-[var(--accent-cyan-glow)] p-3">
          <span className="text-lg">🔍</span>
          <div>
            <div className="font-bold text-[var(--text-primary)] text-xs mb-0.5">强调</div>
            <div className="text-[11px] text-[var(--text-tertiary)]">
              把真实且可验证的优势放到谈判桌上，通常提升信任和议价空间。
            </div>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elev)] p-3">
          <span className="text-lg">✨</span>
          <div>
            <div className="font-bold text-[var(--text-primary)] text-xs mb-0.5">重组</div>
            <div className="text-[11px] text-[var(--text-tertiary)]">
              换一个更有利的叙事角度表达经历，收益更高，但验证风险也更高。
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elev)] p-3">
          <div className="text-xs font-bold text-[var(--text-primary)] mb-1">信誉影响</div>
          <div className="grid grid-cols-3 gap-2 text-[11px] text-[var(--text-tertiary)]">
            <span><strong className="text-[var(--state-success)]">强调</strong>：信誉上升</span>
            <span><strong className="text-[var(--interviewer-amber)]">重组</strong>：收益与风险并存</span>
            <span><strong className="text-[var(--state-danger)]">弱化</strong>：短期避险，长期扣分</span>
          </div>
        </div>
      </div>
    ),
    icon: "🃏",
  },
  {
    title: "谈判动作",
    subtitle: "练习真实面试判断",
    body: (
      <div className="space-y-3 text-sm text-[var(--text-secondary)] leading-relaxed">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[var(--accent-cyan-glow)] border border-[var(--accent-cyan)]/20 flex items-center justify-center text-[10px]">💬</div>
            <span className="text-xs"><strong className="text-[var(--text-primary)]">自由话术</strong> — 用自然语言表达你的谈薪姿态</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[var(--candidate-blue-glow)] border border-[var(--candidate-blue)]/20 flex items-center justify-center text-[10px]">💰</div>
            <span className="text-xs"><strong className="text-[var(--text-primary)]">报价/还价</strong> — 给出锚点，同时观察 HR 的耐心和信任变化</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[var(--hr-purple-glow)] border border-[var(--hr-purple)]/20 flex items-center justify-center text-[10px]">🤝</div>
            <span className="text-xs"><strong className="text-[var(--text-primary)]">接受/拒绝</strong> — 接受不是失败，拒绝前先确认总包和职级空间</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[var(--interviewer-amber-glow)] border border-[var(--interviewer-amber)]/20 flex items-center justify-center text-[10px]">🧠</div>
            <span className="text-xs"><strong className="text-[var(--text-primary)]">CoachPanel</strong> — 每轮说明下一步动作和 HR 如何看你</span>
          </div>
        </div>
        <p className="text-[var(--text-tertiary)] text-xs">
          目标不是“赢游戏”，而是练习在真实面试里做更好的谈薪判断。
        </p>
      </div>
    ),
    icon: "🎯",
  },
  {
    title: "复盘与 What-if",
    subtitle: "把一局练习变成下次面试策略",
    body: (
      <div className="space-y-3 text-sm text-[var(--text-secondary)] leading-relaxed">
        <p>
          谈判结束后，你会得到一份可以带走的<strong className="text-[var(--text-primary)]">谈判备忘录</strong>：
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--accent-cyan)]">📝</span>
            <span><strong className="text-[var(--text-primary)]">谈判备忘录</strong> — 总结核心筹码、底线区间和下次可用话术</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--accent-cyan)]">🌳</span>
            <span><strong className="text-[var(--text-primary)]">策略树</strong> — 看清“你的选择 → HR 信念更新 → 收益变化”</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--accent-cyan)]">🎚️</span>
            <span><strong className="text-[var(--text-primary)]">What-if</strong> — 用滑块探索“如果当时多/少要 5K 会怎样”</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--accent-cyan)]">🤖</span>
            <span><strong className="text-[var(--text-primary)]">AI 复盘助手</strong> — 继续追问这次谈判的可改进点</span>
          </div>
        </div>
        <p className="text-[var(--text-tertiary)] text-xs">
          即使谈判破裂，也能转化为下一次真实面试的策略清单。
        </p>
      </div>
    ),
    icon: "📊",
  },
];

export default function TutorialModal({ onComplete, onSkip }: TutorialModalProps) {
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState(0);

  const goNext = () => {
    if (page < PAGES.length - 1) {
      setDirection(1);
      setPage((p) => p + 1);
    } else {
      onComplete();
    }
  };

  const goBack = () => {
    if (page > 0) {
      setDirection(-1);
      setPage((p) => p - 1);
    }
  };

  const current = PAGES[page];

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 40 : -40,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -40 : 40,
      opacity: 0,
    }),
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-md mx-4 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-panel)] shadow-2xl overflow-hidden"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-[var(--border-hairline)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.span
                key={page}
                initial={{ scale: 0.5, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                className="text-2xl"
              >
                {current.icon}
              </motion.span>
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">{current.title}</h2>
                <p className="text-[11px] text-[var(--text-tertiary)]">{current.subtitle}</p>
              </div>
            </div>
            <button
              onClick={onSkip}
              className="text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors px-2 py-1 rounded hover:bg-[var(--bg-elev)]"
            >
              跳过
            </button>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mt-4">
            {PAGES.map((_, i) => (
              <motion.div
                key={i}
                className="h-1 rounded-full"
                animate={{
                  width: i === page ? 24 : 8,
                  backgroundColor:
                    i === page
                      ? "var(--accent-cyan)"
                      : i < page
                      ? "var(--accent-cyan)60"
                      : "var(--border-strong)",
                }}
                transition={{ duration: 0.3 }}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 min-h-[280px]">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={page}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              {current.body}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2 flex items-center justify-between">
          <button
            onClick={goBack}
            disabled={page === 0}
            className="px-4 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elev)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            上一步
          </button>

          <div className="flex items-center gap-2">
            {page === PAGES.length - 1 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={onComplete}
                className="px-5 py-2.5 rounded-lg text-sm font-bold bg-[var(--accent-cyan)] text-[var(--bg-canvas)] hover:brightness-110 transition-[filter,transform] shadow-lg shadow-cyan-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-cyan)]/60"
              >
                🚀 开始体验
              </motion.button>
            )}
            {page < PAGES.length - 1 && (
              <button
                onClick={goNext}
                className="px-5 py-2.5 rounded-lg text-sm font-bold bg-[var(--accent-cyan)] text-[var(--bg-canvas)] hover:brightness-110 transition-[filter,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-cyan)]/60"
              >
                下一步 →
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
