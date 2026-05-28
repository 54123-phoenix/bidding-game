"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BadgeCheck, Brain, ChevronLeft, Pause, Play, ShieldAlert, SkipForward, Sparkles } from "lucide-react";

const DEMO_STEPS = [
  {
    title: "载入预设案例",
    cue: "Case Load",
    feature: "候选人画像 + 目标岗位",
    narration: "系统载入一名 4 年 Go 后端候选人，以及字节跳动 P7 后端岗位。这里是预设剧本，用来快速展示完整能力。",
    candidate: "Diana Zhao · Go / Kubernetes / 高并发系统",
    hr: "ByteDance HR · 预算谨慎 · 目标 58-72W",
    offer: "--",
    trust: 42,
    patience: 88,
    risk: "低",
    action: "准备谈判沙盘",
  },
  {
    title: "解析关键信号",
    cue: "Signal Parse",
    feature: "简历信号抽取",
    narration: "简历中的 QPS 提升、P99 延迟、微服务改造会被转成谈判筹码，而不是只生成一段泛泛的职业建议。",
    candidate: "强信号：QPS 50k、P99 降低 82%、带 3 人小组",
    hr: "HR 判断：技术匹配度高，但仍需压低首轮锚点",
    offer: "58W",
    trust: 56,
    patience: 82,
    risk: "低",
    action: "生成首轮报价",
  },
  {
    title: "HR 低锚报价",
    cue: "Round 1",
    feature: "多轮谈判状态",
    narration: "HR 给出偏保守报价。系统同时展示报价、信任、耐心和风险，而不是只输出一句聊天回复。",
    candidate: "候选人目标：78W，总包结构可谈",
    hr: "HR：当前预算比较紧，首轮可以给到 58W",
    offer: "58W",
    trust: 58,
    patience: 74,
    risk: "中",
    action: "候选人准备还价",
  },
  {
    title: "打出情报牌",
    cue: "Info Card",
    feature: "信息不对称与信任变化",
    narration: "候选人选择披露可验证项目成果。信任上升，但 HR 耐心下降，体现谈判不是单变量游戏。",
    candidate: "披露：核心链路重构，延迟降低 82%",
    hr: "HR 解读：能力可信度提高，但报价压力变大",
    offer: "66W",
    trust: 73,
    patience: 61,
    risk: "中",
    action: "信任 +15%，耐心 -13%",
  },
  {
    title: "策略还价",
    cue: "Counter Offer",
    feature: "策略建议 + HR 心理映射",
    narration: "系统建议用业务影响力支撑 76W 还价，并提示不要过早强调外部 offer，避免破坏信任。",
    candidate: "我希望基于业务影响力和岗位匹配，把总包推进到 76W 左右。",
    hr: "HR：可以争取到 70W，但需要确认入职意愿",
    offer: "70W",
    trust: 76,
    patience: 45,
    risk: "中高",
    action: "进入关键转折点",
  },
  {
    title: "复盘与反事实",
    cue: "Debrief",
    feature: "可解释复盘",
    narration: "结果页总结每轮选择、风险变化和替代策略：如果第二轮直接拒绝，谈判破裂概率会明显上升。",
    candidate: "最终接受 72W，并争取到绩效复审窗口",
    hr: "复盘：成交来自可信证据，而不是单纯高开价",
    offer: "72W",
    trust: 81,
    patience: 36,
    risk: "成交",
    action: "完成演示",
  },
];

export default function DemoPage() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const step = DEMO_STEPS[index];
  const progress = ((index + 1) / DEMO_STEPS.length) * 100;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      setIndex((current) => {
        if (current >= DEMO_STEPS.length - 1) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 3600);
    return () => window.clearTimeout(timer);
  }, [index, playing]);

  const statusCards = useMemo(() => [
    { label: "当前报价", value: step.offer, tone: "cyan" },
    { label: "HR 信任", value: `${step.trust}%`, tone: "emerald" },
    { label: "HR 耐心", value: `${step.patience}%`, tone: "amber" },
    { label: "局势风险", value: step.risk, tone: "rose" },
  ], [step]);

  return (
    <main className="product-shell relative min-h-screen overflow-hidden bg-[#05070a] px-4 py-8 text-white md:px-8">
      <div className="pointer-events-none absolute inset-0 quiet-grid opacity-[0.035]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-cyan-400/10 blur-[110px]" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-400 transition hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50">
            <ChevronLeft size={14} /> 返回首页
          </Link>
          <div className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-amber-100">
            Preset Demo · 非真实分析结果
          </div>
        </header>

        <section className="mb-5 grid gap-5 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-200"
            >
              <Sparkles size={14} /> 谈判剧场
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="max-w-4xl text-3xl font-black tracking-tight md:text-5xl"
            >
              90 秒看懂系统如何推演一场谈薪。
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 }}
              className="mt-3 max-w-3xl text-sm leading-6 text-slate-500"
            >
              这是一段写死输入和输出的功能导览，帮助你快速理解简历信号、HR 报价、情报牌、信任变化与复盘能力。真实模拟请使用 `/play` 上传自己的资料。
            </motion.p>
          </div>

          <div className="surface-base rounded-3xl p-3.5">
            <div className="mb-3 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300">播放控制</span>
              <span className="text-slate-600">{index + 1}/{DEMO_STEPS.length}</span>
            </div>
            <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-800">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-amber-200" animate={{ width: `${progress}%` }} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setPlaying((v) => !v)} className="rounded-xl bg-cyan-300 px-3 py-2 text-xs font-black text-slate-950 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
                {playing ? <Pause className="mx-auto" size={16} /> : <Play className="mx-auto" size={16} />}
              </button>
              <button onClick={() => setIndex((v) => Math.min(v + 1, DEMO_STEPS.length - 1))} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/50">
                下一步
              </button>
              <button onClick={() => { setIndex(DEMO_STEPS.length - 1); setPlaying(false); }} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/50">
                <SkipForward className="mx-auto" size={16} />
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[230px_minmax(780px,1fr)_260px]">
          <aside className="surface-base rounded-3xl p-3">
            <div className="mb-3 px-1 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">Script Timeline</div>
            <div className="space-y-2">
              {DEMO_STEPS.map((item, i) => (
                <button
                  key={item.title}
                  onClick={() => { setIndex(i); setPlaying(false); }}
                  className={`w-full rounded-xl border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50 ${i === index ? "border-cyan-300/35 bg-cyan-300/10" : "border-white/5 bg-white/[0.02] hover:border-white/15"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className={i === index ? "text-xs font-black text-cyan-100" : "text-xs font-bold text-slate-400"}>{item.title}</span>
                    <span className="text-[10px] text-slate-600">0{i + 1}</span>
                  </div>
                  <div className="mt-1 text-[10px] text-slate-600">{item.feature}</div>
                </button>
              ))}
            </div>
          </aside>

          <section className="surface-raised relative min-h-[640px] overflow-hidden rounded-[2rem] border-cyan-300/20 p-6 shadow-[0_0_70px_rgba(34,211,238,0.08)] md:p-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(34,211,238,0.20),transparent_30%),radial-gradient(circle_at_86%_24%,rgba(251,191,36,0.16),transparent_32%)]" />
            <div className="relative z-10">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.28em] text-cyan-300">{step.cue}</div>
                  <h2 className="mt-1 text-4xl font-black text-white md:text-5xl">{step.title}</h2>
                </div>
                <div className="rounded-full border border-amber-300/25 bg-amber-300/10 px-4 py-2 text-xs font-bold text-amber-100">{step.feature}</div>
              </div>

              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="grid gap-5 lg:grid-cols-2"
              >
                <DialogueCard label="候选人" tone="candidate" text={step.candidate} />
                <DialogueCard label="HR" tone="hr" text={step.hr} />
              </motion.div>

              <motion.div
                key={`${step.title}-narration`}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.08 }}
                className="mt-6 rounded-3xl border border-cyan-300/15 bg-black/25 p-6"
              >
                <div className="mb-2 flex items-center gap-2 text-xs font-black text-cyan-200">
                  <Brain size={15} /> 系统旁白
                </div>
                <p className="text-base leading-8 text-slate-200">{step.narration}</p>
              </motion.div>

              <div className="mt-6 grid gap-4 sm:grid-cols-4">
                {statusCards.map((card) => <MetricCard key={card.label} {...card} />)}
              </div>

              <div className="mt-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-5 py-4 text-base font-black text-cyan-100">
                当前动作：{step.action}
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="surface-base rounded-3xl p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-black text-white"><BadgeCheck size={16} className="text-emerald-300" /> 演示展示什么</div>
              <div className="space-y-2 text-xs leading-relaxed text-slate-500">
                <p>展示功能点和交互方式，不调用真实后端，不保存 session。</p>
                <p>所有候选人、HR 话术、报价和结果均为预设剧本。</p>
                <p>真实分析请回到 `/play` 上传自己的简历和岗位。</p>
              </div>
            </div>
            <div className="surface-base rounded-3xl p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-black text-white"><ShieldAlert size={16} className="text-amber-200" /> 可信边界</div>
              <p className="text-xs leading-relaxed text-slate-500">演示页偏“谈判剧场”，真实页偏“谈判作战室”。这样既保留趣味性，也不会把预设结果伪装成真实职业建议。</p>
            </div>
            <Link href="/play" className="group flex items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-4 py-3.5 text-sm font-black text-slate-950 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
              开始真实模拟 <ArrowRight size={16} className="transition group-hover:translate-x-1" />
            </Link>
          </aside>
        </section>
      </div>
    </main>
  );
}

function DialogueCard({ label, text, tone }: { label: string; text: string; tone: "candidate" | "hr" }) {
  const isCandidate = tone === "candidate";
  return (
    <div className="min-h-[160px] rounded-3xl border border-white/10 bg-white/[0.045] p-6">
      <div className={isCandidate ? "mb-4 text-sm font-black text-blue-300" : "mb-4 text-sm font-black text-purple-300"}>{label}</div>
      <p className="text-lg leading-9 text-slate-200">{text}</p>
    </div>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  const color = tone === "emerald" ? "text-emerald-300" : tone === "amber" ? "text-amber-200" : tone === "rose" ? "text-rose-300" : "text-cyan-200";
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-4 text-center">
      <div className="text-xs text-slate-600">{label}</div>
      <div className={`mt-1 text-3xl font-black ${color}`}>{value}</div>
    </div>
  );
}
