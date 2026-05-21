"""POST /api/debrief/chat — data-grounded debrief advisor.

System prompt is built from actual game data — the AI only
answers based on computed results, never fabricates.
"""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(tags=["Debrief-Chat"])

# Import session store
from api.session_store import get_store

_store = get_store()
_SESSION_TTL = 3600 * 4  # 4 hours


class DebriefChatRequest(BaseModel):
    session_id: str = Field(description="Game session ID from /api/game/init")
    message: str = Field(default="", description="User's question (empty = auto-generate summary)")


def _build_system_prompt(session: dict) -> str:
    """Build a data-grounded system prompt from game results."""
    state = session["state"]
    fr = session.get("final_result") or {}
    eq_data = session.get("equilibrium") or {}
    actions = getattr(state, "action_history", [])

    # ── Outcome ──
    outcome = fr.get("outcome", state.public_status or "unknown")
    prob = fr.get("success_probability", 0)
    rounds = fr.get("negotiation_rounds", 0)
    salary = fr.get("final_salary", "无")

    # ── Interview scores ──
    scores = getattr(state, "scores", {}) or {}
    coding = scores.get("coding", "N/A")
    design = scores.get("system_design", "N/A")
    domain = scores.get("domain_expertise", "N/A")
    soft = scores.get("soft_skills", "N/A")
    growth = scores.get("growth_potential", "N/A")

    # ── Risk flags ──
    risk_flags = []
    for a in reversed(actions if hasattr(actions, '__iter__') else []):
        if getattr(a, "player", "") == "interviewer":
            risk_flags = getattr(a, "params", {}).get("risk_flags", [])
            break

    # ── Candidate / Job ──
    resume = session.get("resume")
    job = session.get("job")
    candidate_name = getattr(resume, "name", "候选人") if resume else "候选人"
    skills = getattr(resume, "skills", []) if resume else []
    education = getattr(resume, "education", []) if resume else []
    experience = getattr(resume, "experience", []) if resume else []
    job_title = getattr(job, "title", "") if job else ""
    job_company = getattr(job, "company", "") if job else ""
    job_level = getattr(job, "level", "") if job else ""
    job_skills = getattr(job, "required_skills", []) if job else []

    # ── Negotiation log ──
    neg_log = []
    for a in (actions if hasattr(actions, '__iter__') else []):
        player = getattr(a, "player", "")
        a_type = getattr(a, "action_type", "")
        reasoning = getattr(a, "reasoning", "")
        rnd = getattr(a, "round", 0)
        if player in ("candidate", "hr"):
            label = "你" if player == "candidate" else "HR"
            neg_log.append(f"第{rnd+1}轮 {label}: {a_type} — {reasoning[:100]}")

    # ── Equilibrium ──
    cs = eq_data.get("candidate_strategy", {}) or {}
    eq_ask = cs.get("opening_salary_ask", "N/A") if isinstance(cs, dict) else "N/A"
    eq_payoff = eq_data.get("candidate_expected_payoff", "N/A")

    # ── Build prompt ──
    return f"""你是职业博弈顾问。你只能基于以下数据回答用户的问题。不要编造任何信息。

== 博弈结果 ==
候选人: {candidate_name}
目标岗位: {job_title} @ {job_company} ({job_level})
结果: {outcome} | 成功率: {prob:.0%} | 谈判轮次: {rounds}
最终薪资: {salary}K/年

== 候选人技能 ==
{', '.join(skills[:15]) if skills else '无'}

== 岗位要求技能 ==
{', '.join(job_skills) if job_skills else '无'}

== 面试评分（5维） ==
编码能力: {coding} | 系统设计: {design} | 领域知识: {domain} | 软技能: {soft} | 成长潜力: {growth}

== 风险标志 ==
{chr(10).join(f'- {r}' for r in risk_flags) if risk_flags else '无显著风险'}

== 谈判记录 ==
{chr(10).join(neg_log[-8:]) if neg_log else '无'}

== 均衡策略 ==
理论最优要价: {eq_ask}K/年 | 均衡收益: {eq_payoff}

== 回答规则 ==
1. 只基于以上数据回答。不知道的事直接说不知道。
2. 给出具体、可操作的建议：学什么技能、投什么级别、薪资如何调整。
3. 如果用户被拒，分析被拒原因并按重要性排序。
4. 如果用户成交，分析成功因素并给出巩固建议。
5. 语气直接、客观、不安慰。中文回答，控制在300字以内。
6. 不要重复上面的数据原文，而是解释数据背后的含义。"""


@router.post("/debrief/chat")
async def debrief_chat(request: DebriefChatRequest):
    """Chat with the debrief advisor. Uses real game data as context."""
    session = _store.get(request.session_id)
    if not session:
        return {"status": "error", "message": "会话已过期，请重新开始"}

    try:
        system_prompt = _build_system_prompt(session)

        from llm.client import call_llm_chat, is_llm_available

        user_msg = request.message.strip() if request.message.strip() else "请分析这次谈判的结果，告诉我哪里做得好、哪里需要改进、下一步该怎么做。"

        if is_llm_available():
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_msg},
            ]
            reply = await call_llm_chat(messages, temperature=0.3, max_retries=2)
            reply = reply.strip()
        else:
            reply = _rule_based_reply(session, user_msg)

        return {"status": "ok", "reply": reply}
    except Exception as e:
        return {"status": "error", "message": str(e)}


def _rule_based_reply(session: dict, user_msg: str) -> str:
    """Fallback when LLM unavailable: template-driven reply from game data."""
    fr = session.get("final_result") or {}
    outcome = fr.get("outcome", "unknown")
    prob = fr.get("success_probability", 0)
    recommendation = fr.get("recommendation", "")

    state = session["state"]
    risk_flags = []
    for a in getattr(state, "action_history", []):
        if getattr(a, "player", "") == "interviewer":
            risk_flags = getattr(a, "params", {}).get("risk_flags", [])
            break

    if outcome != "accepted":
        lines = ["谈判未成功。主要原因分析："]
        if risk_flags:
            lines.append("")
            for i, r in enumerate(risk_flags[:5], 1):
                lines.append(f"{i}. {r}")
        lines.append("")
        lines.append(f"综合成功率仅{prob:.0%}，建议：")
        lines.append("- 补充岗位要求的核心技能后再投递")
        lines.append("- 考虑投递更低级别或技能要求更匹配的岗位")
        lines.append("- 调整薪资期望至市场合理范围")
    else:
        lines = [
            f"谈判成功！最终薪资{fr.get('final_salary', 'N/A')}K/年。",
            f"成功率{prob:.0%}。",
            "",
            recommendation if recommendation else "你的谈判策略与博弈均衡接近。",
        ]
    return "\n".join(lines)
