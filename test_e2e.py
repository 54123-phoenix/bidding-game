"""End-to-end test: simulate real user with messy input."""
from __future__ import annotations

import json, sys, traceback
import httpx

API = "http://localhost:8001"

def test(name, fn):
    print(f"\n{'='*60}")
    print(f"TEST: {name}")
    print('='*60)
    try:
        fn()
        print(f"  => PASS")
    except Exception as e:
        print(f"  => FAIL: {e}")
        traceback.print_exc()

# ═══════════════════════════════════════════════════════════════
# Test 1: JD parsing with messy natural language input
# ═══════════════════════════════════════════════════════════════
def test_jd_parse():
    # Simulating user pasting a real job posting (messy, with garbage characters)
    jd_text = """【招聘】高级后端工程师 - 字节跳动（北京）

    岗位职责：
    1. 负责xxx平台后端服务的架构设计与开发
    2. 参与高并发分布式系统的性能优化
    3. 与产品、前端团队协作交付需求

    任职要求：
    - 精通Go/Python，熟悉Kubernetes和Docker
    - 3-5年后端开发经验，有大规模分布式系统经验优先
    - 熟悉MySQL、Redis、Kafka等中间件
    - 了解微服务架构设计模式

    薪资范围：50K-80K/月 * 15薪

    联系方式：hr@bytedance.com

    ---- 以下为复制粘贴时混入的垃圾信息 ----
    页面编码：UTF-8  发布时间：2026-05-10
    浏览器的广告：??????免费抽奖??????
    """

    with httpx.Client(timeout=30) as c:
        resp = c.post(f"{API}/api/jd/parse", data={"jd_text": jd_text})
        data = resp.json()
        print(f"  status: {data.get('status')}")
        if data.get('status') == 'ok':
            job = data['job']
            print(f"  title: {job.get('title')}")
            print(f"  company: {job.get('company')}")
            print(f"  skills: {job.get('required_skills')}")
            print(f"  salary: {job.get('salary_range')}")
        else:
            print(f"  error: {data.get('message')}")

# ═══════════════════════════════════════════════════════════════
# Test 2: Game init with manually constructed resume data
# (simulating what happens after the real user uploads a PDF)
# ═══════════════════════════════════════════════════════════════
def test_game_init():
    # Semi-realistic parsed resume with some garbage
    resume = {
        "resume_id": "test-001",
        "name": "张三",
        "email": "zhangsan@gmail.com",
        "phone": "13800138000",
        "summary": "5年后端开发经验，精通Go和Python",
        "skills": ["Go", "Python", "Kubernetes", "Docker", "MySQL", "Redis", "Kafka", "gRPC", "Linux"],
        "skill_levels": {"Go": "精通", "Python": "熟练", "Kubernetes": "熟练"},
        "education": [
            {"school": "浙江大学", "degree": "硕士", "major": "计算机科学", "graduation_year": 2019}
        ],
        "experience": [
            {
                "company": "阿里巴巴",
                "title": "后端开发工程师",
                "description": "负责电商系统微服务架构设计，QPS提升3倍，支撑日均千万级请求。",
                "tech_stack": ["Go", "Kubernetes", "Redis", "Kafka"],
                "start_date": "2022-03-01",
                "end_date": "2025-12-31"
            },
            {
                "company": "美团",
                "title": "Java开发工程师",
                "description": "参与订单系统开发，用了Spring Boot和MyBatis。",
                "tech_stack": ["Java", "Spring Boot", "MySQL"],
                "start_date": "2019-07-01",
                "end_date": "2022-02-28"
            }
        ],
        "projects": [
            {
                "name": "微服务网关",
                "description": "自研API网关，日均处理10亿+请求，P99延迟<50ms。",
                "tech_stack": ["Go", "gRPC", "Redis", "Kubernetes"]
            }
        ],
        "competitions": [],
        "certifications": ["AWS Solutions Architect"]
    }

    # Job parsed from JD (Step 1 output)
    job = {
        "job_id": "test-job-001",
        "title": "高级后端工程师",
        "company": "字节跳动",
        "location": "北京",
        "level": "P7",
        "required_skills": ["Go", "Python", "Kubernetes", "Docker", "MySQL", "Redis", "Kafka", "微服务", "分布式系统"],
        "optional_skills": ["gRPC", "Linux"],
        "salary_range": [600, 960],
        "description": "负责xxx平台后端服务的架构设计与开发"
    }

    with httpx.Client(timeout=30) as c:
        resp = c.post(f"{API}/api/game/init", json={
            "resume": resume,
            "job": job,
            "strategy": "balanced",
            "market_condition": "normal"
        })
        data = resp.json()
        print(f"  status: {data.get('status')}")
        if data.get('status') == 'ok':
            print(f"  session_id: {data.get('session_id')}")
            print(f"  round: {data.get('round')}")
            print(f"  phase: {data.get('phase')}")
            gs = data.get('game_state', {})
            print(f"  public_offer: {gs.get('public_offer')}")
            print(f"  interviewer_rec: {gs.get('interviewer_recommendation')}")
            opts = data.get('options', [])
            print(f"  options: {[o['label'] for o in opts]}")
            return data
        else:
            print(f"  error: {data.get('message')}")
            return None

# ═══════════════════════════════════════════════════════════════
# Test 3: Full game flow — play through to completion
# ═══════════════════════════════════════════════════════════════
def test_full_game_flow():
    # Step 1: Init
    resume = {
        "resume_id": "test-002",
        "name": "李四",
        "email": "lisi@qq.com",
        "summary": "3年AI工程师",
        "skills": ["Python", "PyTorch", "TensorFlow", "NLP", "Docker", "Linux", "SQL", "Git"],
        "education": [
            {"school": "华中科技大学", "degree": "硕士", "major": "人工智能", "graduation_year": 2023}
        ],
        "experience": [
            {
                "company": "腾讯",
                "title": "AI工程师",
                "description": "负责大模型微调和推理优化。使用LoRA对7B模型做领域微调，推理延迟降低40%。",
                "tech_stack": ["Python", "PyTorch", "CUDA"],
                "start_date": "2023-07-01",
                "end_date": None
            }
        ],
        "projects": [],
        "competitions": [{"name": "kaggle竞赛", "year": 2022, "award": "银奖", "description": "NLP文本分类任务排名前5%"}],
        "certifications": [],
        "skill_levels": {"Python": "精通", "PyTorch": "熟练", "NLP": "熟练"}
    }

    job = {
        "job_id": "test-job-002",
        "title": "大模型算法工程师",
        "company": "字节跳动",
        "level": "P6",
        "required_skills": ["Python", "PyTorch", "大模型", "NLP"],
        "optional_skills": ["CUDA", "RAG"],
        "salary_range": [350, 500],
        "description": "参与大模型训练与推理优化"
    }

    session_id = None
    with httpx.Client(timeout=60) as c:
        # Init
        print("  [1/4] Initializing game...")
        resp = c.post(f"{API}/api/game/init", json={
            "resume": resume, "job": job,
            "strategy": "balanced", "market_condition": "normal"
        })
        data = resp.json()
        print(f"    status: {data.get('status')}")
        if data.get('status') != 'ok':
            print(f"    FAIL: {data.get('message')}")
            return
        session_id = data['session_id']
        print(f"    session: {session_id}")
        gs = data.get('game_state', {})
        print(f"    interviewer: {gs.get('interviewer_recommendation')}")
        print(f"    offer: {gs.get('public_offer')}")

        # Round 0: User counter-offers
        print("  [2/4] User counter-offers 45K...")
        resp = c.post(f"{API}/api/game/act", json={
            "session_id": session_id,
            "action_type": "counter_offer",
            "salary_amount": 45
        })
        data = resp.json()
        print(f"    phase: {data.get('phase')}")
        gs = data.get('game_state', {})
        print(f"    new offer: {gs.get('public_offer')}")
        if data.get('last_hr_action'):
            print(f"    HR action: {data['last_hr_action'].get('action_type')}")

        # Round 1: User counter again
        if data.get('phase') == 'candidate_turn':
            print("  [3/4] User counter-offers 42K...")
            session_id = data.get('session_id') or session_id
            resp = c.post(f"{API}/api/game/act", json={
                "session_id": session_id,
                "action_type": "counter_offer",
                "salary_amount": 42
            })
            data = resp.json()
            print(f"    phase: {data.get('phase')}")

        # Round 2: User accepts
        if data.get('phase') == 'candidate_turn':
            print("  [4/4] User accepts...")
            session_id = data.get('session_id') or session_id
            resp = c.post(f"{API}/api/game/act", json={
                "session_id": session_id,
                "action_type": "accept"
            })
            data = resp.json()
            print(f"    phase: {data.get('phase')}")

        # Final result
        if data.get('phase') == 'finished':
            print(f"    outcome: {data.get('outcome')}")
            print(f"    message: {data.get('message')}")
            fr = data.get('final_result', {})
            print(f"    salary: {fr.get('final_salary')}K")
            print(f"    P(success): {fr.get('success_probability')}")
            print(f"    rounds: {fr.get('negotiation_rounds')}")
            eq = data.get('equilibrium', {})
            if eq:
                cs = eq.get('candidate_strategy', {})
                print(f"    equilibrium ask: {cs.get('opening_salary_ask')}K")
                print(f"    equilibrium payoff: {eq.get('candidate_expected_payoff')}")

# ═══════════════════════════════════════════════════════════════
# Test 4: Error handling — empty resume
# ═══════════════════════════════════════════════════════════════
def test_error_empty_resume():
    with httpx.Client(timeout=15) as c:
        resp = c.post(f"{API}/api/game/init", json={
            "resume": {"resume_id": "empty", "name": "", "skills": []},
            "job": {"job_id": "j1", "title": "", "company": "", "level": "", "required_skills": []},
        })
        data = resp.json()
        print(f"  status: {data.get('status')}")
        print(f"  message: {data.get('message', 'N/A')[:100]}")

# ═══════════════════════════════════════════════════════════════
# Test 5: Invalid session ID
# ═══════════════════════════════════════════════════════════════
def test_invalid_session():
    with httpx.Client(timeout=15) as c:
        resp = c.post(f"{API}/api/game/act", json={
            "session_id": "nonexistent-12345",
            "action_type": "accept"
        })
        data = resp.json()
        print(f"  status: {data.get('status')}")
        print(f"  message: {data.get('message', 'N/A')}")

# ═══════════════════════════════════════════════════════════════
# Run all tests
# ═══════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print("=" * 60)
    print("BIDDING GAME — END-TO-END TEST SUITE")
    print("=" * 60)

    test("JD Parsing (messy natural language input)", test_jd_parse)
    test("Game Init (realistic resume + job)", test_game_init)
    test("Full Game Flow (init → negotiate → result)", test_full_game_flow)
    test("Error Handling: Empty Resume", test_error_empty_resume)
    test("Error Handling: Invalid Session", test_invalid_session)

    print("\n" + "=" * 60)
    print("ALL TESTS COMPLETE")
    print("=" * 60)
