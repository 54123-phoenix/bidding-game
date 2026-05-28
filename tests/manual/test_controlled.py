"""Controlled experiments — isolate variables to find bugs."""
import httpx, json, time

API = "http://localhost:8001"

BASE_RESUME = {
    "resume_id": None,
    "name": None,
    "email": "test@example.com",
    "summary": None,
    "skills": ["Go", "Python", "Kubernetes", "Docker", "MySQL", "Redis", "Linux"],
    "education": [],
    "experience": [],
    "projects": [],
    "competitions": [],
    "certifications": [],
    "skill_levels": {"Go": "精通", "Python": "熟练"},
}

BASE_JOB = {
    "job_id": "ctrl-job",
    "title": "高级后端工程师",
    "company": "字节跳动",
    "level": "P7",
    "required_skills": ["Go", "Kubernetes", "Redis", "Kafka", "MySQL", "微服务"],
    "optional_skills": ["Docker", "Linux"],
    "salary_range": [500, 900],
    "description": "负责后端微服务架构设计"
}

def run_game(resume, job, label=""):
    """Run init + 3 rounds, collect key metrics."""
    with httpx.Client(timeout=60) as c:
        r = c.post(f"{API}/api/game/init", json={
            "resume": resume, "job": job,
            "strategy": "balanced", "market_condition": "normal"
        })
        d = r.json()
        if d.get("status") != "ok":
            return {"label": label, "error": d.get("message", "unknown")}

        gs = d.get("game_state", {})
        scores = gs.get("scores", {})
        metrics = {
            "label": label,
            "interviewer_rec": gs.get("interviewer_recommendation"),
            "interviewer_score": scores.get("overall", "N/A"),
            "coding_score": scores.get("coding", "N/A"),
            "design_score": scores.get("system_design", "N/A"),
            "domain_score": scores.get("domain_expertise", "N/A"),
            "market_adj": gs.get("market_adjustment"),
            "session": d.get("session_id"),
        }

        # Play through with proper negotiation
        sid = d["session_id"]
        gs = d.get("game_state", {})
        offer = gs.get("public_offer") or 0

        for i in range(4):
            if offer > 0 and offer > 300:
                # Accept if decent offer
                act = {"session_id": sid, "action_type": "accept"}
            elif offer > 0:
                # Counter slightly above
                act = {"session_id": sid, "action_type": "counter_offer", "salary_amount": int(offer * 1.1)}
            else:
                # No offer: make opening demand
                act = {"session_id": sid, "action_type": "counter_offer", "salary_amount": 500}

            r = c.post(f"{API}/api/game/act", json=act, timeout=30)
            ad = r.json()
            if ad.get("phase") == "finished":
                fr = ad.get("final_result", {})
                metrics["outcome"] = fr.get("outcome")
                metrics["final_salary"] = fr.get("final_salary")
                metrics["P(success)"] = fr.get("success_probability")
                metrics["rounds"] = fr.get("negotiation_rounds")
                metrics["candidate_payoff"] = fr.get("candidate_payoff")
                eq = ad.get("equilibrium", {})
                if eq:
                    cs = eq.get("candidate_strategy", {})
                    metrics["eq_ask"] = cs.get("opening_salary_ask")
                    metrics["eq_payoff"] = eq.get("candidate_expected_payoff")
                break
            sid = ad.get("session_id", sid)
            offer = (ad.get("game_state") or {}).get("public_offer") or 0

        return metrics


def test_school_tier():
    """控制变量：同样经历，不同学校"""
    print("\n" + "="*65)
    print("EXPERIMENT 1: School Tier (985 vs 双非)")
    print("="*65)

    # 985
    r985 = dict(BASE_RESUME)
    r985["resume_id"] = "s-985"
    r985["name"] = "985-张三"
    r985["summary"] = "4年Go后端开发经验"
    r985["education"] = [{"school": "浙江大学", "degree": "硕士", "major": "计算机科学", "graduation_year": 2022}]
    r985["experience"] = [
        {"company": "美团", "title": "后端开发工程师", "description": "负责订单系统微服务化改造",
         "tech_stack": ["Go", "Kubernetes", "Redis"], "start_date": "2022-07-01", "end_date": "2026-05-01"}
    ]

    # 双非
    r_non = dict(BASE_RESUME)
    r_non["resume_id"] = "s-non"
    r_non["name"] = "双非-李四"
    r_non["summary"] = "4年Go后端开发经验"
    r_non["education"] = [{"school": "某某工业学院", "degree": "本科", "major": "计算机科学", "graduation_year": 2022}]
    r_non["experience"] = [
        {"company": "美团", "title": "后端开发工程师", "description": "负责订单系统微服务化改造",
         "tech_stack": ["Go", "Kubernetes", "Redis"], "start_date": "2022-07-01", "end_date": "2026-05-01"}
    ]

    m985 = run_game(r985, dict(BASE_JOB), "985-浙大")
    m_non = run_game(r_non, dict(BASE_JOB), "双非-某学院")

    for m in [m985, m_non]:
        print(f"\n  [{m.get('label')}]")
        print(f"    Rec: {m.get('interviewer_rec')}  |  Score: {m.get('interviewer_score')}")
        print(f"    Coding: {m.get('coding_score')}  |  Design: {m.get('design_score')}  |  Domain: {m.get('domain_score')}")
        print(f"    Outcome: {m.get('outcome')}  |  Salary: {m.get('final_salary')}K  |  P(success): {m.get('P(success)')}")
        print(f"    Eq Ask: {m.get('eq_ask')}K  |  Payoff: {m.get('candidate_payoff')}")

    # Check: does school tier create meaningful difference?
    s985 = m985.get("interviewer_score")
    s_non = m_non.get("interviewer_score")
    if isinstance(s985, (int, float)) and isinstance(s_non, (int, float)):
        if abs(s985 - s_non) < 0.01:
            print(f"\n  ** BUG: 985 vs non-985 scores identical ({s985} vs {s_non})!")
        else:
            diff = abs(s985 - s_non) * 100
            print(f"\n  OK: School tier creates {diff:.1f}pp difference")


def test_skill_gap():
    """控制变量：同样背景，技能匹配 vs 不匹配"""
    print("\n" + "="*65)
    print("EXPERIMENT 2: Skill Match (Go后端 vs 前端转后端)")
    print("="*65)

    # Strong match
    r_match = dict(BASE_RESUME)
    r_match["resume_id"] = "s-match"
    r_match["name"] = "匹配-王五"
    r_match["summary"] = "5年Go后端，精通微服务"
    r_match["skills"] = ["Go", "Python", "Kubernetes", "Docker", "MySQL", "Redis", "Kafka", "gRPC", "Linux", "微服务"]
    r_match["education"] = [{"school": "华中科技大学", "degree": "硕士", "major": "计算机科学", "graduation_year": 2021}]
    r_match["experience"] = [
        {"company": "阿里巴巴", "title": "后端开发工程师", "description": "负责微服务架构设计与高并发系统开发",
         "tech_stack": ["Go", "Kubernetes", "Redis", "Kafka"], "start_date": "2021-07-01", "end_date": "2026-05-01"}
    ]

    # Weak match
    r_weak = dict(BASE_RESUME)
    r_weak["resume_id"] = "s-weak"
    r_weak["name"] = "不匹配-赵六"
    r_weak["summary"] = "5年前端开发，想转后端"
    r_weak["skills"] = ["JavaScript", "TypeScript", "React", "Vue", "CSS", "HTML", "Webpack", "Node.js"]
    r_weak["education"] = [{"school": "华中科技大学", "degree": "硕士", "major": "软件工程", "graduation_year": 2021}]
    r_weak["experience"] = [
        {"company": "字节跳动", "title": "前端开发工程师", "description": "负责中后台管理系统前端架构",
         "tech_stack": ["React", "TypeScript", "Node.js"], "start_date": "2021-07-01", "end_date": "2026-05-01"}
    ]

    m_match = run_game(r_match, dict(BASE_JOB), "匹配-Go后端")
    m_weak = run_game(r_weak, dict(BASE_JOB), "不匹配-前端转后端")

    for m in [m_match, m_weak]:
        print(f"\n  [{m.get('label')}]")
        print(f"    Rec: {m.get('interviewer_rec')}  |  Score: {m.get('interviewer_score')}")
        print(f"    Outcome: {m.get('outcome')}  |  Salary: {m.get('final_salary')}K  |  P(success): {m.get('P(success)')}")
        print(f"    Payoff: {m.get('candidate_payoff')}")

    p_match = m_match.get("P(success)", 0)
    p_weak = m_weak.get("P(success)", 0)
    gap = p_match - p_weak if (p_match and p_weak) else 0
    print(f"\n  Gap: {gap:.1%}  |  {'GOOD - large difference' if gap > 0.4 else 'OK' if gap > 0.15 else '** BUG: too small'}")


def test_company_pedigree():
    """控制变量：阿里T1 vs 不知名小厂"""
    print("\n" + "="*65)
    print("EXPERIMENT 3: Company Pedigree (阿里T1 vs 小厂)")
    print("="*65)

    r_ali = dict(BASE_RESUME)
    r_ali["resume_id"] = "s-ali"
    r_ali["name"] = "阿里-钱七"
    r_ali["summary"] = "4年阿里P6后端开发"
    r_ali["education"] = [{"school": "南京大学", "degree": "本科", "major": "计算机科学", "graduation_year": 2022}]
    r_ali["experience"] = [
        {"company": "阿里巴巴", "title": "后端开发工程师", "description": "负责淘宝微服务架构",
         "tech_stack": ["Go", "Kubernetes", "Redis", "Kafka"], "start_date": "2022-07-01", "end_date": "2026-05-01"}
    ]

    r_small = dict(BASE_RESUME)
    r_small["resume_id"] = "s-small"
    r_small["name"] = "小厂-周八"
    r_small["summary"] = "4年后端开发"
    r_small["education"] = [{"school": "南京大学", "degree": "本科", "major": "计算机科学", "graduation_year": 2022}]
    r_small["experience"] = [
        {"company": "某不知名科技有限公司", "title": "后端开发工程师", "description": "负责内部管理系统开发",
         "tech_stack": ["Go", "MySQL", "Redis"], "start_date": "2022-07-01", "end_date": "2026-05-01"}
    ]

    m_ali = run_game(r_ali, dict(BASE_JOB), "阿里T1")
    m_small = run_game(r_small, dict(BASE_JOB), "小厂")

    for m in [m_ali, m_small]:
        print(f"\n  [{m.get('label')}]")
        print(f"    面试评价: {m.get('interviewer_rec')}  |  得分: {m.get('interviewer_score')}")
        print(f"    结果: {m.get('outcome')}  |  薪资: {m.get('final_salary')}K  |  P(success): {m.get('P(success)')}")
        print(f"    均衡要价: {m.get('eq_ask')}K  |  收益: {m.get('candidate_payoff')}")


def test_garbage_input():
    """垃圾输入：矛盾信息、缺失字段、不合理期望"""
    print("\n" + "="*65)
    print("EXPERIMENT 4: Garbage Input Handling")
    print("="*65)

    tests = []

    # 4a: Contradictory info (title says P7, salary asks P4)
    r = dict(BASE_RESUME)
    r["resume_id"] = "g-contra"
    r["name"] = ""
    r["summary"] = "1年实习经验"
    r["skills"] = ["Java", "Spring"]
    r["education"] = [{"school": "", "degree": "其他", "major": "？？", "graduation_year": 2099}]
    r["experience"] = []
    t = run_game(r, dict(BASE_JOB), "矛盾信息(P7 JD vs 新人简历)")
    print(f"\n  [矛盾信息] 结果: {t.get('outcome')} | 面试: {t.get('interviewer_rec')} | P(success): {t.get('P(success)')}")
    if t.get("P(success)", 0) > 0.3:
        print(f"  ** BUG: Fresh grad resume for P7 role has {t.get('P(success)', 0):.0%} success rate!")

    # 4b: Missing name, weird characters
    r2 = dict(BASE_RESUME)
    r2["resume_id"] = "g-weird"
    r2["name"] = "NULL\x00\x01测试<script>alert(1)</script>"
    r2["summary"] = "🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥"
    r2["skills"] = ["<script>", "", "", "", ""]
    r2["education"] = []
    t2 = run_game(r2, dict(BASE_JOB), "XSS/特殊字符")
    print(f"  [特殊字符] 结果: {t2.get('outcome')} | error: {t2.get('error', 'none')}")

    # 4c: Empty everything
    r3 = dict(BASE_RESUME)
    r3["resume_id"] = "g-empty"
    r3["name"] = ""
    r3["skills"] = []
    r3["education"] = []
    r3["experience"] = []
    j_empty = dict(BASE_JOB)
    j_empty["required_skills"] = []
    t3 = run_game(r3, j_empty, "全空数据")
    print(f"  [全空] 结果: {t3.get('outcome')} | P(success): {t3.get('P(success)')} | error: {t3.get('error', 'none')}")


def test_competition_bonus():
    """控制变量：ACM金牌 vs 无竞赛"""
    print("\n" + "="*65)
    print("EXPERIMENT 5: Competition Signal (ACM金牌 vs 无)")
    print("="*65)

    r_acm = dict(BASE_RESUME)
    r_acm["resume_id"] = "s-acm"
    r_acm["name"] = "ACM-吴九"
    r_acm["summary"] = "3年Go后端"
    r_acm["education"] = [{"school": "北京大学", "degree": "本科", "major": "计算机科学", "graduation_year": 2023}]
    r_acm["experience"] = [
        {"company": "腾讯", "title": "后端开发工程师", "description": "参与微信支付后端开发",
         "tech_stack": ["Go", "Kubernetes", "MySQL"], "start_date": "2023-07-01", "end_date": "2026-05-01"}
    ]
    r_acm["competitions"] = [
        {"name": "ACM-ICPC World Finals", "year": 2022, "award": "金牌", "description": "全球总决赛金牌"}
    ]

    r_none = dict(BASE_RESUME)
    r_none["resume_id"] = "s-none"
    r_none["name"] = "无竞赛-郑十"
    r_none["summary"] = "3年Go后端"
    r_none["education"] = [{"school": "北京大学", "degree": "本科", "major": "计算机科学", "graduation_year": 2023}]
    r_none["experience"] = [
        {"company": "腾讯", "title": "后端开发工程师", "description": "参与微信支付后端开发",
         "tech_stack": ["Go", "Kubernetes", "MySQL"], "start_date": "2023-07-01", "end_date": "2026-05-01"}
    ]

    m_acm = run_game(r_acm, dict(BASE_JOB), "ACM金牌")
    m_none = run_game(r_none, dict(BASE_JOB), "无竞赛")

    for m in [m_acm, m_none]:
        print(f"\n  [{m.get('label')}]")
        print(f"    面试评价: {m.get('interviewer_rec')}  |  得分: {m.get('interviewer_score')}")
        print(f"    结果: {m.get('outcome')}  |  薪资: {m.get('final_salary')}K  |  P(success): {m.get('P(success)')}")
        print(f"    均衡要价: {m.get('eq_ask')}K  |  收益: {m.get('candidate_payoff')}")

    if m_acm.get("P(success)") == m_none.get("P(success)"):
        print(f"\n  ** BUG: ACM gold vs no competition P(success) identical — competition signal not working!")


# ═══════════════════════════════════════════════════════════
if __name__ == "__main__":
    print("CONTROLLED EXPERIMENTS — BIDDING GAME")
    print("Testing variable isolation with garbage values...")
    t0 = time.time()

    test_school_tier()
    test_skill_gap()
    test_company_pedigree()
    test_competition_bonus()
    test_garbage_input()

    print(f"\n{'='*65}")
    print(f"ALL EXPERIMENTS COMPLETE ({time.time()-t0:.0f}s)")
    print(f"{'='*65}")
