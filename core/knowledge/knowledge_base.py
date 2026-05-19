"""Domain Knowledge Base — updatable reference tables for career signals.

All tables are dict-based for fast lookup and easy updating.
When new tech emerges, add entries here — no code changes needed elsewhere.
"""

from __future__ import annotations

# ═══════════════════════════════════════════════════════════════════════════════
# 1. Skill Synonym Map — canonical form for all recognized skills
# ═══════════════════════════════════════════════════════════════════════════════

SKILL_SYNONYMS: dict[str, str] = {
    # ── Languages ──
    "react.js": "React", "reactjs": "React",
    "vue.js": "Vue", "vuejs": "Vue",
    "node.js": "Node.js", "nodejs": "Node.js",
    "python3": "Python", "py": "Python",
    "typescript": "TypeScript", "ts": "TypeScript",
    "javascript": "JavaScript", "js": "JavaScript",
    "golang": "Go", "go-lang": "Go", "go": "Go",
    "rust-lang": "Rust",
    "c++": "C++", "cpp": "C++",
    "c#": "C#", "csharp": "C#",
    "postgresql": "PostgreSQL", "postgres": "PostgreSQL", "pg": "PostgreSQL",
    "mongodb": "MongoDB", "mongo": "MongoDB",
    "kubernetes": "Kubernetes", "k8s": "Kubernetes",
    "tensorflow": "TensorFlow", "tf": "TensorFlow",
    "pytorch": "PyTorch",
    "machine learning": "Machine Learning", "ml": "Machine Learning",
    "deep learning": "Deep Learning", "dl": "Deep Learning",
    "natural language processing": "NLP", "nlp": "NLP",
    "large language model": "LLM", "llm": "LLM",
    "fastapi": "FastAPI", "flask": "Flask", "django": "Django",
    "spring boot": "Spring Boot", "springboot": "Spring Boot",
    "aws": "AWS", "amazon web services": "AWS",
    "azure": "Azure", "gcp": "GCP", "google cloud": "GCP",
    "redis": "Redis", "kafka": "Kafka", "rabbitmq": "RabbitMQ",
    "graphql": "GraphQL", "gql": "GraphQL",
    "rest": "REST", "restful": "REST",
    "grpc": "gRPC",
    "ci/cd": "CI/CD", "cicd": "CI/CD",
    "git": "Git", "linux": "Linux", "unix": "Unix",
    "webassembly": "WebAssembly", "wasm": "WebAssembly",

    # ── AI / LLM Era (2024-2026) ──
    "大模型": "LLM",
    "检索增强生成": "RAG", "rag": "RAG",
    "智能体": "AI Agent", "ai agent": "AI Agent", "agent": "AI Agent",
    "提示工程": "Prompt Engineering", "prompt engineering": "Prompt Engineering",
    "langchain": "LangChain",
    "向量数据库": "向量数据库", "vector database": "向量数据库",
    "embedding": "Embedding",
    "微调": "模型微调", "fine-tuning": "模型微调", "sft": "模型微调",
    "rlhf": "RLHF", "人类反馈强化学习": "RLHF",
    "lora": "LoRA", "qlora": "QLoRA",
    "扩散模型": "扩散模型", "stable diffusion": "Stable Diffusion",
    "transformers": "Transformers",
    "huggingface": "HuggingFace", "hugging face": "HuggingFace",
    "vllm": "vLLM",
    "语义搜索": "语义搜索", "semantic search": "语义搜索",
    "多模态": "多模态", "multimodal": "多模态",

    # ── Cloud Native ──
    "服务网格": "Service Mesh", "service mesh": "Service Mesh",
    "istio": "Istio",
    "ebpf": "eBPF",
    "serverless": "Serverless", "无服务器": "Serverless",
    "gitops": "GitOps",
    "argocd": "ArgoCD",
    "helm": "Helm",
    "terraform": "Terraform", "iac": "Infrastructure as Code",
    "可观测性": "可观测性", "observability": "可观测性",
    "prometheus": "Prometheus", "grafana": "Grafana",
    "云原生": "云原生", "cloud native": "云原生",

    # ── Data Engineering ──
    "clickhouse": "ClickHouse",
    "starrocks": "StarRocks", "doris": "Apache Doris",
    "hudi": "Apache Hudi", "iceberg": "Apache Iceberg",
    "delta lake": "Delta Lake",
    "dbt": "dbt",
    "flink": "Apache Flink", "spark": "Apache Spark",
    "hadoop": "Hadoop",
    "数据仓库": "数据仓库", "数仓": "数据仓库",
    "数据湖": "数据湖", "data lake": "数据湖",
    "实时计算": "实时计算", "流计算": "流计算",
    "etl": "ETL", "elt": "ELT",

    # ── Emerging / Modern ──
    "svelte": "Svelte",
    "trpc": "tRPC",
    "bun": "Bun", "deno": "Deno",
    "zig": "Zig",
    "astro": "Astro",
    "next.js": "Next.js", "nextjs": "Next.js",
    "remix": "Remix",
    "tailwind": "Tailwind CSS", "tailwindcss": "Tailwind CSS",
    "prisma": "Prisma",
    "drizzle": "Drizzle ORM",
    "turborepo": "Turborepo",
    "pnpm": "pnpm",

    # ── Chinese Tech Industry Terms ──
    "高并发": "高并发",
    "容灾": "容灾", "灾备": "容灾",
    "多活": "多活架构", "异地多活": "多活架构",
    "全链路压测": "全链路压测",
    "熔断": "熔断降级", "降级": "熔断降级", "限流": "熔断降级",
    "读写分离": "读写分离",
    "分库分表": "分库分表", "分片": "分库分表",
    "微前端": "微前端", "micro frontend": "微前端",
    "低代码": "低代码", "low-code": "低代码",
    "中台": "中台",
    "devops": "DevOps",
    "sre": "SRE",
    "敏捷": "敏捷开发", "agile": "敏捷开发", "scrum": "敏捷开发",
    "互联网": "互联网",
    "后端开发": "后端开发", "前端开发": "前端开发",
    "全栈开发": "全栈开发", "全栈": "全栈",
    "架构设计": "架构设计", "系统设计": "系统设计",
    "性能优化": "性能优化",
    "自动化测试": "自动化测试",
    "持续集成": "CI/CD", "持续部署": "CI/CD",
}


def normalize_skill(raw: str) -> str:
    """Normalize a single skill name to canonical form."""
    key = raw.strip().lower()
    if key in SKILL_SYNONYMS:
        return SKILL_SYNONYMS[key]
    # Title-case fallback
    return raw.strip()


def normalize_skills(raw_skills: list[str]) -> list[str]:
    """Normalize and deduplicate a list of skill strings."""
    seen: set[str] = set()
    result: list[str] = []
    for s in raw_skills:
        n = normalize_skill(s)
        if n and n not in seen:
            seen.add(n)
            result.append(n)
    return result


# ═══════════════════════════════════════════════════════════════════════════════
# 2. School Tier Classification
# ═══════════════════════════════════════════════════════════════════════════════

# Tier → (label, score_multiplier for HR evaluation)
SCHOOL_TIERS: dict[str, tuple[str, float]] = {
    "C9":   ("C9联盟", 1.15),
    "985":  ("985工程", 1.10),
    "211":  ("211工程", 1.05),
    "双一流": ("双一流", 1.05),
    "QS100": ("QS世界前100", 1.10),
    "其他":  ("其他院校", 1.00),
}

# School name → tier
SCHOOL_TIER_MAP: dict[str, str] = {
    # C9
    "清华大学": "C9", "北京大学": "C9", "复旦大学": "C9",
    "上海交通大学": "C9", "浙江大学": "C9", "中国科学技术大学": "C9",
    "南京大学": "C9", "哈尔滨工业大学": "C9", "西安交通大学": "C9",
    # 985
    "北京航空航天大学": "985", "中国人民大学": "985", "北京理工大学": "985",
    "北京师范大学": "985", "南开大学": "985", "天津大学": "985",
    "大连理工大学": "985", "东北大学": "985", "吉林大学": "985",
    "同济大学": "985", "华东师范大学": "985",
    "东南大学": "985", "华中科技大学": "985", "武汉大学": "985",
    "中南大学": "985", "湖南大学": "985", "国防科技大学": "985",
    "中山大学": "985", "华南理工大学": "985",
    "四川大学": "985", "电子科技大学": "985", "重庆大学": "985",
    "西北工业大学": "985", "兰州大学": "985", "中国农业大学": "985",
    "西北农林科技大学": "985", "中国海洋大学": "985", "中央民族大学": "985",
    "厦门大学": "985", "山东大学": "985",
    # 211 (selected common ones)
    "北京邮电大学": "211", "西安电子科技大学": "211", "北京交通大学": "211",
    "北京科技大学": "211", "北京工业大学": "211", "北京化工大学": "211",
    "南京航空航天大学": "211", "南京理工大学": "211", "南京农业大学": "211",
    "上海大学": "211", "上海财经大学": "211", "东华大学": "211",
    "苏州大学": "211", "江南大学": "211", "河海大学": "211", "中国矿业大学": "211",
    "武汉理工大学": "211", "华中农业大学": "211", "华中师范大学": "211",
    "西南交通大学": "211", "西南财经大学": "211", "西南大学": "211",
    "合肥工业大学": "211", "安徽大学": "211",
    "暨南大学": "211", "华南师范大学": "211",
    "福州大学": "211",
    "郑州大学": "211",
    "哈尔滨工程大学": "211",
    "长安大学": "211", "西北大学": "211",
    "中国地质大学": "211", "中国石油大学": "211",
    "中国政法大学": "211", "中央财经大学": "211", "对外经济贸易大学": "211",
    "中南财经政法大学": "211",
    # International
    "Massachusetts Institute of Technology": "QS100", "MIT": "QS100",
    "Stanford University": "QS100", "Stanford": "QS100",
    "Carnegie Mellon University": "QS100", "CMU": "QS100",
    "University of California, Berkeley": "QS100", "UC Berkeley": "QS100",
    "University of Cambridge": "QS100", "Cambridge": "QS100",
    "University of Oxford": "QS100", "Oxford": "QS100",
    "ETH Zurich": "QS100",
    "National University of Singapore": "QS100", "NUS": "QS100",
    "Nanyang Technological University": "QS100", "NTU": "QS100",
    "Tsinghua University": "QS100",
    "Peking University": "QS100",
}


def classify_school(school_name: str) -> tuple[str, str, float]:
    """Return (tier_key, tier_label, score_multiplier) for a school name."""
    # Exact match
    if school_name in SCHOOL_TIER_MAP:
        tier = SCHOOL_TIER_MAP[school_name]
        label, score = SCHOOL_TIERS[tier]
        return tier, label, score
    # Fuzzy match
    name_lower = school_name.lower().strip()
    for key, tier in SCHOOL_TIER_MAP.items():
        if key.lower() in name_lower or name_lower in key.lower():
            label, score = SCHOOL_TIERS[tier]
            return tier, label, score
    return "其他", "其他院校", 1.00


# ═══════════════════════════════════════════════════════════════════════════════
# 3. Company Tier Classification
# ═══════════════════════════════════════════════════════════════════════════════

# Tier → (label, experience_weight_multiplier)
COMPANY_TIERS: dict[str, tuple[str, float]] = {
    "T1": ("一线大厂", 1.3),
    "T2": ("二线中厂", 1.1),
    "T3": ("其他公司", 1.0),
    "startup": ("创业公司", 0.9),
    "foreign": ("外企", 1.15),
}

# Company name → tier
COMPANY_TIER_MAP: dict[str, str] = {
    # T1: Tier-1 Chinese Big Tech
    "阿里巴巴": "T1", "阿里云": "T1", "蚂蚁集团": "T1", "淘宝": "T1",
    "阿里巴巴集团": "T1", "alibaba": "T1", "阿里": "T1",
    "字节跳动": "T1", "抖音": "T1", "今日头条": "T1",
    "字节跳动科技": "T1", "bytedance": "T1", "字节": "T1",
    "腾讯": "T1", "微信": "T1", "tencent": "T1",
    "百度": "T1", "baidu": "T1",
    "华为": "T1", "huawei": "T1",
    "美团": "T1", "meituan": "T1",
    "拼多多": "T1", "pinduoduo": "T1",
    "京东": "T1", "jd.com": "T1",
    "网易": "T1", "netease": "T1",
    "快手": "T1", "kuaishou": "T1",
    "滴滴": "T1", "didi": "T1",
    "小米": "T1", "xiaomi": "T1",
    # T1: Foreign
    "Google": "foreign", "谷歌": "foreign",
    "Microsoft": "foreign", "微软": "foreign",
    "Amazon": "foreign", "亚马逊": "foreign",
    "Apple": "foreign", "苹果": "foreign",
    "Meta": "foreign", "Facebook": "foreign",
    # T2: Second-tier
    "哔哩哔哩": "T2", "B站": "T2", "bilibili": "T2",
    "商汤科技": "T2", "商汤": "T2",
    "旷视科技": "T2", "旷视": "T2",
    "科大讯飞": "T2",
    "大疆": "T2", "DJI": "T2",
    "京东数科": "T2",
    "贝壳": "T2",
    "携程": "T2",
    "小红书": "T2",
    "知乎": "T2",
    "Soul": "T2",
    "米哈游": "T2", "miHoYo": "T2",
    "莉莉丝": "T2",
    "完美世界": "T2",
    "搜狐": "T2",
    "新浪": "T2", "微博": "T2",
    "360": "T2",
    "Vivo": "T2", "OPPO": "T2",
    "联想": "T2", "Lenovo": "T2",
    "海康威视": "T2",
    "深信服": "T2",
}


def classify_company(company_name: str) -> tuple[str, str, float]:
    """Return (tier_key, tier_label, experience_weight) for a company name."""
    if company_name in COMPANY_TIER_MAP:
        tier = COMPANY_TIER_MAP[company_name]
        label, weight = COMPANY_TIERS[tier]
        return tier, label, weight
    name_lower = company_name.lower().strip()
    for key, tier in COMPANY_TIER_MAP.items():
        if key.lower() in name_lower or name_lower in key.lower():
            label, weight = COMPANY_TIERS[tier]
            return tier, label, weight
    # Heuristic: contains "初创" or "startup" or "创业"
    if any(w in name_lower for w in ("startup", "初创", "创业", "天使轮", "pre-a", "a轮", "种子轮")):
        return "startup", "创业公司", 0.9
    return "T3", "其他公司", 1.0


# ═══════════════════════════════════════════════════════════════════════════════
# 4. Competition Level Classification
# ═══════════════════════════════════════════════════════════════════════════════

# Level → (label, hr_score_bonus)
COMPETITION_LEVELS: dict[str, tuple[str, float]] = {
    "S": ("国际/国家级顶尖赛事", 0.12),
    "A": ("国家级高水平赛事", 0.08),
    "B": ("省/区域级赛事", 0.04),
    "C": ("校级/其他赛事", 0.01),
}

# Competition → (level, base_weight)
COMPETITION_MAP: dict[str, tuple[str, float]] = {
    # S-tier
    "ACM-ICPC": ("S", 1.0), "ICPC": ("S", 1.0),
    "ACM": ("S", 1.0),
    "IOI": ("S", 1.0),
    "IMO": ("S", 1.0),
    # A-tier
    "Kaggle": ("A", 0.9),
    "数学建模": ("A", 0.7), "MCM": ("A", 0.7), "美赛": ("A", 0.7),
    "蓝桥杯": ("B", 0.5),
    "挑战杯": ("A", 0.7),
    "互联网+": ("A", 0.7),
    "全国大学生数学竞赛": ("B", 0.6), "数学竞赛": ("B", 0.5),
    "CCPC": ("A", 0.8),
    "Codeforces": ("B", 0.6),
    "LeetCode": ("B", 0.4),
    "天池": ("A", 0.7),
    "信奥": ("A", 0.8), "NOI": ("A", 0.8),
}

# Award modifier within a competition
AWARD_MODIFIERS: dict[str, float] = {
    "金奖": 1.0, "金牌": 1.0, "冠军": 1.0, "第一名": 1.0, "特等奖": 1.0,
    "gold": 1.0, "1st": 1.0,
    "银奖": 0.8, "银牌": 0.8, "亚军": 0.85, "第二名": 0.85, "一等奖": 0.8,
    "silver": 0.8, "2nd": 0.85,
    "铜奖": 0.6, "铜牌": 0.6, "季军": 0.7, "第三名": 0.7, "二等奖": 0.6,
    "bronze": 0.6, "3rd": 0.7,
    "三等奖": 0.4, "优胜奖": 0.3, "优秀奖": 0.3, "入围": 0.2,
    "区域赛": 0.7,
    "省一": 0.6, "省二": 0.45, "省三": 0.3,
}


def classify_competition(name: str, award: str = "") -> tuple[str, str, float]:
    """Return (level_key, level_label, hr_score_bonus) for a competition."""
    name_lower = name.lower().strip()
    award_lower = award.lower().strip()

    # Find competition base level
    comp_level = "C"
    comp_weight = 0.5
    for key, (level, weight) in COMPETITION_MAP.items():
        if key.lower() in name_lower:
            comp_level = level
            comp_weight = weight
            break

    # Apply award modifier
    award_mod = 0.5  # default if award unspecified
    for key, mod in AWARD_MODIFIERS.items():
        if key.lower() in award_lower:
            award_mod = mod
            break

    # Compute final bonus
    base_bonus = COMPETITION_LEVELS[comp_level][1]
    final_bonus = round(base_bonus * comp_weight * award_mod, 3)

    # Cap at 0.15
    final_bonus = min(final_bonus, 0.15)

    return comp_level, COMPETITION_LEVELS[comp_level][0], final_bonus


# ═══════════════════════════════════════════════════════════════════════════════
# 5. Project Metrics Extraction Patterns
# ═══════════════════════════════════════════════════════════════════════════════

import re as _re

PROJECT_METRIC_PATTERNS: list[tuple[str, _re.Pattern, str]] = [
    # (metric_name, regex, unit)
    ("qps", _re.compile(r"(?:qps|QPS|每秒请求|每秒查询)[\s:：]*(\d+[\d,]*\.?\d*)\s*(万|亿|百万|千万|[万亿千百])?", _re.IGNORECASE), ""),
    ("p99_latency_ms", _re.compile(r"(?:P99|p99|99分位)[\s\w]*?(\d+[\d,]*\.?\d*)\s*(ms|毫秒|秒|s)", _re.IGNORECASE), "ms"),
    ("data_volume", _re.compile(r"(\d+[\d,]*\.?\d*)\s*(PB|TB|GB|亿|万|百万|千万)\s*(?:数据|日志|消息|条记录)", _re.IGNORECASE), ""),
    ("availability", _re.compile(r"可用[性率][\s:：]*(\d+[\d,]*\.?\d*)\s*(?:个9|%)?", _re.IGNORECASE), "%"),
    ("user_scale", _re.compile(r"(?:DAU|MAU|日活|月活|用户量?)[\s:：]*(\d+[\d,]*\.?\d*)\s*(万|亿|百万|千万|[万亿千百])?", _re.IGNORECASE), ""),
    ("latency_reduction_pct", _re.compile(r"(?:延迟|耗时|响应时间)[\s\w]*?(?:降低|减少|下降|优化|从).*?(\d+[\d,]*\.?\d*)\s*%", _re.IGNORECASE), "%"),
    ("improvement_pct", _re.compile(r"(?:提升|提高|增长|增加)[\s\w]*?(\d+[\d,]*\.?\d*)\s*%", _re.IGNORECASE), "%"),
    ("team_size", _re.compile(r"(?:带领|管理|负责|团队)[\s:：]*(\d+[\d,]*)\s*(?:人|名|位)", _re.IGNORECASE), "人"),
]


def extract_project_metrics(description: str) -> dict[str, str]:
    """Extract quantified metrics from project description text.

    Returns a dict like {"QPS": "1000万", "P99延迟": "45ms", "可用性": "99.99%"}.
    """
    results: dict[str, str] = {}
    metric_labels = {
        "qps": "QPS", "p99_latency_ms": "P99延迟",
        "data_volume": "数据量级", "availability": "可用性",
        "user_scale": "用户规模", "latency_reduction_pct": "延迟优化",
        "improvement_pct": "性能提升", "team_size": "团队规模",
    }
    for key, pattern, default_unit in PROJECT_METRIC_PATTERNS:
        m = pattern.search(description)
        if m:
            value = m.group(1).replace(",", "")
            unit = m.group(2) if m.lastindex and m.lastindex >= 2 and m.group(2) else default_unit
            results[metric_labels[key]] = f"{value}{unit}"
    return results
