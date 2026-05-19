"""PDF text extraction using pymupdf (fitz)."""

from __future__ import annotations

import fitz  # pymupdf


class PDFExtractionError(Exception):
    """Raised when PDF text extraction fails."""


def extract_text_from_pdf(source: bytes) -> str:
    """Extract raw text from PDF bytes. Falls back to page-by-page extraction."""
    try:
        doc = fitz.open(stream=source, filetype="pdf")
    except Exception as exc:
        raise PDFExtractionError(f"Failed to open PDF: {exc}") from exc

    if doc.page_count == 0:
        doc.close()
        raise PDFExtractionError("PDF has no pages")

    parts: list[str] = []
    for page in doc:
        text = page.get_text("text")
        if text:
            parts.append(text.strip())

    doc.close()

    full_text = "\n\n".join(parts)
    if not full_text.strip():
        raise PDFExtractionError("No extractable text found in PDF (scanned image?)")

    return full_text
