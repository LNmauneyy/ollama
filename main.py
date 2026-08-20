"""Portfolio AI Vision Screener API — FastAPI application.

Two-stage pipeline:
1. Vision stage:  Convert PDF pages to images → describe via vision LLM (qwen2.5vl:7b)
2. Synthesis stage: Combine all descriptions → extract structured JSON evaluation

Usage:
    python main.py          # Start on 0.0.0.0:8099 (or as configured in .env)
    uvicorn main:app        # Via uvicorn directly
"""

import asyncio

from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from services.analyzer import analyze_portfolio_pipeline
from services import database
from models.schemas import (
    PortfolioAnalysis,
    ErrorResponse,
    AnalysisSummary,
    AnalysisRecord,
)

# ── App ────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Portfolio AI Vision Screener API",
    description=(
        "รับ PDF Portfolio ของนักเรียน → "
        "AI vision อ่านเนื้อหาทุกหน้า → "
        "วิเคราะห์และประเมินศักยภาพเชิงลึก → "
        "ส่งกลับ JSON โครงสร้าง"
    ),
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure the history table exists before the first request arrives.
database.init_db()


# ── Routes ─────────────────────────────────────────────────────────────────

@app.post(
    "/analyze-portfolio/",
    response_model=PortfolioAnalysis,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid file type"},
        413: {"model": ErrorResponse, "description": "File too large"},
        422: {"model": ErrorResponse, "description": "Unprocessable file"},
        500: {"model": ErrorResponse, "description": "Internal error"},
    },
    summary="วิเคราะห์ Portfolio PDF",
    description=(
        "อัปโหลดไฟล์ PDF Portfolio ของนักเรียน (สูงสุด 15 หน้า, "
        "ไม่เกิน 30 MB) เพื่อให้ AI วิเคราะห์และประเมินศักยภาพ "
        "ส่งกลับเป็น JSON ที่มีโครงสร้าง"
    ),
)
async def analyze_portfolio(file: UploadFile = File(...)):
    """Receive a PDF portfolio and return an AI-powered analysis.

    The pipeline:
    1. Validates the file (extension, magic bytes, size, MIME type).
    2. Converts PDF pages to images (via pdf2image + Poppler).
    3. Describes each page in parallel via vision model (qwen2.5vl:7b).
    4. Synthesizes all descriptions into a structured JSON evaluation.

    If some pages fail during vision processing, the remaining pages
    are still analyzed (graceful degradation).
    """
    result, failed_pages = await analyze_portfolio_pipeline(file)

    if failed_pages and "_debug_synthesis_error" in result:
        # Vision succeeded partially, but synthesis failed entirely
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Synthesis failed",
                "detail": "ระบบไม่สามารถสรุปผล JSON ได้ — อาจเกิดจากข้อความไม่สมบูรณ์",
                "failed_pages": failed_pages,
                "synthesis_error": result.get("_debug_synthesis_error"),
            },
        )

    # Persist the successful analysis to the history database.
    # A storage failure must never break the analysis response.
    try:
        analysis_id = await asyncio.to_thread(
            database.save_analysis,
            file.filename or "unknown.pdf",
            result,
        )
        result["analysis_id"] = analysis_id
    except Exception as e:
        print(f"[history] บันทึกประวัติการวิเคราะห์ไม่สำเร็จ: {e}")

    return result


# ── History routes ─────────────────────────────────────────────────────────

@app.get(
    "/history/",
    response_model=list[AnalysisSummary],
    summary="ดูประวัติการวิเคราะห์ทั้งหมด",
    description="ส่งกลับรายการประวัติการวิเคราะห์ที่เคยประมวลผล เรียงจากล่าสุดก่อน (ไม่รวมผลลัพธ์เต็ม)",
)
async def list_history(
    limit: int = Query(default=50, ge=1, le=200, description="จำนวนรายการสูงสุด"),
):
    """List past AI analyses, newest first."""
    return await asyncio.to_thread(database.list_analyses, limit)


@app.get(
    "/history/{analysis_id}",
    response_model=AnalysisRecord,
    responses={404: {"model": ErrorResponse, "description": "Not found"}},
    summary="ดูผลการวิเคราะห์ย้อนหลังตาม ID",
)
async def get_history_item(analysis_id: int):
    """Return one full past analysis (including the stored result JSON)."""
    record = await asyncio.to_thread(database.get_analysis, analysis_id)
    if record is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "Not found", "detail": "ไม่พบข้อมูลการวิเคราะห์นี้"},
        )
    return record


@app.delete(
    "/history/{analysis_id}",
    responses={404: {"model": ErrorResponse, "description": "Not found"}},
    summary="ลบประวัติการวิเคราะห์ตาม ID",
)
async def delete_history_item(analysis_id: int):
    """Delete one past analysis record."""
    deleted = await asyncio.to_thread(database.delete_analysis, analysis_id)
    if not deleted:
        raise HTTPException(
            status_code=404,
            detail={"error": "Not found", "detail": "ไม่พบข้อมูลการวิเคราะห์นี้"},
        )
    return {"deleted": True, "analysis_id": analysis_id}


@app.get("/health", summary="ตรวจสอบสถานะ API")
async def health_check():
    """Simple health check endpoint."""
    return {
        "status": "ok",
        "version": "2.0.0",
        "vision_model": settings.vision_model_name,
        "synthesis_model": settings.synthesis_model_name,
    }


# ── Entry point ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=False,
        log_level="info",
    )