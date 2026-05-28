"""Regression tests for interactive game session persistence."""

from __future__ import annotations

import pytest

from api.session_store import get_store, reset_store
from data.demo_profiles import JOBS, RESUMES


@pytest.fixture(autouse=True)
def _fresh_game_store(monkeypatch):
    reset_store()
    import api.routes.game as game_route
    import api.routes.debrief_chat as debrief_route

    store = get_store()
    monkeypatch.setattr(game_route, "_store", store)
    monkeypatch.setattr(debrief_route, "_store", store)
    yield
    reset_store()


@pytest.mark.asyncio
async def test_interactive_session_persists_info_cards_actions_and_debrief_context():
    from api.routes.debrief_chat import _build_system_prompt
    from api.routes.game import GameActRequest, GameInitRequest, InfoActRequest, game_act, get_game_state, info_act, init_game

    resume = RESUMES["res-diana-zhao"].model_dump()
    job = JOBS["job-bytedance-backend"].model_dump()

    init = await init_game(GameInitRequest(resume=resume, job=job, strategy="balanced", market_condition="normal"))

    assert init["status"] == "ok"
    assert len(init["info_cards"]) > 0
    assert init["trust_state"]["trust_label"]
    assert init["game_state"]["candidate_reservation_wage"] > 0

    session_id = init["session_id"]
    first_card = init["info_cards"][0]
    info = await info_act(InfoActRequest(
        session_id=session_id,
        action_type="reveal",
        card_id=first_card["card_id"],
        stated_value=first_card["true_value"],
    ))

    assert info["status"] == "ok"
    assert info["trust_state"]["hr_trust_in_candidate"] >= init["trust_state"]["hr_trust_in_candidate"]

    act = await game_act(GameActRequest(session_id=session_id, action_type="counter_offer", salary_amount=760))

    assert act["status"] == "ok"
    assert act["info_cards"]
    assert act["trust_state"]["trust_label"]
    assert act["round_insight"]["hr_interpretation"]
    assert act["round_insight"]["next_advice"]
    assert act["round_insight"]["risk_level"] in {"low", "medium", "high"}
    assert "hr_patience" in act["round_insight"]["situation_delta"]

    state = await get_game_state(session_id)

    assert state["status"] == "ok"
    assert len(state["round_actions"]) >= 5
    assert any(a["player"] == "candidate" for a in state["round_actions"])
    assert any(a["player"] == "hr" for a in state["round_actions"])
    assert state["info_cards"][0]["reveal_state"] == "revealed"

    prompt = _build_system_prompt(get_store().get(session_id))

    assert "Diana Zhao" in prompt
    assert "字节" in prompt or "Bytedance" in prompt
    assert "第1轮 你: counter_offer" in prompt
    assert get_store().get(session_id)["round_insights"][0]["hr_interpretation"]
