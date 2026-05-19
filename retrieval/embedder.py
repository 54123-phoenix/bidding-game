"""Embedding service — text to dense vector via sentence-transformers (MiniLM) or DashScope.

Simplified from ai-career-intelligence. DashScope preferred when API key available.
"""

from __future__ import annotations

import os

EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_DIM = 384
BATCH_SIZE = 32


def resume_to_text(resume) -> str:
    """Flatten StructuredResume to a single searchable text."""
    parts = [resume.summary, " ".join(resume.skills)]
    for proj in resume.projects:
        parts.append(f"{proj.name}: {proj.description}")
    for exp in resume.experience:
        parts.append(f"{exp.title} at {exp.company}: {exp.description}")
    return " ".join(filter(None, parts))


def job_to_text(job) -> str:
    """Flatten StructuredJob to a single searchable text."""
    parts = [
        job.title, job.company, job.description,
        " ".join(job.required_skills), " ".join(job.optional_skills), job.level,
    ]
    return " ".join(filter(None, parts))


class Embedder:
    """Thin wrapper around sentence-transformers with DashScope fallback."""

    def __init__(self, model_name: str = EMBEDDING_MODEL):
        self._model_name = model_name
        self._model = None
        self._dashscope_available = bool(os.getenv("DASHSCOPE_API_KEY"))

    @property
    def dim(self) -> int:
        if self._dashscope_available:
            return 1536
        return EMBEDDING_DIM

    def _lazy_load(self):
        if self._model is None and not self._dashscope_available:
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer(self._model_name)

    def encode_resume(self, resume) -> list[float]:
        return self._encode_text(resume_to_text(resume))

    def encode_job(self, job) -> list[float]:
        return self._encode_text(job_to_text(job))

    def encode_query(self, text: str) -> list[float]:
        return self._encode_text(text)

    def encode_batch(self, items: list, item_type: str = "resume") -> list[list[float]]:
        self._lazy_load()
        fn = resume_to_text if item_type == "resume" else job_to_text
        texts = [fn(item) for item in items]
        if self._dashscope_available:
            return self._dashscope_encode_batch(texts)
        embeddings = self._model.encode(texts, batch_size=BATCH_SIZE,
                                        show_progress_bar=False, normalize_embeddings=True)
        return [vec.tolist() for vec in embeddings]

    def _encode_text(self, text: str) -> list[float]:
        if self._dashscope_available:
            return self._dashscope_encode(text)
        self._lazy_load()
        vec = self._model.encode([text], normalize_embeddings=True)
        return vec[0].tolist()

    def _dashscope_encode(self, text: str) -> list[float]:
        import httpx
        api_key = os.getenv("DASHSCOPE_API_KEY", "")
        with httpx.Client(timeout=30) as client:
            resp = client.post(
                "https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"model": "text-embedding-v2", "input": {"texts": [text]}},
            )
            resp.raise_for_status()
            return resp.json()["output"]["embeddings"][0]["embedding"]

    def _dashscope_encode_batch(self, texts: list[str]) -> list[list[float]]:
        return [self._dashscope_encode(t) for t in texts]


embedder = Embedder()
