import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Prefer DATA_DIR=/data on cloud hosts; fall back if volume is not writable. */
function resolveDataDir(): string {
  const tried: string[] = [];
  const candidates = [
    process.env.DATA_DIR,
    process.env.DATA_DIR ? undefined : path.resolve(__dirname, "../../data"),
    "/data",
    path.join(process.cwd(), "data"),
    path.join("/tmp", "nestos-data"),
  ].filter(Boolean) as string[];

  for (const raw of candidates) {
    const dir = path.resolve(raw);
    tried.push(dir);
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.mkdirSync(path.join(dir, "uploads"), { recursive: true });
      fs.accessSync(dir, fs.constants.W_OK);
      if (dir !== path.resolve(process.env.DATA_DIR || "")) {
        console.log(`  DATA_DIR using ${dir} (tried: ${tried.join(" → ")})`);
      } else {
        console.log(`  DATA_DIR ${dir}`);
      }
      return dir;
    } catch (err) {
      console.warn(`  DATA_DIR not usable: ${dir}`, err instanceof Error ? err.message : err);
    }
  }
  throw new Error(`No writable data directory. Tried: ${tried.join(", ")}`);
}

const DATA_DIR = resolveDataDir();
const DB_PATH = path.join(DATA_DIR, "nestos.sqlite");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','manager','recruiter','sales')),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS candidates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT,
  skills TEXT DEFAULT '[]',
  experience TEXT,
  ctc TEXT,
  notice TEXT,
  location TEXT,
  stage TEXT DEFAULT 'Sourced',
  source TEXT DEFAULT 'Bulk PDF',
  service TEXT DEFAULT 'Talent Acq',
  resume_path TEXT,
  resume_original_name TEXT,
  raw_text_preview TEXT,
  parse_confidence REAL DEFAULT 0,
  parse_method TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS outreach_log (
  id TEXT PRIMARY KEY,
  candidate_id TEXT,
  user_id TEXT,
  user_name TEXT,
  type TEXT NOT NULL,
  target TEXT NOT NULL,
  context TEXT,
  outcome TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  invoice_no TEXT NOT NULL,
  client_name TEXT NOT NULL,
  service_line TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  gst_percent REAL NOT NULL,
  status TEXT NOT NULL,
  due_date TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS verifications (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL,
  doc_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  status TEXT NOT NULL,
  extracted TEXT DEFAULT '{}',
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  assignee TEXT NOT NULL,
  assigner TEXT NOT NULL,
  due_date TEXT,
  priority TEXT DEFAULT 'Medium',
  module TEXT,
  status TEXT DEFAULT 'Open',
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS resdex_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  skills TEXT DEFAULT '[]',
  experience TEXT,
  ctc TEXT,
  notice TEXT,
  location TEXT,
  folder TEXT DEFAULT 'Shortlist',
  freshness TEXT,
  credit TEXT DEFAULT '1 CV',
  dup INTEGER DEFAULT 0,
  imported INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cand_email ON candidates(email);
CREATE INDEX IF NOT EXISTS idx_cand_name ON candidates(name);
CREATE INDEX IF NOT EXISTS idx_resdex_role ON resdex_profiles(role);
`);

const RESDEX_SEED = [
  ["Ritu Sharma", "React Native Developer", ["React Native", "Firebase", "TypeScript"], "5 yrs", "₹22L", "30 days", "Bengaluru", "Shortlist", "Active today", "1 CV", 0],
  ["Imran Khanna", "Solutions Architect", ["AWS", "Microservices", "Java"], "9 yrs", "₹48L", "60 days", "Pune", "Personal", "Active 2d ago", "1 CV", 0],
  ["Karthik Raja", "Senior React Developer", ["React", "Next.js", "GraphQL"], "7 yrs", "₹30L", "15 days", "Bengaluru", "Accessed CVs", "Active today", "FREE", 1],
  ["Devika Suresh", "Java Backend", ["Java", "Spring", "SQL"], "4 yrs", "₹18L", "Immediate", "Chennai", "Emailed", "Active 5d ago", "1 CV", 0],
  ["Ananya Iyer", "Data Engineer", ["Spark", "Airflow", "Python"], "5.5 yrs", "₹26L", "30 days", "Chennai", "Shortlist", "Active today", "1 CV", 0],
  ["Farhan Ali", "DevOps Engineer", ["AWS", "K8s", "Terraform"], "5 yrs", "₹24L", "Immediate", "Hyderabad", "Shortlist", "Active today", "1 CV", 0],
  ["Meera Pillai", "QA Automation Lead", ["Playwright", "CI/CD", "Selenium"], "8 yrs", "₹27L", "30 days", "Kochi", "Personal", "Active 1d ago", "1 CV", 0],
  ["Aditya Rao", "ML Engineer", ["PyTorch", "LLMs", "MLOps"], "4.5 yrs", "₹32L", "Immediate", "Bengaluru", "Shortlist", "Active today", "1 CV", 0],
  ["Suresh Nair", "Engineering Manager", ["Leadership", "Java", "AWS"], "11 yrs", "₹52L", "90 days", "Bengaluru", "Personal", "Active 3d ago", "1 CV", 0],
  ["Priyanka Das", "Frontend Engineer", ["React", "Tailwind", "TypeScript"], "3 yrs", "₹16L", "30 days", "Remote", "Shortlist", "Active today", "1 CV", 0],
  ["Nikhil Bhat", "SDET", ["Selenium", "API testing", "Java"], "4 yrs", "₹18L", "45 days", "Pune", "Emailed", "Active 4d ago", "1 CV", 0],
  ["Gaurav Mehta", "Java Backend", ["Java", "Spring", "Kafka"], "6 yrs", "₹25L", "30 days", "Mumbai", "Shortlist", "Active today", "1 CV", 0],
  ["Lakshmi Narayan", "Full Stack Developer", ["React", "Node", "Postgres"], "5 yrs", "₹22L", "15 days", "Hyderabad", "Shortlist", "Active today", "1 CV", 0],
  ["Sneha Kulkarni", "Product Manager", ["B2B SaaS", "Roadmapping"], "7 yrs", "₹34L", "60 days", "Pune", "Personal", "Active 2d ago", "1 CV", 0],
  ["Vikram Shetty", "Backend Engineer (Go)", ["Go", "Postgres", "gRPC"], "4 yrs", "₹21L", "45 days", "Bengaluru", "Shortlist", "Active today", "1 CV", 0],
  ["Rohini Menon", "Senior React Developer", ["React", "TypeScript", "Node"], "6.5 yrs", "₹28L", "30 days", "Bengaluru", "Shortlist", "Active today", "1 CV", 0],
  ["Arjun Patel", "Cloud Architect", ["Azure", "Terraform", "K8s"], "10 yrs", "₹45L", "60 days", "Delhi", "Personal", "Active 1d ago", "1 CV", 0],
  ["Neha Gupta", "UI/UX Engineer", ["Figma", "React", "CSS"], "4 yrs", "₹18L", "30 days", "Noida", "Shortlist", "Active today", "1 CV", 0],
  ["Karan Malhotra", "Security Engineer", ["AppSec", "Python", "AWS"], "6 yrs", "₹30L", "45 days", "Bengaluru", "Accessed CVs", "Active 3d ago", "1 CV", 0],
  ["Divya Krishnan", "Scrum Master", ["Agile", "Jira", "Facilitation"], "8 yrs", "₹26L", "30 days", "Chennai", "Emailed", "Active 6d ago", "1 CV", 0],
];

export function seedDatabase() {
  const userCount = db.prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number };
  if (userCount.c === 0) {
    const insert = db.prepare(
      `INSERT INTO users (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)`
    );
    const now = new Date().toISOString();
    const users = [
      ["admin@hummingbrains.com", "Admin@123", "Karthikeyan", "admin"],
      ["manager@hummingbrains.com", "Manager@123", "Priya N.", "manager"],
      ["recruiter@hummingbrains.com", "Recruiter@123", "Arjun M.", "recruiter"],
      ["sales@hummingbrains.com", "Sales@123", "Divya R.", "sales"],
    ] as const;
    for (const [email, pass, name, role] of users) {
      insert.run(randomUUID(), email, bcrypt.hashSync(pass, 10), name, role, now);
    }
    console.log("  Seeded role users (admin/manager/recruiter/sales)");
  }

  const resdexCount = db.prepare("SELECT COUNT(*) AS c FROM resdex_profiles").get() as { c: number };
  if (resdexCount.c === 0) {
    const insert = db.prepare(
      `INSERT INTO resdex_profiles (id, name, role, skills, experience, ctc, notice, location, folder, freshness, credit, dup, imported, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
    );
    const now = new Date().toISOString();
    for (const row of RESDEX_SEED) {
      const [name, role, skills, exp, ctc, notice, loc, folder, freshness, credit, dup] = row;
      insert.run(randomUUID(), name, role, JSON.stringify(skills), exp, ctc, notice, loc, folder, freshness, credit, dup, now);
    }
    console.log(`  Seeded ${RESDEX_SEED.length} Naukri Resdex profiles`);
  }
}

seedDatabase();

export function parseSkills(raw: string | null): string[] {
  try {
    return JSON.parse(raw || "[]");
  } catch {
    return [];
  }
}

export function rowToCandidate(r: Record<string, unknown>) {
  return {
    id: String(r.id),
    name: String(r.name),
    email: (r.email as string) || null,
    phone: (r.phone as string) || null,
    role: (r.role as string) || null,
    skills: parseSkills(r.skills as string),
    experience: (r.experience as string) || null,
    ctc: (r.ctc as string) || null,
    notice: (r.notice as string) || null,
    location: (r.location as string) || null,
    stage: String(r.stage || "Sourced"),
    source: String(r.source || "Bulk PDF"),
    service: String(r.service || "Talent Acq"),
    resume_path: (r.resume_path as string) || null,
    resume_original_name: (r.resume_original_name as string) || null,
    raw_text_preview: (r.raw_text_preview as string) || null,
    parse_confidence: Number(r.parse_confidence || 0),
    parse_method: (r.parse_method as string) || null,
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  };
}

export const sqliteStore = {
  uploadDir: UPLOAD_DIR,
  dbPath: DB_PATH,

  findUserByEmail(email: string) {
    return db.prepare("SELECT * FROM users WHERE lower(email)=lower(?)").get(email) as
      | { id: string; email: string; password_hash: string; name: string; role: string }
      | undefined;
  },

  findUserById(id: string) {
    return db.prepare("SELECT id, email, name, role, created_at FROM users WHERE id=?").get(id) as
      | { id: string; email: string; name: string; role: string; created_at: string }
      | undefined;
  },

  listUsers() {
    return db.prepare("SELECT id, email, name, role, created_at FROM users ORDER BY role").all();
  },

  listCandidates() {
    return (db.prepare("SELECT * FROM candidates ORDER BY updated_at DESC").all() as Record<string, unknown>[]).map(rowToCandidate);
  },

  getCandidate(id: string) {
    const r = db.prepare("SELECT * FROM candidates WHERE id=?").get(id) as Record<string, unknown> | undefined;
    return r ? rowToCandidate(r) : null;
  },

  findByEmailOrName(email: string | null, name: string) {
    if (email) {
      const byEmail = db.prepare("SELECT * FROM candidates WHERE lower(email)=lower(?)").get(email) as Record<string, unknown> | undefined;
      if (byEmail) return rowToCandidate(byEmail);
    }
    const byName = db.prepare("SELECT * FROM candidates WHERE lower(name)=lower(?)").get(name) as Record<string, unknown> | undefined;
    return byName ? rowToCandidate(byName) : null;
  },

  upsertCandidate(c: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    role: string | null;
    skills: string[];
    experience: string | null;
    ctc: string | null;
    notice: string | null;
    location: string | null;
    stage: string;
    source: string;
    service?: string;
    resume_path: string | null;
    resume_original_name: string | null;
    raw_text_preview: string | null;
    parse_confidence: number;
    parse_method: string | null;
    created_at: string;
    updated_at: string;
    created_by?: string;
  }) {
    const existing = db.prepare("SELECT id FROM candidates WHERE id=?").get(c.id);
    const skills = JSON.stringify(c.skills || []);
    if (existing) {
      db.prepare(
        `UPDATE candidates SET name=?, email=?, phone=?, role=?, skills=?, experience=?, ctc=?, notice=?, location=?, stage=?, source=?,
         resume_path=?, resume_original_name=?, raw_text_preview=?, parse_confidence=?, parse_method=?, updated_at=? WHERE id=?`
      ).run(
        c.name, c.email, c.phone, c.role, skills, c.experience, c.ctc, c.notice, c.location, c.stage, c.source,
        c.resume_path, c.resume_original_name, c.raw_text_preview, c.parse_confidence, c.parse_method, c.updated_at, c.id
      );
    } else {
      db.prepare(
        `INSERT INTO candidates (id, name, email, phone, role, skills, experience, ctc, notice, location, stage, source, service, resume_path, resume_original_name, raw_text_preview, parse_confidence, parse_method, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        c.id, c.name, c.email, c.phone, c.role, skills, c.experience, c.ctc, c.notice, c.location, c.stage, c.source,
        c.service || "Talent Acq", c.resume_path, c.resume_original_name, c.raw_text_preview, c.parse_confidence, c.parse_method,
        c.created_by || null, c.created_at, c.updated_at
      );
    }
    return this.getCandidate(c.id)!;
  },

  saveFile(filename: string, buffer: Buffer) {
    const safe = filename.replace(/[^\w.\-]+/g, "_");
    const dest = path.join(UPLOAD_DIR, `${Date.now()}_${safe}`);
    fs.writeFileSync(dest, buffer);
    return dest;
  },

  addOutreach(row: {
    id: string; candidate_id: string | null; user_id?: string; user_name?: string;
    type: string; target: string; context: string; outcome: string; created_at: string;
  }) {
    db.prepare(
      `INSERT INTO outreach_log (id, candidate_id, user_id, user_name, type, target, context, outcome, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(row.id, row.candidate_id, row.user_id || null, row.user_name || null, row.type, row.target, row.context, row.outcome, row.created_at);
    return row;
  },

  listOutreach() {
    return db.prepare("SELECT * FROM outreach_log ORDER BY created_at DESC LIMIT 200").all();
  },

  listInvoices() {
    return db.prepare("SELECT * FROM invoices ORDER BY created_at DESC").all();
  },

  upsertInvoice(inv: Record<string, unknown>) {
    const exists = db.prepare("SELECT id FROM invoices WHERE id=?").get(inv.id);
    if (exists) {
      db.prepare(`UPDATE invoices SET status=? WHERE id=?`).run(inv.status, inv.id);
    } else {
      db.prepare(
        `INSERT INTO invoices (id, invoice_no, client_name, service_line, description, amount, gst_percent, status, due_date, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(inv.id, inv.invoice_no, inv.client_name, inv.service_line, inv.description, inv.amount, inv.gst_percent, inv.status, inv.due_date, inv.created_by || null, inv.created_at);
    }
    return inv;
  },

  listVerifications() {
    return db.prepare("SELECT * FROM verifications ORDER BY created_at DESC").all().map((v: any) => ({
      ...v,
      extracted: typeof v.extracted === "string" ? JSON.parse(v.extracted || "{}") : v.extracted,
    }));
  },

  addVerification(v: Record<string, unknown>) {
    db.prepare(
      `INSERT INTO verifications (id, candidate_id, doc_type, file_name, status, extracted, notes, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(v.id, v.candidate_id, v.doc_type, v.file_name, v.status, JSON.stringify(v.extracted || {}), v.notes, v.created_by || null, v.created_at);
    return v;
  },

  searchResdex(q: { query?: string; folder?: string; location?: string }) {
    let sql = "SELECT * FROM resdex_profiles WHERE imported=0";
    const params: string[] = [];
    if (q.folder && q.folder !== "All") {
      sql += " AND folder=?";
      params.push(q.folder);
    }
    if (q.location) {
      // support "Bengaluru, Hyderabad" → match any city token
      const cities = q.location
        .split(/[,/|]+/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (cities.length) {
        sql += ` AND (${cities.map(() => "lower(location) LIKE ?").join(" OR ")})`;
        cities.forEach((c) => params.push(`%${c}%`));
      }
    }
    if (q.query) {
      // tokenize Boolean / punctuation so "React AND TypeScript NOT Angular" still finds React profiles
      const tokens = q.query
        .split(/\b(?:AND|OR|NOT)\b|[,\s|/()+]+/i)
        .map((s) => s.trim().toLowerCase())
        .filter((t) => t.length >= 2 && !["the", "and", "or", "not"].includes(t));
      if (tokens.length) {
        sql += ` AND (${tokens
          .map(() => "(lower(name) LIKE ? OR lower(role) LIKE ? OR lower(skills) LIKE ? OR lower(location) LIKE ?)")
          .join(" OR ")})`;
        tokens.forEach((t) => {
          const like = `%${t}%`;
          params.push(like, like, like, like);
        });
      }
    }
    sql += " ORDER BY CASE folder WHEN 'Shortlist' THEN 0 WHEN 'Personal' THEN 1 WHEN 'Accessed CVs' THEN 2 ELSE 3 END, name ASC";
    return (db.prepare(sql).all(...params) as any[]).map((r) => ({
      ...r,
      skills: parseSkills(r.skills),
      dup: !!r.dup,
      imported: !!r.imported,
    }));
  },

  /** For folder tab counts — always full pool, ignore search */
  listResdexFolders() {
    const rows = db.prepare("SELECT folder, COUNT(*) AS c FROM resdex_profiles WHERE imported=0 GROUP BY folder").all() as {
      folder: string;
      c: number;
    }[];
    const map: Record<string, number> = {};
    let total = 0;
    for (const r of rows) {
      map[r.folder] = r.c;
      total += r.c;
    }
    return { total, folders: map };
  },

  ensureResdexCaptureColumns() {
    const cols = (db.prepare("PRAGMA table_info(resdex_profiles)").all() as { name: string }[]).map((c) => c.name);
    if (!cols.includes("naukri_key")) db.exec("ALTER TABLE resdex_profiles ADD COLUMN naukri_key TEXT");
    if (!cols.includes("capture_source")) db.exec("ALTER TABLE resdex_profiles ADD COLUMN capture_source TEXT DEFAULT 'seed'");
    if (!cols.includes("page_url")) db.exec("ALTER TABLE resdex_profiles ADD COLUMN page_url TEXT");
  },

  /** Upsert profiles captured by the Chrome helper from Naukri Resdex */
  upsertResdexCaptures(
    profiles: Array<{
      name: string;
      role?: string;
      skills?: string[];
      experience?: string;
      ctc?: string;
      notice?: string;
      location?: string;
      folder?: string;
      naukri_key?: string;
      page_url?: string;
      freshness?: string;
    }>,
    _createdBy?: string
  ) {
    this.ensureResdexCaptureColumns();
    const now = new Date().toISOString();
    let created = 0;
    let updated = 0;
    const saved: ReturnType<typeof this.searchResdex> = [];

    const findByKey = db.prepare("SELECT * FROM resdex_profiles WHERE naukri_key=? AND imported=0");
    const findByNameRole = db.prepare(
      "SELECT * FROM resdex_profiles WHERE lower(name)=lower(?) AND lower(role)=lower(?) AND imported=0"
    );
    const insert = db.prepare(
      `INSERT INTO resdex_profiles (id, name, role, skills, experience, ctc, notice, location, folder, freshness, credit, dup, imported, created_at, naukri_key, capture_source, page_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '1 CV', 0, 0, ?, ?, 'naukri-helper', ?)`
    );
    const update = db.prepare(
      `UPDATE resdex_profiles SET role=?, skills=?, experience=?, ctc=?, notice=?, location=?, folder=?, freshness=?, naukri_key=COALESCE(naukri_key,?), capture_source='naukri-helper', page_url=COALESCE(?, page_url)
       WHERE id=?`
    );

    for (const p of profiles) {
      const name = (p.name || "").trim();
      if (!name || name.length < 2) continue;
      const role = (p.role || "Profile from Naukri").trim();
      const skills = JSON.stringify(Array.isArray(p.skills) ? p.skills : []);
      const folder = p.folder || "Shortlist";
      const key = (p.naukri_key || `${name}|${role}`).slice(0, 200);
      const existing =
        (p.naukri_key ? (findByKey.get(p.naukri_key) as any) : null) ||
        (findByNameRole.get(name, role) as any);

      if (existing) {
        update.run(
          role,
          skills,
          p.experience || existing.experience,
          p.ctc || existing.ctc,
          p.notice || existing.notice,
          p.location || existing.location,
          folder,
          p.freshness || "Captured just now",
          key,
          p.page_url || null,
          existing.id
        );
        updated++;
        const row = db.prepare("SELECT * FROM resdex_profiles WHERE id=?").get(existing.id) as any;
        saved.push({
          ...row,
          skills: parseSkills(row.skills),
          dup: !!row.dup,
          imported: !!row.imported,
        });
      } else {
        const id = randomUUID();
        insert.run(
          id,
          name,
          role,
          skills,
          p.experience || null,
          p.ctc || null,
          p.notice || null,
          p.location || null,
          folder,
          p.freshness || "Captured just now",
          now,
          key,
          p.page_url || null
        );
        created++;
        const row = db.prepare("SELECT * FROM resdex_profiles WHERE id=?").get(id) as any;
        saved.push({
          ...row,
          skills: parseSkills(row.skills),
          dup: !!row.dup,
          imported: !!row.imported,
        });
      }
    }

    return { created, updated, data: saved, folderCounts: this.listResdexFolders() };
  },

  listHelperCaptures() {
    this.ensureResdexCaptureColumns();
    return (
      db
        .prepare(
          `SELECT * FROM resdex_profiles WHERE imported=0 AND capture_source='naukri-helper' ORDER BY created_at DESC`
        )
        .all() as any[]
    ).map((r) => ({
      ...r,
      skills: parseSkills(r.skills),
      dup: !!r.dup,
      imported: !!r.imported,
    }));
  },

  importResdex(id: string, createdBy?: string) {
    const r = db.prepare("SELECT * FROM resdex_profiles WHERE id=?").get(id) as any;
    if (!r) return null;
    if (r.imported) return { already: true as const };
    const now = new Date().toISOString();
    const candId = randomUUID();
    const skills = parseSkills(r.skills);
    db.prepare(
      `INSERT INTO candidates (id, name, email, phone, role, skills, experience, ctc, notice, location, stage, source, service, resume_path, resume_original_name, raw_text_preview, parse_confidence, parse_method, created_by, created_at, updated_at)
       VALUES (?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, 'Sourced', 'Resdex', 'Talent Acq', NULL, ?, NULL, 0.85, 'naukri-resdex-import', ?, ?, ?)`
    ).run(candId, r.name, r.role, JSON.stringify(skills), r.experience, r.ctc, r.notice, r.location, `${r.name.replace(/\s/g, "_")}_Resdex.pdf`, createdBy || null, now, now);
    db.prepare("UPDATE resdex_profiles SET imported=1 WHERE id=?").run(id);
    return { already: false as const, candidate: this.getCandidate(candId)! };
  },

  addTask(t: Record<string, unknown>) {
    db.prepare(
      `INSERT INTO tasks (id, title, assignee, assigner, due_date, priority, module, status, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(t.id, t.title, t.assignee, t.assigner, t.due_date, t.priority, t.module, t.status || "Open", t.notes || null, t.created_at);
    return t;
  },

  listTasks() {
    return db.prepare("SELECT * FROM tasks ORDER BY created_at DESC").all();
  },
};
