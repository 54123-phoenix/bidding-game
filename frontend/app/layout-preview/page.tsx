const hudItems = ["当前报价", "轮次", "HR 耐心", "信任", "市场温度"];

function Hud() {
  return (
    <div className="grid grid-cols-5 gap-3">
      {hudItems.map((item, index) => (
        <div key={item} className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
          <div className="text-[10px] font-bold tracking-[0.18em] text-slate-500">{item}</div>
          <div className="mt-2 text-lg font-black text-slate-100">{["65K", "2/5", "72%", "谨慎", "偏热"][index]}</div>
        </div>
      ))}
    </div>
  );
}

function Panel({ title, children, className = "" }: { title: string; children?: React.ReactNode; className?: string }) {
  return (
    <section className={`overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/72 ${className}`}>
      <div className="border-b border-slate-800/80 px-5 py-3 text-[11px] font-black tracking-[0.18em] text-slate-500">{title}</div>
      {children ?? <Skeleton />}
    </section>
  );
}

function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-5">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-2.5 rounded-full bg-slate-700/70"
          style={{ width: ["92%", "68%", "46%", "78%", "58%"][index % 5] }}
        />
      ))}
    </div>
  );
}

function Bubble({ mine = false }: { mine?: boolean }) {
  return (
    <div className={`max-w-[74%] rounded-3xl border p-4 ${mine ? "ml-auto border-cyan-300/25 bg-cyan-500/15" : "border-purple-300/25 bg-purple-500/15"}`}>
      <div className="mb-3 h-2.5 rounded-full bg-slate-500/70" />
      <div className="h-2.5 w-2/3 rounded-full bg-slate-500/55" />
    </div>
  );
}

function ActionDock() {
  return (
    <div className="grid grid-cols-2 gap-3 p-5">
      <button className="h-12 rounded-2xl bg-cyan-300 text-sm font-black text-slate-950">还价</button>
      <button className="h-12 rounded-2xl bg-emerald-300 text-sm font-black text-slate-950">接受</button>
      <button className="col-span-2 h-12 rounded-2xl bg-rose-300 text-sm font-black text-slate-950">拒绝 / 离场</button>
    </div>
  );
}

function CommandRoom() {
  return (
    <PreviewShell
      title="A. 左右指挥台"
      note="最接近真实工作台：左边是 HR 和局势，中间是对话，右边是行动与筹码。优点是信息稳定、比赛讲解容易；缺点是仍然有三栏密度。"
    >
      <Hud />
      <div className="mt-5 grid h-[620px] grid-cols-[240px_minmax(520px,1fr)_300px] gap-5">
        <div className="grid grid-rows-[180px_minmax(0,1fr)] gap-5">
          <Panel title="HR 状态" className="border-purple-300/20 bg-purple-950/15">
            <div className="p-5">
              <div className="mb-5 h-20 rounded-3xl border border-purple-300/20 bg-purple-400/10" />
              <Skeleton rows={3} />
            </div>
          </Panel>
          <Panel title="局势雷达">
            <Skeleton rows={7} />
          </Panel>
        </div>

        <div className="grid min-w-0 grid-rows-[92px_minmax(0,1fr)_78px] gap-5">
          <Panel title="HR 最新回应" className="border-purple-300/20 bg-purple-950/15">
            <Skeleton rows={2} />
          </Panel>
          <Panel title="对话主舞台">
            <div className="space-y-4 p-6">
              <Bubble />
              <Bubble mine />
              <Bubble />
              <Bubble mine />
              <Bubble />
            </div>
          </Panel>
          <Panel title="薪资拉锯">
            <div className="flex h-full items-center gap-4 px-5">
              <span className="text-xs font-bold text-slate-500">HR 65K</span>
              <div className="h-3 flex-1 rounded-full bg-slate-800">
                <div className="h-full w-[58%] rounded-full bg-gradient-to-r from-cyan-300 to-lime-300" />
              </div>
              <span className="text-xs font-bold text-slate-500">目标 78K</span>
            </div>
          </Panel>
        </div>

        <div className="grid grid-rows-[180px_150px_minmax(0,1fr)] gap-5">
          <Panel title="下一步行动" className="border-cyan-300/30 bg-cyan-950/20 shadow-[0_20px_70px_rgba(34,211,238,0.08)]">
            <ActionDock />
          </Panel>
          <Panel title="本轮建议">
            <p className="p-5 text-sm leading-7 text-slate-400">先用可验证筹码支撑要价，再给出一个可退让锚点。</p>
          </Panel>
          <Panel title="筹码摘要">
            <Skeleton rows={6} />
          </Panel>
        </div>
      </div>
    </PreviewShell>
  );
}

function TimelineConsole() {
  return (
    <PreviewShell
      title="B. 时间轴控制台"
      note="不是三栏工作台，而是把谈判做成一条推进中的战局时间轴：上方看局势，中间看每轮节点，底部固定操作。优点是差异明显、演示叙事强；缺点是需要重排更多组件。"
    >
      <Hud />
      <div className="mt-5 grid h-[620px] grid-rows-[120px_minmax(0,1fr)_132px] gap-5">
        <div className="grid grid-cols-[minmax(0,1fr)_340px] gap-5">
          <Panel title="HR 本轮判断" className="border-purple-300/20 bg-purple-950/15">
            <Skeleton rows={3} />
          </Panel>
          <Panel title="关键筹码">
            <div className="grid grid-cols-3 gap-3 p-4">
              <div className="h-16 rounded-2xl border border-cyan-300/20 bg-cyan-400/10" />
              <div className="h-16 rounded-2xl border border-lime-300/20 bg-lime-400/10" />
              <div className="h-16 rounded-2xl border border-amber-300/20 bg-amber-400/10" />
            </div>
          </Panel>
        </div>

        <Panel title="谈判时间轴">
          <div className="grid h-full grid-cols-[120px_minmax(0,1fr)_260px] gap-5 p-6">
            <div className="flex flex-col items-center justify-between py-4">
              {[1, 2, 3, 4].map((round) => (
                <div key={round} className="flex h-14 w-14 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-300/10 text-sm font-black text-cyan-200">
                  R{round}
                </div>
              ))}
            </div>
            <div className="space-y-5 overflow-hidden">
              <div className="rounded-3xl border border-slate-800 bg-slate-900/55 p-5">
                <div className="mb-3 text-xs font-bold text-cyan-200">Round 2 当前交锋</div>
                <Bubble />
                <div className="mt-4" />
                <Bubble mine />
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-900/35 p-5 opacity-60">
                <div className="mb-3 text-xs font-bold text-slate-500">Round 1 已完成</div>
                <Skeleton rows={3} />
              </div>
            </div>
            <div className="space-y-5">
              <Panel title="当前薪资区间">
                <Skeleton rows={4} />
              </Panel>
              <Panel title="风险提示">
                <Skeleton rows={5} />
              </Panel>
            </div>
          </div>
        </Panel>

        <div className="grid grid-cols-[minmax(0,1fr)_420px] gap-5">
          <Panel title="当前目标">
            <p className="p-5 text-sm leading-7 text-slate-400">稳住 HR 耐心，使用外部机会作为证据，把锚点推到 75K 以上。</p>
          </Panel>
          <Panel title="固定行动栏" className="border-cyan-300/30 bg-cyan-950/20">
            <div className="grid grid-cols-3 gap-3 p-5">
              <button className="h-14 rounded-2xl bg-cyan-300 font-black text-slate-950">还价</button>
              <button className="h-14 rounded-2xl bg-emerald-300 font-black text-slate-950">接受</button>
              <button className="h-14 rounded-2xl bg-rose-300 font-black text-slate-950">拒绝</button>
            </div>
          </Panel>
        </div>
      </div>
    </PreviewShell>
  );
}

function PreviewShell({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[32px] border border-slate-800 bg-[#090d14] p-6 shadow-2xl shadow-black/30">
      <div className="mb-5 flex items-end justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-100">{title}</h2>
          <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-400">{note}</p>
        </div>
        <div className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-black text-cyan-200">PC ONLY</div>
      </div>
      {children}
    </section>
  );
}

export default function LayoutPreviewPage() {
  return (
    <div className="min-h-screen bg-[#070a10] px-8 py-10 text-slate-100">
      <div className="mx-auto max-w-[1520px]">
        <div className="mb-9">
          <div className="text-xs font-black tracking-[0.28em] text-cyan-300">TEMPORARY DESIGN PREVIEW</div>
          <h1 className="mt-3 text-4xl font-black tracking-tight">/play PC 端布局预览</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
            已排除悬浮行动台。现在只保留两个真正不同的方向：一个是稳定工作台，一个是叙事时间轴。
          </p>
        </div>

        <div className="space-y-10">
          <CommandRoom />
          <TimelineConsole />
        </div>
      </div>
    </div>
  );
}
