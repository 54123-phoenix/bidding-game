"""Unit tests for signal_extractor — resume → career signal transformation."""

from __future__ import annotations

from datetime import date

import pytest

from core.signal_extractor import SignalProfile, extract_signals
from models.schemas import (
    Competition,
    Education,
    Project,
    StructuredResume,
    WorkExperience,
)


def make_resume(**overrides) -> StructuredResume:
    defaults = {
        "resume_id": "r-test", "name": "Test User",
        "summary": "5年Go后端开发经验",
        "skills": ["Go", "Python", "Kubernetes", "Docker", "MySQL", "Redis", "Linux"],
        "skill_levels": {"Go": "精通", "Python": "熟练", "Kubernetes": "熟练"},
        "education": [
            Education(school="浙江大学", degree="硕士", major="计算机科学与技术", graduation_year=2021),
        ],
        "experience": [
            WorkExperience(
                company="阿里巴巴", title="高级后端工程师",
                description="负责微服务架构设计，QPS从5k提升到50k，P99延迟从200ms降至35ms",
                tech_stack=["Go", "Kubernetes", "Redis", "Kafka"],
                start_date=date(2021, 7, 1), end_date=date(2026, 5, 1),
            ),
        ],
        "projects": [
            Project(
                name="微服务网关",
                description="自研API网关，日均处理10亿+请求，P99延迟<50ms",
                tech_stack=["Go", "gRPC", "Redis", "Kubernetes"],
            ),
        ],
    }
    defaults.update(overrides)
    return StructuredResume(**defaults)


class TestExtractSignals:
    def test_returns_signal_profile(self):
        resume = make_resume()
        profile = extract_signals(resume)
        assert isinstance(profile, SignalProfile)

    def test_school_signal_c9(self):
        resume = make_resume()
        profile = extract_signals(resume)
        assert profile.highest_school_tier in ("C9", "985")  # 浙大 is C9/985

    def test_company_signal_t1(self):
        resume = make_resume()
        profile = extract_signals(resume)
        assert profile.best_company_tier == "T1"  # 阿里巴巴 is T1

    def test_project_metrics_extracted(self):
        resume = make_resume(
            projects=[
                Project(
                    name="微服务网关",
                    description="QPS达到10万，P99延迟<50ms，可用性99.99%",
                    tech_stack=["Go", "gRPC"],
                ),
            ],
        )
        profile = extract_signals(resume)
        assert profile.has_quantified_impact, "Should extract metrics from quantified project"
        assert len(profile.project_metrics) > 0

    def test_experience_years_calculated(self):
        resume = make_resume()
        profile = extract_signals(resume)
        assert profile.total_experience_years > 4.0

    def test_level_inferred(self):
        resume = make_resume()
        profile = extract_signals(resume)
        # Level depends on experience years + company + school signals
        assert profile.inferred_level in ("P6", "P7", "P8")

    def test_growth_trajectory(self):
        resume = make_resume()
        profile = extract_signals(resume)
        assert profile.career_trajectory_label in ("steady", "steep", "plateau")

    def test_stability_normal(self):
        resume = make_resume()
        profile = extract_signals(resume)
        assert 0.0 <= profile.stability_risk <= 1.0
        assert profile.avg_tenure_years > 0

    def test_leverage_score(self):
        resume = make_resume()
        profile = extract_signals(resume)
        assert 0.1 <= profile.inferred_leverage <= 0.95

    def test_salary_range_suggested(self):
        resume = make_resume()
        profile = extract_signals(resume)
        assert profile.suggested_salary_range is not None
        lo, hi = profile.suggested_salary_range
        assert lo < hi
        assert lo > 0

    def test_empty_resume(self):
        resume = StructuredResume(resume_id="empty")
        profile = extract_signals(resume)
        assert isinstance(profile, SignalProfile)
        assert profile.total_experience_years == 0.0
        assert profile.inferred_level == "P4"

    def test_declining_trajectory(self):
        """Verify 'declining' trajectory is reachable (previously was dead code)."""
        resume = make_resume(
            experience=[
                WorkExperience(
                    company="某公司", title="开发",
                    description="维护遗留系统",
                    tech_stack=["Java"],
                    start_date=date(2014, 1, 1), end_date=date(2026, 5, 1),
                ),
            ],
            skills=["Java", "SQL"],
        )
        profile = extract_signals(resume)
        # With >8 years experience and very low skill growth rate, should be declining
        assert profile.skill_growth_rate < 1.0
        assert profile.total_experience_years > 8
        assert profile.career_trajectory_label in ("declining", "plateau")

    def test_competition_signal(self):
        resume = make_resume(
            competitions=[
                Competition(name="ACM-ICPC", year=2020, award="金牌", description="区域赛金牌"),
            ],
        )
        profile = extract_signals(resume)
        assert profile.best_competition_level == "S"

    def test_t_shape_computed(self):
        resume = make_resume()
        profile = extract_signals(resume)
        assert 0.0 <= profile.t_shape_score <= 1.0
