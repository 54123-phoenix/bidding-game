"""Unit tests for knowledge_base classification functions."""

from __future__ import annotations

import pytest

from core.knowledge.knowledge_base import (
    classify_company,
    classify_competition,
    classify_school,
    extract_project_metrics,
    normalize_skill,
    normalize_skills,
)


class TestNormalizeSkill:
    def test_exact_match(self):
        assert normalize_skill("Go") == "Go"

    def test_synonym_lowercase(self):
        assert normalize_skill("k8s") == "Kubernetes"

    def test_synonym_case_insensitive(self):
        assert normalize_skill("React.js") == "React"

    def test_chinese_skill(self):
        assert normalize_skill("大模型") == "LLM"

    def test_unknown_skill(self):
        assert normalize_skill("SomeRareSkill") == "SomeRareSkill"

    def test_no_duplicate_in_dict(self):
        """Verify normalize_skill has no dead-code duplicate check."""
        result = normalize_skill("llm")
        assert result == "LLM"


class TestNormalizeSkills:
    def test_deduplication(self):
        result = normalize_skills(["Go", "golang", "k8s", "kubernetes"])
        assert "Go" in result
        assert "Kubernetes" in result
        assert len(result) == 2, f"Expected 2 unique skills, got {result}"

    def test_empty(self):
        assert normalize_skills([]) == []

    def test_all_unknown(self):
        assert normalize_skills(["abc", "xyz"]) == ["abc", "xyz"]


class TestClassifySchool:
    def test_c9_school(self):
        tier, label, multiplier = classify_school("清华大学")
        assert tier == "C9"
        assert multiplier == 1.15

    def test_985_school(self):
        tier, _, multiplier = classify_school("华中科技大学")
        assert tier == "985"
        assert multiplier == 1.10

    def test_211_school(self):
        tier, _, multiplier = classify_school("北京邮电大学")
        assert tier == "211"
        assert multiplier == 1.05

    def test_qs100_school(self):
        tier, _, multiplier = classify_school("MIT")
        assert tier == "QS100"
        assert multiplier == 1.10

    def test_unknown_school(self):
        tier, label, multiplier = classify_school("某不知名学院")
        assert tier == "其他"
        assert multiplier == 1.00

    def test_fuzzy_match(self):
        tier, _, _ = classify_school("北京大学医学部")
        assert tier in ("C9", "985", "QS100")


class TestClassifyCompany:
    def test_t1_chinese(self):
        tier, label, weight = classify_company("阿里巴巴")
        assert tier == "T1"
        assert weight == 1.3

    def test_t1_foreign(self):
        tier, label, weight = classify_company("Google")
        assert tier == "foreign"
        assert weight == 1.15

    def test_t2(self):
        tier, label, weight = classify_company("哔哩哔哩")
        assert tier == "T2"
        assert weight == 1.1

    def test_t3_unknown(self):
        tier, label, weight = classify_company("某不知名科技公司")
        assert tier == "T3"
        assert weight == 1.0

    def test_startup(self):
        tier, _, weight = classify_company("某创业公司")
        assert tier == "startup"
        assert weight == 0.9

    def test_fuzzy_match(self):
        tier, _, _ = classify_company("阿里巴巴集团控股有限公司")
        assert tier == "T1"


class TestClassifyCompetition:
    def test_acm_gold(self):
        level, label, bonus = classify_competition("ACM-ICPC", "金奖")
        assert level == "S"
        assert bonus > 0.10

    def test_kaggle_silver(self):
        level, _, bonus = classify_competition("Kaggle", "silver")
        assert level == "A"
        assert 0.03 < bonus < 0.12

    def test_unknown_competition(self):
        level, _, bonus = classify_competition("某不知名比赛", "参与奖")
        assert level == "C"
        assert bonus < 0.05

    def test_no_award(self):
        level, _, bonus = classify_competition("ACM-ICPC", "")
        assert level == "S"
        assert bonus > 0.02  # default award modifier applied


class TestExtractProjectMetrics:
    def test_qps_extraction(self):
        metrics = extract_project_metrics("QPS: 1000万，支撑双11峰值")
        assert "QPS" in metrics, f"No QPS found in {metrics}"

    def test_latency_extraction(self):
        metrics = extract_project_metrics("P99延迟从200ms降至35ms")
        assert "P99延迟" in metrics

    def test_no_metrics(self):
        metrics = extract_project_metrics("负责日常开发和维护工作")
        assert len(metrics) == 0

    def test_availability(self):
        metrics = extract_project_metrics("可用性99.99%，系统稳定运行")
        assert "可用性" in metrics, f"No availability found in {metrics}"
