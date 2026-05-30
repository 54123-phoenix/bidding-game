# Video Script

Target length: 3-5 minutes.

## Recording Setup

Open before recording:

- `http://localhost:3000`
- `http://localhost:3000/dashboard`
- `http://localhost:3000/play`
- A completed result page from demo history if available.

Recommended resolution:

- 1920x1080.
- Browser zoom 90%-100%.
- Hide bookmarks and unnecessary desktop icons.

## 0:00-0:20 Opening

Screen: Homepage.

Voiceover:

> 大家好，这是我们的智聘创新AI+大赛作品：薪资谈判教练。它不是一个简单的薪资计算器，而是帮助求职者在真实面试前练习 HR 压价、理解对方信念，并生成下次面试可用谈判备忘录的决策训练系统。

Show:

- `你的薪资谈判教练。`
- `过程教练 / 可解释 / 可带走`.

## 0:20-0:50 Problem And Product Loop

Screen: Homepage or PPT loop diagram.

Voiceover:

> 真实谈薪中，用户最难判断的是：什么时候坚持，什么时候让步，什么时候先补筹码，什么时候应该转向总包、职级或签字费。我们的系统将这个过程拆成一个可练习的闭环：输入个人档案和岗位，进入教练局，每轮获得行动建议，最后通过备忘录、策略树和 What-if 复盘带走具体策略。

## 0:50-1:25 Dashboard And Demo Data

Screen: Dashboard.

Voiceover:

> 为了保证演示稳定，我们内置了 25 场覆盖不同岗位、策略和结果的谈薪历史，包括后端、AI、产品、测试、安全、IoT、数据、全栈和算法等场景。即使后端或 LLM API 不可用，也可以展示完整的复盘闭环。

Show:

- Session list.
- Accepted and rejected examples.

## 1:25-2:20 Live Negotiation Coach

Screen: `/play`, negotiation phase.

Voiceover:

> 在谈判过程中，右侧的 CoachPanel 是核心。它会告诉用户下一步该怎么做，为什么这么做，以及 HR 当前如何看待候选人。例如当 HR 压价时，系统会提示先补充可验证筹码，不要立刻让步；当 HR 耐心偏低时，则建议转向成交条件。

Show:

- Coach verdict.
- Why.
- Recommended move.
- HR profile.
- Belief snapshot.

## 2:20-2:55 Chip Cards And Reputation

Screen: InfoCardHand.

Voiceover:

> 谈薪筹码卡用于训练用户如何组织真实经历。我们不鼓励虚构，而是提供强调、重组和弱化三种表达策略。每次使用都会影响 HR 信任，也会影响本地市场信誉分，让用户看到过度包装的长期后果。

Show:

- Chip card labels.
- Reputation badge.

## 2:55-3:50 Results Recap

Screen: Results page.

Voiceover:

> 谈判结束后，系统不只是给一个结果，而是生成可带走的谈判备忘录。用户可以看到自己的核心筹码、推荐锚点、底线区间和下次可直接使用的话术。策略树会展示每个关键选择如何改变 HR 信念和收益风险。

Show:

- Negotiation Memo tab.
- Strategy Tree tab.

## 3:50-4:25 What-if

Screen: What-if tab.

Voiceover:

> What-if 面板帮助用户探索平行选择。例如，如果第 2 轮少要 5K，成交概率会怎样变化？如果更强硬，薪资上限可能上升，但破裂风险也会上升。这里我们明确标注为近似推演，用于训练决策直觉，而不是严格重跑完整均衡模型。

Show:

- Slider.
- Strategy posture buttons.
- Four metric cards.

## 4:25-4:55 Architecture And Boundaries

Screen: PPT architecture slide or README.

Voiceover:

> 技术上，系统采用规则优先、LLM 可选的架构。核心状态、耐心、筹码、信誉和 What-if 都有确定性规则路径，LLM 主要用于解析和表达增强。我们也明确说明边界：它不是生产级招聘决策系统，不替代真实薪资调研，What-if 也不是严格均衡重算。

## 4:55-5:10 Closing

Screen: Homepage or final results page.

Voiceover:

> 总结来说，我们不是让 AI 替用户谈薪，而是把谈薪中的隐性判断显性化，让求职者在真实面试前完成一次低风险、高反馈的决策训练。

## Backup Short Version

If the video must be under 3 minutes:

1. Homepage positioning: 20s.
2. CoachPanel during negotiation: 60s.
3. Chip reputation: 30s.
4. Memo + StrategyTree + What-if: 60s.
5. Rule-first architecture and boundaries: 30s.
