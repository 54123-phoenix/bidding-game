"""Qdrant vector store wrapper — simplified from ai-career-intelligence.

Uses local file persistence by default. Falls back to :memory: for CI.
"""

from __future__ import annotations

import os
import uuid
from pathlib import Path

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams

COLLECTION_RESUMES = "resumes"
COLLECTION_JOBS = "jobs"
EMBEDDING_DIM = 384  # MiniLM default; DashScope overrides at runtime

_POINT_NAMESPACE = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")


def _to_uuid(id_str: str) -> str:
    return str(uuid.uuid5(_POINT_NAMESPACE, id_str))


class QdrantStore:
    """Simplified Qdrant wrapper for resume/job vector storage."""

    def __init__(self, location: str | None = None, dim: int = EMBEDDING_DIM):
        if location is None:
            location = os.environ.get(
                "QDRANT_URL",
                str(Path(__file__).resolve().parent.parent / "data" / "qdrant_storage"),
            )
        if location == ":memory:":
            self._client = QdrantClient(location=location)
        else:
            self._client = QdrantClient(path=location)
        self._dim = dim
        self._id_map: dict[str, str] = {}
        self._reverse_map: dict[str, str] = {}
        self._ensure_collections()

    def _ensure_collections(self):
        for name in (COLLECTION_RESUMES, COLLECTION_JOBS):
            if not self._client.collection_exists(name):
                self._client.create_collection(
                    collection_name=name,
                    vectors_config=VectorParams(size=self._dim, distance=Distance.COSINE),
                )

    def _map_id(self, original: str) -> str:
        uid = _to_uuid(original)
        self._id_map[original] = uid
        self._reverse_map[uid] = original
        # Prune old entries to prevent unbounded growth (keep last 10_000)
        if len(self._id_map) > 20_000:
            excess = len(self._id_map) - 10_000
            keys_to_drop = list(self._id_map.keys())[:excess]
            for k in keys_to_drop:
                uid_val = self._id_map.pop(k, None)
                if uid_val:
                    self._reverse_map.pop(uid_val, None)
        return uid

    def _original_id(self, uid: str) -> str:
        return self._reverse_map.get(uid, uid)

    def upsert_job(self, job_id: str, vector: list[float], payload: dict):
        self._client.upsert(
            collection_name=COLLECTION_JOBS,
            points=[PointStruct(id=self._map_id(job_id), vector=vector, payload=payload)],
        )

    def upsert_batch(self, collection: str, ids: list[str], vectors: list[list[float]], payloads: list[dict]):
        points = [
            PointStruct(id=self._map_id(id_), vector=vec, payload=pl)
            for id_, vec, pl in zip(ids, vectors, payloads)
        ]
        self._client.upsert(collection_name=collection, points=points)

    def search(self, collection: str, query_vector: list[float], top_k: int = 10,
               score_threshold: float = 0.0) -> list[dict]:
        results = self._client.query_points(
            collection_name=collection, query=query_vector,
            limit=top_k, score_threshold=score_threshold,
        ).points
        return [
            {"id": self._original_id(hit.id), "score": round(hit.score, 4), "payload": hit.payload or {}}
            for hit in results
        ]

    def collection_exists(self, name: str) -> bool:
        return self._client.collection_exists(name)

    def count(self, collection: str) -> int:
        return self._client.count(collection_name=collection).count


# Module-level singleton
store = QdrantStore()
