"""Resume parser — simplified from ai-career-intelligence.

Pipeline: raw bytes → text extraction → LLM extraction → Pydantic validation.
On LLM failure, falls back to regex-based extraction.
"""

from __future__ import annotations

import json
import re
import uuid
from datetime import datetime

from input.pdf_extractor import extract_text_from_pdf
from llm.client import call_llm
from models.schemas import Competition, Education, Project, StructuredResume, WorkExperience

# ── Skill synonyms (from parser/schemas.py) ────────────────────────────

SKILL_SYNONYMS: dict[str, str] = {
    "react.js": "React", "reactjs": "React", "vue.js": "Vue", "vuejs": "Vue",
    "node.js": "Node.js", "nodejs": "Node.js", "python3": "Python",
    "typescript": "TypeScript", "ts": "TypeScript",
    "javascript": "JavaScript", "js": "JavaScript",
    "golang": "Go", "go-lang": "Go",
    "postgresql": "PostgreSQL", "postgres": "PostgreSQL", "mongodb": "MongoDB",
    "kubernetes": "Kubernetes", "k8s": "Kubernetes",
    "tensorflow": "TensorFlow", "tf": "TensorFlow", "pytorch": "PyTorch",
    "machine learning": "Machine Learning", "ml": "Machine Learning",
    "deep learning": "Deep Learning", "dl": "Deep Learning",
    "natural language processing": "NLP", "nlp": "NLP",
    "large language model": "LLM", "llm": "LLM",
    "fastapi": "FastAPI", "flask": "Flask", "django": "Django",
    "aws": "AWS", "azure": "Azure", "gcp": "GCP",
    "redis": "Redis", "kafka": "Kafka", "rabbitmq": "RabbitMQ",
    "graphql": "GraphQL", "grpc": "gRPC", "rest": "REST",
}

SECTION_PATTERNS: dict[str, re.Pattern] = {
    "skills": re.compile(
        r"(?:技能|skills?|技术栈|tech[_\s]?stack|proficienc(?:y|ies))[\s:：]*(.+?)(?:\n\n|\n(?:项目|工作|教育|经历|experience|project|education|$))",
        re.IGNORECASE | re.DOTALL,
    ),
    "email": re.compile(r"[\w.\-+]+@[\w.\-]+\.[a-z]{2,}", re.IGNORECASE),
    "phone": re.compile(r"(?:\+86[\s-]?)?1[3-9]\d[\s-]?\d{4}[\s-]?\d{4}"),
}

RESUME_PARSE_PROMPT = """Extract structured information from this resume. Output ONLY valid JSON, no markdown.

Resume text:
{resume_text}

Output format:
{{
  "name": "full name",
  "email": "email or null",
  "phone": "phone or null",
  "summary": "short professional summary (2-3 sentences, include years of experience and domain)",
  "skills": ["normalized skill name", ...],
  "skill_levels": {{"Python": "精通", "C++": "熟练", ...}},
  "projects": [
    {{"name": "project name", "description": "detailed with quantified metrics (QPS, latency, data volume, user scale, availability %)", "tech_stack": ["tech", ...], "start_date": "YYYY-MM-DD or null", "end_date": "YYYY-MM-DD or null"}}
  ],
  "education": [
    {{"school": "school name", "degree": "本科/硕士/博士/其他", "major": "major", "graduation_year": 2024 or null}}
  ],
  "experience": [
    {{"company": "company", "title": "job title", "description": "detailed with quantified impact", "tech_stack": ["tech", ...], "start_date": "YYYY-MM-DD or null", "end_date": "YYYY-MM-DD or null"}}
  ],
  "certifications": ["cert name", ...],
  "competitions": [
    {{"name": "standardized competition name", "year": 2024, "award": "金奖/银奖/铜奖/一等奖/二等奖/三等奖", "description": "brief"}}
  ]
}}

Rules:
- Normalize ALL skill names using these mappings:
  "React.js"→"React", "Vue.js"→"Vue", "Node.js"→"Node.js", "Python3"→"Python",
  "golang"→"Go", "k8s"→"Kubernetes", "TF"→"TensorFlow",
  "大模型"→"大模型", "RAG"→"RAG", "Agent"→"AI Agent",
  "微服务"→"微服务", "分布式"→"分布式系统", "高并发"→"高并发",
  "Fine-tuning"→"模型微调", "SFT"→"模型微调"
- skill_levels: infer for EACH skill. 等级: "入门"/"了解"/"熟练"/"精通"/"专家"
- project descriptions MUST include quantified metrics when available
- education degree: "本科"/"硕士"/"博士"/"其他"
- JSON only, no markdown```, no prefix text"""


def normalize_skill(raw: str) -> str:
    key = raw.strip().lower()
    if key in SKILL_SYNONYMS:
        return SKILL_SYNONYMS[key]
    return raw.strip().title()


def normalize_skills(raw_skills: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for s in raw_skills:
        n = normalize_skill(s)
        if n and n not in seen:
            seen.add(n)
            result.append(n)
    return result


async def parse_resume(source: bytes | str, source_type: str = "pdf") -> StructuredResume:
    """Parse a resume file into StructuredResume.

    Pipeline: raw → text → LLM extraction → Pydantic validation.
    """
    # Extract text
    try:
        if source_type == "pdf":
            if isinstance(source, str):
                source = source.encode("utf-8")
            raw_text = extract_text_from_pdf(source)
        elif isinstance(source, bytes):
            raw_text = source.decode("utf-8", errors="replace")
        else:
            raw_text = str(source)
    except Exception:
        raw_text = str(source) if isinstance(source, str) else source.decode("utf-8", errors="replace")

    # LLM extraction
    try:
        data = await _llm_parse(raw_text)
    except Exception:
        data = _rule_parse(raw_text)

    return _validate(data)


async def _llm_parse(raw_text: str) -> dict:
    prompt = RESUME_PARSE_PROMPT.replace("{resume_text}", raw_text[:8000])
    response = await call_llm(prompt, temperature=0.1, max_retries=2)
    return _safe_json(response)


def _rule_parse(raw_text: str) -> dict:
    """Regex fallback when LLM fails."""
    skills: list[str] = []
    skill_match = SECTION_PATTERNS["skills"].search(raw_text)
    if skill_match:
        chunk = skill_match.group(1)
        skills = [s.strip() for s in re.split(r"[,，、/|]", chunk) if s.strip()]

    email_match = SECTION_PATTERNS["email"].search(raw_text)
    phone_match = SECTION_PATTERNS["phone"].search(raw_text)

    return {
        "name": "", "email": email_match.group(0) if email_match else None,
        "phone": phone_match.group(0) if phone_match else None,
        "summary": "", "skills": skills, "skill_levels": {},
        "projects": [], "education": [], "experience": [],
        "certifications": [], "competitions": [],
    }


def _validate(data: dict) -> StructuredResume:
    data = _sanitize(data)
    data["skills"] = normalize_skills(data.get("skills") or [])
    try:
        return StructuredResume(**data)
    except Exception:
        return StructuredResume(
            resume_id=f"res-{uuid.uuid4().hex[:8]}",
            name=data.get("name", ""),
            skills=data.get("skills", []),
        )


def _sanitize(data: dict) -> dict:
    for field in ("name", "summary"):
        if not isinstance(data.get(field), str):
            data[field] = ""
    data["resume_id"] = (
        data["resume_id"] if isinstance(data.get("resume_id"), str) and data["resume_id"]
        else f"res-{uuid.uuid4().hex[:8]}"
    )
    for field in ("email", "phone"):
        if data.get(field) is not None and not isinstance(data.get(field), str):
            data[field] = None
    for field in ("skills", "certifications"):
        if not isinstance(data.get(field), list):
            data[field] = []
    if not isinstance(data.get("skill_levels"), dict):
        data["skill_levels"] = {}

    nested = {
        "projects": (Project, ("name",)),
        "education": (Education, ("school", "major")),
        "experience": (WorkExperience, ("company", "title")),
        "competitions": (Competition, ("name",)),
    }
    for list_key, (model_cls, required_strs) in nested.items():
        raw_items = data.get(list_key)
        if not isinstance(raw_items, list):
            data[list_key] = []
            continue
        parsed = []
        for item in raw_items:
            if not isinstance(item, dict):
                continue
            for f in required_strs:
                if not isinstance(item.get(f), str):
                    item[f] = ""
            item = _coerce_dates(item)
            primary = required_strs[0]
            if not item.get(primary):
                continue
            try:
                parsed.append(model_cls(**item))
            except Exception:
                continue
        data[list_key] = parsed
    return data


def _coerce_dates(item: dict) -> dict:
    for field in ("start_date", "end_date"):
        raw = item.get(field)
        if isinstance(raw, str) and raw.strip():
            try:
                item[field] = datetime.strptime(raw.strip(), "%Y-%m-%d").date()
            except ValueError:
                item[field] = None
        elif raw == "" or raw is None:
            item[field] = None
    return item


def _safe_json(raw: str) -> dict:
    raw = raw.strip()
    m = re.search(r"\{[\s\S]*\}", raw)
    if m:
        raw = m.group(0)
    return json.loads(raw)
