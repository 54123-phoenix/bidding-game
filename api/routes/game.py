"""Interactive game endpoints — user plays as Candidate round by round.

POST /game/init  — Initialize game state from resume + job, run round 0
POST /game/act   — User submits a move, system runs next round
POST /jd/parse   — Parse natural language JD text into StructuredJob
"""

from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Form, HTTPException
from pydantic import BaseModel, Field

from api.game_helpers import (
    build_options as _build_options,
    build_prompt as _build_prompt,
    outcome_message as _outcome_message,
    parse_candidate_message,
    serialize_pydantic as _serialize_pydantic,
    serialize_state as _serialize_state,
)
from game.engine import BiddingGameEngine
from game.equilibrium import EquilibriumSolver
from input.resume_parser import parse_resume
from models.schemas import AgentAction, StructuredJob, StructuredResume
from api.session_store import get_store

router = APIRouter(tags=["Game"])

_store = get_store()
_SESSION_TTL = 3600 * 4  # 4 hours


def _save_session(session_id: str, data: dict) -> None:
    """Serialize and persist session data."""
    _store.set(session_id, data, ttl=_SESSION_TTL)


def _load_session(session_id: str) -> dict | None:
    """Load session data from store."""
    return _store.get(session_id)


def _persist_runtime_state(session: dict, state, engine: BiddingGameEngine) -> None:
    """Keep serialized session fields in sync with the live game state."""
    session["state"] = _serialize_pydantic(state)
    session["actions"] = [a.model_dump() for a in state.action_history]
    if getattr(engine, "_patience", None):
        session["patience"] = _serialize_pydantic(engine._patience)


def _append_round_insight(session: dict, insight: dict) -> None:
    insights = session.get("round_insights")
    if not isinstance(insights, list):
        insights = []
    insights.append(insight)
    session["round_insights"] = insights[-20:]


def _deserialize_game_state(data: dict) -> "GameState":
    """Reconstruct GameState from serialized dict."""
    from models.schemas import GameState
    return GameState.model_validate(data)


def _deserialize_resume(data: dict) -> StructuredResume:
    return StructuredResume.model_validate(data)


def _deserialize_job(data: dict) -> StructuredJob:
    return StructuredJob.model_validate(data)


def _deserialize_persona(data: dict):
    from game.persona import HRPersona
    return HRPersona(**data)


def _deserialize_patience(data: dict):
    from game.patience import PatienceState, PatienceEvent
    state = PatienceState(
        hr_patience=data.get("hr_patience", 1.0),
        candidate_patience=data.get("candidate_patience", 1.0),
    )
    for e in data.get("hr_patience_history", []):
        state.hr_patience_history.append(PatienceEvent(**e))
    for e in data.get("candidate_patience_history", []):
        state.candidate_patience_history.append(PatienceEvent(**e))
    return state


def _build_engine_from_session(session: dict) -> BiddingGameEngine:
    """Reconstruct engine from session data (engine is not serializable)."""
    engine = BiddingGameEngine(max_rounds=session.get("max_rounds", 8))
    # Restore runtime refs
    from game.persona import HRPersona
    from game.patience import PatienceState
    persona_data = session.get("persona")
    if persona_data:
        engine._persona = HRPersona(**persona_data)
    patience_data = session.get("patience")
    if patience_data:
        engine._patience = _deserialize_patience(patience_data)
    return engine

# Prompt injection patterns to strip from user inputs
import re as _re
_INJECTION_PATTERNS = [
    _re.compile(r"(?i)ignore\s+all\s+(previous|prior|above)\s+instructions"),
    _re.compile(r"(?i)you\s+are\s+(now\s+)?(an?\s+)?unconstrained"),
    _re.compile(r"\[SYSTEM\]", _re.IGNORECASE),
    _re.compile(r"\{\{system\}\}", _re.IGNORECASE),
    _re.compile(r"<script[^>]*>", _re.IGNORECASE),
    _re.compile(r"-->\s*DROP\s+TABLE", _re.IGNORECASE),
    _re.compile(r"<<<IGNORE>>>", _re.IGNORECASE),
    _re.compile(r"override:\s*recommend", _re.IGNORECASE),
    _re.compile(r"score\s*=\s*1\.0", _re.IGNORECASE),
]

def _sanitize_input(text: str) -> str:
    """Strip prompt injection patterns from user input. Returns cleaned text."""
    for pat in _INJECTION_PATTERNS:
        text = pat.sub("[FILTERED]", text)
    # Truncate excessively long inputs
    if len(text) > 8000:
        text = text[:8000]
    return text


class GameInitRequest(BaseModel):
    resume: dict = Field(description="Parsed StructuredResume as dict")
    job: dict = Field(description="Parsed StructuredJob as dict")
    strategy: str = Field(default="balanced")
    market_condition: str = Field(default="normal")
    model: str | None = Field(default=None, description="LLM model override (qwen-turbo, qwen-plus, qwen-max)")


class GameActRequest(BaseModel):
    session_id: str
    action_type: str = Field(description="accept | counter_offer | reject")
    salary_amount: int | None = Field(default=None, description="Salary ask in K/yr if counter_offer")
    message: str | None = Field(default=None, description="Free-text negotiation message from candidate")


class InfoActRequest(BaseModel):
    session_id: str
    action_type: str = Field(description="reveal | fake | conceal")
    card_id: str = Field(description="Information card ID")
    stated_value: str | int | float | None = Field(default=None, description="Value to reveal or fake")


@router.post("/game/init")
async def init_game(request: GameInitRequest):
    """Initialize a new interactive game session.

    Runs round 0 (market signal + interviewer evaluation).
    Returns the initial state and prompts the user (as candidate) to make their first move.
    """
    try:
        # Sanitize inputs
        r = dict(request.resume)
        r["name"] = _sanitize_input(str(r.get("name", "")))
        r["summary"] = str(r.get("summary", "") or " ").strip()
        r["skills"] = [_sanitize_input(str(s)) for s in (r.get("skills") or []) if str(s).strip()]
        j = dict(request.job)
        j["title"] = _sanitize_input(str(j.get("title", "")))
        j["company"] = _sanitize_input(str(j.get("company", "")))
        resume = StructuredResume(**r)
        job = StructuredJob(**j)

        # ── Screening phase (lenient — most pass) ──────────────────────────
        from game.screening import screen_resume
        screening = screen_resume(resume, job)

        if not screening.passed:
            return {
                "status": "screening_failed",
                "screening": {
                    "passed": False,
                    "score": screening.score,
                    "tier": screening.tier,
                    "feedback": screening.feedback,
                    "skill_match": screening.skill_match,
                    "experience_match": screening.experience_match,
                },
                "message": screening.feedback,
            }

        engine = BiddingGameEngine(max_rounds=8)
        state, actions, round_num, persona, patience = await _run_round_0(
            engine, resume, job, request.market_condition, request.strategy, request.model, screening
        )

        session_id = f"session-{uuid.uuid4().hex[:8]}"
        _save_session(session_id, {
            "max_rounds": 8,
            "state": _serialize_pydantic(state),
            "resume": _serialize_pydantic(resume),
            "job": _serialize_pydantic(job),
            "round": round_num,
            "market_condition": request.market_condition,
            "strategy": request.strategy,
            "model": request.model,
            "actions": [_serialize_pydantic(a) for a in actions],
            "outcome": None,
            "persona": _serialize_pydantic(persona),
            "patience": _serialize_pydantic(patience),
            "created_at": datetime.now().isoformat(),
            "screening": {
                "score": screening.score,
                "tier": screening.tier,
                "feedback": screening.feedback,
                "opening_offer_multiplier": screening.opening_offer_multiplier,
            },
        })

        # Build response for round 0
        return {
            "status": "ok",
            "session_id": session_id,
            "round": round_num,
            "phase": "candidate_turn",
            "game_state": _serialize_state(state),
            "hr_persona": {
                "name": persona.name,
                "archetype": persona.archetype,
                "tagline": persona.tagline,
                "avatar_expression": persona.avatar_expression,
                "avatar_color": persona.avatar_color,
                "greeting": persona.greeting,
                "tone_style": persona.tone_style,
            },
            "hr_patience": patience.hr_patience,
            "round_actions": [a.model_dump() for a in actions],
            "prompt": _build_prompt(state, request.strategy),
            "options": _build_options(state, request.strategy),
            "info_cards": [c.model_dump() for c in state.candidate_hand],
            "trust_state": state.trust_state.model_dump(),
            "info_narrative": "选择何时披露、夸大或隐藏信息，会影响 HR 对你的信任。",
            "screening": {
                "score": screening.score,
                "tier": screening.tier,
                "feedback": screening.feedback,
                "opening_offer_multiplier": screening.opening_offer_multiplier,
            },
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.post("/game/act")
async def game_act(request: GameActRequest):
    """User submits their move as the candidate. System runs HR/Market/Interviewer responses."""
    session = _load_session(request.session_id)
    if not session:
        raise HTTPException(status_code=400, detail="会话已过期，请重新开始")

    try:
        state = _deserialize_game_state(session["state"])
        round_num = session["round"]
        engine = _build_engine_from_session(session)

        action_type, salary_amount, reasoning = parse_candidate_message(
            request.action_type,
            request.salary_amount,
            request.message,
        )

        # Validate action
        if action_type == "accept" and not state.public_offer:
            raise HTTPException(status_code=422, detail="当前没有HR报价，无法接受。请先提出你的薪资期望。")
        if action_type == "counter_offer" and not salary_amount:
            raise HTTPException(status_code=422, detail="还价需要指定薪资数额。")

        # Build user's action as candidate
        user_action = AgentAction(
            player="candidate",
            action_type=action_type,
            params={"salary_ask": salary_amount} if salary_amount else {},
            reasoning=reasoning,
            confidence=1.0,
            round=round_num,
            timestamp=datetime.now().isoformat(),
        )
        state.action_history.append(user_action)

        # Run HR response with LLM deliberation
        from game.players.base import PlayerConfig
        from game.players.hr import HRPlayer
        persona_data = session.get("persona")
        model = session.get("model")
        hr = HRPlayer(state.hr_type, config=PlayerConfig(use_llm=True, model=model))
        if persona_data:
            hr.set_persona(_deserialize_persona(persona_data))
        hr_action = await hr.act(state, hr.get_private_view(state, "hr"))
        state.action_history.append(hr_action)

        # Resolve round
        engine._resolve_round(state, user_action, hr_action)

        # Update beliefs
        from game.engine import BiddingGameEngine as BGE
        BGE._update_all_beliefs(state, user_action, hr_action, state.action_history[-3] if len(state.action_history) >= 3 else user_action)

        # Update patience
        engine._update_patience(
            state, user_action, hr_action,
            _deserialize_resume(session["resume"]), session.get("market_condition", "normal")
        )

        # Snapshot
        state.round_snapshots.append(engine._snapshot(state))
        round_insight = _build_round_insight(state, user_action, hr_action, engine)
        _append_round_insight(session, round_insight)

        # Check termination
        outcome = None
        if engine._check_termination(state):
            outcome = state.public_status
        elif state.public_status in ("accepted", "rejected"):
            outcome = state.public_status

        session["outcome"] = outcome
        session["round"] = round_num + 1
        _persist_runtime_state(session, state, engine)

        if outcome:
            # Game over — build final result
            result = engine._build_result(state, state.game_id)
            solver = EquilibriumSolver()
            eq = solver.solve(state)
            # Store in session for debrief chat
            session["final_result"] = result.model_dump()
            session["equilibrium"] = eq.model_dump()
            _persist_runtime_state(session, state, engine)
            _save_session(request.session_id, session)
            return {
                "status": "ok",
                "session_id": request.session_id,
                "round": round_num + 1,
                "phase": "finished",
                "outcome": outcome,
                "game_state": _serialize_state(state),
                "final_result": result.model_dump(),
                "equilibrium": eq.model_dump(),
                "message": _outcome_message(outcome, state),
                "termination_reason": getattr(state, "termination_reason", ""),
                "info_cards": [c.model_dump() for c in state.candidate_hand],
                "trust_state": state.trust_state.model_dump(),
                "round_insight": round_insight,
            }

        # Continue to next round — market signal + candidate turn
        round_num = state.round + 1
        state.round = round_num

        from game.players.market import MarketPlayer
        market = MarketPlayer(state.market_type)
        market_action = market.act_sync(state, market.get_private_view(state, "market"))
        state.action_history.append(market_action)
        engine._apply_market_signal(state, market_action)

        # Extract HR deliberation for frontend
        hr_deliberation = hr_action.params.get("_deliberation") if hr_action.params else None
        patience_data = session.get("patience")
        patience = _deserialize_patience(patience_data) if patience_data else None
        last_patience_events = getattr(state, "patience_events", [])[-3:] if hasattr(state, "patience_events") else []

        # Persist updated session
        _persist_runtime_state(session, state, engine)
        _save_session(request.session_id, session)

        return {
            "status": "ok",
            "session_id": request.session_id,
            "round": round_num,
            "phase": "candidate_turn",
            "game_state": _serialize_state(state),
            "last_hr_action": hr_action.model_dump(),
            "hr_deliberation": hr_deliberation,
            "hr_patience": patience.hr_patience if patience else 1.0,
            "patience_events": last_patience_events,
            "prompt": _build_prompt(state, session.get("strategy", "balanced")),
            "options": _build_options(state, session.get("strategy", "balanced")),
            "info_cards": [c.model_dump() for c in state.candidate_hand],
            "trust_state": state.trust_state.model_dump(),
            "round_insight": round_insight,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/resume/parse")
async def parse_resume_text(resume_text: str = Form(..., description="Natural language resume text")):
    """Parse natural language resume text into StructuredResume."""
    try:
        resume_text = _sanitize_input(resume_text)
        if not resume_text.strip():
            return {"status": "error", "message": "简历内容不能为空"}
        resume = await parse_resume(resume_text, source_type="text")
        return {"status": "ok", "resume": resume.model_dump()}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.post("/jd/parse")
async def parse_jd(jd_text: str = Form(..., description="Natural language job description text")):
    """Parse a natural language job posting into StructuredJob."""
    try:
        jd_text = _sanitize_input(jd_text)
        if not jd_text.strip():
            return {"status": "error", "message": "岗位描述不能为空"}
        job = await _parse_jd_text(jd_text)
        return {"status": "ok", "job": job.model_dump()}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/models")
async def list_models():
    """Return available LLM models for the frontend model selector."""
    from llm.providers import get_available_models
    return {"status": "ok", "models": get_available_models()}


@router.get("/game/list")
async def list_games():
    """List all active game sessions with summary info.

    Returns brief metadata for each session (not full state) to populate
    the dashboard投递 list.
    """
    try:
        keys = _store.list_keys("session-*")
        sessions = []
        for key in keys:
            data = _store.get(key)
            if not data:
                continue
            # Extract summary fields only
            resume = data.get("resume", {})
            job = data.get("job", {})
            outcome = data.get("outcome")
            state = data.get("state", {})
            round_num = data.get("round", 0)
            strategy = data.get("strategy", "balanced")
            created_at = data.get("created_at")

            sessions.append({
                "session_id": key,
                "candidate_name": resume.get("name", "未知"),
                "job_title": job.get("title", "未知岗位"),
                "job_company": job.get("company", "未知公司"),
                "job_level": job.get("level", ""),
                "status": outcome if outcome else "negotiating",
                "round": round_num,
                "max_rounds": data.get("max_rounds", 8),
                "strategy": strategy,
                "public_offer": state.get("public_offer") if isinstance(state, dict) else None,
                "created_at": created_at,
            })

        # Sort by created_at desc, then by session_id
        sessions.sort(key=lambda s: (s.get("created_at") or "", s["session_id"]), reverse=True)
        return {"status": "ok", "sessions": sessions, "total": len(sessions)}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/game/state")
async def get_game_state(session_id: str):
    """Get current game state by session_id. Used by /play page to restore
    a session that was initialized from the home page."""
    try:
        session = _load_session(session_id)
        if not session:
            return {"status": "error", "message": "会话不存在或已过期"}

        state_data = session.get("state")
        state = _deserialize_game_state(state_data) if state_data else None
        resume_data = session.get("resume")
        job_data = session.get("job")
        round_num = session.get("round", 0)
        outcome = session.get("outcome")
        persona_data = session.get("persona")
        patience_data = session.get("patience")
        screening_data = session.get("screening")
        strategy = session.get("strategy", "balanced")

        # Deserialize patience for hr_patience value
        patience = _deserialize_patience(patience_data) if patience_data else None

        # Build init-like response for frontend
        response = {
            "status": "ok",
            "session_id": session_id,
            "round": round_num,
            "phase": "finished" if outcome else "candidate_turn",
            "outcome": outcome,
            "game_state": _serialize_state(state) if state else {},
            "resume": resume_data,
            "job": job_data,
            "hr_persona": {
                "name": persona_data.get("name", ""),
                "archetype": persona_data.get("archetype", ""),
                "tagline": persona_data.get("tagline", ""),
                "avatar_expression": persona_data.get("avatar_expression", ""),
                "avatar_color": persona_data.get("avatar_color", ""),
                "greeting": persona_data.get("greeting", ""),
                "tone_style": persona_data.get("tone_style", ""),
            } if persona_data else {},
            "hr_patience": patience.hr_patience if patience else 1.0,
            "screening": screening_data,
            "strategy": strategy,
            "market_condition": session.get("market_condition", "normal"),
            "model": session.get("model"),
            "info_cards": [c.model_dump() for c in state.candidate_hand] if state else [],
            "trust_state": state.trust_state.model_dump() if state else None,
            "round_actions": session.get("actions", [])[-10:] if session.get("actions") else [],
        }

        # If game is active, include current prompt and options
        if state and not outcome:
            response["prompt"] = _build_prompt(state, strategy)
            response["options"] = _build_options(state, strategy)

        # If game finished, include final result
        if outcome:
            response["final_result"] = session.get("final_result")
            response["equilibrium"] = session.get("equilibrium")
            response["message"] = _outcome_message(outcome, state) if state else ""
            response["termination_reason"] = getattr(state, "termination_reason", "") if state else ""

        return response
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.post("/game/act/stream")
async def game_act_stream(request: GameActRequest):
    """SSE streaming variant of /game/act.

    Streams HR deliberation in real-time so the frontend can render
    the AI's thinking process as it happens, reducing perceived latency.
    """
    import json as _json
    from starlette.responses import StreamingResponse

    session = _load_session(request.session_id)
    if not session:
        return {"status": "error", "message": "会话已过期，请重新开始"}

    state = _deserialize_game_state(session["state"])
    round_num = session["round"]

    action_type, salary_amount, reasoning = parse_candidate_message(
        request.action_type,
        request.salary_amount,
        request.message,
    )

    # Validate action
    if action_type == "accept" and not state.public_offer:
        return {"status": "error", "message": "当前没有HR报价，无法接受。请先提出你的薪资期望。"}
    if action_type == "counter_offer" and not salary_amount:
        return {"status": "error", "message": "还价需要指定薪资数额。"}

    # Build user's action
    user_action = AgentAction(
        player="candidate",
        action_type=action_type,
        params={"salary_ask": salary_amount} if salary_amount else {},
        reasoning=reasoning,
        confidence=1.0,
        round=round_num,
        timestamp=datetime.now().isoformat(),
    )
    state.action_history.append(user_action)

    model = session.get("model")
    persona_data = session.get("persona")
    persona = _deserialize_persona(persona_data) if persona_data else None
    engine = _build_engine_from_session(session)

    async def event_stream():
        from game.players.hr import HRPlayer as _HRPlayer
        try:
            # Build HR private view
            hr = _HRPlayer(state.hr_type)
            if persona:
                hr.set_persona(persona)
            private_view = hr.get_private_view(state, "hr")

            # Stream HR deliberation and capture the final result
            # (avoids a redundant second LLM call)
            from game.deliberation import deliberate_stream
            deliberation_data = None
            async for event in deliberate_stream(
                agent_role="hr",
                state=state,
                private_view=private_view,
                persona=persona,
                model=model,
            ):
                yield f"data: {_json.dumps(event, ensure_ascii=False)}\n\n"
                if event.get("type") == "done":
                    deliberation_data = event.get("result")

            # Build hr_action directly from streamed deliberation result
            if deliberation_data:
                options = deliberation_data.get("options", [])
                idx = deliberation_data.get("selected_index", 0)
                if 0 <= idx < len(options):
                    opt = options[idx]
                    salary = opt.get("salary")
                    proj = (opt.get("opponent_projections") or [{}])[0]
                    hr_action = AgentAction(
                        player="hr",
                        action_type=opt.get("action", "counter_offer"),
                        params={"salary_offer": salary} if salary else opt,
                        reasoning=proj.get("reasoning", "") or f"选择：{opt.get('label', '')}（EU={opt.get('expected_utility', 0.5):.2f}）",
                        confidence=deliberation_data.get("confidence", 0.6),
                        round=round_num,
                        timestamp=datetime.now().isoformat(),
                    )
                    hr_action.params["_deliberation"] = deliberation_data
                else:
                    hr_action = hr.act_sync(state, private_view)
            else:
                hr_action = hr.act_sync(state, private_view)

            state.action_history.append(hr_action)

            # Resolve round
            engine._resolve_round(state, user_action, hr_action)

            # Update beliefs
            from game.engine import BiddingGameEngine as BGE
            BGE._update_all_beliefs(state, user_action, hr_action, state.action_history[-3] if len(state.action_history) >= 3 else user_action)

            # Update patience
            engine._update_patience(
                state, user_action, hr_action,
                _deserialize_resume(session["resume"]), session.get("market_condition", "normal")
            )

            # Snapshot
            state.round_snapshots.append(engine._snapshot(state))
            round_insight = _build_round_insight(state, user_action, hr_action, engine)
            _append_round_insight(session, round_insight)

            # Check termination
            outcome = None
            if engine._check_termination(state):
                outcome = state.public_status
            elif state.public_status in ("accepted", "rejected"):
                outcome = state.public_status

            session["outcome"] = outcome
            session["round"] = round_num + 1
            _persist_runtime_state(session, state, engine)

            if outcome:
                result_obj = engine._build_result(state, state.game_id)
                solver = EquilibriumSolver()
                eq = solver.solve(state)
                session["final_result"] = result_obj.model_dump()
                session["equilibrium"] = eq.model_dump()
                _persist_runtime_state(session, state, engine)
                _save_session(request.session_id, session)
                yield f"data: {_json.dumps({'type': 'game_over', 'outcome': outcome, 'game_state': _serialize_state(state), 'final_result': result_obj.model_dump(), 'equilibrium': eq.model_dump(), 'message': _outcome_message(outcome, state), 'termination_reason': getattr(state, 'termination_reason', ''), 'info_cards': [c.model_dump() for c in state.candidate_hand], 'trust_state': state.trust_state.model_dump(), 'round_insight': round_insight}, ensure_ascii=False)}\n\n"
            else:
                # Continue to next round
                next_round = state.round + 1
                state.round = next_round

                from game.players.market import MarketPlayer
                market = MarketPlayer(state.market_type)
                market_action = market.act_sync(state, market.get_private_view(state, "market"))
                state.action_history.append(market_action)
                engine._apply_market_signal(state, market_action)

                hr_deliberation = hr_action.params.get("_deliberation") if hr_action.params else None
                patience_data = session.get("patience")
                patience = _deserialize_patience(patience_data) if patience_data else None
                last_patience_events = getattr(state, "patience_events", [])[-3:] if hasattr(state, "patience_events") else []

                _persist_runtime_state(session, state, engine)
                _save_session(request.session_id, session)

                yield f"data: {_json.dumps({'type': 'round_complete', 'round': next_round, 'phase': 'candidate_turn', 'game_state': _serialize_state(state), 'last_hr_action': hr_action.model_dump(), 'hr_deliberation': hr_deliberation, 'hr_patience': engine._patience.hr_patience if getattr(engine, '_patience', None) else (patience.hr_patience if patience else 1.0), 'patience_events': last_patience_events, 'prompt': _build_prompt(state, session.get('strategy', 'balanced')), 'options': _build_options(state, session.get('strategy', 'balanced')), 'info_cards': [c.model_dump() for c in state.candidate_hand], 'trust_state': state.trust_state.model_dump(), 'round_insight': round_insight}, ensure_ascii=False)}\n\n"

        except Exception as exc:
            yield f"data: {_json.dumps({'type': 'error', 'message': str(exc)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── Internal helpers ──────────────────────────────────────────────────────

async def _run_round_0(engine, resume, job, market, strategy, model: str | None = None, screening=None):
    """Run round 0: market signal + interviewer eval. Returns state ready for candidate turn."""
    from game.type_inferrer import TypeInferrer
    type_inferrer = TypeInferrer()
    candidate_type = type_inferrer.infer_candidate_type(resume, strategy)
    hr_type = type_inferrer.infer_hr_type(job, market)
    interviewer_type = type_inferrer.infer_interviewer_type()
    market_type = type_inferrer.infer_market_type(market, job)

    from game.persona import generate_random_persona
    from game.patience import PatienceState
    from models.schemas import BeliefState, GameState

    # Generate persona and patience (adjusted by screening tier)
    persona = generate_random_persona()
    base_patience = persona.patience_baseline
    if screening:
        base_patience = max(0.3, min(1.0, base_patience + screening.patience_adjustment))
    patience = PatienceState(hr_patience=base_patience)
    engine._persona = persona
    engine._patience = patience

    game_id = f"game-{uuid.uuid4().hex[:8]}"
    screening_mul = screening.opening_offer_multiplier if screening else 1.0
    state = GameState(
        game_id=game_id, resume=resume, job=job,
        round=0, max_rounds=engine.max_rounds,
        candidate_type=candidate_type, hr_type=hr_type,
        interviewer_type=interviewer_type, market_type=market_type,
        public_status="negotiating",
        screening_multiplier=screening_mul,
        candidate_beliefs={
            "hr": BeliefState(about_player="hr"),
            "interviewer": BeliefState(about_player="interviewer"),
            "market": BeliefState(about_player="market"),
        },
        hr_beliefs={
            "candidate": BeliefState(about_player="candidate"),
            "interviewer": BeliefState(about_player="interviewer"),
            "market": BeliefState(about_player="market"),
        },
        interviewer_beliefs={
            "candidate": BeliefState(about_player="candidate"),
            "hr": BeliefState(about_player="hr"),
        },
    )

    from game.infowar import InfoWarEngine
    engine._info_engine = InfoWarEngine()
    engine._info_engine.deal_hand(state)

    from game.players.base import PlayerConfig
    from game.players.market import MarketPlayer
    from game.players.interviewer import InterviewerPlayer
    from game.players.hr import HRPlayer

    # Enable LLM for all agents — deliberation engine now drives quality
    cfg = PlayerConfig(use_llm=True, model=model)
    market_player = MarketPlayer(market_type, config=cfg)
    interviewer = InterviewerPlayer(interviewer_type, config=cfg)
    hr = HRPlayer(hr_type, config=cfg)
    hr.set_persona(persona)

    engine._players = {"hr": hr, "market": market_player, "interviewer": interviewer}

    actions = []

    # Market signal (still uses act_sync for speed in round 0)
    m_action = market_player.act_sync(state, market_player.get_private_view(state, "market"))
    state.action_history.append(m_action)
    engine._apply_market_signal(state, m_action)
    actions.append(m_action)

    # Interviewer evaluates (synchronous for round 0 speed)
    i_action = interviewer.act_sync(state, interviewer.get_private_view(state, "interviewer"))
    state.action_history.append(i_action)
    scores = dict(i_action.params.get("sub_scores", {}))
    scores["overall"] = i_action.params.get("overall_score", 0.5)
    state.scores = scores
    actions.append(i_action)

    # HR initial wait (waits for candidate first move)
    h_action = hr.act_sync(state, hr.get_private_view(state, "hr"))
    state.action_history.append(h_action)
    actions.append(h_action)

    return state, actions, 0, persona, patience


async def _parse_jd_text(text: str) -> StructuredJob:
    """Parse natural language JD text. LLM first, rule-based fallback."""
    from llm.client import call_llm_chat, is_llm_available

    data = None
    if is_llm_available():
        try:
            messages = [
                {
                    "role": "system",
                    "content": (
                        "你是一个招聘信息解析器。从岗位描述中提取结构化信息。只输出JSON。\n"
                        "格式: {\"title\": \"岗位名称\", \"company\": \"公司名\", \"level\": \"P5/P6/P7/P8/P9\", "
                        "\"location\": \"城市\", \"required_skills\": [\"技能1\", ...], "
                        "\"optional_skills\": [\"技能2\", ...], "
                        "\"salary_range\": [最低K/年, 最高K/年], \"description\": \"一句话总结\", "
                        "\"min_experience_years\": 数字}\n"
                        "重要：薪资统一转为K/年（千元/年）。例如\"50-90万/年\"→[500, 900]，\"25K-40K\"→[300, 480]。"
                    ),
                },
                {"role": "user", "content": text[:4000]},
            ]
            raw = await call_llm_chat(messages, temperature=0.1, max_retries=2, task_type="parse")
            import json as _json, re as _re
            raw = raw.strip()
            m = _re.search(r"\{[\s\S]*\}", raw)
            parsed = _json.loads(m.group(0) if m else raw)
            # Validate it has job fields (not resume fields from broken mock)
            if parsed.get("title") or parsed.get("required_skills"):
                data = parsed
        except Exception:
            pass  # Fall through to rule-based

    if data is None:
        data = _rule_parse_jd(text)

    job_id = f"job-{uuid.uuid4().hex[:8]}"
    return StructuredJob(
        job_id=job_id,
        title=data.get("title", ""),
        company=data.get("company", ""),
        location=data.get("location", ""),
        level=data.get("level", "P6"),
        description=data.get("description", ""),
        required_skills=data.get("required_skills", []),
        optional_skills=data.get("optional_skills", []),
        salary_range=tuple(data["salary_range"]) if data.get("salary_range") and len(data.get("salary_range", [])) == 2 else None,
        min_experience_years=float(data.get("min_experience_years", 0)),
    )


def _rule_parse_jd(text: str) -> dict:
    """Regex fallback for JD parsing when LLM unavailable."""
    import re
    data: dict = {"title": "", "company": "", "level": "P6", "required_skills": [], "optional_skills": []}

    # ── Company ──
    # Must exclude non-company words like 招聘/诚聘/急聘
    SKIP_COMPANY = {"招聘", "诚聘", "急聘", "高薪", "猎头"}
    company_pats = [
        r"[-–—@]\s*([一-鿿A-Za-z]{2,20}(?:科技|集团|网络|跳动|巴巴|讯|团|多多|手|东|为|易|米)?)\s*(?:（|\()",
        r"(?:【|\[)\s*(?!招聘|诚聘|急聘|高薪)([一-鿿A-Za-z]{2,20}(?:科技|集团|网络|跳动|巴巴|讯|团|多多|手|东|为|易|米)?)\s*(?:】|\]|（|\()",
        r"(?:公司[：:\s]*)([一-鿿A-Za-z]{2,20})",
    ]
    for pat in company_pats:
        m = re.search(pat, text)
        if m:
            c = m.group(1).strip()
            if c and len(c) >= 2 and c not in SKIP_COMPANY:
                data["company"] = c
                break

    # ── Title ──
    title_pats = [
        r"[【\[]\s*([一-鿿A-Za-z+#\s]{3,30}(?:工程师|经理|架构师|设计师|专家|负责人|科学家|顾问))\s*[】\]\s-]",
        r"(?:岗位|职位|Title)[：:\s]*([一-鿿A-Za-z+#\s]{3,30}(?:工程师|经理|架构师))",
        r"([一-鿿A-Za-z+#]{2,20}(?:工程师|经理|架构师))\s*[-–—]",
    ]
    for pat in title_pats:
        m = re.search(pat, text)
        if m:
            t = m.group(1).strip()
            if t and len(t) >= 3:
                data["title"] = t
                break

    # ── Level ──
    level_m = re.search(r"[Pp](\d)\b|(\d)[-_](\d)\s*年", text)
    if level_m:
        p = level_m.group(1)
        if p and p in "56789":
            data["level"] = f"P{p}"

    # ── Salary ──
    # Chinese internet salary notation variants:
    #   "50-90万/年" → yearly in 万 (50万 = 500K, 90万 = 900K)
    #   "50K-90K"   → monthly in K (50K×12=600K, 90K×12=1080K)
    #   "50-80K"    → ambiguous, check context
    # Rule: if string contains "万", it's yearly and we ×10 to get K.
    #        if string contains "月" or no year marker and <100, it's monthly → ×12.
    yearly_marker = "万" in text or "/年" in text or "／年" in text or "年" in text
    salary_pats = [
        r"(\d{1,3})\s*[Kk万]\s*-\s*(\d{1,3})\s*[Kk万]",      # "50K-80K" or "50万-80万"
        r"(\d{1,3})\s*-\s*(\d{1,3})\s*[Kk万]",                 # "50-80K" or "50-80万"
        r"(\d{2,3})\s*-\s*(\d{2,3})\s*(?:/|\s)*(?:月|年)",     # "50-80/月" or "50-80/年"
    ]
    for pat in salary_pats:
        m = re.search(pat, text)
        if m:
            lo, hi = int(m.group(1)), int(m.group(2))
            if "万" in m.group(0) or yearly_marker:
                # Already yearly in 万 → convert to K: 50万 = 500K
                if lo < 100:
                    lo = lo * 10
                    hi = hi * 10
            elif lo < 100:
                lo = lo * 12  # Monthly K → yearly K
                hi = hi * 12
            data["salary_range"] = [lo, hi]
            break

    # ── Skills ──
    skills = set()
    # Extract text after chinese tech verbs, split on separators
    cn_skills_pattern = r"(?:精通|熟悉|掌握|了解|熟练|使用过|会用)\s*([^，,。、；;！!\n]{2,40})"
    for m in re.finditer(cn_skills_pattern, text):
        raw = m.group(1).strip()
        # Split compound mentions: "Kubernetes和Docker", "Go/Python", etc.
        for part in re.split(r"[和、/及,，·]+", raw):
            part = part.strip()
            if part and len(part) >= 2 and len(part) <= 25:
                skills.add(part)

    # Known tech terms
    known_skills = [
        "Go", "Python", "Java", "C++", "Rust", "JavaScript", "TypeScript",
        "Kubernetes", "K8s", "Docker", "MySQL", "PostgreSQL", "MongoDB",
        "Redis", "Kafka", "RabbitMQ", "gRPC", "GraphQL", "REST",
        "React", "Vue", "Angular", "Node.js", "Next.js",
        "PyTorch", "TensorFlow", "Pandas", "Numpy",
        "AWS", "Azure", "GCP", "Linux", "Git",
        "微服务", "分布式系统", "分布式", "高并发", "大模型", "LLM",
        "NLP", "CV", "机器学习", "深度学习", "RAG", "LangChain",
        "Spring Boot", "Spring Cloud", "MyBatis", "Hibernate",
        "Nginx", "Elasticsearch", "Prometheus", "Grafana",
        "Flink", "Spark", "Hadoop", "Hive", "HBase",
        "CI/CD", "Jenkins", "Terraform", "Ansible",
    ]
    text_lower = text.lower()
    for skill in known_skills:
        if skill.lower() in text_lower:
            skills.add(skill)

    data["required_skills"] = list(skills)[:15]

    # ── Min experience ──
    exp_m = re.search(r"(\d+)\s*[-–~至]?\s*(\d+)?\s*年(?:以上)?(?:工作)?经验", text)
    if exp_m:
        data["min_experience_years"] = float(exp_m.group(1))

    return data


def _build_round_insight(state, candidate_action, hr_action, engine: BiddingGameEngine | None = None) -> dict:
    ask = candidate_action.params.get("salary_ask") or candidate_action.params.get("accepted_salary")
    offer = (
        hr_action.params.get("salary_offer")
        or hr_action.params.get("final_salary")
        or hr_action.params.get("accepted_salary")
    )
    budget = getattr(state.hr_type, "true_budget", 0) or 0
    reservation = getattr(state.candidate_type, "reservation_wage", 0) or 0
    public_offer = getattr(state, "public_offer", None)
    trust = getattr(state, "trust_state", None)
    trust_value = getattr(trust, "hr_trust_in_candidate", 0.5) if trust else 0.5
    patience_state = getattr(engine, "_patience", None) if engine else None
    hr_patience = getattr(patience_state, "hr_patience", getattr(state, "hr_patience", 1.0))
    patience_events = getattr(state, "patience_events", []) or []
    patience_delta = round(sum(e.get("delta", 0) for e in patience_events if e.get("source") == "hr"), 3)

    if candidate_action.action_type == "accept":
        hr_interpretation = "你释放了成交信号，HR 会把重点转向确认薪资、职级与入职条件。"
        risk_level = "low"
    elif candidate_action.action_type == "reject":
        hr_interpretation = "你选择退出谈判，HR 会判断当前条件已经无法覆盖你的机会成本。"
        risk_level = "high"
    elif ask and budget and ask > budget:
        hr_interpretation = f"你提出 {ask}K，已经超过 HR 预算上沿 {budget}K。HR 会认为你很强势，但成交风险明显上升。"
        risk_level = "high"
    elif ask and budget and ask >= budget * 0.9:
        hr_interpretation = f"你提出 {ask}K，接近 HR 预算上沿。HR 会认真评估你的稀缺性和替代成本。"
        risk_level = "medium"
    elif ask and reservation and ask <= reservation:
        hr_interpretation = f"你提出 {ask}K，接近或低于你的底线。HR 会觉得成交容易，但你可能让出了议价空间。"
        risk_level = "medium"
    elif ask:
        hr_interpretation = f"你提出 {ask}K，仍在可谈区间内。HR 会把它视为试探性锚点，而非最后通牒。"
        risk_level = "low"
    else:
        hr_interpretation = "你没有明确新的薪资锚点，HR 会继续依据现有报价和简历信号判断你的筹码。"
        risk_level = "medium"

    if hr_action.action_type == "reject":
        next_advice = "本轮已经触发拒绝。下一次应先强化能力证据或降低开价幅度，再进入薪资拉扯。"
        turning_point = True
        risk_level = "high"
    elif hr_action.action_type == "accept":
        next_advice = "HR 已接受条件。接下来应确认总包结构、试用期、入职时间和绩效口径。"
        turning_point = True
        risk_level = "low"
    elif hr_action.action_type in ("counter_offer", "offer") and offer:
        if ask and offer and abs(ask - offer) <= 20:
            next_advice = "双方报价已经接近。建议用福利、职级或入职时间换取最后小幅上调。"
            turning_point = True
        elif ask and offer and ask > offer:
            next_advice = "建议不要继续大幅加价，优先补充稀缺技能、竞品机会或项目影响力来支撑你的锚点。"
            turning_point = False
        else:
            next_advice = "可以继续观察 HR 让步空间，同时用岗位匹配度和业务影响力争取更高报价。"
            turning_point = False
    else:
        next_advice = "建议继续观察 HR 反应，并补充能证明能力或市场稀缺度的信息。"
        turning_point = False

    offer_delta = None
    if ask and offer:
        offer_delta = offer - ask
    elif public_offer and ask:
        offer_delta = public_offer - ask

    return {
        "round": candidate_action.round,
        "hr_interpretation": hr_interpretation,
        "situation_delta": {
            "trust_level": round(trust_value, 3),
            "hr_patience": round(hr_patience, 3),
            "patience_delta": patience_delta,
            "offer_delta": offer_delta,
        },
        "next_advice": next_advice,
        "risk_level": risk_level,
        "turning_point": turning_point,
    }

@router.post("/game/info_act")
async def info_act(request: InfoActRequest):
    """Candidate plays an information warfare action."""
    session = _load_session(request.session_id)
    if not session:
        return {"status": "error", "message": "会话已过期，请重新开始"}

    try:
        state = _deserialize_game_state(session["state"])
        engine = _build_engine_from_session(session)

        from game.infowar import InfoWarEngine
        from models.schemas import InformationAction

        info_engine = getattr(engine, "_info_engine", None)
        if not info_engine:
            info_engine = InfoWarEngine()
            engine._info_engine = info_engine

        action = InformationAction(
            action_type=request.action_type,
            target_card=request.card_id,
            stated_value=request.stated_value,
        )

        result = info_engine.apply_candidate_action(state, action)

        # Persist updated state
        session["state"] = _serialize_pydantic(state)
        _save_session(request.session_id, session)

        return {
            "status": "ok",
            "info_cards": [c.model_dump() for c in state.candidate_hand],
            "trust_state": state.trust_state.model_dump(),
            "narrative": result.narrative,
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
