"""InterviewerPlayer — the technical interviewer / hiring committee member.

Private type: strictness, bias_vector, preferred_skill_style, risk_tolerance
Observable:    resume signals, interview performance (if simulated), market signals
Hidden from:   HR's budget, candidate's outside options

Strategy: evaluate candidate, produce structured score, flag risks
"""

from __future__ import annotations

from datetime import date as date_cls, datetime

from game.players.base import BayesianPlayer, PlayerConfig
from models.schemas import AgentAction, GameState, InterviewerPrivateType


class InterviewerPlayer(BayesianPlayer):
    player_role = "interviewer"

    def __init__(self, private_type: InterviewerPrivateType, config: PlayerConfig | None = None):
        super().__init__(config)
        self.private_type = private_type

    def get_private_view(self, state: GameState, role: str) -> dict:
        return {
            "role": "interviewer",
            "private": {
                "strictness": self.private_type.strictness,
                "preferred_skill_style": self.private_type.preferred_skill_style,
                "risk_tolerance": self.private_type.risk_tolerance,
                # Bias vector is truly private — not even shown in the "view"
            },
            "public": {
                "round": state.round,
                "candidate_skills": state.resume.skills,
                "candidate_experience": [
                    {"title": e.title, "company": e.company}
                    for e in state.resume.experience[:5]
                ],
                "candidate_education": [
                    {"school": e.school, "degree": e.degree}
                    for e in state.resume.education
                ],
                "job_requirements": state.job.required_skills,
                "job_level": state.job.level,
            },
            "beliefs": {
                k: b.model_dump() for k, b in state.interviewer_beliefs.items()
            },
        }

    # ── Rule-based evaluation (realistic multi-round interview simulation) ─

    def _act_rules(self, state: GameState, private_view: dict) -> AgentAction:
        """Simulate a realistic Chinese tech interview process.

        Structure mirrors real hiring:
          1. Coding/Algorithm round
          2. System Design round (weighted by level)
          3. Domain Expertise round
          4. Culture/Communication assessment

        Signal integration:
          - School tier → affects Coding + System Design
          - Competition → affects Coding (algorithms)
          - Company pedigree → affects System Design + Domain
          - Years of experience → affects all, with diminishing returns
          - Level-dependent weights: senior roles emphasize design, junior emphasize coding
        """
        itype = self.private_type
        level = state.job.level
        total_years = self._compute_total_years(state)

        # ── Dimension weights by level ──
        # Junior (P5/P6): coding matters most
        # Senior (P7/P8): system design + domain matter most
        # Staff+ (P9): design + leadership matter most
        is_junior = level in ("P5", "P6", "T2-1", "T2-3", "1-2", "2-1", "L5", "L6")
        is_senior = level in ("P7", "P8", "T3-1", "T3-3", "2-2", "3-1", "L7", "L8")
        # Default: staff+

        if is_junior:
            w = {"coding": 0.35, "design": 0.15, "domain": 0.25, "soft": 0.15, "growth": 0.10}
        elif is_senior:
            w = {"coding": 0.20, "design": 0.30, "domain": 0.30, "soft": 0.10, "growth": 0.10}
        else:
            w = {"coding": 0.10, "design": 0.35, "domain": 0.30, "soft": 0.15, "growth": 0.10}

        # ── Compute dimension scores ──

        # 1. CODING — skill match + school foundation + competition
        coding_base = self._eval_coding(state)
        # School bonus: stronger for juniors, weaker for seniors
        school_bonus = self._get_school_bonus(state)
        if is_junior:
            coding_base += school_bonus * 0.25  # School matters a lot for juniors
        elif is_senior:
            coding_base += school_bonus * 0.08  # Barely matters for seniors
        # Competition bonus: only for juniors
        comp_bonus = self._get_competition_bonus(state)
        if is_junior:
            coding_base += comp_bonus * 0.20
        coding_score = min(coding_base, 1.0)

        # 2. SYSTEM DESIGN — experience + company pedigree
        design_score = self._eval_system_design(state)
        company_bonus = self._get_company_bonus(state)
        design_score = min(design_score + company_bonus * 0.25, 1.0)

        # 3. DOMAIN EXPERTISE — deep skill match + relevant experience
        domain_score = self._eval_domain_expertise(state)
        domain_score = min(domain_score + company_bonus * 0.15, 1.0)

        # 4. SOFT SKILLS — communication, culture fit, stability
        soft_score = self._eval_culture_fit(state)
        stability_penalty = self._get_stability_penalty(state)
        soft_score = max(soft_score - stability_penalty, 0.0)

        # 5. GROWTH POTENTIAL — trajectory, learning signals
        growth_score = self._eval_growth_potential(state)
        if is_junior:
            growth_score += comp_bonus * 0.15  # Competition signals learning ability

        # ── Composite ──
        raw = (
            coding_score * w["coding"]
            + design_score * w["design"]
            + domain_score * w["domain"]
            + soft_score * w["soft"]
            + growth_score * w["growth"]
        )

        # Strictness adjustment
        strictness_adj = (itype.strictness - 0.5) * 0.25
        # Bias adjustments
        bias = self._compute_bias_adjustments(state)
        adjusted = min(max(raw - strictness_adj + bias["total"], 0.0), 1.0)

        # ── Age threshold penalty ──
        age_penalty, age_flag = self._check_age_threshold(state)
        if age_flag:
            adjusted = max(adjusted - age_penalty, 0.0)

        # ── Recommendation ──
        if adjusted >= 0.72:
            recommendation = "strong_hire"
        elif adjusted >= 0.52:
            recommendation = "hire"
        elif adjusted >= 0.35:
            recommendation = "weak_hire"
        else:
            recommendation = "no_hire"

        risk_flags = self._identify_risks(state)

        # Apply time/logic penalties (progressive based on severity)
        time_anomaly_count = sum(1 for r in risk_flags if "时间异常" in r)
        adjusted = max(adjusted - 0.06 * time_anomaly_count, 0.0)

        overlap_count = sum(1 for r in risk_flags if "经历重叠" in r)
        adjusted = max(adjusted - 0.05 * overlap_count, 0.0)

        for r in risk_flags:
            if "长期空窗" in r:
                # Extract gap years from message
                import re
                m = re.search(r'空窗([\d.]+)年', r)
                years = float(m.group(1)) if m else 1.5
                penalty = min(0.04 * years, 0.25)  # Cap at 0.25
                adjusted = max(adjusted - penalty, 0.0)

        if any("关键词堆砌" in r for r in risk_flags):
            adjusted = max(adjusted - 0.08, 0.0)
        if any("晋升速度异常" in r for r in risk_flags):
            adjusted = max(adjusted - 0.06, 0.0)

        return AgentAction(
            player="interviewer", action_type="evaluate",
            params={
                "overall_score": round(adjusted, 3),
                "sub_scores": {
                    "coding": round(coding_score, 3),
                    "system_design": round(design_score, 3),
                    "domain_expertise": round(domain_score, 3),
                    "soft_skills": round(soft_score, 3),
                    "growth_potential": round(growth_score, 3),
                },
                "recommendation": recommendation,
                "risk_flags": risk_flags,
                "strictness_applied": itype.strictness,
                "bias_breakdown": bias["breakdown"],
                "age_flag": age_flag,
            },
            reasoning=(
                f"面评: {adjusted:.2f} → {recommendation}. "
                f"编码={coding_score:.0%} 架构={design_score:.0%} "
                f"领域={domain_score:.0%} 软技能={soft_score:.0%} 成长={growth_score:.0%}. "
                f"严格度={itype.strictness:.0%}. "
                + (f"风险: {'; '.join(risk_flags[:3])}" if risk_flags else "")
            ),
            confidence=round(1.0 - abs(0.5 - adjusted), 2),
            round=state.round, timestamp=datetime.now().isoformat(),
        )

    # ── Dimension evaluators ────────────────────────────────────────────

    def _eval_coding(self, state: GameState) -> float:
        """Coding/Algorithm round: skill match + depth."""
        req = {s.lower().strip() for s in state.job.required_skills}
        cand = {s.lower().strip() for s in state.resume.skills}
        if not req:
            return 0.5
        exact = len(req & cand) / len(req)
        # Adjacent skill bonus (e.g., Python for Go role)
        adjacent = {
            "go": {"python", "rust", "java", "c++"},
            "python": {"go", "java", "c++"},
            "java": {"go", "python", "c++", "kotlin"},
            "react": {"vue", "angular", "svelte"},
            "kubernetes": {"docker", "helm"},
        }
        adj_count = sum(1 for r in (req - cand) if adjacent.get(r, set()) & cand)
        return min(exact + adj_count * 0.06, 1.0)

    def _eval_system_design(self, state: GameState) -> float:
        """System Design round: experience-driven architecture ability."""
        total_years = self._compute_total_years(state)
        from core.china_market_model import LEVEL_YEARS
        expected = LEVEL_YEARS.get(state.job.level, 3)

        # Years score with diminishing returns after 2x expected
        if total_years >= expected * 2:
            years_score = 0.9 + min((total_years - expected * 2) / 10, 0.1)
        else:
            years_score = min(total_years / max(expected, 1), 0.9)

        # Project complexity signal
        projects = state.resume.projects or []
        has_scale = False
        for p in projects:
            desc = (p.description or "").lower()
            if any(kw in desc for kw in ("qps", "万", "亿", "p99", "延迟", "可用", "分布式", "集群", "高并发")):
                has_scale = True
                break

        return years_score * 0.65 + (0.30 if has_scale else 0.10)

    def _eval_domain_expertise(self, state: GameState) -> float:
        """Domain expertise: how well does candidate know THIS specific domain."""
        req = {s.lower().strip() for s in state.job.required_skills}
        cand = {s.lower().strip() for s in state.resume.skills}
        if not req:
            return 0.5
        # Deep match: how many required skills does candidate claim proficiency in?
        skill_levels = state.resume.skill_levels or {}
        deep_count = sum(
            1 for s in (req & cand)
            if skill_levels.get(s, "") in ("精通", "专家", "熟练")
        )
        breadth = len(req & cand) / len(req)
        depth = deep_count / max(len(req), 1)
        return breadth * 0.4 + depth * 0.4 + 0.2

    def _eval_culture_fit(self, state: GameState) -> float:
        """Culture/communication: big-company experience signals process maturity."""
        companies = [e.company.lower() for e in state.resume.experience]
        big_tech = {"阿里", "字节", "腾讯", "百度", "华为", "美团", "京东", "google", "amazon", "microsoft"}
        has_big = any(any(kw in c for kw in big_tech) for c in companies)
        unique = len(set(companies)) if companies else 0

        score = 0.50
        if has_big:
            score += 0.22
        if unique >= 3:
            score += 0.10
        if unique >= 5:
            score += 0.08
        # Too many jobs = job hopper concern
        if unique >= 5 and self._compute_total_years(state) < 8:
            score -= 0.10
        return min(max(score, 0.0), 1.0)

    def _eval_growth_potential(self, state: GameState) -> float:
        """Growth potential: trajectory steepness + learning signals."""
        total_years = self._compute_total_years(state)
        skills = state.resume.skills or []
        competitions = state.resume.competitions or []
        projects = state.resume.projects or []

        # Skill acquisition rate
        skill_rate = len(skills) / max(total_years, 0.5)
        rate_score = min(skill_rate / 8.0, 1.0) * 0.35

        # Project impact growth
        has_metrics = any(
            any(kw in (p.description or "").lower()
                for kw in ("qps", "万", "亿", "%", "倍", "p99", "降低", "提升"))
            for p in projects
        )
        proj_score = (0.75 if has_metrics else 0.25) * 0.30

        # Promotion speed
        titles = list(dict.fromkeys(e.title for e in state.resume.experience if e.title))
        promo_score = min(len(titles) / max(total_years / 2, 1), 1.0) * 0.35

        return min(rate_score + proj_score + promo_score, 1.0)

    # ── Signal extractors (shared across dimensions) ─────────────────────

    @staticmethod
    def _compute_total_years(state: GameState) -> float:
        total = 0.0
        today = date_cls.today()
        for exp in state.resume.experience:
            if exp.start_date:
                end = exp.end_date or today
                total += (end - exp.start_date).days / 365.0
        return max(total, 0.0)

    @staticmethod
    def _get_school_bonus(state: GameState) -> float:
        """School prestige bonus — calibrated for Chinese tech hiring."""
        if not state.resume.education:
            return 0.0
        tier_map = {"C9": 0.20, "QS100": 0.18, "985": 0.14, "211": 0.08, "双一流": 0.06}
        best = 0.0
        for edu in state.resume.education:
            from core.knowledge.knowledge_base import classify_school
            tier, _, _ = classify_school(edu.school)
            best = max(best, tier_map.get(tier, 0.0))
        return best

    @staticmethod
    def _get_competition_bonus(state: GameState) -> float:
        """Competition achievement bonus."""
        if not state.resume.competitions:
            return 0.0
        from core.knowledge.knowledge_base import classify_competition
        level_scores = {"S": 0.22, "A": 0.14, "B": 0.06, "C": 0.02}
        best = 0.0
        for comp in state.resume.competitions:
            level, _, _ = classify_competition(comp.name, comp.award)
            best = max(best, level_scores.get(level, 0.0))
        return best

    @staticmethod
    def _get_company_bonus(state: GameState) -> float:
        """Company pedigree bonus — T1 experience is gold in Chinese tech."""
        if not state.resume.experience:
            return 0.0
        from core.knowledge.knowledge_base import classify_company
        tiers = []
        for exp in state.resume.experience:
            tier, _, _ = classify_company(exp.company)
            tiers.append(tier)
        t1_count = tiers.count("T1") + tiers.count("foreign")
        if t1_count >= 2:
            return 0.22
        elif t1_count == 1:
            return 0.15
        elif "T2" in tiers:
            return 0.07
        return 0.0

    @staticmethod
    def _get_stability_penalty(state: GameState) -> float:
        """Job-hopping penalty. Chinese internet: <1yr tenure = red flag."""
        if not state.resume.experience:
            return 0.0
        today = date_cls.today()
        tenures = []
        for exp in state.resume.experience:
            if exp.start_date:
                end = exp.end_date or today
                tenures.append((end - exp.start_date).days / 365.0)
        if not tenures:
            return 0.0
        avg = sum(tenures) / len(tenures)
        if avg < 0.8:
            return 0.25
        elif avg < 1.2:
            return 0.15
        elif avg < 1.8:
            return 0.05
        return 0.0

    @staticmethod
    def _check_age_threshold(state: GameState) -> tuple[float, bool]:
        """Check candidate against implicit age thresholds for this level."""
        from core.china_market_model import AGE_THRESHOLDS, COMPANY_AGE_TOLERANCE
        threshold = AGE_THRESHOLDS.get(state.job.level)
        if not threshold:
            return 0.0, False
        total_years = InterviewerPlayer._compute_total_years(state)
        # Estimate age: assume start working at 22 (bachelor) or 25 (master)
        has_master = any(e.degree in ("硕士", "博士") for e in state.resume.education)
        start_age = 25 if has_master else 22
        est_age = start_age + total_years

        company_tolerance = COMPANY_AGE_TOLERANCE.get(state.job.company, 1.0)
        soft_ceiling = threshold["soft_ceiling"] * company_tolerance
        hard_ceiling = threshold["hard_ceiling"] * company_tolerance

        if est_age > hard_ceiling:
            return 0.20, True
        elif est_age > soft_ceiling:
            return 0.08, True
        return 0.0, False

    # ── Bias adjustments ────────────────────────────────────────────────

    def _compute_bias_adjustments(self, state: GameState) -> dict:
        bias_vec = self.private_type.bias_vector or {}
        breakdown = {}
        total = 0.0

        school_bias = bias_vec.get("school_prestige", 0.0)
        if school_bias != 0:
            has_elite = self._get_school_bonus(state) > 0.10
            adj = school_bias * (0.10 if has_elite else -0.08)
            breakdown["school_prestige"] = adj
            total += adj

        big_company_bias = bias_vec.get("big_company", 0.0)
        if big_company_bias != 0:
            has_big = self._get_company_bonus(state) > 0.10
            adj = big_company_bias * (0.08 if has_big else -0.06)
            breakdown["big_company"] = adj
            total += adj

        youth_bias = bias_vec.get("youth", 0.0)
        if youth_bias != 0:
            total_years = self._compute_total_years(state)
            is_young = total_years < 5
            adj = youth_bias * (0.08 if is_young else -0.08)
            breakdown["youth"] = adj
            total += adj

        return {"total": round(total, 3), "breakdown": breakdown}

    def _identify_risks(self, state: GameState) -> list[str]:
        risks = []
        total_years = self._compute_total_years(state)

        # Skill gap
        req = {s.lower().strip() for s in state.job.required_skills}
        cand = {s.lower().strip() for s in state.resume.skills}
        gap = req - cand
        if len(gap) / max(len(req), 1) > 0.35:
            risks.append(f"关键技能缺失: {', '.join(list(gap)[:3])}")

        # Job hopping
        penalty = self._get_stability_penalty(state)
        if penalty > 0.10:
            risks.append("频繁跳槽风险")

        # Over/under qualified
        from core.china_market_model import LEVEL_YEARS
        expected = LEVEL_YEARS.get(state.job.level, 3)
        if total_years > expected * 2.5:
            risks.append(f"过度资历: {total_years:.0f}年经验 vs {expected}年要求")
        elif total_years < expected * 0.4:
            risks.append(f"经验不足: {total_years:.1f}年 vs {expected}年要求")

        # Age flag
        _, age_flag = self._check_age_threshold(state)
        if age_flag:
            risks.append("年龄接近职级软上限")

        # ── Time logic checks ──
        time_risks = self._check_time_consistency(state)
        risks.extend(time_risks)

        # ── Keyword stuffing detection ──
        if len(state.resume.skills) > 25:
            risks.append(f"技能数量异常({len(state.resume.skills)}项)，疑似关键词堆砌")
        all_proficient = all(
            v in ("精通", "专家") for v in (state.resume.skill_levels or {}).values()
        )
        if all_proficient and len(state.resume.skill_levels or {}) > 10:
            risks.append("所有技能标注精通/专家，可信度存疑")

        return risks

    @staticmethod
    def _check_time_consistency(state: GameState) -> list[str]:
        """Detect timeline anomalies: pre-graduation work, overlapping jobs, gaps."""
        risks = []
        today = date_cls.today()

        # Find graduation date
        grad_year = None
        for edu in state.resume.education:
            y = edu.graduation_year
            if y and (grad_year is None or y > grad_year):
                grad_year = y

        # Check experiences
        exps = sorted(
            state.resume.experience,
            key=lambda e: e.start_date or today
        )

        for exp in exps:
            if not exp.start_date:
                continue
            start = exp.start_date

            # Pre-graduation check
            if grad_year and start.year < grad_year:
                risks.append(
                    f"时间异常: {exp.company}经历开始于{start.year}年，早于毕业年份{grad_year}年"
                )

            # Unreasonable promotion speed
            total_years = InterviewerPlayer._compute_total_years(state)
            title = exp.title or ""
            high_titles = ("P8", "P9", "T3-3", "T4", "3-2", "L8", "L9",
                          "架构师", "CTO", "VP", "总监", "负责人", "主管", "Staff", "Principal")
            if any(t in title for t in high_titles) and total_years < 6:
                risks.append(f"晋升速度异常: {total_years:.0f}年经验即达到{title}")

        # Overlapping jobs check (gap < -30 days = overlap)
        for i in range(len(exps) - 1):
            if exps[i].end_date and exps[i+1].start_date:
                gap_days = (exps[i+1].start_date - exps[i].end_date).days
                if gap_days < -30:
                    risks.append(
                        f"经历重叠: {exps[i].company}与{exps[i+1].company}存在{abs(gap_days)}天重叠"
                    )

        # Long gap check (>1.5 years between jobs)
        for i in range(len(exps) - 1):
            if exps[i].end_date and exps[i+1].start_date:
                gap_days = (exps[i+1].start_date - exps[i].end_date).days
                if gap_days > 547:  # 1.5 years
                    risks.append(
                        f"长期空窗: {exps[i].company}与{exps[i+1].company}之间空窗{gap_days/365:.1f}年"
                    )

        return risks

    # ── Deliberation-powered evaluation ─────────────────────────────────
    # The old _act_llm single-prompt approach is replaced by the two-phase
    # deliberation engine in base.py's _deliberate_and_act().
    # Interviewer-specific prompt building is in game/deliberation.py:_interviewer_phase1()
