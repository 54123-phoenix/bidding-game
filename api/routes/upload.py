"""POST /api/upload — Resume upload & parsing."""

from __future__ import annotations

from fastapi import APIRouter, File, Form, UploadFile

from input.resume_parser import parse_resume

router = APIRouter(tags=["Upload"])


@router.post("/upload")
async def upload_resume(file: UploadFile = File(...), source_type: str = Form(default="pdf")):
    """Upload and parse a resume file (PDF/Markdown/Text).

    Returns a StructuredResume with extracted skills, experience, education,
    projects, competitions, and certifications.
    """
    content = await file.read()
    try:
        resume = await parse_resume(content, source_type=source_type or "pdf")
        return {"status": "ok", "resume": resume.model_dump()}
    except Exception as e:
        return {"status": "error", "message": str(e), "resume": None}
