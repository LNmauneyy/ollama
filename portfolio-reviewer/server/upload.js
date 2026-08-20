import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { getDb } from './db.js';
import { requireAuth } from './auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  defParamCharset: 'utf8' // decode non-ASCII (e.g. Thai) filenames correctly
});

const router = Router();

// POST /api/upload — upload a file
router.post('/upload', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'กรุณาเลือกไฟล์ที่ต้องการอัปโหลด' });
  }

  const db = getDb();
  const result = db.prepare(`
    INSERT INTO files (filename, original_name, file_path, file_size, mime_type, uploaded_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    req.file.filename,
    req.file.originalname,
    req.file.path,
    req.file.size,
    req.file.mimetype,
    req.session.username
  );

  res.json({
    message: 'อัปโหลดไฟล์สำเร็จ',
    file: {
      id: result.lastInsertRowid,
      filename: req.file.filename,
      original_name: req.file.originalname,
      file_size: req.file.size,
      mime_type: req.file.mimetype
    }
  });
});

// GET /api/files — list all files
router.get('/files', requireAuth, (req, res) => {
  const db = getDb();
  const files = db.prepare('SELECT * FROM files ORDER BY created_at DESC').all();

  res.json({
    files: files.map(f => ({
      ...f,
      file_size_formatted: formatFileSize(f.file_size),
      ai_status_th: translateAiStatus(f.ai_status)
    }))
  });
});

// GET /api/files/:id/download — download a file
router.get('/files/:id/download', requireAuth, (req, res) => {
  const db = getDb();
  const file = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id);

  if (!file) {
    return res.status(404).json({ error: 'ไม่พบไฟล์' });
  }

  if (!fs.existsSync(file.file_path)) {
    return res.status(404).json({ error: 'ไฟล์ไม่มีอยู่ในระบบ' });
  }

  res.download(file.file_path, file.original_name);
});

// DELETE /api/files/:id — delete a file
router.delete('/files/:id', requireAuth, (req, res) => {
  const db = getDb();
  const file = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id);

  if (!file) {
    return res.status(404).json({ error: 'ไม่พบไฟล์' });
  }

  // Delete physical file
  try {
    if (fs.existsSync(file.file_path)) {
      fs.unlinkSync(file.file_path);
    }
  } catch (err) {
    console.error('Error deleting file:', err);
  }

  db.prepare('DELETE FROM files WHERE id = ?').run(req.params.id);
  res.json({ message: 'ลบไฟล์สำเร็จ' });
});

function formatFileSize(bytes) {
  if (!bytes) return 'N/A';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function translateAiStatus(status) {
  const map = {
    'pending': 'รอวิเคราะห์',
    'processing': 'กำลังวิเคราะห์...',
    'done': 'วิเคราะห์เสร็จแล้ว',
    'error': 'เกิดข้อผิดพลาด'
  };
  return map[status] || status;
}

export default router;