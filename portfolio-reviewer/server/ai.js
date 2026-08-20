import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { Agent, fetch as undiciFetch } from 'undici';
import { getDb } from './db.js';
import { requireAuth } from './auth.js';

const router = Router();
const PYTHON_API = process.env.PYTHON_API_URL || 'http://localhost:8099';

// The Python pipeline can legitimately run for ~15-20+ minutes on a full
// portfolio (page_read_timeout=300s per batch x up to 5 batches +
// synthesis_timeout=600s, see config.py). Node's built-in global fetch
// aborts at a 300s headers timeout, which was turning slow-but-successful
// analyses into spurious 502s. Passing a dispatcher into the global fetch
// doesn't work (Node's built-in fetch bundles its own internal undici copy,
// version-mismatched against the one from node_modules), so use undici's
// own `fetch` here instead, paired with a dispatcher from the same package.
const pythonApiDispatcher = new Agent({
  headersTimeout: 40 * 60 * 1000,
  bodyTimeout: 40 * 60 * 1000,
});
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 },
  defParamCharset: 'utf8',
});

// POST /api/analyze-portfolio — direct upload+analyze passthrough to the Python
// vision API, used by the main PortfolioAI upload page (src/services/aiService.js).
// The browser never calls the Python API directly, so it works regardless of
// domain/host and the Python API doesn't need to be reachable from outside this server.
router.post('/analyze-portfolio', requireAuth, memoryUpload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'กรุณาเลือกไฟล์ที่ต้องการอัปโหลด' });
  }
  try {
    const boundary = '----' + Math.random().toString(36).slice(2);
    const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${req.file.originalname}"\r\nContent-Type: ${req.file.mimetype}\r\n\r\n`;
    const footer = `\r\n--${boundary}--\r\n`;
    const body = Buffer.concat([
      Buffer.from(header, 'utf-8'),
      req.file.buffer,
      Buffer.from(footer, 'utf-8'),
    ]);

    const response = await undiciFetch(`${PYTHON_API}/analyze-portfolio/`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body,
      dispatcher: pythonApiDispatcher,
    });

    const data = await response.json().catch(() => ({}));
    res.status(response.status).json(data);
  } catch (err) {
    console.error('analyze-portfolio proxy error:', err);
    res.status(502).json({ error: 'ไม่สามารถเชื่อมต่อระบบวิเคราะห์ AI ได้' });
  }
});

// GET /api/history — proxy to Python history list
router.get('/history', requireAuth, async (req, res) => {
  try {
    const limit = req.query.limit || 50;
    const response = await fetch(`${PYTHON_API}/history/?limit=${encodeURIComponent(limit)}`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('history proxy error:', err);
    res.status(502).json({ error: 'ไม่สามารถโหลดประวัติการวิเคราะห์ได้' });
  }
});

// GET /api/history/:id — proxy to Python history detail
router.get('/history/:id', requireAuth, async (req, res) => {
  try {
    const response = await fetch(`${PYTHON_API}/history/${req.params.id}`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('history detail proxy error:', err);
    res.status(502).json({ error: 'ไม่สามารถโหลดประวัติการวิเคราะห์ได้' });
  }
});

// DELETE /api/history/:id — proxy to Python history delete
router.delete('/history/:id', requireAuth, async (req, res) => {
  try {
    const response = await fetch(`${PYTHON_API}/history/${req.params.id}`, { method: 'DELETE' });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('history delete proxy error:', err);
    res.status(502).json({ error: 'ไม่สามารถลบประวัติการวิเคราะห์ได้' });
  }
});

// POST /api/ai/analyze/:id — analyze a single file via Python FastAPI
router.post('/ai/analyze/:id', requireAuth, async (req, res) => {
  const db = getDb();
  const file = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id);

  if (!file) {
    return res.status(404).json({ error: 'ไม่พบไฟล์' });
  }

  db.prepare("UPDATE files SET ai_status = 'processing' WHERE id = ?").run(file.id);

  analyzeFile(file).then(result => {
    db.prepare("UPDATE files SET ai_status = 'done', ai_result = ? WHERE id = ?")
      .run(JSON.stringify(result), file.id);
  }).catch(err => {
    console.error('AI Analysis error:', err);
    db.prepare("UPDATE files SET ai_status = 'error', ai_result = ? WHERE id = ?")
      .run(JSON.stringify({ error: err.message }), file.id);
  });

  res.json({
    message: 'กำลังวิเคราะห์ไฟล์ด้วย AI...',
    file_id: file.id,
    status: 'processing'
  });
});

// POST /api/ai/analyze-all — analyze all pending files
router.post('/ai/analyze-all', requireAuth, async (req, res) => {
  const db = getDb();
  const pendingFiles = db.prepare("SELECT * FROM files WHERE ai_status = 'pending'").all();

  if (pendingFiles.length === 0) {
    return res.json({ message: 'ไม่มีไฟล์ที่รอการวิเคราะห์', count: 0 });
  }

  for (const file of pendingFiles) {
    db.prepare("UPDATE files SET ai_status = 'processing' WHERE id = ?").run(file.id);

    analyzeFile(file).then(result => {
      db.prepare("UPDATE files SET ai_status = 'done', ai_result = ? WHERE id = ?")
        .run(JSON.stringify(result), file.id);
    }).catch(err => {
      console.error(`AI Analysis error for file ${file.id}:`, err);
      db.prepare("UPDATE files SET ai_status = 'error', ai_result = ? WHERE id = ?")
        .run(JSON.stringify({ error: err.message }), file.id);
    });
  }

  res.json({
    message: `กำลังวิเคราะห์ ${pendingFiles.length} ไฟล์ด้วย AI...`,
    count: pendingFiles.length
  });
});

// GET /api/ai/status/:id — check analysis status
router.get('/ai/status/:id', requireAuth, (req, res) => {
  const db = getDb();
  const file = db.prepare('SELECT id, original_name, ai_status, ai_result, updated_at FROM files WHERE id = ?').get(req.params.id);

  if (!file) {
    return res.status(404).json({ error: 'ไม่พบไฟล์' });
  }

  let result = null;
  if (file.ai_result) {
    try {
      result = JSON.parse(file.ai_result);
    } catch {
      result = { raw: file.ai_result };
    }
  }

  res.json({
    file_id: file.id,
    filename: file.original_name,
    status: file.ai_status,
    result
  });
});

// GET /api/ai/stats — get AI analysis statistics
router.get('/ai/stats', requireAuth, (req, res) => {
  const db = getDb();
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      COALESCE(SUM(CASE WHEN ai_status = 'pending' THEN 1 ELSE 0 END), 0) as pending,
      COALESCE(SUM(CASE WHEN ai_status = 'processing' THEN 1 ELSE 0 END), 0) as processing,
      COALESCE(SUM(CASE WHEN ai_status = 'done' THEN 1 ELSE 0 END), 0) as done,
      COALESCE(SUM(CASE WHEN ai_status = 'error' THEN 1 ELSE 0 END), 0) as error
    FROM files
  `).get();

  res.json(stats);
});

/**
 * ส่งไฟล์ไปยัง Python FastAPI (localhost:8099/analyze-portfolio/)
 * เพื่อวิเคราะห์ด้วย AI Vision (qwen2.5vl:7b) + Synthesis
 */
async function analyzeFile(file) {
  if (!fs.existsSync(file.file_path)) {
    throw new Error(`ไม่พบไฟล์ ${file.original_name} ในระบบ`);
  }

  // Read file as Blob/Buffer
  const fileBuffer = fs.readFileSync(file.file_path);
  const fileName = file.original_name;
  const mimeType = file.mime_type || 'application/octet-stream';

  // Send to Python FastAPI backend
  const boundary = '----' + Math.random().toString(36).slice(2);
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: ${mimeType}\r\n\r\n`;
  const footer = `\r\n--${boundary}--\r\n`;
  const body = Buffer.concat([
    Buffer.from(header, 'utf-8'),
    fileBuffer,
    Buffer.from(footer, 'utf-8')
  ]);

  const response = await undiciFetch(`${PYTHON_API}/analyze-portfolio/`, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
    dispatcher: pythonApiDispatcher,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Python API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  // Transform Python API response to match our format
  return {
    summary: buildSummary(data),
    document_type: 'Portfolio',
    key_points: [
      ...(data.expert_evaluation?.strengths || []),
      ...(data.technical_skills_breakdown?.programming_languages || []),
    ].slice(0, 5),
    quality_score: mapScore(data.expert_evaluation?.readiness_score),
    recommendations: data.expert_evaluation?.areas_for_improvement
      ? data.expert_evaluation.areas_for_improvement.map(a => `ปรับปรุง: ${a}`)
      : data.expert_evaluation?.final_recommendation
        ? [data.expert_evaluation.final_recommendation]
        : [],
    tags: extractTags(data),
    // Also store full raw response
    raw_response: data
  };
}

function buildSummary(data) {
  const parts = [
    data.student_name ? `📋 ${data.student_name}` : '',
    data.education?.school ? `🏫 ${data.education.school}` : '',
    data.education?.program ? `📚 ${data.education.program}` : '',
    data.education?.gpa_overall ? `⭐ GPA ${data.education.gpa_overall}` : '',
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' | ') : 'วิเคราะห์พอร์ตโฟลิโอเรียบร้อย';
}

function mapScore(readiness) {
  const map = { 'ดีเยี่ยม': 92, 'ดีมาก': 82, 'ผ่านเกณฑ์': 70 };
  return map[readiness] || 78;
}

function extractTags(data) {
  const tags = [];
  const tech = data.technical_skills_breakdown;
  if (tech) {
    const allSkills = [
      ...(tech.programming_languages || []),
      ...(tech.hardware_and_robotics || []),
      ...(tech.ai_and_software_platforms || []),
    ];
    tags.push(...allSkills);
  }
  if (data.soft_skills_and_roles) {
    tags.push(...data.soft_skills_and_roles);
  }
  return tags.slice(0, 8);
}

export default router;