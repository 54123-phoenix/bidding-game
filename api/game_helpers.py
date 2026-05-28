"""Small helpers for interactive game routes.

Keep these functions side-effect free so the route module can focus on API
orchestration and session persistence.
"""

from __future__ import annotations

import re
from dataclasses import asdict
from typing import Any


def serialize_pydantic(obj: Any) -> dict:
    """Safely serialize a Pydantic model, dataclass, or mapping."""
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    if hasattr(obj, "__dataclass_fields__"):
        return asdict(obj)
    return dict(obj) if obj else {}


def parse_candidate_message(
    action_type: str,
    salary_amount: int | None,
    message: str | None,
) -> tuple[str, int | None, str]:
    """Infer candidate action intent and salary from free text."""
    reasoning = "用户决策"
    if not message or not message.strip():
        return action_type, salary_amount, reasoning

    msg = message.strip().lower()
    reasoning = message.strip()

    if any(k in msg for k in ("接受", "同意", "好的", "可以", "没问题", "接受offer", "join", "accept")):
        action_type = "accept"
    elif any(k in msg for k in ("拒绝", "算了", "不考虑", "抱歉", "reject", "pass", "decline")):
        action_type = "reject"
    else:
        action_type = "counter_offer"

    match = re.search(r"(\d{2,3})\s*[k千K/]", message)
    if not match:
        match = re.search(r"(?:期望|底线|至少|不低于|要|给|到)\s*(\d{2,3})", message)
    if match:
        salary_amount = int(match.group(1))

    return action_type, salary_amount, reasoning


def serialize_state(state: Any) -> dict:
    """Serialize current game state for the frontend."""
    return {
        "round": state.round,
        "max_rounds": state.max_rounds,
        "public_offer": state.public_offer,
        "public_status": state.public_status,
        "competition_intensity": getattr(state, "competition_intensity", 0.5),
        "market_adjustment": getattr(state, "market_adjustment", 1.0),
        "scores": getattr(state, "scores", {}),
        "interviewer_recommendation": get_interviewer_rec(state),
        "candidate_reservation_wage": state.candidate_type.reservation_wage,
    }


def get_interviewer_rec(state: Any) -> str:
    """Extract interviewer recommendation from action history."""
    for action in reversed(state.action_history):
        if action.player == "interviewer":
            rec = action.params.get("recommendation", "")
            mapping = {
                "strong_hire": "强烈推荐",
                "hire": "推荐录用",
                "weak_hire": "勉强推荐",
                "no_hire": "不推荐",
            }
            return mapping.get(rec, rec or "待评估")
    return "待评估"


def build_prompt(state: Any, strategy: str = "balanced") -> str:
    """Build the prompt text for the user's decision."""
    offer = state.public_offer or 0
    market_label = (
        "候选人市场（对你有利）" if getattr(state, "market_adjustment", 1.0) > 1.05
        else "雇主市场（对企业有利）" if getattr(state, "market_adjustment", 1.0) < 0.95
        else "供需平衡"
    )

    if offer > 0:
        return (
            f"第 {state.round + 1} 轮谈判。当前桌上报价 {offer}K/年。"
            f"市场状态：{market_label}。"
            f"你的薪资底线：{state.candidate_type.reservation_wage}K/年。"
        )

    job = state.job
    salary_hint = ""
    if job.salary_range and len(job.salary_range) == 2:
        salary_hint = f"该岗位薪资范围 {job.salary_range[0]}K-{job.salary_range[1]}K/年。"
    strategy_hint = {
        "aggressive": "你采用激进策略，开局可以锚定高位。",
        "balanced": "你采用稳健策略，开局要价适中偏高。",
        "conservative": "你采用保守策略，开局要价务实。",
    }.get(strategy, "")
    return (
        f"HR 正在等待你的薪资期望。{salary_hint}"
        f"市场状态：{market_label}。{strategy_hint}"
        f"（你的薪资底线：{state.candidate_type.reservation_wage}K/年，但开局要价应高于底线）"
    )


def build_options(state: Any, strategy: str = "balanced") -> list[dict]:
    """Build valid actions based on current negotiation state."""
    offer = state.public_offer or 0
    reserve = state.candidate_type.reservation_wage
    job = state.job

    if job.salary_range and len(job.salary_range) == 2:
        _, job_high = job.salary_range
    else:
        job_high = 600

    options: list[dict] = []
    if offer > 0 and offer >= reserve * 0.85:
        options.append({"action": "accept", "label": f"接受报价 {offer}K/年", "color": "emerald"})

    if offer > 0:
        counter_targets = [
            max(offer + 5, int(offer * 1.08)),
            max(offer + 15, int(offer * 1.15)),
        ]
        for target in list(dict.fromkeys(counter_targets)):
            rounded = (target // 5) * 5
            options.append({"action": "counter_offer", "salary": rounded, "label": f"要价 {rounded}K/年", "color": "cyan"})
        options.append({"action": "reject", "label": "拒绝并退出谈判", "color": "red"})
        return options

    anchors = {
        "aggressive": (0.78, 0.95),
        "balanced": (0.62, 0.82),
        "conservative": (0.48, 0.68),
    }
    low_pct, high_pct = anchors.get(strategy, anchors["balanced"])
    targets = [max(int(job_high * low_pct), reserve + 10), max(int(job_high * high_pct), reserve + 10)]

    for target in list(dict.fromkeys(targets)):
        rounded = (target // 5) * 5
        options.append({"action": "counter_offer", "salary": rounded, "label": f"我要 {rounded}K/年", "color": "cyan"})
    return options


def outcome_message(outcome: str, state: Any) -> str:
    if outcome == "accepted":
        return f"谈判成功！最终薪资 {state.public_offer}K/年。恭喜！"
    if outcome == "rejected":
        return "谈判破裂。候选人与HR未能达成一致。"
    return "谈判超时。"
