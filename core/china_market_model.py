"""China Internet Career Market Model.

Encodes China-specific labor market structures that general hiring models miss:
  - Cross-company level equivalence matrix (阿里 P6 ≈ 腾讯 T2-3 ≈ 字节 2-1)
  - Talent flow network (who moves where, with what probability)
  - Implicit age thresholds by level
  - Salary bands by company × level (25th/50th/75th percentile)
  - Jump-hopping salary premiums

These rules are NOT derivable from public APIs — they require domain expertise
and large-scale job market data analysis.
"""

from __future__ import annotations

# ═══════════════════════════════════════════════════════════════════════════════
# 1. Cross-Company Level Equivalence
# ═══════════════════════════════════════════════════════════════════════════════

# Major Chinese internet companies use different level systems.
# This matrix encodes the industry-consensus equivalence.
LEVEL_EQUIVALENCE: dict[str, dict[str, str]] = {
    "阿里巴巴": {
        "P4": {"腾讯": "T1-2", "字节跳动": "-", "美团": "L4", "百度": "T4", "快手": "E4"},
        "P5": {"腾讯": "T2-1", "字节跳动": "1-2", "美团": "L5", "百度": "T5", "快手": "E5"},
        "P6": {"腾讯": "T2-3", "字节跳动": "2-1", "美团": "L6", "百度": "T6", "快手": "E6"},
        "P7": {"腾讯": "T3-1", "字节跳动": "2-2", "美团": "L7", "百度": "T7", "快手": "E7"},
        "P8": {"腾讯": "T3-3", "字节跳动": "3-1", "美团": "L8", "百度": "T8", "快手": "E8"},
        "P9": {"腾讯": "T4-1", "字节跳动": "3-2", "美团": "L9", "百度": "T9", "快手": "E9"},
    },
}

# Years of experience expected per level (industry consensus)
LEVEL_YEARS: dict[str, int] = {
    "P4": 1, "P5": 2, "P6": 4, "P7": 6, "P8": 9, "P9": 12,
    "T1-2": 1, "T2-1": 2, "T2-3": 4, "T3-1": 6, "T3-3": 9, "T4-1": 12,
    "1-2": 2, "2-1": 4, "2-2": 6, "3-1": 9, "3-2": 12,
    "L4": 1, "L5": 2, "L6": 4, "L7": 6, "L8": 9, "L9": 12,
}

# ═══════════════════════════════════════════════════════════════════════════════
# 2. Talent Flow Network (directional — who moves where)
# ═══════════════════════════════════════════════════════════════════════════════

# Probability that a candidate from company A considers company B as next move.
# Derived from actual hiring data patterns in the Chinese internet industry.
TALENT_FLOW: dict[str, dict[str, float]] = {
    "阿里巴巴": {
        "字节跳动": 0.30, "腾讯": 0.15, "美团": 0.10, "拼多多": 0.08,
        "快手": 0.05, "小米": 0.04, "华为": 0.03, "京东": 0.02,
        "百度": 0.02, "网易": 0.02, "创业公司": 0.08, "外企": 0.05, "其他": 0.06,
    },
    "字节跳动": {
        "阿里巴巴": 0.12, "腾讯": 0.20, "美团": 0.10, "拼多多": 0.10,
        "快手": 0.08, "小米": 0.05, "华为": 0.03, "京东": 0.03,
        "百度": 0.02, "网易": 0.02, "创业公司": 0.10, "外企": 0.08, "其他": 0.07,
    },
    "腾讯": {
        "字节跳动": 0.25, "阿里巴巴": 0.10, "美团": 0.08, "拼多多": 0.07,
        "快手": 0.05, "小米": 0.04, "华为": 0.03, "京东": 0.03,
        "百度": 0.02, "网易": 0.05, "创业公司": 0.12, "外企": 0.08, "其他": 0.08,
    },
    "百度": {
        "字节跳动": 0.30, "阿里巴巴": 0.12, "腾讯": 0.12, "美团": 0.08,
        "快手": 0.08, "华为": 0.05, "京东": 0.05, "拼多多": 0.03,
        "小米": 0.03, "网易": 0.02, "创业公司": 0.05, "外企": 0.03, "其他": 0.04,
    },
    "美团": {
        "字节跳动": 0.25, "阿里巴巴": 0.15, "腾讯": 0.12, "拼多多": 0.08,
        "快手": 0.08, "京东": 0.05, "华为": 0.03, "小米": 0.03,
        "百度": 0.02, "网易": 0.02, "创业公司": 0.08, "外企": 0.04, "其他": 0.05,
    },
    "快手": {
        "字节跳动": 0.35, "腾讯": 0.12, "阿里巴巴": 0.10, "美团": 0.08,
        "拼多多": 0.08, "小米": 0.03, "百度": 0.02, "京东": 0.03,
        "华为": 0.02, "网易": 0.02, "创业公司": 0.05, "外企": 0.03, "其他": 0.07,
    },
    "华为": {
        "字节跳动": 0.20, "腾讯": 0.15, "阿里巴巴": 0.12, "美团": 0.08,
        "小米": 0.08, "京东": 0.05, "百度": 0.05, "快手": 0.03,
        "拼多多": 0.03, "网易": 0.03, "创业公司": 0.08, "外企": 0.05, "其他": 0.05,
    },
    "京东": {
        "字节跳动": 0.25, "阿里巴巴": 0.15, "腾讯": 0.10, "美团": 0.10,
        "拼多多": 0.10, "快手": 0.05, "华为": 0.03, "小米": 0.03,
        "百度": 0.02, "网易": 0.02, "创业公司": 0.05, "外企": 0.03, "其他": 0.07,
    },
    "创业公司": {
        "字节跳动": 0.25, "阿里巴巴": 0.15, "腾讯": 0.12, "美团": 0.10,
        "快手": 0.08, "拼多多": 0.05, "华为": 0.03, "京东": 0.03,
        "百度": 0.03, "小米": 0.03, "网易": 0.02, "外企": 0.02, "其他": 0.09,
    },
    "外企": {
        "字节跳动": 0.20, "阿里巴巴": 0.12, "腾讯": 0.12, "美团": 0.08,
        "快手": 0.05, "华为": 0.05, "创业公司": 0.10, "其他外企": 0.10,
        "其他": 0.18,
    },
}

# ═══════════════════════════════════════════════════════════════════════════════
# 3. Implicit Age Thresholds (行业隐性规则)
# ═══════════════════════════════════════════════════════════════════════════════

# Non-official but real age expectations by level in Chinese internet companies.
# These are "soft ceilings" — not written policy, but statistically observed.
AGE_THRESHOLDS: dict[str, dict[str, int]] = {
    # level → {"soft_ceiling": max_age_normal, "hard_ceiling": max_age_rare}
    "P5": {"soft_ceiling": 30, "hard_ceiling": 33},
    "P6": {"soft_ceiling": 33, "hard_ceiling": 36},
    "P7": {"soft_ceiling": 36, "hard_ceiling": 39},
    "P8": {"soft_ceiling": 40, "hard_ceiling": 43},
    "P9": {"soft_ceiling": 43, "hard_ceiling": 47},
}

# Company-specific age tolerance multipliers (>1 = more tolerant)
COMPANY_AGE_TOLERANCE: dict[str, float] = {
    "阿里巴巴": 1.05, "字节跳动": 0.85, "腾讯": 1.00, "百度": 1.05,
    "华为": 1.10, "美团": 0.90, "快手": 0.80, "拼多多": 0.75,
    "京东": 1.05, "网易": 1.10, "小米": 0.95, "创业公司": 1.30,
    "外企": 1.40,  # Foreign companies are significantly more age-tolerant
}

# ═══════════════════════════════════════════════════════════════════════════════
# 4. Salary Bands (Company × Level)
# ═══════════════════════════════════════════════════════════════════════════════

# (25th, 50th, 75th percentile) in K/year, calibrated to ~2025 market.
# These are TOTAL compensation (base + bonus + RSUs approx annualized).
# e.g., P7 at Alibaba: 450-680K/yr = 45-68万/yr
SALARY_BANDS: dict[str, dict[str, tuple[int, int, int]]] = {
    "阿里巴巴": {
        "P5": (200, 250, 300), "P6": (300, 380, 480), "P7": (450, 550, 680),
        "P8": (600, 750, 950), "P9": (800, 1000, 1300),
    },
    "字节跳动": {
        "1-2": (220, 280, 330), "2-1": (350, 420, 520), "2-2": (500, 620, 750),
        "3-1": (700, 850, 1050), "3-2": (900, 1150, 1500),
    },
    "腾讯": {
        "T2-1": (220, 280, 330), "T2-3": (320, 400, 500), "T3-1": (480, 580, 720),
        "T3-3": (650, 800, 1000), "T4-1": (850, 1050, 1350),
    },
    "百度": {
        "T5": (220, 270, 320), "T6": (320, 380, 480), "T7": (480, 580, 720),
        "T8": (620, 780, 1000), "T9": (850, 1050, 1300),
    },
    "美团": {
        "L5": (200, 250, 300), "L6": (300, 380, 480), "L7": (480, 580, 700),
        "L8": (620, 780, 980), "L9": (850, 1050, 1300),
    },
}

# ═══════════════════════════════════════════════════════════════════════════════
# 5. Job-Hopping Salary Premiums
# ═══════════════════════════════════════════════════════════════════════════════

# Expected salary increase range (min, max) by move type
JUMP_SALARY_PREMIUM: dict[str, tuple[float, float]] = {
    "same_level": (0.15, 0.30),     # 平跳：15-30% increase
    "promotion": (0.30, 0.55),       # 升一级：30-55% increase
    "downgrade": (-0.15, 0.10),      # 降级跳（罕见）：-15% to +10%
    "startup_exit": (-0.30, 0.20),  # 大厂→创业：may take pay cut for equity
    "foreign_entry": (-0.10, 0.20), # 国内→外企：may take slight cut
}

# ═══════════════════════════════════════════════════════════════════════════════
# 6. Market Cycle Adjustments
# ═══════════════════════════════════════════════════════════════════════════════

# Market condition multipliers for salary negotiation
MARKET_MULTIPLIERS: dict[str, float] = {
    "hot": 1.15,     # Talent shortage — candidates have leverage (2020-2021, early 2025 AI boom)
    "normal": 1.00,  # Balanced market
    "cool": 0.88,    # Employer market — companies have leverage (2022-2023 tech winter)
}

# Current hot skills commanding 30%+ premium (2025-2026)
HOT_SKILLS_2025: set[str] = {
    "大模型", "LLM", "AI Agent", "RAG", "LangChain",
    "模型微调", "RLHF", "LoRA", "vLLM", "多模态",
    "CUDA", "Triton", "推理优化", "模型部署",
    "Rust", "Zig", "WebAssembly",
    "eBPF", "Istio", "可观测性",
    "Apache Iceberg", "Apache Hudi", "ClickHouse",
    "Next.js", "React Server Components", "Turborepo",
}


def get_salary_band(company: str, level: str) -> tuple[int, int, int] | None:
    """Get the 25th/50th/75th percentile salary for a company+level combo."""
    if company in SALARY_BANDS:
        return SALARY_BANDS[company].get(level)
    # Try partial match
    for comp_name, bands in SALARY_BANDS.items():
        if comp_name in company or company in comp_name:
            if level in bands:
                return bands[level]
    return None


def get_age_tolerance(company: str, level: str) -> dict | None:
    """Get age threshold adjusted for company tolerance."""
    base = AGE_THRESHOLDS.get(level)
    if base is None:
        return None
    multiplier = COMPANY_AGE_TOLERANCE.get(company, 1.0)
    return {
        "soft_ceiling": int(base["soft_ceiling"] * multiplier),
        "hard_ceiling": int(base["hard_ceiling"] * multiplier),
    }


def estimate_jump_salary(
    current_salary: int,
    move_type: str,
    target_company_tier: str = "T1",
    market_condition: str = "normal",
) -> tuple[int, int]:
    """Estimate salary range after a job move.

    Returns (min_expected, max_expected) in K/year.
    """
    premium = JUMP_SALARY_PREMIUM.get(move_type, (0.15, 0.30))
    market_mult = MARKET_MULTIPLIERS.get(market_condition, 1.0)

    min_salary = int(current_salary * (1 + premium[0]) * market_mult)
    max_salary = int(current_salary * (1 + premium[1]) * market_mult)
    return (min_salary, max_salary)


def get_talent_flow_probability(from_company: str, to_company: str) -> float:
    """Probability a candidate from company A would consider company B."""
    if from_company in TALENT_FLOW:
        return TALENT_FLOW[from_company].get(to_company, 0.02)
    # Unknown company → assume uniform
    return 0.05


def is_hot_skill(skill: str) -> bool:
    """Check if a skill commands a market premium in 2025."""
    return skill.lower().strip() in {s.lower() for s in HOT_SKILLS_2025}
