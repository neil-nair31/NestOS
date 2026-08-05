# Mani meeting guide — ConnectOS & NestOS demo

**Purpose:** Walk Mani through both platforms step-by-step, show what exists today vs what’s roadmap, and capture what HummingBrains / RTS still needs.

**Suggested length:** 45–60 minutes  
**You bring:** Laptop, this doc, stable internet (optional for NestOS — works offline)

---

## 1. One-minute framing (say this first)

| Product | Who it’s for | What it solves today |
|--------|----------------|----------------------|
| **ConnectOS** | ConnectorsHR (public website + internal admin) | Website enquiries land in one inbox — candidates, employers, careers, contact — with CV download and CSV export. |
| **NestOS** | HummingBrains / RTS-style staffing ops | Recruiters + managers run talent, Naukri sourcing, IaaS interviews, clients, revenue, activity logging, tasks, and analytics in one ops layer. |

**Key line:** ConnectOS is the *lead capture + admin* layer for a marketing site. NestOS is the *full recruitment operations* platform (demo — not production yet). NestOS borrows ConnectOS patterns for **verified activity**, **sign-out**, and **analytics**.

---

## 2. Before the meeting — checklist

### ConnectOS (live stack)

```powershell
# Terminal 1 — API (from repo root)
cd C:\Users\neila\Projects\connectosWebsite1\server
npm install
# Copy .env.example → .env, set DATABASE_URL + ADMIN_PASSWORD, then:
npm run migrate
npm run seed:admin
npm run dev

# Terminal 2 — Website + admin UI
cd C:\Users\neila\Projects\connectosWebsite1\client
npm install
npm run dev
```

- Website: `http://localhost:5173`
- Admin: `http://localhost:5173/admin/login`
- Admin login: values from `server/.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`)

**If DB isn’t set up:** You can still demo the **public website** and explain that submissions need the API + MySQL. Have the quotation PDF open as backup: `docs/ConnectorsHR-Website-ConnectOS-Quotation.html`.

**Production (if live):** `https://connectorshr.com` + `https://connectorshr.com/admin` — use if local stack fails.

### NestOS (single-file demo — no build)

1. Open in Chrome/Edge (double-click or drag into browser):

   `C:\Users\neila\Projects\connectosWebsite1\NestOS\nestos-v2-demo.html`

2. Default role is **Recruiter — Arjun M.** (mom-friendly nav).
3. No server required — all data is in-page JavaScript.

**Quick sanity check (F12 → Console):**

```javascript
// Should print "JS OK" — if the page is blank, something broke in the script
typeof state !== "undefined" && state.deliveryPhase
```

If the page is blank, refresh once. If still broken, open the file in a different browser (not IE).

---

## 3. ConnectOS — step-by-step demo (~15 min)

### Story arc

> “Someone fills a form on the website → it hits our API → it appears in ConnectOS admin with type, CV, and source page — no more lost WhatsApp/email leads.”

### Step 1 — Public website (2 min)

1. Home → scroll value prop.
2. **Job Hunter** (`/job-hunter`) — candidate CV upload path.
3. **For Employers** (`/for-employers`) — B2B enquiry.
4. **Contact** (`/contact`) — general lead.

**Point out:** Every form posts to the ConnectOS API (not just email).

### Step 2 — Submit a test lead (3 min)

1. Open **Contact** or **Job Hunter**.
2. Fill with obvious test data: `Mani Demo / mani.test@example.com`.
3. Submit → should succeed (toast or thank-you).

**If API is down:** Say submissions queue once server is up; show admin with existing rows instead.

### Step 3 — Admin dashboard (5 min)

1. Go to `/admin/login` → sign in.
2. **Submissions inbox:**
   - Filter by type: Candidate / Employers / Careers / Contact.
   - Search by name or email.
   - Click a row → detail drawer (phone, company, message, source page).
3. **CV:** Click attachment if present → download.
4. **Export CSV** → “This is what sales/ops can use in Excel or CRM.”

### Step 4 — What ConnectOS does *not* do yet (1 min)

Be honest — sets up NestOS conversation:

- No recruiter pipeline (stages, interviews, Resdex).
- No call/outreach logging or end-of-day sign-out.
- No task assignment across team.
- No revenue / client CRM / IaaS workflow.

**Transition line:** “That’s where NestOS comes in for RTS-style operations.”

---

## 4. NestOS — step-by-step demo (~25 min)

**File:** `NestOS/nestos-v2-demo.html`  
**Role switcher:** Top-right — `Viewing as` dropdown.

### Part A — Recruiter view (what daily staff see) (~12 min)

Start as **Recruiter — Arjun M.**

| Step | Nav / action | What to say |
|------|----------------|---------------|
| 1 | **Home** | “One screen for today — interviews, Naukri imports, tasks.” |
| 2 | Click **Run today's interview** card | Opens IaaS — live capture, AI report in ~2 min vs 45–60 min manual. |
| 3 | **Find on Naukri (Resdex)** | “Search Naukri as today, import CV in one click — no duplicate credit waste.” |
| 4 | Click **Add to Candidates** on a shortlist row | Candidate lands in Talent Hub permanently. |
| 5 | **All candidates** | Structured profiles, resume, match to requirements. |
| 6 | **Log calls & outreach** | ConnectOS-style: Call / WhatsApp / Email / LinkedIn. Log one live with Mani watching. |
| 7 | Header **End day** | Recruiter declares extra unlogged work → notifies admin. |
| 8 | **Messages & tasks** | Internal chat + assigned tasks (no email attachments lost). |
| 9 | **My analytics** | Their pipeline + outreach — verified activity only. |

**Live activity log (do this once):**

1. Header notebook icon **or** nav **Log calls & outreach**.
2. **Log call** → Target: `Demo Candidate` → Context: `REQ-88` → Outcome: `Interested`.
3. Show row appear as **Verified**.

**End day (do this once):**

1. **End day** (header) → show auto-summary.
2. Add: “2 WhatsApp follow-ups not logged earlier.”
3. Submit → “Admin gets notified.”

### Part B — Admin / manager view (~10 min)

Switch to **Admin — Karthikeyan**.

| Step | Nav / action | What to say |
|------|----------------|---------------|
| 1 | **Dashboard** | Full platform — Resdex imports, ATS sync, sign-out reviews pending. |
| 2 | Review **Sign-out reviews pending** | Approve Arjun’s sign-out from Part A. |
| 3 | Bottom **Task command** bar | Assign work without leaving the screen. |
| 4 | **Workspace** → Assign new task | Pick Sanjay, due date, module. |
| 5 | **Analytics** | Tabs: Pipeline · Sourcing · Outreach · Team · IaaS · Leads. |
| 6 | **Team & Tracking** | Live status (online / interview / away) — utilization. |
| 7 | **Audit & Compliance** | Idle vs active — same principle as ConnectOS verified activity. |
| 8 | **Clients** + **Revenue** | CRM, renewals, MRR — growth layer. |
| 9 | **Resdex Sourcing** + **Settings** | Phase 4 — ATS connectors (Greenhouse, Workday). |

### Part C — Phases (if he asks “what’s built vs planned”) (~3 min)

NestOS is organized in **delivery phases** (proposal-aligned):

| Phase | Modules | Status in demo |
|-------|---------|----------------|
| 1 | Talent Hub, Workspace, Activity, Analytics | Live |
| 2 | Clients, Leads, Revenue | Live |
| 3 | IaaS, Team & Tracking, Audit | Live |
| 4 | Resdex Sourcing, ATS sync | Live |

Admin bar: **Preview all phases** only needed for roadmap modules — everything above is on by default (`deliveryPhase: 4`).

---

## 5. ConnectOS vs NestOS — comparison slide (in your head)

| Capability | ConnectOS | NestOS demo |
|------------|-----------|-------------|
| Website lead forms | ✅ Production scope | Leads module (sales) |
| Admin inbox + CSV | ✅ | Workspace + audit |
| CV storage | ✅ | Talent Hub + Resdex import |
| Call / outreach logging | ❌ | ✅ Activity log |
| End-of-day sign-out | ❌ | ✅ |
| Task assignment | ❌ | ✅ Task command bar |
| Pipeline analytics | ❌ | ✅ Analytics window |
| IaaS interviews + AI reports | ❌ | ✅ |
| Naukri Resdex workflow | ❌ | ✅ |
| Client CRM / MRR | ❌ | ✅ |

---

## 6. Questions to ask Mani (discovery)

Use these to learn what to build next. **Take notes in the blank column.**

### Operations & pain

1. Where do recruiters spend the most time today — Naukri, calls, Excel, WhatsApp, or client interviews?
2. How do you track who called which candidate? (Spreadsheet? Memory? Nothing?)
3. Do managers know utilization and idle time today, or is it gut feel?
4. What happens at end of day if someone did work but didn’t log it?

### RTS-specific workflow

5. Staff aug vs talent acquisition vs IaaS — which line matters most in the next 6 months?
6. Do you use Resdex credits today? Any pain with duplicate CV charges?
7. Which ATS do clients actually use (Greenhouse, Workday, Zoho, none)?
8. Video for interviews — Meet, Teams, or Zoom? Who schedules?

### People & roles

9. Who should assign tasks — one admin, or team leads per vertical?
10. Should sales see revenue only, or also candidate pipeline?
11. Netherlands / EU team — same workflows as India, or different compliance?

### ConnectOS overlap

12. Does HummingBrains need a **public website + lead inbox** like ConnectorsHR, or only internal NestOS?
13. Should website enquiries auto-create client records in NestOS?

### Success criteria

14. If we ship one thing in 4 weeks that would impress you, what is it?
15. What would make your recruiters actually *use* the system daily? (Fear of audit? Ease? Mobile?)

| # | His answer | Priority (H/M/L) |
|---|------------|------------------|
| | | |
| | | |
| | | |

---

## 7. What he might ask for next (be ready)

| Request | Your response |
|---------|----------------|
| “Can we merge ConnectOS and NestOS?” | Same *patterns* (activity, admin, leads); one product would mean NestOS absorbs website forms + API. Scope + timeline discussion. |
| “Real Naukri integration?” | Demo is workflow mock; production needs browser extension or official API partnership + legal review. |
| “Mobile app for recruiters?” | Not in demo; mobile-responsive web first is faster. |
| “Payroll / billing?” | Out of scope today; Revenue module is intelligence, not accounting. |
| “How much / how long?” | Point to phased proposal in NestOS; ConnectOS quotation for website stack (`docs/ConnectorsHR-Website-ConnectOS-Quotation.html`). |
| “Can mom / junior recruiter use it?” | Yes — start demo in **Recruiter** role; plain-language nav is intentional. |
| “Data security / DPDP?” | Audit module + export + retention called out in Settings; production needs hosting + DPA. |

---

## 8. Suggested meeting agenda (45 min)

| Time | Block |
|------|--------|
| 0–5 | Context: ConnectOS vs NestOS (Section 1) |
| 5–20 | ConnectOS live demo (Section 3) |
| 20–45 | NestOS recruiter → admin demo (Section 4) |
| 45–55 | Discovery questions (Section 6) |
| 55–60 | Next steps + what you’ll send in writing |

---

## 9. JavaScript / demo troubleshooting

### NestOS won’t load or clicks do nothing

1. Hard refresh: `Ctrl + Shift + R`
2. Console (`F12`): red errors? Note the line number — usually a quote/syntax issue in `nestos-v2-demo.html`.
3. Validate script (PowerShell):

```powershell
node -e "const fs=require('fs');const h=fs.readFileSync('NestOS/nestos-v2-demo.html','utf8');new Function(h.match(/<script>([\s\S]*)<\/script>/)[1]);console.log('OK')"
```

Run from repo root: `C:\Users\neila\Projects\connectosWebsite1`

### Useful in-browser debug (NestOS)

```javascript
state.role          // current role
state.view          // current screen
state.outreachLog   // activity entries
state.signOutRequests // end-of-day queue
TASKS               // open tasks
```

Force a screen without clicking nav:

```javascript
state.view = "analytics"; state.analyticsTab = "pipeline"; render();
```

### ConnectOS admin empty

- API not running → start `server` on port 4000.
- `client/.env` must have `VITE_API_URL=http://localhost:4000`.
- Run migrate + seed admin if first time.

### ConnectOS CORS errors

- `CORS_ORIGIN` in server `.env` must match client URL (`http://localhost:5173`).

---

## 10. One-page cheat sheet (print or keep on phone)

### ConnectOS

| | |
|---|---|
| **Start** | `client`: `npm run dev` · `server`: `npm run dev` |
| **Site** | localhost:5173 |
| **Admin** | localhost:5173/admin/login |
| **Demo path** | Job Hunter submit → Admin inbox → CSV |

### NestOS

| | |
|---|---|
| **Open** | Double-click `NestOS/nestos-v2-demo.html` |
| **Recruiter demo** | Home → Resdex import → Log call → End day |
| **Admin demo** | Sign-out review → Task bar → Analytics → Audit |
| **Role switch** | Top-right dropdown |

### Files to have open as backup

- `docs/ConnectorsHR-Website-ConnectOS-Quotation.html`
- This guide: `docs/Mani-Meeting-ConnectOS-NestOS-Guide.md`

---

## 11. After the meeting — follow-up email template

```
Hi Mani,

Thanks for your time today. Quick recap:

ConnectOS — website enquiries → secure admin inbox (types, CVs, CSV export).
NestOS — ops platform for talent, IaaS, Resdex, activity logging, tasks, analytics.

You mentioned: [bullet his top 2–3 needs from Section 6].

Proposed next step: [e.g. prioritize Phase X / scope real Resdex helper / connect website leads to NestOS].

Happy to send a short written proposal once you confirm priority.

— [Your name]
```

---

*Last updated: Jul 2026 · NestOS demo includes ConnectOS-parity activity log, sign-out, task dock, and analytics.*
