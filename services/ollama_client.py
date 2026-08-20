"""Async Ollama API client with retry, caching, and parallel support.

Centralizes all communication with Ollama's /api/generate endpoint.
Handles:
- Async HTTP calls via httpx (non-blocking, unlike requests)
- Automatic retry with exponential backoff (tenacity)
- In-memory cache with TTL for page descriptions
- Parallel page processing with configurable concurrency limit
"""

import asyncio
import json
import time
from typing import Optional

import httpx
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from config import settings


# ── Cache ──────────────────────────────────────────────────────────────────

class TTLCache:
    """Simple thread-safe in-memory cache with time-to-live."""

    def __init__(self, ttl_seconds: int = 300):
        self._store: dict[str, tuple[float, str]] = {}
        self._ttl = ttl_seconds

    def get(self, key: str) -> Optional[str]:
        """Return cached value if exists and not expired."""
        if key in self._store:
            expires_at, value = self._store[key]
            if time.monotonic() < expires_at:
                return value
            del self._store[key]
        return None

    def set(self, key: str, value: str) -> None:
        """Store value with expiration time."""
        self._store[key] = (time.monotonic() + self._ttl, value)

    def invalidate(self, key: str) -> None:
        """Remove a key from cache."""
        self._store.pop(key, None)

    def clear(self) -> None:
        """Clear all cached entries."""
        self._store.clear()


# Global cache instance — shared across requests
_vision_cache = TTLCache(ttl_seconds=300)


# ── Retry configuration ────────────────────────────────────────────────────

def _is_retryable(exc: BaseException) -> bool:
    """Return True if the exception is transient and worth retrying.

    Retry on:
    - HTTP 429 (rate limited)
    - HTTP 5xx (server errors)
    - Timeout / connection errors
    """
    if isinstance(exc, httpx.TimeoutException):
        return True
    if isinstance(exc, httpx.ConnectError):
        return True
    if isinstance(exc, httpx.HTTPStatusError):
        return exc.response.status_code in (429, 502, 503, 504)
    return False


_VISION_RETRY = retry(
    retry=retry_if_exception_type(
        (httpx.TimeoutException, httpx.ConnectError, httpx.HTTPStatusError),
    ),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry_error_callback=lambda retry_state: None,  # return None on final failure
)


# ── Image helpers ──────────────────────────────────────────────────────────

def pil_image_to_base64(img) -> str:
    """Convert a PIL Image to a base64-encoded PNG string.

    Args:
        img: A PIL Image object.

    Returns:
        Base64-encoded PNG string suitable for Ollama's images field.
    """
    from io import BytesIO
    import base64
    buf = BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


# ── Vision page description ────────────────────────────────────────────────

_VISION_PROMPT = (
    "คุณกำลังอ่านหน้าหนึ่งจาก Portfolio ของนักเรียนที่สมัครเข้ามหาวิทยาลัย "
    "จงถอดความทุกอย่างที่เห็นในภาพนี้อย่างละเอียดและถูกต้องที่สุด รวมถึง:\n"
    "- ข้อความทั้งหมดในภาพ (ชื่อ, ตัวเลข, วันที่, GPA, ชื่อโรงเรียน, ชื่อโปรเจกต์ ฯลฯ) "
    "อ่านตามที่เห็นจริง ห้ามเดาหรือแต่งเติม\n"
    "- คำอธิบายกราฟ/แผนภูมิ ถ้ามี ให้ระบุตัวเลขและป้ายกำกับที่เห็นจริง\n"
    "- โลโก้ ไอคอน หรือสัญลักษณ์ที่บ่งบอกทักษะ/เทคโนโลยี (เช่น โลโก้ภาษาโปรแกรม, บอร์ด Arduino)\n"
    "- เนื้อหาบนใบประกาศนียบัตร/เกียรติบัตร ถ้ามี ให้ระบุชื่อรายการและวันที่ให้ครบ\n\n"
    "ตอบเป็นข้อความบรรยายธรรมดา (ไม่ต้องเป็น JSON) เป็นภาษาไทยปนอังกฤษตามต้นฉบับ "
    "ห้ามสรุปย่อจนเสียรายละเอียด และห้ามใส่ความเห็นส่วนตัว"
)


async def describe_page(
    image_b64: str,
    page_number: int,
    cache_key: str = "",
) -> Optional[str]:
    """Send one page image to the vision model and return the description.

    Uses retry logic for transient failures. Returns None if all retries fail
    (graceful degradation — caller decides whether to skip).

    Args:
        image_b64: Base64-encoded PNG of the page.
        page_number: 1-indexed page number (for logging).
        cache_key: Optional unique key for caching. If empty, caching is
                   skipped for this call.

    Returns:
        Description string, or None if all retries failed.
    """
    # Check cache first
    if cache_key:
        cached = _vision_cache.get(cache_key)
        if cached is not None:
            return cached

    payload = {
        "model": settings.vision_model_name,
        "prompt": _VISION_PROMPT,
        "images": [image_b64],
        "stream": False,
        "options": {
            "temperature": 0,
            "num_ctx": 8192,
        },
    }

    result = await _call_ollama_with_retry(payload, page_number)

    if result is not None and cache_key:
        _vision_cache.set(cache_key, result)

    return result


@_VISION_RETRY
async def _call_ollama_with_retry(
    payload: dict,
    page_number: int,
) -> Optional[str]:
    """Make a single Ollama API call with retry logic via tenacity decorator.

    Args:
        payload: JSON payload for /api/generate.
        page_number: Page number for error context.

    Returns:
        Response text, or None if the call failed.
    """
    try:
        async with httpx.AsyncClient(timeout=settings.page_read_timeout) as client:
            response = await client.post(settings.ollama_api_url, json=payload)
            response.raise_for_status()
            return response.json().get("response", "").strip()
    except httpx.TimeoutException:
        raise  # caught by tenacity
    except httpx.HTTPStatusError as e:
        if e.response.status_code in (429, 502, 503, 504):
            raise  # retryable
        # Non-retryable HTTP error → return None immediately
        return None
    except (httpx.RequestError, json.JSONDecodeError):
        raise  # retryable


# ── Parallel page processing ───────────────────────────────────────────────

async def describe_all_pages_parallel(
    images: list,
    content_hash: str,
) -> tuple[list[str], list[int]]:
    """Process all pages in parallel with a configurable concurrency limit.

    Args:
        images: List of PIL Image objects.
        content_hash: SHA256 of PDF content for cache key derivation.

    Returns:
        Tuple of:
        - List of description strings (one per page, None for failed pages).
        - List of page numbers that failed (1-indexed).
    """
    semaphore = asyncio.Semaphore(settings.max_concurrent_pages)

    async def _process_one(idx: int, img) -> Optional[str]:
        async with semaphore:
            img_b64 = pil_image_to_base64(img)
            page_cache_key = f"{content_hash}_p{idx}"
            return await describe_page(img_b64, idx, cache_key=page_cache_key)

    tasks = [_process_one(idx, img) for idx, img in enumerate(images, start=1)]
    results = await asyncio.gather(*tasks)

    descriptions: list[str] = []
    failed_pages: list[int] = []

    for idx, result in enumerate(results, start=1):
        if result is None:
            failed_pages.append(idx)
            descriptions.append(f"--- หน้า {idx} ---\n[ไม่สามารถอ่านหน้านี้ได้]")
        else:
            descriptions.append(f"--- หน้า {idx} ---\n{result}")

    return descriptions, failed_pages


# ── Synthesis (JSON extraction) ────────────────────────────────────────────

from string import Template

_SYNTHESIS_TEMPLATE = Template(
    '''คุณคือหัวหน้าคณะกรรมการผู้เชี่ยวชาญด้านการคัดเลือกนักศึกษาเข้ามหาวิทยาลัย ในสาขาเทคโนโลยีคอมพิวเตอร์และครุศาสตร์อุตสาหกรรม
หน้าที่ของคุณคือการ "วิเคราะห์และประเมินศักยภาพเชิงลึก" จากข้อความที่ถอดความมาจาก Portfolio ด้านล่างนี้อย่างละเอียดถี่ถ้วน
ข้อความด้านล่างถอดมาจากภาพจริงทีละหน้า ให้ยึดข้อมูลที่ปรากฏจริงเท่านั้น ห้ามเดาหรือแต่งเติมตัวเลข/วันที่/ชื่อที่ไม่มีในข้อความ

กฎสำคัญที่ห้ามฝ่าฝืน:
- ก่อนตอบ ให้ไล่อ่านข้อความที่ถอดมาทุกหน้าอย่างละเอียดอีกครั้ง ถ้าพบตัวเลข วันที่ เกรด รางวัล หรือชื่อกิจกรรมใดๆ ที่ตรงกับช่องในโครงสร้าง JSON ห้ามปล่อยเป็นค่าว่างเด็ดขาด ต้องใส่ข้อมูลนั้นให้ครบ
- โดยเฉพาะ GPA: ถ้าในข้อความมีคำว่า "GPA" ตามด้วยตัวเลข หรือมีกราฟ/ตารางเกรดรายภาคเรียน ต้องดึงตัวเลขเหล่านั้นมาใส่ใน gpa_overall และ gpa_details เสมอ
- โปรเจกต์ กิจกรรม เหรียญรางวัล และใบเกียรติบัตรทุกรายการที่ปรากฏในทุกหน้า (ไม่ใช่แค่หน้าแรกๆ) ต้องถูกนำมารวมไว้ใน key_projects_analysis และ soft_skills_and_roles ให้ครบ ห้ามเลือกมาแค่บางหน้า

จงตอบกลับเป็นรูปแบบ JSON ที่ถูกต้องสมบูรณ์เท่านั้น (ห้ามมีคำเกริ่นนำ หรือคำสรุปนอกกรอบ JSON) ตามโครงสร้างที่กำหนดดังนี้:

โครงสร้าง JSON ที่ต้องการ:
{
    "student_name": "ชื่อ-นามสกุลของนักศึกษา (ตรวจสอบความถูกต้องของสระและวรรณยุกต์ภาษาไทย)",
    "education": {
        "school": "ชื่อโรงเรียนมัธยมปลายต้นสังกัด",
        "program": "สายการเรียนหรือแผนการเรียน เช่น Coding & Multimedia",
        "gpa_overall": "เกรดเฉลี่ยสะสมรวมที่ระบุ หรือเกรดเทอมล่าสุด",
        "gpa_details": "สรุปแนวโน้มเกรดรายเทอม เช่น เกรดทรงตัวอยู่ในระดับ 3.0-3.5"
    },
    "technical_skills_breakdown": {
        "programming_languages": ["ภาษาโปรแกรมมิ่งทั้งหมดที่พบ เช่น C++, Python, HTML/CSS"],
        "hardware_and_robotics": ["ทักษะด้านฮาร์ดแวร์ บอร์ดไมโครคอนโทรลเลอร์ และหุ่นยนต์ เช่น Arduino, ESP32, micro:bit, ZMROBO"],
        "ai_and_software_platforms": ["แพลตฟอร์ม AI, ซอฟต์แวร์ และระบบฐานข้อมูล เช่น CiRA CORE, Image Processing, Machine Learning, MySQL"]
    },
    "soft_skills_and_roles": ["ทักษะการทำงานและบทบาทที่พบในกิจกรรม เช่น ภาวะผู้นำ (ประธาน/กรรมการ), การพรีเซนต์งานภาษาอังกฤษ, การทำงานเป็นทีม"],
    "key_projects_analysis": [
        {
            "project_name": "ชื่อโปรเจกต์เด่น (เช่น ระบบสแกนคนเข้าออกโรงเรียนด้วย CiRA CORE)",
            "technologies_used": ["เทคนิคหรือเครื่องมือที่ใช้ในโปรเจกต์นี้"],
            "project_description": "อธิบายสั้นๆ ว่าโปรเจกต์นี้ทำอะไรและแก้ปัญหาอะไรให้กับโรงเรียนหรือชุมชน"
        }
    ],
    "expert_evaluation": {
        "strengths": ["จุดเด่นและข้อได้เปรียบที่เป็นรูปธรรมของนักเรียนคนนี้เมื่อเทียบกับเด็กสายคอมพิวเตอร์ทั่วไป"],
        "readiness_score": "ประเมินความพร้อมในการเข้าเรียนต่อในสาขาเทคโนโลยีคอมพิวเตอร์ (เลือกใส่: ดีเยี่ยม / ดีมาก / ผ่านเกณฑ์)",
        "final_recommendation": "คำแนะนำเชิงวิเคราะห์จากผู้เชี่ยวชาญ 3-4 ประโยค ว่าควรรับเข้าศึกษาหรือไม่ และเด็กคนนี้จะไปต่อยอดสร้างชื่อเสียงในด้านใดได้บ้าง"
    }
}

กติกาการวิเคราะห์:
- ห้ามพ่นคำขยะ เช่น "A.I." หรือ "Technique" แยกออกมาโดดๆ ให้จัดกลุ่มเข้ากับทักษะที่เกี่ยวข้องให้เรียบร้อย
- สแกนหาคำศัพท์ที่ซ่อนอยู่ตามบล็อกวงกลม สัญลักษณ์กราฟิก และเกียรติบัตรท้ายเล่มอย่างละเอียด (เช่น รายชื่อคอร์สอบรมบนเว็บ Ai Learn)
- ถ้าข้อมูลบางช่องไม่ปรากฏในข้อความ ให้ใส่ค่าว่าง "" หรือ array ว่าง [] แทนการเดา

ข้อความที่ถอดมาจาก Portfolio (ทีละหน้า):
"""
${extracted_text}
"""
''')


async def synthesize_json(
    extracted_text: str,
    failed_pages: list[int],
) -> dict:
    """Send the full extracted text to the synthesis model and return structured JSON.

    Uses string.Template to safely interpolate user content (prevents injection).

    Args:
        extracted_text: Concatenated page descriptions.
        failed_pages: List of page numbers that failed during vision stage.

    Returns:
        Parsed JSON dict from the synthesis model.

    Raises:
        RuntimeError: If the synthesis call fails or returns invalid JSON.
    """
    prompt = _SYNTHESIS_TEMPLATE.safe_substitute(extracted_text=extracted_text)

    payload = {
        "model": settings.synthesis_model_name,
        "prompt": prompt,
        "stream": False,
        "format": "json",
        "options": {
            "temperature": 0,
            "num_ctx": 16384,
            "num_thread": 6,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=settings.synthesis_timeout) as client:
            response = await client.post(settings.ollama_api_url, json=payload)
            response.raise_for_status()
            result = json.loads(response.json().get("response", "{}"))
    except httpx.TimeoutException:
        raise RuntimeError("การสรุปผล JSON ใช้เวลานานเกินกำหนด (timeout)")
    except httpx.HTTPStatusError as e:
        raise RuntimeError(
            f"Ollama synthesis model error (status {e.response.status_code}): "
            f"{e.response.text[:500]}",
        )
    except (httpx.RequestError, json.JSONDecodeError) as e:
        raise RuntimeError(f"JSON synthesis failed: {e}")

    # Annotate with debug info
    result["_debug_extracted_text"] = extracted_text
    result["_debug_failed_pages"] = failed_pages

    return result