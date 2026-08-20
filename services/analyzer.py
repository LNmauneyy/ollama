"""Portfolio analysis pipeline orchestrator.

Ties together the two-stage pipeline:
1. Vision stage: convert PDF to images → describe each page via vision model
2. Synthesis stage: combine all descriptions → extract structured JSON

Handles graceful degradation: if vision fails on some pages, those pages are
skipped and synthesis continues with the available descriptions.
"""

import re
from typing import Tuple

from fastapi import UploadFile

from config import settings
from services.pdf_processor import validate_and_convert_pdf
from services.ollama_client import describe_all_pages_parallel, synthesize_json
from models.schemas import PortfolioAnalysis


# ── Public API ─────────────────────────────────────────────────────────────

async def analyze_portfolio_pipeline(file: UploadFile) -> Tuple[dict, list[int]]:
    """Run the full portfolio analysis pipeline.

    Pipeline steps:
    1. Validate and convert PDF → list of page images.
    2. Process all pages through vision model in parallel.
    3. Combine descriptions → send to synthesis model.
    4. Parse and return structured JSON.

    Args:
        file: Uploaded PDF file from the API request.

    Returns:
        Tuple of (analysis dict, list of failed page numbers).
        The analysis dict is guaranteed to have at least the
        PortfolioAnalysis schema fields (some may be empty).
    """
    # Step 1: Validate PDF and convert to images
    images, content_hash = await validate_and_convert_pdf(file)

    # Step 2: Vision — describe all pages in parallel
    page_descriptions, failed_pages = await describe_all_pages_parallel(
        images,
        content_hash,
    )

    # Combine all descriptions
    extracted_text = "\n\n".join(page_descriptions)

    # Clean up whitespace
    extracted_text = re.sub(r' +', ' ', extracted_text)

    # Step 3: Synthesis — extract structured JSON
    if failed_pages:
        # Inform the synthesis model about which pages failed
        failed_note = (
            f"\n\n[หมายเหตุ: หน้าที่ {', '.join(map(str, failed_pages))} "
            f"ไม่สามารถอ่านได้เนื่องจากข้อผิดพลาดของระบบ — "
            f"ให้ข้ามหน้าเหล่านั้นและวิเคราะห์จากข้อมูลที่มีเท่านั้น]"
        )
        extracted_text += failed_note

    try:
        result = await synthesize_json(extracted_text, failed_pages)
    except RuntimeError as e:
        # Synthesis failed — return partial result with what we have
        partial = PortfolioAnalysis().model_dump()
        partial["_debug_extracted_text"] = extracted_text
        partial["_debug_failed_pages"] = failed_pages
        partial["_debug_synthesis_error"] = str(e)
        return partial, failed_pages

    return result, failed_pages