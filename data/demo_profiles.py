"""Demo data: realistic Chinese internet-company resumes and JDs.

10 resumes spanning P5-P9 (初级→专家). 15 JDs across 5 tier-1 internet companies.
All skill requirements, level expectations, and salary ranges follow real market logic.

Constraint 4: 职级体系符合真实互联网大厂逻辑，不出现"应届生要求10年经验"的笑话。
"""

from __future__ import annotations

from datetime import date

from models.schemas import (
    Education,
    Project,
    StructuredJob,
    StructuredResume,
    WorkExperience,
)

# ---------------------------------------------------------------------------
# 10 Realistic Resumes (P5 → P9)
# ---------------------------------------------------------------------------

RESUMES: dict[str, StructuredResume] = {
    # ── P5 初级工程师 (1-2年) ──
    "res-john-chen": StructuredResume(
        resume_id="res-john-chen",
        name="John Chen",
        email="john.chen@example.com",
        phone="+1 555 0101",
        summary="2年后端开发经验，熟悉 Python 和 Django，参与过电商后端系统开发。",
        skills=["Python", "Django", "MySQL", "Redis", "Docker", "Git", "Linux"],
        projects=[
            Project(
                name="电商订单系统",
                description="负责订单模块 CRUD 接口开发，使用 Django REST Framework 实现 RESTful API。",
                tech_stack=["Python", "Django", "PostgreSQL", "Redis"],
            ),
        ],
        education=[
            Education(school="浙江大学", degree="本科", major="计算机科学与技术", graduation_year=2024),
        ],
        experience=[
            WorkExperience(
                company="有赞",
                title="后端开发工程师",
                description="参与电商中台订单系统开发，负责订单查询和状态流转模块。",
                tech_stack=["Python", "Django", "MySQL", "Redis", "Docker"],
                start_date=date(2024, 7, 1),
                end_date=None,
            ),
        ],
    ),
    "res-emma-li": StructuredResume(
        resume_id="res-emma-li",
        name="Emma Li",
        email="emma.li@example.com",
        phone="+1 555 0102",
        summary="1年前端开发经验，React 生态熟练，有移动端适配经验。",
        skills=["JavaScript", "TypeScript", "React", "CSS", "HTML", "Git", "Webpack"],
        projects=[
            Project(
                name="后台管理面板",
                description="使用 React + Ant Design 搭建运营后台，实现数据可视化仪表盘。",
                tech_stack=["React", "TypeScript", "Ant Design", "ECharts"],
            ),
        ],
        education=[
            Education(school="华中科技大学", degree="本科", major="软件工程", graduation_year=2025),
        ],
        experience=[
            WorkExperience(
                company="小红书",
                title="前端开发工程师",
                description="参与商家后台管理系统开发，负责商品管理和数据看板模块。",
                tech_stack=["React", "TypeScript", "Ant Design"],
                start_date=date(2025, 7, 1),
                end_date=None,
            ),
        ],
    ),

    # ── P6 中级工程师 (3-4年) ──
    "res-sarah-wang": StructuredResume(
        resume_id="res-sarah-wang",
        name="Sarah Wang",
        email="sarah.wang@example.com",
        phone="+1 555 0103",
        summary="4年后端开发经验，精通 Go 微服务架构，有高并发系统设计经验。",
        skills=["Go", "gRPC", "Kubernetes", "PostgreSQL", "Redis", "Kafka", "Docker", "Linux", "Prometheus"],
        projects=[
            Project(
                name="消息推送平台",
                description="设计并实现了日均 10 亿级消息推送系统，采用 Go + Kafka 异步架构。",
                tech_stack=["Go", "Kafka", "Redis", "Kubernetes", "gRPC"],
            ),
            Project(
                name="API 网关重构",
                description="将单体 API 网关拆分为微服务架构，QPS 提升 3 倍。",
                tech_stack=["Go", "gRPC", "Kubernetes", "Envoy"],
            ),
        ],
        education=[
            Education(school="上海交通大学", degree="硕士", major="计算机科学与技术", graduation_year=2022),
        ],
        experience=[
            WorkExperience(
                company="字节跳动",
                title="后端开发工程师",
                description="负责消息中台基础设施建设，设计高可用推送链路。",
                tech_stack=["Go", "Kafka", "Redis", "Kubernetes"],
                start_date=date(2022, 7, 1),
                end_date=None,
            ),
        ],
    ),
    "res-mike-chen": StructuredResume(
        resume_id="res-mike-chen",
        name="Mike Chen",
        email="mike.chen@example.com",
        phone="+1 555 0104",
        summary="3年全栈开发经验，Node.js + React 技术栈，有 SaaS 产品从零到一经验。",
        skills=["TypeScript", "Node.js", "React", "PostgreSQL", "MongoDB", "Docker", "AWS", "GraphQL"],
        projects=[
            Project(
                name="协作 SaaS 平台",
                description="从零搭建团队协作平台，支持实时文档编辑和权限管理。",
                tech_stack=["TypeScript", "Node.js", "React", "PostgreSQL", "WebSocket"],
            ),
        ],
        education=[
            Education(school="北京邮电大学", degree="本科", major="网络工程", graduation_year=2023),
        ],
        experience=[
            WorkExperience(
                company="飞书",
                title="全栈开发工程师",
                description="参与飞书文档协作引擎开发，负责前后端实时同步模块。",
                tech_stack=["TypeScript", "Node.js", "React", "MongoDB"],
                start_date=date(2023, 3, 1),
                end_date=None,
            ),
        ],
    ),

    # ── P7 高级工程师 (5-7年) ──
    "res-diana-zhao": StructuredResume(
        resume_id="res-diana-zhao",
        name="Diana Zhao",
        email="diana.zhao@example.com",
        phone="+1 555 0105",
        summary="6年后端/基础架构经验，主导过日活千万级系统的架构升级，擅长分布式系统设计。",
        skills=[
            "Go", "Python", "Kubernetes", "Docker", "Kafka", "Redis",
            "PostgreSQL", "gRPC", "Prometheus", "Grafana", "Terraform", "AWS",
        ],
        projects=[
            Project(
                name="容器平台建设",
                description="主导公司 Kubernetes 集群从 50 节点扩展到 500+ 节点，自研调度器优化资源利用率提升 40%。",
                tech_stack=["Go", "Kubernetes", "Docker", "Prometheus", "etcd"],
            ),
            Project(
                name="全链路压测平台",
                description="设计并实现全链路压测系统，支持 100万 QPS 流量回放。",
                tech_stack=["Go", "Java", "Kafka", "Redis", "InfluxDB"],
            ),
        ],
        education=[
            Education(school="清华大学", degree="硕士", major="计算机科学与技术", graduation_year=2020),
        ],
        experience=[
            WorkExperience(
                company="阿里云",
                title="高级开发工程师",
                description="负责容器服务 ACK 的核心调度和弹性伸缩模块，服务数百万容器实例。",
                tech_stack=["Go", "Kubernetes", "Docker", "etcd", "Prometheus"],
                start_date=date(2020, 7, 1),
                end_date=None,
            ),
            WorkExperience(
                company="美团",
                title="后端开发工程师",
                description="参与外卖配送调度系统开发，优化骑手路径规划算法。",
                tech_stack=["Java", "Kafka", "Redis", "MySQL"],
                start_date=date(2018, 7, 1),
                end_date=date(2020, 6, 30),
            ),
        ],
    ),
    "res-ryan-sun": StructuredResume(
        resume_id="res-ryan-sun",
        name="Ryan Sun",
        email="ryan.sun@example.com",
        phone="+1 555 0106",
        summary="5年算法工程师经验，专注 NLP 和推荐系统，有 LLM 微调和部署经验。",
        skills=[
            "Python", "PyTorch", "TensorFlow", "Transformers", "LangChain",
            "Kubernetes", "MLflow", "Redis", "Kafka", "SQL", "Ray",
        ],
        projects=[
            Project(
                name="大模型推理平台",
                description="搭建公司级 LLM 推理服务，支持 Qwen/DeepSeek 等模型部署，P99 延迟 < 2s。",
                tech_stack=["Python", "PyTorch", "vLLM", "Kubernetes", "Ray"],
            ),
            Project(
                name="智能客服 NLU",
                description="基于 BERT 微调的意图识别和实体抽取系统，准确率 95%+。",
                tech_stack=["Python", "PyTorch", "Transformers", "ONNX"],
            ),
        ],
        education=[
            Education(school="北京大学", degree="硕士", major="人工智能", graduation_year=2021),
        ],
        experience=[
            WorkExperience(
                company="腾讯",
                title="算法工程师",
                description="负责腾讯云 AI 平台 NLP 能力建设，包括文本分类、情感分析等。",
                tech_stack=["Python", "PyTorch", "Transformers", "Kubernetes"],
                start_date=date(2021, 7, 1),
                end_date=None,
            ),
        ],
    ),
    "res-olivia-liu": StructuredResume(
        resume_id="res-olivia-liu",
        name="Olivia Liu",
        email="olivia.liu@example.com",
        phone="+1 555 0107",
        summary="5年数据工程师，精通大数据生态，有 PB 级数据仓库建设经验。",
        skills=[
            "Java", "Scala", "Spark", "Flink", "Hadoop", "Hive",
            "Kafka", "ClickHouse", "Airflow", "Python", "SQL", "Docker",
        ],
        projects=[
            Project(
                name="实时数仓建设",
                description="主导从离线 T+1 到实时秒级的数据仓库升级，采用 Flink + Kafka + ClickHouse 架构。",
                tech_stack=["Flink", "Kafka", "ClickHouse", "Hadoop", "Java"],
            ),
        ],
        education=[
            Education(school="复旦大学", degree="硕士", major="数据科学", graduation_year=2021),
        ],
        experience=[
            WorkExperience(
                company="快手",
                title="数据开发工程师",
                description="负责用户增长数据仓库建设和实时计算任务开发。",
                tech_stack=["Spark", "Flink", "Kafka", "ClickHouse", "Hadoop"],
                start_date=date(2021, 3, 1),
                end_date=None,
            ),
        ],
    ),

    # ── P8 资深/Staff 工程师 (8-10年) ──
    "res-james-huang": StructuredResume(
        resume_id="res-james-huang",
        name="James Huang",
        email="james.huang@example.com",
        phone="+1 555 0108",
        summary="9年后端架构经验，主导过多个日活过亿产品的技术架构，擅长高可用分布式系统设计。",
        skills=[
            "Go", "Java", "Kubernetes", "Docker", "Kafka", "Redis",
            "PostgreSQL", "MySQL", "gRPC", "Istio", "Terraform", "AWS",
            "Prometheus", "Grafana", "Elasticsearch",
        ],
        projects=[
            Project(
                name="电商核心链路重构",
                description="主导将单体电商系统拆分为 50+ 微服务，支撑双十一亿级并发。",
                tech_stack=["Go", "Java", "Kubernetes", "Kafka", "Redis", "MySQL"],
            ),
            Project(
                name="服务网格落地",
                description="在 1000+ 服务中推广 Istio，实现灰度发布、流量治理和可观测性。",
                tech_stack=["Istio", "Kubernetes", "Envoy", "Prometheus", "Grafana"],
            ),
        ],
        education=[
            Education(school="南京大学", degree="硕士", major="软件工程", graduation_year=2017),
        ],
        experience=[
            WorkExperience(
                company="拼多多",
                title="资深后端工程师",
                description="负责电商交易核心链路架构设计和稳定性保障，支撑 10 亿+ 日活。",
                tech_stack=["Go", "Java", "Kubernetes", "Kafka", "Redis", "MySQL"],
                start_date=date(2021, 1, 1),
                end_date=None,
            ),
            WorkExperience(
                company="京东",
                title="高级开发工程师",
                description="参与京东商城交易系统开发，负责订单和支付模块。",
                tech_stack=["Java", "Spring", "MySQL", "Redis", "Kafka"],
                start_date=date(2017, 7, 1),
                end_date=date(2020, 12, 31),
            ),
        ],
    ),
    "res-grace-zhou": StructuredResume(
        resume_id="res-grace-zhou",
        name="Grace Zhou",
        email="grace.zhou@example.com",
        phone="+1 555 0109",
        summary="8年AI/ML方向经验，从算法研究到工程落地全链路覆盖，有 3 个 A 类论文和 5 项专利。",
        skills=[
            "Python", "PyTorch", "TensorFlow", "JAX", "Kubernetes",
            "MLflow", "Kubeflow", "Ray", "Spark", "SQL", "Transformers",
            "LangChain", "vLLM",
        ],
        projects=[
            Project(
                name="搜广推统一模型平台",
                description="设计统一训练/推理平台，支持 CTR/CVR/NLP 等多任务，日处理 100TB 训练数据。",
                tech_stack=["Python", "PyTorch", "Kubeflow", "Ray", "Spark", "Kafka"],
            ),
            Project(
                name="多模态搜索",
                description="基于 CLIP 和 BLIP 实现图文多模态搜索，CTR 提升 15%。",
                tech_stack=["Python", "PyTorch", "Transformers", "FAISS", "ONNX"],
            ),
        ],
        education=[
            Education(school="中国科学技术大学", degree="博士", major="计算机视觉", graduation_year=2018),
        ],
        experience=[
            WorkExperience(
                company="百度",
                title="资深算法工程师",
                description="负责搜索广告排序算法优化，主导深度学习模型从研发到全量上线。",
                tech_stack=["Python", "PyTorch", "TensorFlow", "Spark", "C++"],
                start_date=date(2018, 7, 1),
                end_date=None,
            ),
        ],
    ),

    # ── P9 专家/Principal 工程师 (10年+) ──
    "res-thomas-lin": StructuredResume(
        resume_id="res-thomas-lin",
        name="Thomas Lin",
        email="thomas.lin@example.com",
        phone="+1 555 0110",
        summary=(
            "12年分布式系统和基础架构经验，前阿里 P9。主导过多个部门级基础设施项目，"
            "包括自研分布式文件系统和全球多活架构。在稳定性、成本优化、组织效能方面有体系化方法论。"
        ),
        skills=[
            "Go", "C++", "Rust", "Kubernetes", "Docker", "Kafka", "Redis",
            "PostgreSQL", "MySQL", "TiDB", "etcd", "gRPC", "Istio", "Envoy",
            "Terraform", "Ansible", "Prometheus", "Grafana", "Elasticsearch",
        ],
        projects=[
            Project(
                name="自研分布式文件系统",
                description="主导设计并实现了兼容 POSIX 的分布式文件系统，支撑公司 100PB+ 数据存储。",
                tech_stack=["C++", "Go", "Rust", "etcd", "Protobuf"],
            ),
            Project(
                name="全球多活架构",
                description="设计并落地三地五中心多活架构，RPO < 1s, RTO < 30s。",
                tech_stack=["Go", "Kubernetes", "etcd", "MySQL", "TiDB"],
            ),
            Project(
                name="云原生成本优化",
                description="通过混部、弹性伸缩和 Spot 实例策略，年度节省云计算成本 2 亿+。",
                tech_stack=["Go", "Kubernetes", "Prometheus", "Terraform"],
            ),
        ],
        education=[
            Education(school="上海交通大学", degree="硕士", major="计算机系统结构", graduation_year=2014),
        ],
        experience=[
            WorkExperience(
                company="蚂蚁集团",
                title="技术专家 (P9)",
                description=(
                    "负责蚂蚁基础设施部的分布式存储和全球部署架构。"
                    "带领 15 人团队，主导多个 T 级项目从立项到全量交付。"
                ),
                tech_stack=["Go", "C++", "Kubernetes", "etcd", "TiDB"],
                start_date=date(2018, 3, 1),
                end_date=None,
            ),
            WorkExperience(
                company="华为",
                title="高级工程师",
                description="参与华为云分布式存储系统开发，负责元数据管理模块。",
                tech_stack=["C++", "Java", "Linux", "分布式系统"],
                start_date=date(2014, 7, 1),
                end_date=date(2018, 2, 28),
            ),
        ],
    ),
}

# ---------------------------------------------------------------------------
# 15 Realistic JDs (across 5 tier-1 companies, mid → principal levels)
# ---------------------------------------------------------------------------

JOBS: dict[str, StructuredJob] = {
    # ── 阿里巴巴 ──
    "job-ali-senior-backend": StructuredJob(
        job_id="job-ali-senior-backend",
        title="高级后端开发工程师",
        company="阿里巴巴",
        location="杭州",
        level="高级",
        description=(
            "负责淘宝核心交易链路的架构设计和性能优化。参与双十一大促全链路压测和容量规划。"
            "设计高可用、高并发的分布式系统，保障核心链路的稳定性 SLA 99.99%。"
        ),
        required_skills=["Java", "Spring", "MySQL", "Redis", "Kafka", "分布式系统"],
        optional_skills=["Go", "Kubernetes", "Docker", "Elasticsearch"],
        salary_range=(400, 700),
        posted_date=date(2026, 5, 1),
    ),
    "job-ali-ml-engineer": StructuredJob(
        job_id="job-ali-ml-engineer",
        title="机器学习平台工程师",
        company="阿里巴巴",
        location="北京",
        level="高级",
        description=(
            "负责 PAI 机器学习平台的训练引擎开发。支持大规模分布式训练（千卡级别），"
            "优化 GPU 利用率和训练吞吐。与算法团队合作将模型高效部署到生产环境。"
        ),
        required_skills=["Python", "PyTorch", "Kubernetes", "分布式训练", "GPU 编程"],
        optional_skills=["TensorFlow", "Kubeflow", "Ray", "MLflow"],
        salary_range=(450, 800),
        posted_date=date(2026, 5, 3),
    ),
    "job-ali-staff-architect": StructuredJob(
        job_id="job-ali-staff-architect",
        title="基础设施架构师 (P8)",
        company="阿里巴巴",
        location="杭州",
        level="专家",
        description=(
            "负责阿里集团基础设施的技术规划和架构设计。覆盖计算、存储、网络三大领域。"
            "推动云原生技术在公司内部的落地，制定技术标准和最佳实践。需要跨 BU 协调能力。"
        ),
        required_skills=["Kubernetes", "Go", "分布式存储", "网络架构", "Linux 内核"],
        optional_skills=["C++", "Rust", "eBPF", "Terraform", "Ansible"],
        salary_range=(800, 1500),
        posted_date=date(2026, 4, 28),
    ),

    # ── 字节跳动 ──
    "job-bytedance-backend": StructuredJob(
        job_id="job-bytedance-backend",
        title="后端开发工程师 — 抖音",
        company="字节跳动",
        location="北京",
        level="高级",
        description=(
            "参与抖音后端服务开发，负责直播、电商或社交等核心业务模块。"
            "设计高并发、低延迟的分布式系统，支持亿级 DAU。"
            "持续优化系统性能，推动技术方案的落地和迭代。"
        ),
        required_skills=["Go", "Kubernetes", "Redis", "Kafka", "MySQL", "微服务"],
        optional_skills=["Python", "gRPC", "Docker", "Terraform"],
        salary_range=(500, 900),
        posted_date=date(2026, 5, 5),
    ),
    "job-bytedance-ml-platform": StructuredJob(
        job_id="job-bytedance-ml-platform",
        title="机器学习平台研发工程师",
        company="字节跳动",
        location="上海",
        level="高级",
        description=(
            "参与字节跳动内部 ML Platform 建设，为推荐、广告、搜索等业务提供训练和推理基础设施。"
            "支持千卡级别的大规模分布式训练，优化 GPU 调度和模型推理性能。"
        ),
        required_skills=["Python", "PyTorch", "Go", "Kubernetes", "分布式系统"],
        optional_skills=["TensorFlow", "Ray", "vLLM", "Volcano", "Kubeflow"],
        salary_range=(550, 950),
        posted_date=date(2026, 5, 2),
    ),
    "job-bytedance-data-platform": StructuredJob(
        job_id="job-bytedance-data-platform",
        title="数据平台高级工程师",
        company="字节跳动",
        location="北京",
        level="高级",
        description=(
            "负责字节跳动数据平台基础架构，包括实时计算、数据集成、OLAP 引擎等方向。"
            "设计 PB 级别数据的高效存储和查询方案，支撑全公司的数据分析和业务决策。"
        ),
        required_skills=["Java", "Flink", "Spark", "Kafka", "ClickHouse", "Hadoop"],
        optional_skills=["Go", "Scala", "Presto", "Hudi", "Iceberg"],
        salary_range=(500, 900),
        posted_date=date(2026, 5, 4),
    ),

    # ── 腾讯 ──
    "job-tencent-senior-ml": StructuredJob(
        job_id="job-tencent-senior-ml",
        title="高级算法工程师 — 大模型方向",
        company="腾讯",
        location="深圳",
        level="高级",
        description=(
            "参与混元大模型的训练和优化，包括预训练、SFT、RLHF 等环节。"
            "探索大模型在微信、游戏、云等业务场景的应用落地。"
            "跟进前沿技术，推动模型架构和训练方法的创新。"
        ),
        required_skills=["Python", "PyTorch", "Transformers", "大模型训练", "DeepSpeed"],
        optional_skills=["JAX", "vLLM", "LangChain", "TensorFlow", "Ray"],
        salary_range=(600, 1000),
        posted_date=date(2026, 5, 1),
    ),
    "job-tencent-cloud-architect": StructuredJob(
        job_id="job-tencent-cloud-architect",
        title="云原生架构师",
        company="腾讯云",
        location="深圳",
        level="专家",
        description=(
            "负责腾讯云原生产品的技术架构设计和演进。"
            "参与 TKE (容器服务)、Service Mesh、Serverless 等产品的核心研发。"
            "为头部客户提供云原生架构咨询和最佳实践指导。"
        ),
        required_skills=["Kubernetes", "Go", "Docker", "Istio", "Linux", "分布式系统"],
        optional_skills=["C++", "eBPF", "Terraform", "Helm", "Prometheus"],
        salary_range=(700, 1300),
        posted_date=date(2026, 4, 30),
    ),
    "job-tencent-security": StructuredJob(
        job_id="job-tencent-security",
        title="安全研发工程师",
        company="腾讯",
        location="北京",
        level="中级",
        description=(
            "负责腾讯安全产品（如 WAF、DDoS 防护）的后台系统开发。"
            "参与安全威胁检测引擎的研发和优化，提升检测准确率和响应速度。"
        ),
        required_skills=["Go", "Python", "Linux", "网络协议", "MySQL"],
        optional_skills=["C++", "Kubernetes", "Kafka", "ELK", "安全攻防"],
        salary_range=(350, 600),
        posted_date=date(2026, 5, 6),
    ),

    # ── 美团 ──
    "job-meituan-backend": StructuredJob(
        job_id="job-meituan-backend",
        title="后端开发工程师 — 到店事业群",
        company="美团",
        location="北京",
        level="中级",
        description=(
            "参与美团到店业务（餐饮、酒店、旅游）的后端系统开发。"
            "负责商家端和用户端核心功能的设计与实现。"
            "优化系统性能，提升用户体验和商家效率。"
        ),
        required_skills=["Java", "Spring", "MySQL", "Redis", "Kafka"],
        optional_skills=["Go", "Kubernetes", "Docker", "Elasticsearch"],
        salary_range=(300, 550),
        posted_date=date(2026, 5, 3),
    ),
    "job-meituan-algorithm": StructuredJob(
        job_id="job-meituan-algorithm",
        title="搜索推荐算法工程师",
        company="美团",
        location="上海",
        level="高级",
        description=(
            "负责美团搜索和推荐系统的算法优化。"
            "包括 Query 理解、召回、排序、重排等环节的模型迭代。"
            "与工程团队合作推动算法从离线实验到在线 AB 实验再到全量上线。"
        ),
        required_skills=["Python", "PyTorch", "推荐系统", "机器学习", "大数据"],
        optional_skills=["TensorFlow", "Spark", "Flink", "Redis", "C++"],
        salary_range=(500, 900),
        posted_date=date(2026, 5, 4),
    ),

    # ── 拼多多 ──
    "job-pdd-trading-engineer": StructuredJob(
        job_id="job-pdd-trading-engineer",
        title="交易系统开发工程师",
        company="拼多多",
        location="上海",
        level="中级",
        description=(
            "参与拼多多核心交易链路的开发和维护。"
            "包括下单、支付、退款等关键流程的优化和稳定性保障。"
            "应对大促期间数倍的流量峰值挑战。"
        ),
        required_skills=["Java", "Spring", "MySQL", "Redis", "Kafka", "高并发"],
        optional_skills=["Go", "Kubernetes", "RocketMQ", "Sentinel"],
        salary_range=(350, 600),
        posted_date=date(2026, 5, 2),
    ),
    "job-pdd-sre": StructuredJob(
        job_id="job-pdd-sre",
        title="SRE 稳定性工程师",
        company="拼多多",
        location="上海",
        level="高级",
        description=(
            "负责拼多多核心系统的稳定性保障。"
            "建设监控告警、故障自愈、容量规划等稳定性基础设施。"
            "参与混沌工程实践，通过故障演练提升系统韧性。"
        ),
        required_skills=["Go", "Kubernetes", "Linux", "Prometheus", "Grafana", "故障处理"],
        optional_skills=["Python", "Terraform", "eBPF", "OpenTelemetry", "Ansible"],
        salary_range=(500, 850),
        posted_date=date(2026, 5, 5),
    ),

    # ── 其他 ──
    "job-deepseek-researcher": StructuredJob(
        job_id="job-deepseek-researcher",
        title="大模型研究科学家",
        company="DeepSeek",
        location="北京",
        level="专家",
        description=(
            "参与下一代大语言模型的核心研究，包括模型架构创新、训练方法改进、"
            "推理效率优化等方向。目标是在数学推理、代码生成、长文本理解等关键基准上达到 SOTA。"
            "鼓励发表顶会论文，推动开源生态建设。"
        ),
        required_skills=["Python", "PyTorch", "大模型训练", "Transformer 架构", "分布式训练"],
        optional_skills=["JAX", "CUDA", "Triton", "vLLM", "ML 系统"],
        salary_range=(800, 2000),
        posted_date=date(2026, 5, 1),
    ),
}

# ---------------------------------------------------------------------------
# Skill-level matrix (reference — what each level should reasonably know)
# ---------------------------------------------------------------------------
#
# P5 (初级 1-3年): 1-2门语言 + 常用框架 + 基础中间件, 能独立完成模块开发
# P6 (中级 3-5年): 精通领域技术栈, 能设计子系统, 有一定的性能优化经验
# P7 (高级 5-8年): 主导中大型系统设计, 有跨团队协作经验, 能带小团队
# P8 (资深 8-12年): 部门级技术规划, 主导基础设施/核心系统, 带 10+ 人团队
# P9 (专家 12年+): 公司级技术影响力, 开创性技术方向, 带 20+ 人组织
#
# 以上标准参考阿里/腾讯/字节的职级体系 (P5-P9 / T5-T9 / 2-1~3-2)
# ---------------------------------------------------------------------------
