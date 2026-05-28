"""POST /api/upload — Resume upload & parsing."""

from __future__ import annotations

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from input.resume_parser import parse_resume

router = APIRouter(tags=["Upload"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_TYPES = {"application/pdf", "text/plain", "text/markdown"}


@router.post("/upload")
async def upload_resume(file: UploadFile = File(...), source_type: str = Form(default="pdf")):
    """Upload and parse a resume file (PDF/Markdown/Text).

    Returns a StructuredResume with extracted skills, experience, education,
    projects, competitions, and certifications.
    """
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type: {file.content_type}. Allowed: {ALLOWED_TYPES}",
        )
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 10MB)")
    try:
        resume = await parse_resume(content, source_type=source_type or "pdf")
        return {"status": "ok", "resume": resume.model_dump()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
