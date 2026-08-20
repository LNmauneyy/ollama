# PortfolioAI — ระบบตรวจสอบพอร์ตด้วย AI

ระบบจัดการเอกสารพร้อม AI วิเคราะห์สำหรับงานอาคารสถานที่และยานพาหนะ คณะครุศาสตร์อุตสาหกรรม มจพ.

## Features

- ✅ **Login system** — admin/admin พร้อม Session + SQLite database
- ✅ **File upload** — ลาก-วาง หรือเลือกไฟล์ (PDF, รูปภาพ, เอกสาร)
- ✅ **AI Analysis** — เชื่อมต่อ Ollama เพื่อวิเคราะห์เอกสาร
- ✅ **Dashboard** — สถิติไฟล์, สถานะ AI, จัดการไฟล์
- ✅ **Portfolio Review** — หน้าตรวจสอบพอร์ตด้วย AI
- ✅ **Deploy ready** — พร้อม Deploy บน Render.com

## Tech Stack

- **Frontend:** React 19 + Vite + Tailwind CSS
- **Backend:** Node.js + Express 5
- **Database:** SQLite (better-sqlite3)
- **AI:** Python FastAPI + Ollama vision model (`qwen2.5vl:7b`) — see `../main.py`. The Node server never calls Ollama directly; it proxies AI requests to that Python service via `PYTHON_API_URL`.
- **Deploy:** Render.com

## Setup

```bash
# ติดตั้ง dependencies
npm install

# รันในโหมดพัฒนา (Frontend + Backend)
npm run dev:all

# หรือรันแยก
npm run dev        # Vite dev server (http://localhost:5173)
npm run dev:server # Express API server (http://localhost:3000)

# Build สำหรับ production
npm run build
npm start          # รัน Express server ที่ port 3000
```

## Login

- **Username:** `admin`
- **Password:** set via the `ADMIN_PASSWORD` environment variable before first run.
  If left unset, a random password is generated on first startup and printed
  once to the server log — set `ADMIN_PASSWORD` and restart to choose your own.

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/login` | Login |
| POST | `/api/logout` | Logout |
| GET | `/api/me` | Check current session |
| GET | `/api/files` | List uploaded files |
| POST | `/api/upload` | Upload file |
| DELETE | `/api/files/:id` | Delete file |
| GET | `/api/files/:id/download` | Download file |
| POST | `/api/ai/analyze/:id` | AI วิเคราะห์ไฟล์เดียว |
| POST | `/api/ai/analyze-all` | AI วิเคราะห์ทั้งหมด |
| GET | `/api/ai/status/:id` | เช็คสถานะ AI |
| GET | `/api/ai/stats` | สถิติ AI |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3000 | Server port |
| NODE_ENV | development | Production mode |
| SESSION_SECRET | *(required in production)* | Session secret key — server refuses to start in production without it |
| ADMIN_PASSWORD | *(random, printed once)* | Password for the `admin` account |

## Deploy on Render.com

1. Push code to GitHub
2. Go to [Render.com](https://render.com) → New Web Service
3. Connect your repo
4. Set:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `node server/index.js`
5. Add a **Disk** (1 GB) for persisting uploads + database
6. Set environment variables
7. Deploy!

> **Note:** Ollama AI ต้องรันแยก (ไม่สามารถรันบน Render free tier ได้) — ให้รัน Ollama ที่ server ของคุณ แล้วตั้งค่า `OLLAMA_API_URL`

## License

สำหรับใช้งานในคณะครุศาสตร์อุตสาหกรรม มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ