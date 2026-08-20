import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import authRouter from './auth.js';
import uploadRouter from './upload.js';
import aiRouter from './ai.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Required when running behind a reverse proxy (nginx/Apache in front of the
// university domain) so Express trusts X-Forwarded-Proto and secure cookies
// actually get set over HTTPS.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// ---------- Session ----------
const isProduction = process.env.NODE_ENV === 'production';

if (!process.env.SESSION_SECRET) {
  if (isProduction) {
    console.error('❌ SESSION_SECRET is required in production. Set it as an environment variable and restart.');
    process.exit(1);
  }
  console.warn('⚠️  SESSION_SECRET not set — using an insecure development-only value.');
}

const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-only-insecure-secret-do-not-use-in-production';

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// ---------- Body parsers ----------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------- API routes ----------
// auth: /api/login, /api/logout, /api/me
app.use('/api', authRouter);
// upload: /api/upload, /api/files, /api/files/:id
app.use('/api', uploadRouter);
// ai: /api/ai/analyze/:id, /api/ai/analyze-all, /api/ai/status/:id, /api/ai/stats
app.use('/api', aiRouter);

// ---------- Static files ----------
// In production, serve the built Vite app from dist/
const distPath = path.join(__dirname, '..', 'dist');
const publicPath = path.join(__dirname, '..', 'public');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}
app.use(express.static(publicPath));

// ---------- Uploaded files (serve) ----------
const uploadsPath = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsPath));

// ---------- SPA fallback (for production build) ----------
// Serve index.html for all non-API routes (React Router) - Express 5 syntax
app.get('/{*splat}', (req, res) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'ไม่พบเส้นทาง' });
  }
  // Try dist/index.html first (production)
  const distIndex = path.join(distPath, 'index.html');
  if (fs.existsSync(distIndex)) {
    return res.sendFile(distIndex);
  }
  // Fallback to public/index.html
  const publicIndex = path.join(publicPath, 'index.html');
  if (fs.existsSync(publicIndex)) {
    return res.sendFile(publicIndex);
  }
  res.status(404).send('ไม่พบหน้าเว็บ');
});

// ---------- Start server ----------
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📂 Uploads directory: ${uploadsPath}`);
  console.log(`🔐 Default login: admin / admin\n`);
});