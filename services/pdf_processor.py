"""PDF file validation and image conversion service.

Handles:
- File type validation (magic bytes + MIME type)
- File size validation
- PDF to PIL Image conversion via pdf2image
"""

import hashlib
from io import BytesIO
from typing import Tuple

from fastapi import UploadFile, HTTPException
from pdf2image import convert_from_bytes
from pdf2image.exceptions import PDFInfoNotInstalledError, PDFPageCountError

from config import settings


# ── Constants ──────────────────────────────────────────────────────────────

PDF_MAGIC_BYTES = b"%PDF"
MAX_FILE_SIZE_BYTES = settings.max_file_size_mb * 1024 * 1024


# ── Public API ─────────────────────────────────────────────────────────────

async def validate_and_convert_pdf(
    file: UploadFile,
) -> Tuple[list[bytes], str]:
    """Validate a PDF upload and convert it to a list of page images.

    Steps:
    1. Check filename extension.
    2. Read content and validate magic bytes.
    3. Check content-type header.
    4. Enforce file size limit.
    5. Convert to images via pdf2image.

    Args:
        file: The uploaded PDF file from FastAPI.

    Returns:
        Tuple of (list of PIL Image objects, content hash string).

    Raises:
        HTTPException: If validation fails or conversion errors occur.
    """
    # 1. Extension check (quick reject)
    if not (file.filename and file.filename.lower().endswith(".pdf")):
        raise HTTPException(status_code=400, detail="รองรับเฉพาะไฟล์ PDF เท่านั้น")

    # 2. Read content
    pdf_content = await file.read()

    if not pdf_content:
        raise HTTPException(status_code=422, detail="ไฟล์ว่างเปล่า")

    # 3. Magic bytes check
    if not pdf_content.startswith(PDF_MAGIC_BYTES):
        raise HTTPException(
            status_code=400,
            detail="ไฟล์ไม่ใช่ PDF ที่ถูกต้อง (ไม่พบ magic bytes %PDF)",
        )

    # 4. Content-type header check (if provided)
    content_type = file.content_type or ""
    if content_type and content_type not in (
        "application/pdf",
        "application/octet-stream",
        "",
    ):
        raise HTTPException(
            status_code=400,
            detail=f"Content-type ไม่ถูกต้อง: {content_type}",
        )

    # 5. File size check
    if len(pdf_content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"ไฟล์ใหญ่เกิน {settings.max_file_size_mb} MB "
            f"(ได้รับ {len(pdf_content) / 1024 / 1024:.1f} MB)",
        )

    # 6. Compute content hash for caching
    content_hash = hashlib.sha256(pdf_content).hexdigest()

    # 7. Convert to images
    try:
        all_images = convert_from_bytes(
            pdf_content,
            poppler_path=settings.poppler_path,
            dpi=150,
        )
    except PDFInfoNotInstalledError:
        raise HTTPException(
            status_code=500,
            detail="Poppler ไม่ได้ติดตั้งหรือหา poppler_path ไม่ถูกต้อง",
        )
    except PDFPageCountError as e:
        raise HTTPException(
            status_code=422,
            detail=f"ไม่สามารถอ่านจำนวนหน้า PDF ได้: {e}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"แปลง PDF เป็นรูปภาพล้มเหลว: {e}",
        )

    if not all_images:
        raise HTTPException(status_code=422, detail="ไม่สามารถแปลง PDF เป็นรูปภาพได้")

    # Limit pages
    images = all_images[: settings.max_pages]

    return images, content_hash