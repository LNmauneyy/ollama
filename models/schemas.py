"""Pydantic models for API request/response schemas."""

from typing import Annotated, Any

from pydantic import BaseModel, BeforeValidator, Field


def _coerce_str(v: Any) -> str:
    """Convert any value to string (handles int/float from Ollama)."""
    if isinstance(v, str):
        return v
    if v is None:
        return ""
    return str(v)


# Field type that accepts str, int, or float and always returns str
CoercedStr = Annotated[str, BeforeValidator(_coerce_str)]


# ── Nested schemas ─────────────────────────────────────────────────────────

class Education(BaseModel):
    school: CoercedStr = Field(default="", description="ชื่อโรงเรียนมัธยมปลายต้นสังกัด")
    program: CoercedStr = Field(default="", description="สายการเรียนหรือแผนการเรียน")
    gpa_overall: CoercedStr = Field(default="", description="เกรดเฉลี่ยสะสมรวม")
    gpa_details: CoercedStr = Field(default="", description="สรุปแนวโน้มเกรดรายเทอม")


class TechnicalSkillsBreakdown(BaseModel):
    programming_languages: list[str] = Field(default_factory=list)
    hardware_and_robotics: list[str] = Field(default_factory=list)
    ai_and_software_platforms: list[str] = Field(default_factory=list)


class ProjectAnalysis(BaseModel):
    project_name: CoercedStr = Field(default="")
    technologies_used: list[str] = Field(default_factory=list)
    project_description: CoercedStr = Field(default="")


class ExpertEvaluation(BaseModel):
    strengths: list[str] = Field(default_factory=list)
    readiness_score: CoercedStr = Field(default="", description="ดีเยี่ยม / ดีมาก / ผ่านเกณฑ์")
    final_recommendation: CoercedStr = Field(default="")


# ── Main response schema ───────────────────────────────────────────────────

class PortfolioAnalysis(BaseModel):
    """Full analysis result returned by the API."""
    analysis_id: int | None = Field(
        default=None,
        description="ID ของรายการในประวัติการวิเคราะห์ (None หากยังไม่ได้บันทึก)",
    )
    student_name: CoercedStr = Field(default="")
    education: Education = Field(default_factory=Education)
    technical_skills_breakdown: TechnicalSkillsBreakdown = Field(
        default_factory=TechnicalSkillsBreakdown,
    )
    soft_skills_and_roles: list[str] = Field(default_factory=list)
    key_projects_analysis: list[ProjectAnalysis] = Field(default_factory=list)
    expert_evaluation: ExpertEvaluation = Field(default_factory=ExpertEvaluation)
    _debug_extracted_text: str = ""


# ── History schemas ────────────────────────────────────────────────────────

class AnalysisSummary(BaseModel):
    """Lightweight history list item (no full result payload)."""
    analysis_id: int
    filename: str
    student_name: str
    school: str
    readiness_score: str
    created_at: str


class AnalysisRecord(AnalysisSummary):
    """Full history record including the stored analysis result."""
    result: dict[str, Any]


# ── Error response schema ──────────────────────────────────────────────────

class ErrorResponse(BaseModel):
    """Standard error response body."""
    error: str
    detail: str
    failed_pages: list[int] = Field(default_factory=list)