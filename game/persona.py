"""HR Persona System — character generation for the hiring negotiation game.

Each negotiation randomly generates an HR persona that affects:
  - Opening offer strategy (lowball vs generous)
  - Concession rate (stubborn vs flexible)
  - Patience baseline and decay
  - Tone and speech patterns (reflected in deliberation + UI)

Four archetypes: old_fox, anxious, hard_ass, professional.
Each has parameter ranges; random jitter ensures replay variety.
"""

from __future__ import annotations

import random
import uuid
from dataclasses import dataclass, field


@dataclass
class HRPersona:
    persona_id: str
    archetype: str           # "old_fox" | "anxious" | "hard_ass" | "professional"
    name: str                # Display name in Chinese
    tagline: str             # One-line description for UI

    # ── Negotiation parameters (ranges, actual values set by template + jitter) ──
    opening_offer_pct: float = 0.75       # % of budget offered as opening (0.60-0.85)
    concession_rate: float = 0.06         # % of gap conceded per round (0.02-0.12)
    patience_baseline: float = 0.65       # Starting patience
    patience_decay_rate: float = 0.08     # Extra patience decay per neutral round
    final_offer_threshold: float = 0.82   # At what % of budget HR walks away

    # ── Tone / speech ──
    tone_style: str = "professional"      # "blunt" | "friendly" | "strategic" | "formal"
    greeting: str = ""
    pressure_phrase: str = ""
    accept_phrase: str = ""
    reject_phrase: str = ""

    # ── UI display ──
    avatar_expression: str = "neutral"    # "neutral" | "smiling" | "serious" | "stern"
    avatar_color: str = "#6366f1"         # Tailwind-compatible color


# ═══════════════════════════════════════════════════════════════════════════════
# Persona Templates
# ═══════════════════════════════════════════════════════════════════════════════

PERSONA_TEMPLATES: dict[str, dict] = {
    "old_fox": {
        "names": ["林薇", "张明远", "王敏", "陈志强"],
        "tagline": "老谋深算 · 不急于一时",
        "opening_offer_pct": (0.60, 0.70),
        "concession_rate": (0.03, 0.05),
        "patience_baseline": 0.80,
        "patience_decay_rate": 0.04,
        "final_offer_threshold": 0.88,
        "tone_style": "strategic",
        "greeting": "你的背景确实不错，不过我们现在也在面试其他几位候选人……",
        "pressure_phrase": "我不急，你可以慢慢考虑。不过这个岗位的 HC 不多了。",
        "accept_phrase": "欢迎加入团队。虽然预算上我压了一些，但你的能力我是认可的。",
        "reject_phrase": "差距太大了。如果你改变主意，随时联系我——如果岗位还在的话。",
        "avatar_expression": "smiling",
        "avatar_color": "#8b5cf6",
        "persona_instruction": (
            "老板说了，这个季度 HC 多但预算紧，每个 offer 都要压到最低。"
            "你先低开价试探对方底线，慢慢让步。要让对方觉得你手上还有其他候选人，"
            "不要表现出急需。即使对方开价在预算内，你也至少要还一轮价再接受。"
            "你的核心原则：宁可多谈3轮压5K，也不能一口答应显得预算很松。"
        ),
    },
    "anxious": {
        "names": ["李佳", "刘洋", "赵雪", "周涛"],
        "tagline": "急火攻心 · 越快越好",
        "opening_offer_pct": (0.78, 0.85),
        "concession_rate": (0.08, 0.12),
        "patience_baseline": 0.55,
        "patience_decay_rate": 0.12,
        "final_offer_threshold": 0.95,
        "tone_style": "friendly",
        "greeting": "很高兴你对我们团队感兴趣！流程我们可以加快，你什么时候能入职？",
        "pressure_phrase": "我们真的很希望你能来。如果薪资上有顾虑，我们还可以再讨论。",
        "accept_phrase": "太好了！我马上安排 Offer 审批。欢迎上车！",
        "reject_phrase": "太遗憾了……如果你改变主意，随时找我，我帮你加速流程。",
        "avatar_expression": "smiling",
        "avatar_color": "#10b981",
        "persona_instruction": (
            "这个岗位已经空了3个月了，再不招到人你今年的 OKR 要挂了。"
            "你对这个候选人很满意，想尽快锁定。如果对方要价在预算内，直接接受。"
            "即使要价略超预算，你也可以尝试说服老板追加。"
            "你的核心原则：快！宁可多花10K，也不能让候选人跑了重新招聘。"
        ),
    },
    "hard_ass": {
        "names": ["陈刚", "李强", "王磊", "张峰"],
        "tagline": "雷厉风行 · 不拖泥带水",
        "opening_offer_pct": (0.70, 0.80),
        "concession_rate": (0.00, 0.02),
        "patience_baseline": 0.40,
        "patience_decay_rate": 0.20,
        "final_offer_threshold": 0.80,
        "tone_style": "blunt",
        "greeting": "说正事吧。你的简历我看过了，这是我的报价，接不接受随你。",
        "pressure_phrase": "这就是最终数字，行就行，不行就算了。我不喜欢绕圈子。",
        "accept_phrase": "成交。希望你入职后的表现对得起你的要价。",
        "reject_phrase": "那就算了。祝你好运。",
        "avatar_expression": "stern",
        "avatar_color": "#ef4444",
        "persona_instruction": (
            "你是出了名的强硬谈判者。你不喜欢来回扯皮——直接给'最佳和最终报价'。"
            "你是团队里最看重内部公平的人，给一个人开太高会让其他人不满。"
            "如果有人觉得待遇不公平，你宁愿不招。对方如果要价高，你直接拒绝。"
            "你的核心原则：效率和公平大于一切。不要因为急着招人破坏内部薪资结构。"
        ),
    },
    "professional": {
        "names": ["陈雅文", "李明达", "张思远", "周静"],
        "tagline": "专业理性 · 追求双赢",
        "opening_offer_pct": (0.72, 0.78),
        "concession_rate": (0.05, 0.08),
        "patience_baseline": 0.65,
        "patience_decay_rate": 0.07,
        "final_offer_threshold": 0.90,
        "tone_style": "formal",
        "greeting": "根据你的背景和市场数据，我认为我们可以找到一个双方都满意的数字。",
        "pressure_phrase": "这是我的分析结果。我相信这个数字是公平的，但也愿意听取你的想法。",
        "accept_phrase": "很好的谈判过程。欢迎加入，期待共事。",
        "reject_phrase": "基于数据和双方立场，我们确实存在难以弥合的差距。祝后续顺利。",
        "avatar_expression": "neutral",
        "avatar_color": "#6366f1",
        "persona_instruction": (
            "你是数据驱动的 HR。每个报价都要有市场数据和内部对标的依据。"
            "你不喜欢情绪化谈判——一切用数字说话。候选人要价合理就接受，"
            "不合理就解释为什么不合理，然后给出你的数据来源。"
            "你的核心原则：公平、透明、有据可依。目标是让双方都觉得不亏。"
        ),
    },
}


# ═══════════════════════════════════════════════════════════════════════════════
# Generation
# ═══════════════════════════════════════════════════════════════════════════════


def generate_random_persona(seed: int | None = None) -> HRPersona:
    """Generate a random HR persona with parameter jitter for replay variety.

    Args:
        seed: Optional random seed for reproducibility.

    Returns:
        A fully initialized HRPersona instance.
    """
    rng = random.Random(seed)
    archetype = rng.choice(list(PERSONA_TEMPLATES.keys()))
    t = PERSONA_TEMPLATES[archetype]

    def _jitter(lo: float, hi: float) -> float:
        return round(rng.uniform(lo, hi), 3)

    name = rng.choice(t["names"])

    return HRPersona(
        persona_id=f"persona-{archetype}-{uuid.uuid4().hex[:4]}",
        archetype=archetype,
        name=name,
        tagline=t["tagline"],
        opening_offer_pct=_jitter(*t["opening_offer_pct"]),
        concession_rate=_jitter(*t["concession_rate"]),
        patience_baseline=t["patience_baseline"],
        patience_decay_rate=t["patience_decay_rate"],
        final_offer_threshold=t.get("final_offer_threshold", 0.85),
        tone_style=t["tone_style"],
        greeting=t["greeting"],
        pressure_phrase=t["pressure_phrase"],
        accept_phrase=t["accept_phrase"],
        reject_phrase=t["reject_phrase"],
        avatar_expression=t["avatar_expression"],
        avatar_color=t["avatar_color"],
    )


def get_persona_deliberation_prompt(persona: HRPersona) -> str:
    """Build the persona section of HR's deliberation Phase 1 prompt."""
    return f"""## 你的人设
你是 **{persona.name}**，一个 **{persona.tagline}** 的HR。
你的谈判风格：{_tone_description(persona.tone_style)}
你的经典开场："{persona.greeting}"

你的领导给你的指令：
"{PERSONA_TEMPLATES[persona.archetype]['persona_instruction']}"

你的核心参数（影响但不确定你的决策）：
- 首次开价倾向：预算的 {persona.opening_offer_pct:.0%}
- 每轮让步幅度：约 {persona.concession_rate:.0%}
- 初始耐心：{persona.patience_baseline:.0%}
- 预算上限使用率：{persona.final_offer_threshold:.0%}"""


def _tone_description(tone: str) -> str:
    return {
        "strategic": "话里有话，表面客气实则步步为营，喜欢制造'我不缺人'的氛围",
        "friendly": "热情直接，急于拉近距离，容易在压力下让步",
        "blunt": "简洁高效，不喜欢废话，直接亮底牌",
        "formal": "礼貌专业，每句话都有数据支撑，追求双赢",
    }.get(tone, "专业理性")
