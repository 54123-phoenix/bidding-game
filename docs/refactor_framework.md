# Career Bidding Game — 重构框架设计文档

## 1. 重构目标

在保留全部现有功能（12维评估、贝叶斯博弈、均衡求解、反事实分析、AI辩论）的基础上，引入**信息战机制**、**平行宇宙可视化**、**实时倒计时**三大创意模块，将游戏从"回合制报价模拟器"升级为**"信息不对称下的谍战谈判 + 职业命运抉择"**。

---

## 2. 核心创意：信息战机制（InfoWar）

### 2.1 设计哲学

真实招聘谈判中，薪资数字只是表象，**信息操控**才是核心博弈。候选人可以选择透露或隐瞒关键信息，HR也会通过提问试探真相。信息战机制将这一层"暗博弈"显性化。

### 2.2 新增数据模型

```python
# models/schemas.py 扩展

class InformationCard(BaseModel):
    """候选人手中的信息牌 — 可透露、隐瞒或伪造。"""
    card_id: str
    card_type: Literal["outside_offer", "current_salary", "true_ability",
                       "family_burden", "other_interviews", "resignation_timeline"]
    true_value: str | int | float  # 真实值
    revealed_value: str | int | float | None = None  # 已透露的值（可能≠真实值）
    reveal_state: Literal["hidden", "revealed", "faked", "probed"] = "hidden"
    verifiability: float = Field(ge=0.0, le=1.0, description="HR验证此信息的概率")
    trust_impact: float = Field(ge=-1.0, le=1.0, description="若被发现造假，信任度变化")
    salary_impact: float = Field(ge=-50, le=50, description="对谈判薪资的边际影响(K)")
    description: str = ""  # 前端展示用描述


class TrustState(BaseModel):
    """双方信任度 — 信息战的核心状态变量。"""
    hr_trust_in_candidate: float = Field(default=0.5, ge=0.0, le=1.0)
    candidate_trust_in_hr: float = Field(default=0.5, ge=0.0, le=1.0)
    trust_history: list[dict] = Field(default_factory=list)
    red_flags: list[str] = Field(default_factory=list)  # 已发现的不一致


class InformationAction(BaseModel):
    """信息战动作 — 附加在AgentAction上的信息层。"""
    action_type: Literal["reveal", "conceal", "fake", "probe", "verify"]
    target_card: str | None = None  # 目标信息牌ID
    stated_value: str | int | float | None = None  # 声称的值
    actual_value: str | int | float | None = None  # 真实值（仅candidate知道）
    detected: bool = False  # 是否被识破
    detection_reason: str = ""


class GameState(BaseModel):
    # ... 现有字段保持不变 ...

    # 信息战新增字段
    candidate_hand: list[InformationCard] = Field(default_factory=list)
    trust_state: TrustState = Field(default_factory=TrustState)
    information_history: list[InformationAction] = Field(default_factory=list)
    hr_probe_count: int = 0  # HR已使用的试探次数
    candidate_reveal_count: int = 0  # 候选人已透露次数
```

### 2.3 信息牌类型设计

| 牌类型 | 真实值示例 | 可伪造 | 可验证性 | 信任影响 | 薪资影响 |
|--------|-----------|--------|----------|----------|----------|
| `outside_offer` | 阿里P7 80K | ✅ | 0.7 | -0.4（若假） | +15K |
| `current_salary` | 45K | ✅ | 0.9（流水） | -0.6（若假） | +8K |
| `true_ability` | 0.85 | ✅ | 0.3（面试） | -0.3 | +5K |
| `family_burden` | 高（房贷） | ✅ | 0.2 | -0.2 | -3K（压价筹码） |
| `other_interviews` | 3家进行中 | ✅ | 0.4 | -0.3 | +10K |
| `resignation_timeline` | 1个月 | ✅ | 0.6 | -0.3 | +5K |

### 2.4 信息战状态机

```
[谈判轮开始]
    │
    ▼
[玩家选择动作类型]
    │
    ├── 💰 报价动作（原有：offer / counter / accept / reject）
    │
    └── 🃏 信息动作（新增）
            │
            ├── reveal  ──→ 显示真实值，trust↑，对方belief更新
            ├── conceal ──→ 不透露，trust不变，对方可能probe
            ├── fake    ──→ 声称假值，若verify通过则获利，若失败trust暴跌
            └── probe   ──→ 反向提问对方（仅对HR），可能获取对方信息
    │
    ▼
[信息验证阶段]
    │
    ├── HR有一定概率验证candidate的声明
    │   ├── 验证通过 → trust↑，belief精确化
    │   └── 验证失败 → trust暴跌，red_flags++，可能直接reject
    │
    └── candidate感知HR的诚意（通过HR的concession rate推断）
    │
    ▼
[信任度更新]
    │
    ├── trust > 0.7 → "坦诚博弈"，双方更快接近均衡
    ├── trust 0.3-0.7 → "正常博弈"，标准谈判
    └── trust < 0.3 → "猜疑博弈"，HR倾向reject，candidate倾向overbid
    │
    ▼
[进入下一轮或终止]
```

### 2.5 引擎扩展

```python
# game/engine.py 扩展

class BiddingGameEngine:
    # ... 现有方法 ...

    async def _run_info_phase(self, state: GameState) -> list[AgentAction]:
        """每轮的信息战阶段 — 在报价动作之前执行。"""
        info_actions = []

        # Candidate选择是否出牌
        candidate = self._players["candidate"]
        info_action = await candidate.act_information(state)
        if info_action:
            info_actions.append(info_action)
            state.information_history.append(info_action)
            self._apply_information_action(state, info_action)

        # HR选择是否验证或试探
        hr = self._players["hr"]
        hr_info_action = await hr.act_information(state)
        if hr_info_action:
            info_actions.append(hr_info_action)
            state.information_history.append(hr_info_action)
            self._apply_information_action(state, hr_info_action)

        return info_actions

    def _apply_information_action(self, state: GameState, action: InformationAction):
        """应用信息战动作到游戏状态。"""
        if action.action_type == "reveal":
            self._handle_reveal(state, action)
        elif action.action_type == "fake":
            self._handle_fake(state, action)
        elif action.action_type == "probe":
            self._handle_probe(state, action)
        elif action.action_type == "verify":
            self._handle_verify(state, action)

    def _handle_fake(self, state: GameState, action: InformationAction):
        """处理伪造信息 — 核心博弈点。"""
        card = next((c for c in state.candidate_hand if c.card_id == action.target_card), None)
        if not card:
            return

        # HR验证概率 = 可验证性 × HR疑心度（与trust负相关）
        hr_suspicion = 1.0 - state.trust_state.hr_trust_in_candidate
        verify_prob = card.verifiability * (0.3 + 0.7 * hr_suspicion)

        if random.random() < verify_prob:
            action.detected = True
            action.detection_reason = f"HR通过{self._verify_method(card.card_type)}发现不一致"
            state.trust_state.hr_trust_in_candidate = max(0.0, state.trust_state.hr_trust_in_candidate + card.trust_impact)
            state.trust_state.red_flags.append(action.detection_reason)
        else:
            # 伪造成功！HR更新belief（基于假值）
            action.detected = False
            self._update_belief_from_fake(state, card, action.stated_value)
```

---

## 3. 核心创意：平行宇宙可视化（Parallel Universe）

### 3.1 设计哲学

谈判结束后，用户不仅想知道"我拿到了多少"，更想知道**"如果我做了不同选择，人生会怎样"**。平行宇宙将反事实分析从文字报告升级为可交互的叙事体验。

### 3.2 数据模型

```python
# models/schemas.py 新增

class UniverseTimeline(BaseModel):
    """单个平行宇宙的时间线。"""
    universe_id: str
    universe_label: str  # "接受首报价的宇宙"
    universe_emoji: str = "🌍"
    trigger_decision: str  # 触发此宇宙的关键决策
    timeline: list[TimelineEvent] = Field(default_factory=list)
    final_assessment: str = ""  # 3年后回顾评价
    regret_score: float = Field(ge=0.0, le=1.0)  # 后悔度


class TimelineEvent(BaseModel):
    """时间线上的一个事件。"""
    year: float  # 0.0 = 入职时, 1.0 = 1年后, etc.
    month: int
    event_type: Literal["salary_change", "promotion", "layoff", "ipo",
                        "team_change", "skill_growth", "regret_moment", "satisfaction"]
    title: str
    description: str
    salary: int | None = None
    level: str | None = None
    satisfaction: float | None = Field(ge=0.0, le=1.0)
    triggered_by: str = ""  # 由什么决策触发


class ParallelUniverseReport(BaseModel):
    """平行宇宙分析报告。"""
    base_universe: UniverseTimeline  # 实际发生的宇宙
    alternative_universes: list[UniverseTimeline]  # 3个平行宇宙
    comparison_chart: dict  # 对比数据
    narrative_summary: str  # LLM生成的叙事总结
```

### 3.3 平行宇宙生成规则

| 宇宙 | 触发条件 | 3年轨迹特征 |
|------|----------|------------|
| 🌍 **现实宇宙** | 实际发生的结果 | 基于实际结果模拟 |
| 🌌 **妥协宇宙** | "如果接受首报价" | 入职快但薪资低，1年后后悔，2年后跳槽 |
| 🔥 **硬刚宇宙** | "如果坚持多要10K" | 谈判破裂，去阿里，3年后P8，薪资反超 |
| 💎 **信息战宇宙** | "如果透露外部offer" | 薪资匹配成功，但HR对你有防备，晋升慢 |

### 3.4 前端可视化设计

```tsx
// 平行宇宙对比组件
<ParallelUniverseViewer>
  {/* 顶部：宇宙选择标签 */}
  <UniverseTabs universes={universes} activeId={activeId} onChange={setActiveId} />

  {/* 中部：时间线可视化 */}
  <TimelineChart>
    {/* X轴：时间（0-3年） */}
    {/* Y轴：薪资 + 满意度双轴 */}
    {/* 每条线代表一个宇宙 */}
    {/* 关键事件点用图标标记 */}
  </TimelineChart>

  {/* 底部：事件卡片流 */}
  <EventCards>
    {events.map(event => (
      <EventCard
        type={event.event_type}
        date={event.year}
        title={event.title}
        description={event.description}
        salary={event.salary}
        satisfaction={event.satisfaction}
      />
    ))}
  </EventCards>

  {/* 后悔度仪表盘 */}
  <RegretGauge score={regretScore} />
</ParallelUniverseViewer>
```

---

## 4. 轻量机制：实时倒计时（Real-time Pressure）

### 4.1 设计目标

不改动核心引擎架构，仅在前端增加**时间压力层**，提升演示时的紧张感。

### 4.2 机制设计

```tsx
// 实时倒计时组件
interface RoundTimerProps {
  duration: number;        // 本轮总时长（秒）
  warningAt: number;       // 警告阈值（秒）
  onExpire: () => void;    // 超时回调
  hrPatience: number;      // HR耐心（影响倒计时速度）
}

// 倒计时规则：
// - 基础时长：30秒/轮
// - HR耐心 < 0.5 时：时长缩短至20秒
// - HR耐心 < 0.2 时：时长缩短至15秒，且最后5秒有红色闪烁警告
// - 用户选择"思考"动作：暂停倒计时，但消耗HR耐心
// - 超时未决策：自动执行"等待"动作，HR耐心-0.1
```

### 4.3 突发事件（随机）

```typescript
// 5%概率每轮触发
const RANDOM_EVENTS: RandomEvent[] = [
  {
    id: "budget_cut",
    title: "预算削减",
    description: "HR接到通知，该岗位预算临时削减10%",
    effect: { type: "hr_budget", value: -0.1 },
    duration: 5, // 事件展示5秒
  },
  {
    id: "competitor_hired",
    title: "竞争对手入职",
    description: "另一位候选人接受了更低薪资，HR的议价底气增强",
    effect: { type: "hr_patience", value: +0.15 },
    duration: 5,
  },
  {
    id: "market_heating",
    title: "市场升温",
    description: "行业薪资报告发布，你的技能溢价上涨",
    effect: { type: "market_adjustment", value: +0.08 },
    duration: 5,
  },
];
```

---

## 5. 游戏风格定位："赛博谍战"（Cyber Espionage）

### 5.1 风格关键词

- **信息不对称** → 视觉化：半透明的"已知/未知"区域
- **心理博弈** → 视觉化：心跳线、信任度仪表盘
- **高风险决策** → 视觉化：红色警告、倒计时
- **职业命运** → 视觉化：平行宇宙分岔路

### 5.2 色彩系统微调

```css
/* 在现有暗色主题基础上增加信息战专用色 */
:root {
  /* 现有色保持不变 */
  --bg-canvas: #080a10;
  --accent-cyan: #22d3ee;
  /* ... */

  /* 新增：信息战色系 */
  --info-war-secret: #ff3366;      /* 秘密/隐藏 */
  --info-war-reveal: #00ff88;      /* 已透露 */
  --info-war-fake: #ffaa00;        /* 伪造/风险 */
  --info-war-probe: #aa66ff;       /* 试探 */
  --trust-high: #00ff88;
  --trust-mid: #ffaa00;
  --trust-low: #ff3366;
  --timer-safe: #22d3ee;
  --timer-warning: #ffaa00;
  --timer-danger: #ff3366;
}
```

### 5.3 关键视觉元素

| 元素 | 设计风格 |
|------|----------|
| 信息牌 | 扑克牌样式，背面有锁图标，正面显示内容 |
| 信任度 | 心电图式波动线，高信任为绿色平稳，低信任为红色剧烈波动 |
| 倒计时 | 圆形进度条，外圈发光，最后5秒屏幕边缘红色脉冲 |
| 平行宇宙 | 分岔路口动画，每个宇宙用不同色调区分 |
| 突发事件 | 全屏遮罩+打字机效果通知，类似《赛博朋克2077》的来电 |

---

## 6. 重构实施路线图

### Phase 1: 数据模型扩展（1天）

- [ ] 扩展 `models/schemas.py`：新增 `InformationCard`, `TrustState`, `InformationAction`, `UniverseTimeline` 等
- [ ] 更新 `GameState` 和 `GameResult` 包含信息战字段
- [ ] 更新 Pydantic 序列化/反序列化

### Phase 2: 引擎重构（2天）

- [ ] 在 `game/engine.py` 中插入 `_run_info_phase()` 调用点
- [ ] 实现 `CandidatePlayer.act_information()` 和 `HRPlayer.act_information()`
- [ ] 实现信息验证逻辑（`_handle_fake`, `_handle_verify`）
- [ ] 更新信念更新系统，考虑信息战影响
- [ ] 更新耐心系统，信息战动作影响耐心

### Phase 3: 前端手牌UI（2天）

- [ ] 创建 `InfoCardHand.tsx` 组件：手牌展示区
- [ ] 创建 `TrustMeter.tsx` 组件：信任度可视化
- [ ] 创建 `InfoActionPanel.tsx` 组件：信息动作选择
- [ ] 修改 `play/page.tsx`：在报价动作前插入信息战阶段
- [ ] 修改 `ChatBubble.tsx`：显示信息战动作记录

### Phase 4: 平行宇宙可视化（2天）

- [ ] 后端：`counterfactual/engine.py` 生成 `ParallelUniverseReport`
- [ ] 前端：创建 `ParallelUniverseViewer.tsx`
- [ ] 前端：创建 `TimelineChart.tsx`（用 Recharts 或 D3）
- [ ] 前端：创建 `EventCard.tsx`
- [ ] 集成到结果页面

### Phase 5: 实时倒计时（1天）

- [ ] 创建 `RoundTimer.tsx` 组件
- [ ] 创建 `RandomEventPopup.tsx` 组件
- [ ] 集成到 `NegotiationArena.tsx`

### Phase 6: 风格统一与 polish（1天）

- [ ] 统一新增组件的视觉风格
- [ ] 添加信息战教学引导（首次游玩）
- [ ] 更新成就系统，增加信息战相关成就
- [ ] 测试全部流程

**总计：约9天（可压缩至7天，如果Phase 4和5并行）**

---

## 7. 兼容性保证

### 7.1 向后兼容

- 所有现有API端点保持不变
- 新增端点：
  - `POST /api/game/act_info` — 信息战动作
  - `GET /api/universe/report` — 平行宇宙报告
- 前端路由不变，仅在 `/play` 页面内新增组件

### 7.2 降级策略

- 如果信息战引擎出错，自动降级为纯报价博弈（现有逻辑）
- 如果LLM不可用，信息战动作用规则引擎生成
- 平行宇宙报告如果生成失败，显示简化版对比表格

---

## 8. 大赛演示脚本（配合重构后）

**开场（15秒）**：
> "这不是薪资计算器，这是一场谍战。你手里有6张信息牌，HR不知道哪些是真的。"

**演示信息战（30秒）**：
1. 展示手牌区域："我有外部offer，但我可以选择透露、隐瞒，或者...伪造"
2. 选择"伪造"：声称有阿里P7 offer 90K
3. HR选择"验证"... 验证失败！
4. 信任度暴跌，HR直接进入reject模式

**演示平行宇宙（20秒）**：
> "如果我当时说了实话呢？"
展示三个宇宙的时间线对比，现实宇宙薪资65K，硬刚宇宙虽然谈判破裂但3年后在阿里P8薪资90K

**收尾（10秒）**：
> "每一次谈判，都是一次职业命运的抉择。"
