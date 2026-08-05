import { Router } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { parseResumePdf } from "../services/ocr.js";
import { findExisting, listCandidates, saveResumeFile, upsertCandidate, getCandidate } from "../store/index.js";
import type { Candidate } from "../types.js";
import { config, hasAzure } from "../config.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, cb) => {
    const ok = /pdf|msword|officedocument/i.test(file.mimetype) || /\.pdf$/i.test(file.originalname);
    cb(null, ok);
  },
});

export const candidatesRouter = Router();
candidatesRouter.use(requireAuth);

candidatesRouter.get("/", async (_req, res, next) => {
  try {
    const rows = await listCandidates();
    res.json({ data: rows, count: rows.length, ocr: hasAzure() ? "azure" : "pdf-parse-fallback" });
  } catch (e) {
    next(e);
  }
});

candidatesRouter.get("/:id", async (req, res, next) => {
  try {
    const row = await getCandidate(req.params.id);
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (e) {
    next(e);
  }
});

candidatesRouter.post("/", requireRoles("admin", "manager", "recruiter"), async (req, res, next) => {
  try {
    const body = req.body || {};
    const name = String(body.name || "").trim();
    if (!name) return res.status(400).json({ error: "Name is required" });
    const now = new Date().toISOString();
    const skills = Array.isArray(body.skills)
      ? body.skills.map(String).filter(Boolean)
      : String(body.skills || "")
          .split(/[,;|]/)
          .map((s: string) => s.trim())
          .filter(Boolean);
    const candidate: Candidate = {
      id: randomUUID(),
      name,
      email: body.email ? String(body.email).trim() : null,
      phone: body.phone ? String(body.phone).trim() : null,
      role: body.role ? String(body.role).trim() : null,
      skills,
      experience: body.experience ? String(body.experience).trim() : null,
      ctc: body.ctc ? String(body.ctc).trim() : null,
      notice: body.notice ? String(body.notice).trim() : null,
      location: body.location ? String(body.location).trim() : null,
      stage: body.stage ? String(body.stage).trim() : "Sourced",
      source: body.source ? String(body.source).trim() : "Manual",
      resume_path: null,
      resume_original_name: null,
      raw_text_preview: null,
      parse_confidence: 1,
      parse_method: "manual",
      created_at: now,
      updated_at: now,
    };
    const saved = await upsertCandidate(candidate);
    res.status(201).json({ ok: true, candidate: saved });
  } catch (e) {
    next(e);
  }
});

candidatesRouter.post(
  "/bulk-upload",
  requireRoles("admin", "manager", "recruiter"),
  upload.array("files", 20),
  async (req, res, next) => {
    try {
      const files = (req.files as Express.Multer.File[]) || [];
      if (!files.length) return res.status(400).json({ error: "No PDF files uploaded" });

      const results: Array<{
        file: string;
        status: "created" | "updated" | "error";
        candidate?: Candidate;
        error?: string;
      }> = [];

      for (const file of files) {
        try {
          const parsed = await parseResumePdf(file.buffer, file.originalname);
          const resumePath = await saveResumeFile(file.originalname, file.buffer, file.mimetype);
          const existing = await findExisting(parsed.email, parsed.name);
          const now = new Date().toISOString();

          const candidate: Candidate = {
            id: existing?.id || randomUUID(),
            name: parsed.name,
            email: parsed.email || existing?.email || null,
            phone: parsed.phone || existing?.phone || null,
            role: parsed.role || existing?.role || null,
            skills: parsed.skills.length ? parsed.skills : existing?.skills || [],
            experience: parsed.experience || existing?.experience || null,
            ctc: parsed.ctc || existing?.ctc || null,
            notice: parsed.notice || existing?.notice || null,
            location: parsed.location || existing?.location || null,
            stage: existing?.stage || "Sourced",
            source: "Bulk PDF",
            resume_path: resumePath,
            resume_original_name: file.originalname,
            raw_text_preview: parsed.rawText.slice(0, 500),
            parse_confidence: parsed.confidence,
            parse_method: parsed.method,
            created_at: existing?.created_at || now,
            updated_at: now,
          };

          const saved = await upsertCandidate(candidate);
          results.push({ file: file.originalname, status: existing ? "updated" : "created", candidate: saved });
        } catch (err) {
          results.push({
            file: file.originalname,
            status: "error",
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      res.json({
        ok: true,
        store: config.storeMode,
        ocr: hasAzure() ? "azure-document-intelligence" : "pdf-parse-fallback",
        results,
        created: results.filter((r) => r.status === "created").length,
        updated: results.filter((r) => r.status === "updated").length,
        errors: results.filter((r) => r.status === "error").length,
      });
    } catch (e) {
      next(e);
    }
  }
);
