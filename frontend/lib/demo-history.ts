import type { GameSession } from "@/lib/game-api";
import { USER_PROFILE_KEY, type UserProfile } from "@/lib/user-profile";

const HISTORY_KEY = "bidding_history";

type Outcome = "accepted" | "rejected";

interface DemoScenario {
  id: string;
  timestampOffsetHours: number;
  resumeName: string;
  resumeSummary: string;
  skills: string[];
  company: string;
  title: string;
  level: string;
  salaryRange: [number, number];
  strategy: string;
  marketCondition: string;
  outcome: Outcome;
  finalSalary: number | null;
  successProbability: number;
  rounds: number;
  hr: { name: string; archetype: string; tagline: string; tone: string };
  actions: Array<{
    round: number;
    player: "market" | "interviewer" | "candidate" | "hr";
    action_type: string;
    salary?: number;
    reasoning: string;
  }>;
  outcomeMessage: string;
  recommendation: string;
}

const SCENARIOS: DemoScenario[] = [
  {
    id: "demo-byte-p7-accepted",
    timestampOffsetHours: 1,
    resumeName: "Sarah Wang",
    resumeSummary: "4年 Go 后端经验，负责过日均 10 亿级消息推送链路，擅长高并发和 Kubernetes。",
    skills: ["Go", "Kafka", "Kubernetes", "Redis", "gRPC", "Prometheus"],
    company: "字节跳动",
    title: "后端开发工程师",
    level: "P7",
    salaryRange: [55, 85],
    strategy: "balanced",
    marketCondition: "hot",
    outcome: "accepted",
    finalSalary: 76,
    successProbability: 0.82,
    rounds: 4,
    hr: { name: "林岚", archetype: "data_driven", tagline: "数据驱动型 HRBP", tone: "克制、直接、重视证据" },
    actions: [
      { round: 0, player: "market", action_type: "signal", reasoning: "Go + 云原生岗位供给偏紧，同级别候选人近两周响应率下降。" },
      { round: 0, player: "interviewer", action_type: "evaluate", reasoning: "候选人的 Kafka 推送链路和 K8s 经验与岗位核心职责高度匹配。" },
      { round: 1, player: "candidate", action_type: "counter_offer", salary: 82, reasoning: "我期望 82K，依据是过往推送平台 10 亿级吞吐和本岗位实时架构职责高度匹配。" },
      { round: 1, player: "hr", action_type: "offer", salary: 68, reasoning: "候选人能力匹配，但首轮报价超出团队中位线，先给出预算内稳妥报价。" },
      { round: 2, player: "candidate", action_type: "signal", reasoning: "补充说明 API 网关重构后 QPS 提升 3 倍，并愿意承担稳定性 owner。" },
      { round: 2, player: "hr", action_type: "counter_offer", salary: 72, reasoning: "可验证项目影响力提升可信度，HR 愿意向上申请但仍保留预算余量。" },
      { round: 3, player: "candidate", action_type: "counter_offer", salary: 78, reasoning: "我可以接受团队节奏，但希望总包反映高并发和云原生双栈能力，目标 78K。" },
      { round: 3, player: "hr", action_type: "counter_offer", salary: 76, reasoning: "76K 接近审批上限，配合签字费可以形成双方可接受方案。" },
      { round: 4, player: "candidate", action_type: "accept", salary: 76, reasoning: "接受 76K，并确认职级、绩效周期和签字费写入 offer。" },
    ],
    outcomeMessage: "谈判成功：候选人用可验证项目影响力换取预算上调。",
    recommendation: "复盘时强调证据链：吞吐规模、稳定性责任、岗位稀缺度。",
  },
  {
    id: "demo-ali-p8-rejected",
    timestampOffsetHours: 4,
    resumeName: "Diana Zhao",
    resumeSummary: "6年基础架构经验，主导容器平台从 50 节点扩展到 500+ 节点。",
    skills: ["Go", "Kubernetes", "etcd", "Terraform", "Prometheus", "AWS"],
    company: "阿里云",
    title: "云原生架构专家",
    level: "P8",
    salaryRange: [85, 125],
    strategy: "aggressive",
    marketCondition: "normal",
    outcome: "rejected",
    finalSalary: null,
    successProbability: 0.34,
    rounds: 5,
    hr: { name: "周启明", archetype: "budget_guardian", tagline: "预算守门人", tone: "谨慎、强调内部公平" },
    actions: [
      { round: 0, player: "market", action_type: "signal", reasoning: "P8 云原生专家需求稳定，但头部公司预算审批明显收紧。" },
      { round: 0, player: "interviewer", action_type: "evaluate", reasoning: "技术深度强，但团队当前更看重跨团队影响力和商业化落地。" },
      { round: 1, player: "candidate", action_type: "counter_offer", salary: 128, reasoning: "我期望 128K，容器平台扩容和资源利用率提升能直接支撑专家级别定价。" },
      { round: 1, player: "hr", action_type: "offer", salary: 98, reasoning: "能力认可，但报价超过同职级带宽，不能破坏内部公平。" },
      { round: 2, player: "candidate", action_type: "counter_offer", salary: 124, reasoning: "低于 124K 会弱化我承担专家 owner 的投入意愿。" },
      { round: 2, player: "hr", action_type: "counter_offer", salary: 104, reasoning: "HR 尝试提高到审批边缘，但候选人没有释放足够灵活性。" },
      { round: 3, player: "candidate", action_type: "signal", reasoning: "强调已有外部机会和专家 title，但未给出可验证 offer 细节。" },
      { round: 3, player: "hr", action_type: "wait", reasoning: "外部机会信号可信度不足，HR 转向观察候选人是否愿意讨论总包结构。" },
      { round: 4, player: "candidate", action_type: "counter_offer", salary: 122, reasoning: "坚持现金部分必须达到 122K，不考虑用期权或签字费替代。" },
      { round: 4, player: "hr", action_type: "reject", reasoning: "现金诉求持续超出上限，且候选人对结构化方案缺乏弹性，谈判终止。" },
    ],
    outcomeMessage: "谈判破裂：现金锚点过高且缺少总包结构弹性。",
    recommendation: "下一轮应把现金、签字费、期权和职级评审拆开谈，降低一次性预算冲突。",
  },
  {
    id: "demo-tencent-ai-accepted",
    timestampOffsetHours: 8,
    resumeName: "Ryan Sun",
    resumeSummary: "5年 NLP/LLM 工程经验，搭建过公司级大模型推理平台。",
    skills: ["Python", "PyTorch", "vLLM", "Ray", "Kubernetes", "Transformers"],
    company: "腾讯云",
    title: "大模型平台算法工程师",
    level: "T10",
    salaryRange: [70, 110],
    strategy: "balanced",
    marketCondition: "hot",
    outcome: "accepted",
    finalSalary: 96,
    successProbability: 0.76,
    rounds: 4,
    hr: { name: "许然", archetype: "talent_hunter", tagline: "抢人型 HR", tone: "积极、关注入职确定性" },
    actions: [
      { round: 0, player: "market", action_type: "signal", reasoning: "LLM 推理平台候选人稀缺，具备线上 SLA 经验者议价能力更强。" },
      { round: 0, player: "interviewer", action_type: "evaluate", reasoning: "vLLM、Ray 和 K8s 组合覆盖岗位关键技术栈，交付风险较低。" },
      { round: 1, player: "candidate", action_type: "counter_offer", salary: 104, reasoning: "我希望 104K，因为岗位需要平台化交付而不仅是模型实验。" },
      { round: 1, player: "hr", action_type: "offer", salary: 88, reasoning: "HR 担心候选人同时比较多家 offer，先用较高首轮报价提高粘性。" },
      { round: 2, player: "candidate", action_type: "signal", reasoning: "说明 P99 延迟低于 2 秒和多模型部署经验，证明可直接负责推理成本优化。" },
      { round: 2, player: "hr", action_type: "counter_offer", salary: 94, reasoning: "项目证据直接对应业务成本，HR 愿意争取专项预算。" },
      { round: 3, player: "candidate", action_type: "counter_offer", salary: 98, reasoning: "如果 98K 并确认算力平台 owner 范围，我可以优先推进入职。" },
      { round: 3, player: "hr", action_type: "counter_offer", salary: 96, reasoning: "96K 加快速晋升评审更容易通过审批，也能满足入职确定性。" },
      { round: 4, player: "candidate", action_type: "accept", salary: 96, reasoning: "接受 96K，重点确认 owner 范围和晋升评审时间。" },
    ],
    outcomeMessage: "谈判成功：候选人用入职确定性换取高位报价。",
    recommendation: "保持技术证据和入职承诺绑定，避免只谈薪资不谈责任边界。",
  },
  {
    id: "demo-xhs-frontend-rejected",
    timestampOffsetHours: 14,
    resumeName: "Emma Li",
    resumeSummary: "1年前端经验，熟悉 React 与运营后台，移动端适配经验有限。",
    skills: ["React", "TypeScript", "CSS", "Ant Design", "ECharts"],
    company: "小红书",
    title: "商业化前端工程师",
    level: "P5",
    salaryRange: [22, 35],
    strategy: "aggressive",
    marketCondition: "cool",
    outcome: "rejected",
    finalSalary: null,
    successProbability: 0.28,
    rounds: 3,
    hr: { name: "陈蔚", archetype: "risk_averse", tagline: "风险控制型 HR", tone: "温和但保守" },
    actions: [
      { round: 0, player: "market", action_type: "signal", reasoning: "初级前端供给充足，商业化团队更偏好有增长实验经验的候选人。" },
      { round: 0, player: "interviewer", action_type: "evaluate", reasoning: "React 基础合格，但复杂性能优化和业务增长经验不足。" },
      { round: 1, player: "candidate", action_type: "counter_offer", salary: 38, reasoning: "我希望 38K，因为我可以快速接手后台和数据看板。" },
      { round: 1, player: "hr", action_type: "offer", salary: 26, reasoning: "候选人经验年限和岗位成熟度不完全匹配，HR 保持低位报价。" },
      { round: 2, player: "candidate", action_type: "counter_offer", salary: 36, reasoning: "我认为 React 和可视化经验可以覆盖岗位主要工作，仍希望接近 36K。" },
      { round: 2, player: "hr", action_type: "counter_offer", salary: 28, reasoning: "HR 小幅上调，但强调需要试用期观察独立负责复杂需求的能力。" },
      { round: 3, player: "candidate", action_type: "reject", reasoning: "低于 35K 暂不考虑，希望继续寻找更匹配的岗位。" },
    ],
    outcomeMessage: "谈判破裂：候选人薪资预期超过当前证据支撑。",
    recommendation: "更适合先补充增长实验、性能优化和独立项目 owner 证据，再提高锚点。",
  },
  {
    id: "demo-meituan-data-accepted",
    timestampOffsetHours: 20,
    resumeName: "Olivia Liu",
    resumeSummary: "5年数据工程经验，负责 PB 级数仓与实时链路稳定性。",
    skills: ["Flink", "Spark", "Kafka", "ClickHouse", "Hive", "Airflow"],
    company: "美团",
    title: "实时数仓工程师",
    level: "L8",
    salaryRange: [55, 90],
    strategy: "conservative",
    marketCondition: "normal",
    outcome: "accepted",
    finalSalary: 68,
    successProbability: 0.67,
    rounds: 3,
    hr: { name: "王珂", archetype: "process_oriented", tagline: "流程稳健型 HR", tone: "重视稳定性和落地节奏" },
    actions: [
      { round: 0, player: "market", action_type: "signal", reasoning: "实时数仓岗位需求稳定，候选人 Flink + ClickHouse 组合较匹配。" },
      { round: 0, player: "interviewer", action_type: "evaluate", reasoning: "候选人稳定性和数据治理经验强，适合偏平台型团队。" },
      { round: 1, player: "candidate", action_type: "counter_offer", salary: 72, reasoning: "我期望 72K，重点基于 PB 级数据链路和实时任务稳定性经验。" },
      { round: 1, player: "hr", action_type: "offer", salary: 64, reasoning: "报价低于候选人预期，但落在团队常规带宽内。" },
      { round: 2, player: "candidate", action_type: "counter_offer", salary: 70, reasoning: "我可以接受团队节奏，但希望薪资接近 70K，并明确核心链路 owner。" },
      { round: 2, player: "hr", action_type: "counter_offer", salary: 68, reasoning: "68K 更容易通过审批，同时给出核心链路 owner 和绩效资源。" },
      { round: 3, player: "candidate", action_type: "accept", salary: 68, reasoning: "接受 68K，确认核心链路 owner 和绩效资源。" },
    ],
    outcomeMessage: "谈判成功：候选人用稳健让步换取明确职责资源。",
    recommendation: "适合展示保守策略如何降低破裂风险。",
  },
  {
    id: "demo-feishu-fullstack-accepted",
    timestampOffsetHours: 30,
    resumeName: "Mike Chen",
    resumeSummary: "3年全栈经验，参与实时协作文档和权限系统建设。",
    skills: ["TypeScript", "Node.js", "React", "PostgreSQL", "WebSocket", "GraphQL"],
    company: "飞书",
    title: "协作平台全栈工程师",
    level: "P6",
    salaryRange: [38, 62],
    strategy: "balanced",
    marketCondition: "normal",
    outcome: "accepted",
    finalSalary: 54,
    successProbability: 0.71,
    rounds: 4,
    hr: { name: "赵宁", archetype: "product_minded", tagline: "产品导向型 HR", tone: "关注业务影响和协作成熟度" },
    actions: [
      { round: 0, player: "market", action_type: "signal", reasoning: "协作软件全栈岗位供需平衡，但实时协作经验有溢价。" },
      { round: 0, player: "interviewer", action_type: "evaluate", reasoning: "候选人实时同步模块经验与岗位匹配，架构深度略低于 P7。" },
      { round: 1, player: "candidate", action_type: "counter_offer", salary: 58, reasoning: "我期望 58K，实时文档和权限系统经验能减少团队磨合成本。" },
      { round: 1, player: "hr", action_type: "offer", salary: 48, reasoning: "HR 认可匹配度，但按 P6 中位给出首轮报价。" },
      { round: 2, player: "candidate", action_type: "signal", reasoning: "补充说明 WebSocket 冲突处理和权限模型设计经历。" },
      { round: 2, player: "hr", action_type: "counter_offer", salary: 52, reasoning: "候选人补充的系统设计证据提升可信度，HR 小幅上调。" },
      { round: 3, player: "candidate", action_type: "counter_offer", salary: 55, reasoning: "如果 55K 并确认核心模块 owner，我可以接受 P6 入职。" },
      { round: 3, player: "hr", action_type: "counter_offer", salary: 54, reasoning: "54K 加模块 owner 是可审批的平衡点。" },
      { round: 4, player: "candidate", action_type: "accept", salary: 54, reasoning: "接受 54K，确认入职后负责权限与同步一致性模块。" },
    ],
    outcomeMessage: "谈判成功：全栈候选人用业务贴合度换取中高位报价。",
    recommendation: "适合展示业务影响力证据如何提高 HR 信任。",
  },
  {
    id: "demo-pdd-growth-rejected",
    timestampOffsetHours: 38,
    resumeName: "Kevin Zhang",
    resumeSummary: "7年增长后端经验，负责补贴策略、实时实验平台和用户分层投放系统。",
    skills: ["Java", "Flink", "ClickHouse", "ABTest", "Redis", "高并发"],
    company: "拼多多",
    title: "增长平台后端专家",
    level: "P7+",
    salaryRange: [75, 115],
    strategy: "aggressive",
    marketCondition: "normal",
    outcome: "rejected",
    finalSalary: null,
    successProbability: 0.39,
    rounds: 5,
    hr: { name: "高敏", archetype: "pressure_tester", tagline: "压力测试型 HR", tone: "快节奏、反复确认抗压和稳定性" },
    actions: [
      { round: 0, player: "market", action_type: "signal", reasoning: "增长平台岗位稀缺，但候选人稳定性和强度匹配会被重点审查。" },
      { round: 0, player: "interviewer", action_type: "evaluate", reasoning: "技术经验匹配，面试官担心候选人从成熟平台迁移到高压业务后的适应成本。" },
      { round: 1, player: "candidate", action_type: "counter_offer", salary: 118, reasoning: "我希望 118K，增长实验平台直接影响 GMV 和补贴效率。" },
      { round: 1, player: "hr", action_type: "offer", salary: 92, reasoning: "HR 认为业务价值成立，但高于团队现金带宽，需要观察候选人弹性。" },
      { round: 2, player: "candidate", action_type: "signal", reasoning: "强调曾经支持 200+ 并行实验和分钟级策略回滚。" },
      { round: 2, player: "hr", action_type: "counter_offer", salary: 98, reasoning: "可验证经历提升报价，但 HR 要求用绩效和年终浮动覆盖上行空间。" },
      { round: 3, player: "candidate", action_type: "counter_offer", salary: 114, reasoning: "坚持现金 114K，否则当前机会成本过高。" },
      { round: 3, player: "hr", action_type: "wait", reasoning: "HR 认为候选人强绑定现金，暂缓推进并测试是否接受结构性补偿。" },
      { round: 4, player: "candidate", action_type: "counter_offer", salary: 112, reasoning: "可以小幅降低到 112K，但不接受大比例浮动。" },
      { round: 4, player: "hr", action_type: "reject", reasoning: "候选人与薪酬结构预期不一致，HR 判断成交概率低，结束谈判。" },
    ],
    outcomeMessage: "谈判破裂：现金诉求与高浮动薪酬结构冲突。",
    recommendation: "高压增长岗位应提前确认薪酬结构，而不是只盯现金月薪。",
  },
  {
    id: "demo-kuaishou-reco-accepted",
    timestampOffsetHours: 46,
    resumeName: "Grace Zhou",
    resumeSummary: "6年推荐算法经验，主导短视频召回链路重构和多目标排序实验。",
    skills: ["Python", "TensorFlow", "推荐系统", "召回", "排序", "特征平台"],
    company: "快手",
    title: "推荐算法工程师",
    level: "P7",
    salaryRange: [65, 100],
    strategy: "balanced",
    marketCondition: "hot",
    outcome: "accepted",
    finalSalary: 88,
    successProbability: 0.79,
    rounds: 4,
    hr: { name: "宋遥", archetype: "talent_hunter", tagline: "业务抢人型 HR", tone: "积极但关注入职时间" },
    actions: [
      { round: 0, player: "market", action_type: "signal", reasoning: "推荐算法核心链路人才仍然紧缺，短视频场景迁移成本低。" },
      { round: 0, player: "interviewer", action_type: "evaluate", reasoning: "召回重构和多目标排序经验直接对应团队当前优化方向。" },
      { round: 1, player: "candidate", action_type: "counter_offer", salary: 94, reasoning: "我希望 94K，主要基于召回链路重构对播放时长和互动率的提升。" },
      { round: 1, player: "hr", action_type: "offer", salary: 80, reasoning: "首轮报价偏保守，但 HR 明确表达团队需要尽快补齐算法 owner。" },
      { round: 2, player: "candidate", action_type: "signal", reasoning: "补充线上 A/B 实验提升播放完成率 1.8%，并说明可两周内入职。" },
      { round: 2, player: "hr", action_type: "counter_offer", salary: 86, reasoning: "入职确定性和业务指标让 HR 提高报价。" },
      { round: 3, player: "candidate", action_type: "counter_offer", salary: 90, reasoning: "如果 90K 并明确负责召回优化，我可以优先接受。" },
      { round: 3, player: "hr", action_type: "counter_offer", salary: 88, reasoning: "88K 更符合审批，同时承诺核心召回方向 owner。" },
      { round: 4, player: "candidate", action_type: "accept", salary: 88, reasoning: "接受 88K，确认方向 owner 和试用期目标。" },
    ],
    outcomeMessage: "谈判成功：业务指标和入职确定性共同推高报价。",
    recommendation: "推荐算法谈薪要把模型指标、业务指标和到岗时间绑定。",
  },
  {
    id: "demo-baidu-pm-accepted",
    timestampOffsetHours: 60,
    resumeName: "Mia Huang",
    resumeSummary: "5年 AI 产品经理经验，负责企业知识库、RAG 平台和私有化交付。",
    skills: ["AI 产品", "RAG", "企业服务", "数据分析", "私有化交付", "路线图规划"],
    company: "百度智能云",
    title: "AI 平台产品经理",
    level: "P6",
    salaryRange: [45, 75],
    strategy: "conservative",
    marketCondition: "normal",
    outcome: "accepted",
    finalSalary: 58,
    successProbability: 0.64,
    rounds: 3,
    hr: { name: "叶澄", archetype: "process_oriented", tagline: "流程稳健型 HR", tone: "关注匹配和长期稳定" },
    actions: [
      { round: 0, player: "market", action_type: "signal", reasoning: "AI 产品岗位热度高，但企业交付经验比概念包装更关键。" },
      { round: 0, player: "interviewer", action_type: "evaluate", reasoning: "候选人 RAG 和私有化交付经验匹配，但技术深度需要团队补位。" },
      { round: 1, player: "candidate", action_type: "counter_offer", salary: 62, reasoning: "我期望 62K，企业知识库从 0 到 1 和交付闭环是核心优势。" },
      { round: 1, player: "hr", action_type: "offer", salary: 54, reasoning: "HR 给出稳妥报价，并希望观察候选人对长期成长的关注。" },
      { round: 2, player: "candidate", action_type: "counter_offer", salary: 59, reasoning: "我可以接受稳健方案，但希望薪资接近 59K，并明确产品线 ownership。" },
      { round: 2, player: "hr", action_type: "counter_offer", salary: 58, reasoning: "58K 配合明确 owner 范围更容易审批。" },
      { round: 3, player: "candidate", action_type: "accept", salary: 58, reasoning: "接受 58K，重点确认产品线 ownership 和客户交付节奏。" },
    ],
    outcomeMessage: "谈判成功：保守策略换取稳定成交和明确职责。",
    recommendation: "产品岗 demo 可突出 ownership、客户交付和长期成长，而非只谈现金。",
  },
  {
    id: "demo-netEase-qa-rejected",
    timestampOffsetHours: 72,
    resumeName: "Leo Wu",
    resumeSummary: "4年测试开发经验，熟悉自动化测试、压测平台和质量度量。",
    skills: ["Python", "自动化测试", "JMeter", "Playwright", "质量平台", "CI/CD"],
    company: "网易游戏",
    title: "测试开发工程师",
    level: "P6",
    salaryRange: [32, 52],
    strategy: "balanced",
    marketCondition: "cool",
    outcome: "rejected",
    finalSalary: null,
    successProbability: 0.31,
    rounds: 4,
    hr: { name: "唐玥", archetype: "risk_averse", tagline: "风险规避型 HR", tone: "谨慎、强调岗位刚需" },
    actions: [
      { round: 0, player: "market", action_type: "signal", reasoning: "测试开发岗位供给充足，游戏业务更看重稳定性专项经验。" },
      { round: 0, player: "interviewer", action_type: "evaluate", reasoning: "自动化能力合格，但缺少游戏客户端专项和线上事故治理案例。" },
      { round: 1, player: "candidate", action_type: "counter_offer", salary: 50, reasoning: "我希望 50K，因为自动化平台可以降低回归成本。" },
      { round: 1, player: "hr", action_type: "offer", salary: 38, reasoning: "HR 认为能力可用，但岗位稀缺性不足以支撑高位报价。" },
      { round: 2, player: "candidate", action_type: "signal", reasoning: "补充压测平台经验，但未覆盖游戏客户端稳定性专项。" },
      { round: 2, player: "hr", action_type: "counter_offer", salary: 41, reasoning: "HR 小幅上调，但仍强调专项匹配不足。" },
      { round: 3, player: "candidate", action_type: "counter_offer", salary: 48, reasoning: "我希望至少 48K，否则转向互联网平台测试开发岗位。" },
      { round: 3, player: "hr", action_type: "reject", reasoning: "岗位匹配证据不足且薪资差距仍大，HR 结束谈判。" },
    ],
    outcomeMessage: "谈判破裂：岗位专项匹配不足导致报价上限受限。",
    recommendation: "测试开发场景应补齐游戏稳定性、客户端兼容和线上事故治理证据。",
  },
];

const DEMO_PROFILE: UserProfile = {
  name: "Sarah Wang",
  targetRole: "高级后端 / 云原生平台工程师",
  targetCity: "北京 / 上海 / 杭州",
  preferredStrategy: "balanced",
  resume: {
    resume_id: "demo-fixed-profile-resume",
    name: "Sarah Wang",
    summary: "4年 Go 后端与云原生平台经验，负责过日均 10 亿级消息推送链路和 API 网关重构，擅长高并发、Kubernetes、Kafka 与可观测性建设。",
    skills: ["Go", "Kafka", "Kubernetes", "Redis", "gRPC", "Prometheus", "Docker", "PostgreSQL", "系统设计"],
    education: [{ school: "上海交通大学", degree: "硕士", major: "计算机科学与技术", graduation_year: 2022 }],
    experience: [
      {
        company: "字节跳动",
        title: "后端开发工程师",
        description: "负责消息中台基础设施建设，设计高可用推送链路；参与 API 网关重构，QPS 提升 3 倍，核心链路 P99 延迟降低 35%。",
        tech_stack: ["Go", "Kafka", "Redis", "Kubernetes", "gRPC"],
        start_date: "2022-07",
        end_date: "至今",
      },
      {
        company: "有赞",
        title: "后端开发实习生",
        description: "参与电商订单和营销活动系统开发，熟悉交易链路和缓存一致性问题。",
        tech_stack: ["Python", "Django", "MySQL", "Redis"],
        start_date: "2021-06",
        end_date: "2022-03",
      },
    ],
  },
};

function toAction(scenario: DemoScenario, index: number) {
  const action = scenario.actions[index];
  return {
    player: action.player,
    action_type: action.action_type,
    params: action.salary
      ? action.action_type === "offer"
        ? { salary_offer: action.salary }
        : action.action_type === "accept"
        ? { accepted_salary: action.salary }
        : { salary_ask: action.salary }
      : {},
    reasoning: action.reasoning,
    confidence: Math.max(0.62, 0.92 - index * 0.025),
    round: action.round,
    timestamp: new Date(Date.now() - scenario.timestampOffsetHours * 3600_000 + index * 90_000).toISOString(),
  };
}

function toHistoryEntry(scenario: DemoScenario) {
  const timestamp = Date.now() - scenario.timestampOffsetHours * 3600_000;
  const actions = scenario.actions.map((_, index) => toAction(scenario, index));
  const resumeData = {
    resume_id: `${scenario.id}-resume`,
    name: scenario.resumeName,
    summary: scenario.resumeSummary,
    skills: scenario.skills,
    education: [{ school: "演示数据大学", degree: "本科/硕士", major: "计算机相关", graduation_year: 2021 }],
    experience: [{ company: scenario.company, title: scenario.title, start_date: "2021-07", end_date: "至今" }],
  };
  const jobData = {
    job_id: `${scenario.id}-job`,
    title: scenario.title,
    company: scenario.company,
    level: scenario.level,
    salary_range: scenario.salaryRange,
  };
  const finalResult = {
    outcome: scenario.outcome,
    final_salary: scenario.finalSalary,
    negotiation_rounds: scenario.rounds,
    success_probability: scenario.successProbability,
    candidate_payoff: scenario.outcome === "accepted" ? 0.62 + scenario.successProbability * 0.25 : 0.18,
    hr_payoff: scenario.outcome === "accepted" ? 0.58 + (1 - scenario.successProbability) * 0.1 : 0.31,
    information_asymmetry_cost: scenario.outcome === "accepted" ? 0.12 : 0.34,
    termination_reason: scenario.outcome === "accepted" ? "agreement_reached" : "offer_gap_too_large",
    final_state: {
      action_history: actions,
      scores: { hard_match: 0.82, signal_quality: scenario.successProbability, negotiation: scenario.outcome === "accepted" ? 0.78 : 0.38, trust: scenario.outcome === "accepted" ? 0.74 : 0.36 },
      candidate_type: { leverage: scenario.marketCondition, strategy: scenario.strategy, reservation_wage: Math.round(scenario.salaryRange[0] * 0.9) },
      hr_type: { archetype: scenario.hr.archetype, budget_guard: scenario.outcome === "rejected" },
      interviewer_type: { recommendation: scenario.outcome === "accepted" ? "strong_hire" : "hire_with_risk" },
      market_type: { condition: scenario.marketCondition, salary_trend: scenario.marketCondition === "hot" ? "up" : "flat" },
    },
    evaluation: {
      composite: scenario.outcome === "accepted" ? 0.78 : 0.46,
      dimensions: [
        { dimension: "岗位匹配", score: scenario.outcome === "accepted" ? 0.86 : 0.58, reasoning: "技能与岗位要求的直接重叠度。" },
        { dimension: "信号可信度", score: scenario.successProbability, reasoning: "项目规模、外部机会和可验证成果的可信程度。" },
        { dimension: "谈判策略", score: scenario.outcome === "accepted" ? 0.75 : 0.35, reasoning: scenario.recommendation },
      ],
    },
  };

  return {
    id: scenario.id,
    sessionId: scenario.id,
    timestamp,
    resumeName: scenario.resumeName,
    jobTitle: scenario.title,
    jobCompany: scenario.company,
    jobLevel: scenario.level,
    outcome: scenario.outcome,
    finalSalary: scenario.finalSalary,
    negotiationRounds: scenario.rounds,
    successProbability: scenario.successProbability,
    resumeData,
    jobData,
    finalResult,
    equilibrium: {
      equilibrium_type: "pure_bne",
      solver_iterations: scenario.outcome === "accepted" ? 9 : 14,
      candidate_expected_payoff: finalResult.candidate_payoff,
      hr_expected_payoff: finalResult.hr_payoff,
      converged: true,
      candidate_strategy: { opening_salary_ask: scenario.actions.find((a) => a.player === "candidate" && a.salary)?.salary, stance: scenario.strategy === "aggressive" ? "firm" : "flexible", reservation_wage: Math.round(scenario.salaryRange[0] * 0.9), willing_to_concede_to: scenario.finalSalary || Math.round(scenario.salaryRange[1] * 0.92) },
      hr_strategy: { opening_offer: scenario.actions.find((a) => a.player === "hr" && a.salary)?.salary, max_final_offer: scenario.finalSalary || Math.round(scenario.salaryRange[1] * 0.86), budget_ceiling: scenario.salaryRange[1], urgency: scenario.marketCondition === "hot" ? 0.82 : 0.48 },
    },
    outcomeMessage: scenario.outcomeMessage,
    chatMessages: [
      { role: "user", text: "我这轮最应该复盘什么？" },
      { role: "advisor", text: scenario.recommendation },
    ],
    actions,
    hrPersona: { name: scenario.hr.name, archetype: scenario.hr.archetype, tagline: scenario.hr.tagline, avatar_expression: scenario.outcome === "accepted" ? "🙂" : "🤔", avatar_color: scenario.outcome === "accepted" ? "emerald" : "purple", tone_style: scenario.hr.tone },
    hrPatience: scenario.outcome === "accepted" ? 0.62 : 0.18,
    strategy: scenario.strategy,
    marketCondition: scenario.marketCondition,
  };
}

export function getDemoHistoryEntries() {
  return SCENARIOS.map(toHistoryEntry);
}

export function getDemoGameSessions(): GameSession[] {
  return getDemoHistoryEntries().map((entry) => ({
    session_id: entry.sessionId,
    candidate_name: entry.resumeName,
    job_title: entry.jobTitle,
    job_company: entry.jobCompany,
    job_level: entry.jobLevel,
    status: entry.outcome,
    round: entry.negotiationRounds,
    max_rounds: 8,
    strategy: entry.strategy,
    public_offer: entry.finalSalary,
    created_at: new Date(entry.timestamp).toISOString(),
  }));
}

export function seedDemoProfileIfEmpty() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(USER_PROFILE_KEY);
    if (raw) {
      const existing = JSON.parse(raw) as Partial<UserProfile>;
      if (existing.name || existing.resume) return;
    }
    window.localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(DEMO_PROFILE));
  } catch {
    // Demo seeding should never block the app.
  }
}

export function seedDemoHistoryIfEmpty() {
  if (typeof window === "undefined") return;
  try {
    seedDemoProfileIfEmpty();
    const raw = window.localStorage.getItem(HISTORY_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    if (Array.isArray(existing) && existing.length >= SCENARIOS.length) return;
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(getDemoHistoryEntries()));
  } catch {
    // Demo seeding should never block the app.
  }
}
