"""SQLite storage for AI analysis history.

Stores every successful portfolio analysis so the web UI can browse,
reload, and delete past results. Uses the stdlib sqlite3 module — no
extra dependencies. A fresh connection is opened per call, which keeps
the module safe to use via asyncio.to_thread (no cross-thread sharing).
"""

import json
import sqlite3
from pathlib import Path

from config import settings

_DB_PATH = Path(settings.database_path)


def _connect() -> sqlite3.Connection:
    """Open a new connection with row access by column name."""
    conn = sqlite3.connect(_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Create the analyses table if it doesn't exist yet."""
    with _connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS analyses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT NOT NULL,
                student_name TEXT NOT NULL DEFAULT '',
                school TEXT NOT NULL DEFAULT '',
                readiness_score TEXT NOT NULL DEFAULT '',
                result_json TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            )
            """
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_analyses_id ON analyses (id DESC)"
        )


def save_analysis(filename: str, result: dict) -> int:
    """Insert one analysis result and return the new row id.

    Denormalized summary columns (student_name, school, readiness_score)
    allow fast history listing without parsing the full JSON each time.
    """
    education = result.get("education") or {}
    evaluation = result.get("expert_evaluation") or {}

    student_name = str(result.get("student_name") or "")
    school = str(education.get("school") or "")
    readiness = str(evaluation.get("readiness_score") or "")

    with _connect() as conn:
        cursor = conn.execute(
            """
            INSERT INTO analyses
                (filename, student_name, school, readiness_score, result_json)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                filename,
                student_name,
                school,
                readiness,
                json.dumps(result, ensure_ascii=False),
            ),
        )
        return cursor.lastrowid


def list_analyses(limit: int = 50) -> list[dict]:
    """Return newest-first summaries (without the heavy result_json)."""
    with _connect() as conn:
        rows = conn.execute(
            """
            SELECT id AS analysis_id, filename, student_name, school,
                   readiness_score, created_at
            FROM analyses
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return [dict(row) for row in rows]


def get_analysis(analysis_id: int) -> dict | None:
    """Return one full record with the parsed result, or None if missing."""
    with _connect() as conn:
        row = conn.execute(
            """
            SELECT id AS analysis_id, filename, student_name, school,
                   readiness_score, result_json, created_at
            FROM analyses
            WHERE id = ?
            """,
            (analysis_id,),
        ).fetchone()

    if row is None:
        return None

    record = dict(row)
    record["result"] = json.loads(record.pop("result_json"))
    return record


def delete_analysis(analysis_id: int) -> bool:
    """Delete one record; return True if a row was actually removed."""
    with _connect() as conn:
        cursor = conn.execute(
            "DELETE FROM analyses WHERE id = ?",
            (analysis_id,),
        )
        return cursor.rowcount > 0
