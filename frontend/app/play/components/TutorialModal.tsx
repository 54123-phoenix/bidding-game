"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TutorialModalProps {
  onComplete: () => void;
  onSkip: () => void;
}

const PAGES = [
  {
    title: "欢迎来到 AI 薪资谈判模拟器",
    subtitle: "四角色不完备信息博弈",
    body: (
      <div className="space-y-3 text-sm text-[var(--text-secondary)] leading-relaxed">
        <p>
          在这个模拟器中，你将扮演<strong className="text-[var(--text-primary)]">候选人</strong>，
          与三个智能体进行多轮薪资谈判：
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elev)] p-3">
            <div className="text-xs font-bold text-[var(--candidate-blue)] mb-1">你 — 候选人</div>
            <div className="text-[11px] text-[var(--text-tertiary)]">隐藏真实实力，争取最高薪资</div>
          </div>
          <div className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elev)] p-3">
            <div className="text-xs font-bold text-[var(--hr-purple)] mb-1">HR</div>
            <div className="text-[11px] text-[var(--text-tertiary)]">在预算与人才质量间权衡</div>
          </div>
          <div className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elev)] p-3">
            <div className="text-xs font-bold text-[var(--interviewer-amber)] mb-1">面试官</div>
            <div className="text-[11px] text-[var(--text-tertiary)]">评估技能匹配度，给出录用建议</div>
          </div>
          <div className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elev)] p-3">
            <div className="text-xs font-bold text-[var(--market-rose)] mb-1">市场</div>
            <div className="text-[11px] text-[var(--text-tertiary)]">供需关系影响双方议价能力</div>
          </div>
        </div>
        <p className="text-[var(--text-tertiary)] text-xs">
          核心机制：贝叶斯信念更新 — 每一轮行动都会改变对方对你的判断。
        </p>
      </div>
    ),
    icon: "🎯",
  },
  {
    title: "如何开始",
    subtitle: "两种进入方式",
    body: (
      <div className="space-y-3 text-sm text-[var(--text-secondary)] leading-relaxed">
        <div className="flex items-start gap-3 rounded-lg border border-[var(--accent-cyan)]/20 bg-[var(--accent-cyan-glow)] p-3">
          <span className="text-lg">⚡</span>
          <div>
            <div className="font-bold text-[var(--text-primary)] text-xs mb-0.5">快速体验（推荐首次）</div>
            <div className="text-[11px] text-[var(--text-tertiary)]">
              使用预置简历和岗位，一键进入谈判，先感受完整流程。
            </div>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elev)] p-3">
          <span className="text-lg">📄</span>
          <div>
            <div className="font-bold text-[var(--text-primary)] text-xs mb-0.5">自定义谈判</div>
            <div className="text-[11px] text-[var(--text-tertiary)]">
              上传你的真实简历 + 粘贴目标岗位描述，AI 会解析结构化信息并生成专属博弈场景。
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elev)] p-3">
          <div className="text-xs font-bold text-[var(--text-primary)] mb-1">策略选择</div>
          <div className="grid grid-cols-3 gap-2 text-[11px] text-[var(--text-tertiary)]">
            <span><strong className="text-[var(--state-danger)]">激进型</strong>：高开高要</span>
            <span><strong className="text-[var(--accent-cyan)]">稳健型</strong>：循序渐进</span>
            <span><strong className="text-[var(--state-success)]">保守型</strong>：低调务实</span>
          </div>
        </div>
      </div>
    ),
    icon: "🚀",
  },
  {
    title: "谈判界面",
    subtitle: "读懂战场信息",
    body: (
      <div className="space-y-3 text-sm text-[var(--text-secondary)] leading-relaxed">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[var(--accent-cyan-glow)] border border-[var(--accent-cyan)]/20 flex items-center justify-center text-[10px]">📊</div>
            <span className="text-xs"><strong className="text-[var(--text-primary)]">GameHUD</strong> — 实时显示当前报价、HR耐心值、市场状态</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[var(--candidate-blue-glow)] border border-[var(--candidate-blue)]/20 flex items-center justify-center text-[10px]">💬</div>
            <span className="text-xs"><strong className="text-[var(--text-primary)]">对话气泡</strong> — 记录每轮候选人与 HR 的交锋</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[var(--hr-purple-glow)] border border-[var(--hr-purple)]/20 flex items-center justify-center text-[10px]">🧠</div>
            <span className="text-xs"><strong className="text-[var(--text-primary)]">HR 思考过程</strong> — 透明展示 AI 的决策推理与选项评估</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[var(--interviewer-amber-glow)] border border-[var(--interviewer-amber)]/20 flex items-center justify-center text-[10px]">🃏</div>
            <span className="text-xs"><strong className="text-[var(--text-primary)]">信息战卡牌</strong> — 选择透露、夸大或隐藏简历信息，影响 HR 信任度</span>
          </div>
        </div>
        <p className="text-[var(--text-tertiary)] text-xs">
          每轮你可以选择：接受报价、还价、或拒绝退出。注意 HR 的耐心会随时间递减。
        </p>
      </div>
    ),
    icon: "⚔️",
  },
  {
    title: "战局复盘",
    subtitle: "从失败中学习",
    body: (
      <div className="space-y-3 text-sm text-[var(--text-secondary)] leading-relaxed">
        <p>
          谈判结束后，你将获得完整的<strong className="text-[var(--text-primary)]">战后分析报告</strong>：
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--accent-cyan)]">🌌</span>
            <span><strong className="text-[var(--text-primary)]">平行宇宙</strong> — 对比不同策略选择下的可能结果</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--accent-cyan)]">📈</span>
            <span><strong className="text-[var(--text-primary)]">关键转折点</strong> — 识别哪些决策改变了谈判走向</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--accent-cyan)]">💡</span>
            <span><strong className="text-[var(--text-primary)]">个性化建议</strong> — 基于你的简历和谈判行为的改进方案</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--accent-cyan)]">🤖</span>
            <span><strong className="text-[var(--text-primary)]">AI 复盘助手</strong> — 可以追问任何关于本次谈判的问题</span>
          </div>
        </div>
        <p className="text-[var(--text-tertiary)] text-xs">
          即使谈判破裂，复盘也能帮你理解：是策略问题、信息不对称，还是市场时机不对？
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
                className="px-5 py-2.5 rounded-lg text-sm font-bold bg-[var(--accent-cyan)] text-[var(--bg-canvas)] hover:brightness-110 transition-all shadow-lg shadow-cyan-500/20"
              >
                🚀 开始体验
              </motion.button>
            )}
            {page < PAGES.length - 1 && (
              <button
                onClick={goNext}
                className="px-5 py-2.5 rounded-lg text-sm font-bold bg-[var(--accent-cyan)] text-[var(--bg-canvas)] hover:brightness-110 transition-all"
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
