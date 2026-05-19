"""Semantic job matching — simplified from ai-career-intelligence.

Orchestrates embedding + Qdrant vector search for resume↔job matching.
"""

from __future__ import annotations

from models.schemas import MatchResult, StructuredJob, StructuredResume
from retrieval.embedder import embedder as _embedder
from retrieval.qdrant import COLLECTION_JOBS, store as _store


class Retriever:
    """Orchestrates semantic search for job matching."""

    def __init__(self):
        self._embedder = _embedder
        self._store = _store

    async def index_job(self, job: StructuredJob) -> str:
        vec = job.job_embedding or self._embedder.encode_job(job)
        self._store.upsert_job(
            job_id=job.job_id,
            vector=vec,
            payload={
                "title": job.title, "company": job.company,
                "required_skills": job.required_skills,
                "optional_skills": job.optional_skills,
                "level": job.level, "location": job.location,
                "salary_range": list(job.salary_range) if job.salary_range else None,
            },
        )
        return job.job_id

    async def index_jobs_batch(self, jobs: list[StructuredJob]) -> list[str]:
        ids = [j.job_id for j in jobs]
        vectors = self._embedder.encode_batch(jobs, item_type="job")
        payloads = [
            {"title": j.title, "company": j.company, "required_skills": j.required_skills,
             "optional_skills": j.optional_skills, "level": j.level, "location": j.location,
             "salary_range": list(j.salary_range) if j.salary_range else None}
            for j in jobs
        ]
        self._store.upsert_batch(COLLECTION_JOBS, ids, vectors, payloads)
        return ids

    async def search_jobs(self, resume: StructuredResume, top_k: int = 10) -> list[MatchResult]:
        query_vec = resume.skill_embedding or self._embedder.encode_resume(resume)
        hits = self._store.search(collection=COLLECTION_JOBS, query_vector=query_vec, top_k=top_k)
        return [
            MatchResult(item_id=h["id"], score=h["score"], payload=h["payload"], match_type="resume_to_job")
            for h in hits
        ]

    async def search_by_query(self, query_text: str, top_k: int = 20) -> list[MatchResult]:
        vec = self._embedder.encode_query(query_text)
        hits = self._store.search(collection=COLLECTION_JOBS, query_vector=vec, top_k=top_k)
        return [
            MatchResult(item_id=h["id"], score=h["score"], payload=h["payload"], match_type="resume_to_job")
            for h in hits
        ]


retriever = Retriever()
