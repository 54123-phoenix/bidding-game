"""Test debrief chat quality on 3 representative cases."""
import httpx, json, time

API = "http://localhost:8001"

def quick_game(resume, job, actions):
    """Run a game quickly and return session_id + chat replies."""
    c = httpx.Client(timeout=60)
    r = c.post(f"{API}/api/game/init", json={
        "resume": resume, "job": job,
        "strategy": "balanced", "market_condition": "normal"
    })
    d = r.json()
    if d.get("status") != "ok":
        return {"error": d.get("message")}, None

    sid = d["session_id"]
    for act in actions:
        r = c.post(f"{API}/api/game/act", json={
            "session_id": sid, "action_type": act[0],
            "salary_amount": act[1] if len(act) > 1 else None
        })
        d = r.json()
        if d.get("phase") == "finished":
            break
        sid = d.get("session_id", sid)

    return d, sid


def chat(sid, question):
    r = httpx.post(f"{API}/api/debrief/chat", json={
        "session_id": sid, "message": question
    }, timeout=30)
    return r.json().get("reply", "NO REPLY")


def run_case(name, resume, job, actions, questions):
    print(f"\n{'='*60}")
    print(f"  {name}")
    print(f"{'='*60}")

    result, sid = quick_game(resume, job, actions)
    if not sid:
        print(f"  ERROR: {result.get('error', 'unknown')}")
        return

    outcome = result.get("outcome") or result.get("final_result", {}).get("outcome", "?")
    prob = result.get("final_result", {}).get("success_probability", 0)
    print(f"  Outcome: {outcome}  |  P(success): {prob:.0%}")

    for q in questions:
        print(f"\n  Q: {q}")
        reply = chat(sid, q)
        # Truncate for display
        print(f"  A: {reply[:200]}")
        if len(reply) > 200:
            print(f"     ... ({len(reply)} chars total)")


# ═══════════════════════════════════════════════════════
# CASE A: 白痴简历 — test "为什么失败" quality
# ═══════════════════════════════════════════════════════
def case_trash_resume():
    resume = {
        "resume_id": "trash", "name": "小白", "summary": "刚毕业啥也不会",
        "skills": ["Java", "Spring", "HTML", "CSS"], "skill_levels": {},
        "education": [{"school": "某职业技术学院", "degree": "本科", "major": "软件技术", "graduation_year": 2025}],
        "experience": [],
        "projects": [], "competitions": [], "certifications": [],
        "email": "x@x.com"
    }
    job = {
        "job_id": "j1", "title": "高级后端工程师", "company": "字节跳动", "level": "P7",
        "required_skills": ["Go", "Kubernetes", "Redis", "Kafka", "MySQL", "微服务"],
        "salary_range": [500, 900],
    }
    run_case("白痴简历（0技能匹配+0经验+双非+投P7）", resume, job,
             [("counter_offer", 135)],  # Ask for 135K
             ["我为什么失败了？", "应该提升什么技能？", "该投什么级别的岗位？"])

# ═══════════════════════════════════════════════════════
# CASE B: 优秀简历 — test success analysis quality
# ═══════════════════════════════════════════════════════
def case_excellent_resume():
    resume = {
        "resume_id": "best", "name": "优秀候选人", "summary": "清华CS本硕，阿里P7后端5年",
        "skills": ["Go", "Kubernetes", "Redis", "Kafka", "MySQL", "Docker", "Linux", "gRPC", "微服务", "分布式系统"],
        "skill_levels": {"Go": "精通", "Kubernetes": "精通", "Redis": "精通", "Kafka": "熟练"},
        "education": [
            {"school": "清华大学", "degree": "硕士", "major": "计算机科学与技术", "graduation_year": 2021},
        ],
        "experience": [
            {"company": "阿里巴巴", "title": "高级后端工程师",
             "description": "主导淘宝推荐系统后端架构，QPS 50万+，P99延迟<8ms，降低延迟93%",
             "tech_stack": ["Go", "Kubernetes", "Redis", "Kafka", "Flink"],
             "start_date": "2021-07-01", "end_date": "2026-05-01"}
        ],
        "projects": [{"name": "淘宝推荐系统重构", "description": "QPS 50万+, P99<8ms", "tech_stack": ["Go", "Kubernetes"]}],
        "competitions": [{"name": "ACM-ICPC", "year": 2018, "award": "金牌", "description": "亚洲区域赛金牌"}],
        "certifications": [],
        "email": "best@test.com"
    }
    job = {
        "job_id": "j2", "title": "高级后端工程师", "company": "字节跳动", "level": "P7",
        "required_skills": ["Go", "Kubernetes", "Redis", "Kafka", "MySQL", "微服务"],
        "salary_range": [500, 900],
    }
    run_case("优秀简历（清华+阿里P7+ACM金+量化指标）", resume, job,
             [("counter_offer", 700), ("counter_offer", 720)],
             ["这次谈判哪里做得好？", "还有提升空间吗？", "我的隐藏优势是什么？"])

# ═══════════════════════════════════════════════════════
# CASE C: 边界案例 — test borderline analysis
# ═══════════════════════════════════════════════════════
def case_borderline():
    resume = {
        "resume_id": "border", "name": "边界选手", "summary": "3年Go后端，小厂经验",
        "skills": ["Go", "Python", "MySQL", "Redis", "Docker", "Git"],
        "skill_levels": {"Go": "熟练", "Python": "熟练"},
        "education": [{"school": "杭州电子科技大学", "degree": "本科", "major": "计算机", "graduation_year": 2023}],
        "experience": [
            {"company": "某创业公司", "title": "后端开发",
             "description": "负责公司全部后端服务开发，从0搭建了订单和支付系统",
             "tech_stack": ["Go", "MySQL", "Redis", "Docker"],
             "start_date": "2023-07-01", "end_date": "2026-05-01"}
        ],
        "projects": [], "competitions": [], "certifications": [],
        "email": "b@test.com"
    }
    job = {
        "job_id": "j3", "title": "后端开发工程师", "company": "字节跳动", "level": "P6",
        "required_skills": ["Go", "MySQL", "Redis", "Kubernetes", "Kafka"],
        "salary_range": [300, 480],
    }
    run_case("边界案例（3年小厂/技能匹配60%/双非）", resume, job,
             [("counter_offer", 400)],
             ["我的薪资要价合理吗？", "应该补充什么技能？", "换什么公司更合适？"])


if __name__ == "__main__":
    t0 = time.time()
    print("DEBRIEF CHAT QUALITY TEST")
    case_trash_resume()
    case_excellent_resume()
    case_borderline()
    print(f"\n{'='*60}")
    print(f"DONE — {time.time()-t0:.0f}s")
