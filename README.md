# NestOS — live product for HummingBrains / Mani testing

## Start

```powershell
cd NestOS
npm install
npm run dev
```

**Login:** http://localhost:4100/  
**App:** http://localhost:4100/app  

Do **not** open the HTML from File Explorer. Do **not** use the old `web/` toy UI.

---

## Test accounts (RBAC)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@hummingbrains.com` | `Admin@123` |
| Manager | `manager@hummingbrains.com` | `Manager@123` |
| Recruiter | `recruiter@hummingbrains.com` | `Recruiter@123` |
| Sales | `sales@hummingbrains.com` | `Sales@123` |

Role gates what you can do (e.g. sales can invoice; recruiter can Resdex + OCR; admin sees everything).

---

## Naukri Chrome helper (Mani’s flow)

Naukri has no public API. Recruiters keep using Resdex; the NestOS extension sends visible/shortlisted CVs into NestOS.

1. Open http://localhost:4100/extension-guide  
2. Chrome → `chrome://extensions` → Developer mode → **Load unpacked** → select `NestOS/extension`  
3. Sign in to the extension as recruiter  
4. Open http://localhost:4100/extension-demo (or real Naukri Resdex) → **Send to NestOS**  
5. Open NestOS **Find on Naukri** — captures **auto-load** (no Pull step). Click **Save to NestOS** / **Save all**

---

## What is live / testable

| Feature | How to test |
|---|---|
| Login + JWT cookie | Sign in at `/` → lands on `/app` with your role |
| SQLite database | File: `server/data/nestos.sqlite` |
| Bulk PDF → OCR → candidates | Talent Hub → drop PDFs (`server/data/samples/`) |
| Model hosting | `GET /api/model/status` · `POST /api/model/parse` (file) |
| Naukri Resdex sourcing | Install Chrome helper (`/extension-guide`) → capture on Resdex/demo → **Find on Naukri** → Pull → Save |
| WhatsApp | Candidate drawer → WhatsApp |
| Email | Candidate drawer → Send email (Resend or console stub) |
| Doc verification | Candidate drawer → Verify doc |
| Invoices | Revenue → Create invoice (Admin / Manager / Sales) |
| Activity / end-of-day | Log activity · End day |

---

## Optional keys (`server/.env`)

```
AZURE_DI_ENDPOINT=...
AZURE_DI_KEY=...
RESEND_API_KEY=...
JWT_SECRET=change-me
```

Without Azure: text-layer PDFs still parse. Scanned PDFs need Azure DI.
