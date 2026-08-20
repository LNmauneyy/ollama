import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'database.sqlite');

let db;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
    seedAdmin();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      uploaded_by TEXT,
      ai_status TEXT DEFAULT 'pending',
      ai_result TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

const DEFAULT_PASSWORD = 'admin';

function seedAdmin() {
  const configuredPassword = process.env.ADMIN_PASSWORD;
  const existing = db.prepare('SELECT id, password FROM users WHERE username = ?').get('admin');

  if (!existing) {
    const password = configuredPassword || crypto.randomBytes(9).toString('base64url');
    const hashed = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run('admin', hashed);

    if (configuredPassword) {
      console.log('✅ Seed admin user created (username: admin, password: from ADMIN_PASSWORD env var)');
    } else {
      console.log(`⚠️  ADMIN_PASSWORD ไม่ได้ตั้งค่า — สุ่มรหัสผ่านให้ครั้งแรก: admin / ${password}`);
      console.log('   ตั้งค่า ADMIN_PASSWORD ใน .env แล้วรันใหม่เพื่อกำหนดรหัสผ่านเอง');
    }
    return;
  }

  // Existing DB still has the old hardcoded default — rotate it once a real
  // password is configured, so upgrading doesn't silently leave admin/admin active.
  if (configuredPassword && bcrypt.compareSync(DEFAULT_PASSWORD, existing.password)) {
    const hashed = bcrypt.hashSync(configuredPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, existing.id);
    console.log('🔐 พบรหัสผ่าน admin เดิมเป็นค่า default — อัปเดตเป็นค่าจาก ADMIN_PASSWORD แล้ว');
  }
}