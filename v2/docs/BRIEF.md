# PortfolioAI v2 — Project Brief

> เอกสารนี้คือข้อกำหนดของระบบใหม่ทั้งหมด ใช้เป็นแหล่งอ้างอิงหลักของ Tech Lead (Codex) และนักพัฒนา (Claude)
> ระบบใหม่สร้างในโฟลเดอร์ `v2/` เท่านั้น ห้ามแก้หรือลบโค้ดเดิมนอก `v2/`

## 1. เป้าหมาย

สร้าง PortfolioAI ใหม่ให้เป็นระบบที่ใช้งานจริงในระดับคณะ ไม่ใช่ prototype
ระบบรับไฟล์พอร์ตโฟลิโอ → แปลงเป็นข้อความ Markdown + ภาพรายหน้า → ประเมินตาม rubric โดยอ้างอิงหลักฐานรายหน้า → ให้อาจารย์ตรวจทานและยืนยันผล

**Open question (ต้องถามเจ้าของโปรเจกต์ก่อนออกแบบ schema และ rubric):**
กลุ่มเป้าหมายคือ (ก) นักเรียน ม.ปลายที่ยื่นพอร์ตเข้าศึกษาต่อ — ตรงกับ schema เดิมใน `models/schemas.py`
หรือ (ข) นักศึกษาก่อนจบที่ใช้พอร์ตสมัครงาน — ตรงกับที่เขียนในเอกสาร `docs/`

## 2. บริบทระบบเดิม

- ระบบเดิมมี 2 ส่วน: Python FastAPI (`main.py`, `services/`, `models/`) และเว็บ Node/Express + React (`portfolio-reviewer/`)
- การทำงานเดิม: รับ PDF → แปลงแต่ละหน้าเป็นภาพด้วย Poppler → `qwen2.5vl:7b` ผ่าน Ollama อ่านทีละหน้า → สังเคราะห์เป็น JSON → เก็บใน SQLite
- อ่าน `howtouse.txt`, `models/schemas.py`, `services/analyzer.py` และ `docs/` ให้ครบ เพื่อเข้าใจความต้องการเดิมและปัญหาที่เคยเจอ
- ฮาร์ดแวร์ที่ใช้รัน: RTX 4060 Ti 16GB, Intel i7 Gen 13/14, RAM 16GB, Windows 11 (ใช้ Docker Desktop ได้)

### ปัญหาของระบบเดิมที่ต้องแก้

1. มี 2 backend (Express + FastAPI) ที่ซ้ำซ้อน และใช้ SQLite 2 ไฟล์
2. ประมวลผลแบบ synchronous: request ค้างหลายนาที (timeout 600 วินาที) ไม่มีคิวงานและไม่มี progress
3. ผลลัพธ์เป็น JSON ที่ไม่มี rubric และไม่อ้างอิงหน้า จึงตรวจไม่ได้ว่า AI แต่งข้อมูลขึ้นเองหรือไม่
4. ผูกกับ Ollama รุ่นเดียว เปลี่ยนโมเดลหรือผู้ให้บริการไม่ได้
5. มีผู้ใช้แค่ admin ไม่มีบทบาทนักเรียน/อาจารย์ และไม่มีขั้นตอนให้คนตรวจทานผล AI
6. endpoint ส่งข้อความ OCR เต็มออกไปโดยไม่กรอง ไม่มี backup และไม่มีนโยบายลบข้อมูลตาม PDPA
7. ไม่มี test และไม่มีชุดข้อมูลสำหรับวัดความแม่นยำ

## 3. สถาปัตยกรรม

เสนอทางเลือกอื่นได้ถ้ามีเหตุผลดีกว่า แต่ต้องอธิบายไว้ใน `DESIGN.md`

| ส่วน | เทคโนโลยี |
|---|---|
| Backend | Python 3.12 + FastAPI เป็น backend ตัวเดียว (ตัด Express ออก) |
| Database | PostgreSQL + SQLAlchemy 2 + Alembic migrations |
| คิวงาน | Redis + worker (arq หรือ Celery) สถานะ `queued → processing → done / failed`, ส่ง progress รายหน้าผ่าน SSE, retry และยกเลิกได้ |
| ไฟล์ | MinIO / S3-compatible storage (หรือ local volume ที่ตั้งค่าได้) ห้ามเก็บไฟล์ใน DB |
| Frontend | React + Vite + TypeScript + Tailwind + TanStack Query |
| Deploy | `docker compose up` ตัวเดียวรันได้ทั้งระบบ (api, worker, db, redis, storage, web, ollama แบบ optional) + Caddy สำหรับ HTTPS |

## 4. Document → Markdown layer (ทำก่อนการประเมินเสมอ)

หลักการ: แปลงทุกไฟล์เป็น **page bundle** (ภาพ + Markdown รายหน้า) เพียงครั้งเดียว แล้วทุกขั้นถัดไปอ่านจาก bundle นี้
ห้ามแปลงเป็น Markdown แล้วทิ้งภาพ เพราะพอร์ตโฟลิโอเน้นภาพ และต้องใช้ภาพเป็นหลักฐาน

```text
PDF / DOCX / PPTX
  → (LibreOffice headless) แปลงเป็น PDF
  → ทำทีละหน้า:
      1. render ภาพ (PyMuPDF) → page_N.png        ← เก็บไว้เป็นหลักฐาน
      2. ดึง text layer → ตรวจคุณภาพภาษาไทย
           ผ่าน         → ใช้เป็น Markdown
           เพี้ยน/ไม่มี  → OCR model อ่านภาพเป็น Markdown
      3. vision model บรรยายภาพ/กราฟิกในหน้า
      4. บันทึก page_N.md (front matter: page, text_source, ocr_model, confidence)
  → รวมเป็น document.md คั่นแต่ละหน้าด้วย <!-- page N -->
```

ข้อกำหนด:

- ตรวจไฟล์ก่อนประมวลผล: magic bytes, ขนาด, จำนวนหน้า (ค่าจำกัดตั้งได้ผ่าน env)
- ตรวจคุณภาพ text layer ภาษาไทย: สระ/วรรณยุกต์ลอย, ตัวอักษรในช่วง PUA, อัตราตัวอักษรเพี้ยน ถ้าไม่ผ่านเกณฑ์ให้ใช้ OCR แทน
- OCR และ vision model ต้องเป็น provider ที่สลับได้ (ดูข้อ 6) ให้เปรียบเทียบ Typhoon OCR, qwen2.5vl, Docling และ Marker กับไฟล์ใน `eval/` แล้วเลือกตัว default จากผลจริง พร้อมบันทึกผลเทียบไว้ใน `DESIGN.md` (ตรวจด้วยว่าแต่ละตัวรันผ่าน Ollama ได้หรือต้องใช้ vLLM/transformers)
- vision model บรรยายภาพ เกียรติบัตร และผลงานในหน้า แล้วต่อท้าย `page_N.md` ใน block `> [ภาพ] ...`
- cache bundle ตาม hash ของไฟล์ + เวอร์ชันของ OCR model เปลี่ยน rubric หรือโมเดล synthesis แล้วต้องประเมินใหม่ได้โดยไม่ต้อง OCR ซ้ำ
- อาจารย์ดูและแก้ `page_N.md` ได้จากหน้าเว็บ แล้วกดประเมินใหม่

ตัวอย่าง `page_3.md`:

```markdown
---
page: 3
text_source: ocr        # text_layer | ocr
ocr_model: typhoon-ocr-7b
confidence: 0.91
---
## ผลงานการแข่งขัน
- รางวัลชนะเลิศ การแข่งขันหุ่นยนต์ระดับภาค ปี 2567

> [ภาพ] เกียรติบัตรจากสมาคม... ลงวันที่ ...; ภาพหุ่นยนต์ล้อ 4 ล้อบนสนามแข่ง
```

## 5. Synthesis และการประเมิน

- Synthesis อ่านจาก `document.md` เท่านั้น (ไม่ส่งภาพซ้ำ) ตอบเป็น JSON ตาม schema (structured output) ถ้า validate ไม่ผ่านให้ retry
- ประเมินตาม rubric ที่ admin ตั้งค่าได้ในระบบ (เกณฑ์, น้ำหนัก, คำอธิบายแต่ละระดับ) และเก็บเวอร์ชันของ rubric ที่ใช้กับแต่ละผล
- ทุก claim, คะแนน และข้อเสนอแนะต้องมี evidence `{page, quote}` ถ้าไม่มีหลักฐานให้ตอบว่า "ไม่พบ" ห้ามเดา
- **Grounding check:** ทุก quote ต้องค้นเจอใน `page_N.md` (fuzzy match ≥ 0.9) ถ้าไม่เจอให้ flag เป็น `unverified` และไม่นำไปคิดคะแนน
- ผลลัพธ์ประกอบด้วย: ข้อมูลที่สกัดได้ (การศึกษา ทักษะ ผลงาน กิจกรรม), คะแนนรายเกณฑ์, จุดแข็ง, จุดที่ควรปรับปรุงรายหน้า, ส่วนที่ขาด (missing sections) และคำแนะนำที่ทำตามได้จริง
- prompt ทั้งหมดเก็บเป็นไฟล์แยกที่มีเวอร์ชัน ห้าม hardcode ไว้ใน logic

## 6. AI providers

- สร้าง interface ตัวเดียวที่รองรับ:
  - **Ollama (local):** โมเดลเริ่มต้น `qwen2.5vl:7b` ต้องรันได้ใน VRAM 16GB
  - **OpenRouter:** ผ่าน OpenAI-compatible API เลือกโมเดลผ่าน env
- เลือก provider และโมเดลแยกกันได้สำหรับแต่ละขั้น: OCR, vision description และ synthesis
- บันทึกว่าแต่ละผลใช้โมเดลและ prompt version อะไร พร้อม token, เวลา และค่าใช้จ่าย
- **Privacy:** มีโหมด "local only" ที่บังคับใช้ Ollama สำหรับไฟล์จริงของนักเรียน ก่อนส่งข้อมูลไป OpenRouter ต้องเตือนผู้ใช้ และ admin ปิดการส่งออกได้ทั้งระบบ

## 7. ผู้ใช้และสิทธิ์

- **student:** อัปโหลดและดูผลของตัวเอง
- **advisor:** ดูพอร์ตของนักเรียนในความดูแล แก้ไขหรือยืนยันผล AI และเขียนความเห็น
- **admin:** จัดการผู้ใช้ rubric โมเดล และการตั้งค่า
- Auth: session ใน cookie (httpOnly, secure), แฮชรหัสผ่านด้วย argon2, rate limit ตอน login, CSRF protection, ตรวจสิทธิ์ทุก endpoint (ห้ามดูข้อมูลของคนอื่น) และเผื่อโครงไว้สำหรับ SSO ของมหาวิทยาลัย
- Human-in-the-loop: ผล AI มีสถานะ `draft` จนกว่า advisor จะยืนยัน และเก็บ audit log ว่าใครแก้อะไรเมื่อไร
- ห้ามมีบัญชี default เช่น admin/admin ให้สร้าง admin คนแรกด้วยคำสั่ง CLI

## 8. PDPA และความปลอดภัย

- ไฟล์ต้นฉบับ, ภาพ, Markdown และผลวิเคราะห์ถือเป็นข้อมูลส่วนบุคคลทั้งหมด
- ตั้งระยะเวลาเก็บข้อมูล (retention) ได้ และมี job ลบข้อมูลที่หมดอายุอัตโนมัติ
- ผู้ใช้กดลบและ export ข้อมูลของตัวเองได้
- ห้าม log เนื้อหาพอร์ต และตัดข้อมูลส่วนบุคคลออกจาก log
- ตั้ง security headers, จำกัดขนาด upload, ตรวจ content type และใช้ secrets จาก env เท่านั้น
- ห้ามใส่ API key, ข้อมูลพอร์ตจริง หรือข้อมูลส่วนบุคคลลงใน repo

## 9. Frontend UX

- หน้า upload แบบลากวาง แสดง progress รายหน้าแบบ real-time
- หน้าผล: ภาพหน้า PDF อยู่ข้างผลวิเคราะห์ กดที่ evidence แล้วกระโดดไปหน้านั้น, แสดงสถานะ verified/unverified, มีกราฟคะแนนรายเกณฑ์ และ export ผลเป็น PDF ได้
- เปรียบเทียบผลระหว่างเวอร์ชันของพอร์ตเดียวกันได้ (นักเรียนแก้แล้วอัปโหลดใหม่)
- UI ภาษาไทยเป็นหลัก ใช้บนมือถือได้ และผ่าน accessibility พื้นฐาน

## 10. คุณภาพและการวัดผล

- unit test สำหรับ pipeline, schema และ auth/permission
- integration test ของ API
- e2e (Playwright) สำหรับ flow หลัก
- `eval/`: ชุดพอร์ตตัวอย่างที่ anonymized แล้ว พร้อมเฉลยที่คนตรวจ และสคริปต์วัดผลต่อไปนี้ เพื่อใช้เทียบโมเดล local กับ OpenRouter:
  - ความแม่นยำของ OCR/การสกัดข้อมูล
  - ความใกล้เคียงของคะแนนกับอาจารย์
  - อัตราการ hallucinate (สัดส่วน `unverified`)
  - เวลาต่อไฟล์
- ruff + mypy (Python), eslint + tsc (frontend) และ GitHub Actions CI
- Observability: structured logging, `/health`, `/metrics` และ dashboard แสดงคิวงาน

## 11. ลำดับ phase

ต้องรันระบบจริงด้วย `docker compose up` ได้เมื่อจบแต่ละ phase

| Phase | ขอบเขต |
|---|---|
| P0 | `DESIGN.md`: สถาปัตยกรรม, ER diagram, API spec, JSON schema, ตัวอย่าง rubric, threat model → **รออนุมัติ** |
| P1 | โครง repo + docker compose + DB/migrations + auth/roles + upload |
| P2 | Document → Markdown layer (page bundle, OCR fallback, cache) + คิวงาน + SSE progress |
| P3 | Synthesis ตาม rubric + evidence + grounding check + provider abstraction |
| P4 | Frontend: หน้าผลวิเคราะห์ + evidence viewer + advisor review + แก้ page markdown |
| P5 | Rubric admin, PDPA retention/export/delete, audit log |
| P6 | `eval/` + เทียบโมเดล OCR/LLM + e2e + CI + README ภาษาไทย |

## 12. ส่งมอบ

- โฟลเดอร์ `v2/` ที่ `docker compose up` แล้วใช้งานได้ทั้งระบบ
- `README.md` ภาษาไทย: ติดตั้งบน Windows, สลับ Ollama/OpenRouter, deploy บน server ของคณะ และรัน eval
- `.env.example` ครบทุกตัวแปร พร้อมคำอธิบาย
- `DESIGN.md` ที่มีหัวข้อ "Decisions & Open questions" บันทึกทุกการตัดสินใจพร้อมเหตุผล
