import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from './db.js';

const router = Router();

// POST /api/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
  }

  req.session.userId = user.id;
  req.session.username = user.username;

  return res.json({
    message: 'เข้าสู่ระบบสำเร็จ',
    user: { id: user.id, username: user.username }
  });
});

// POST /api/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ message: 'ออกจากระบบสำเร็จ' });
  });
});

// GET /api/me — check current session
router.get('/me', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'ยังไม่ได้เข้าสู่ระบบ' });
  }

  const db = getDb();
  const user = db.prepare('SELECT id, username, created_at FROM users WHERE id = ?').get(req.session.userId);

  if (!user) {
    return res.status(401).json({ error: 'ไม่พบผู้ใช้' });
  }

  res.json({ user });
});

// Middleware: require login
export function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อน' });
  }
  next();
}

export default router;