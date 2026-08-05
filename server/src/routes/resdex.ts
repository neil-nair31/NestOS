import { Router } from "express";
import { z } from "zod";
import { sqliteStore } from "../db/sqlite.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";

export const resdexRouter = Router();

resdexRouter.use(requireAuth);
resdexRouter.use(requireRoles("admin", "manager", "recruiter"));

const captureProfile = z.object({
  name: z.string().min(2).max(120),
  role: z.string().max(160).optional(),
  skills: z.array(z.string()).optional(),
  experience: z.string().max(80).optional(),
  ctc: z.string().max(80).optional(),
  notice: z.string().max(80).optional(),
  location: z.string().max(120).optional(),
  folder: z.enum(["Shortlist", "Personal", "Accessed CVs", "Emailed"]).optional(),
  naukri_key: z.string().max(200).optional(),
  page_url: z.string().max(500).optional(),
  freshness: z.string().max(80).optional(),
});

resdexRouter.get("/search", (req, res) => {
  const query = String(req.query.q || req.query.query || "").trim();
  const location = String(req.query.location || "").trim();
  const helperOnly = String(req.query.helper || "") === "1";
  let data = sqliteStore.searchResdex({ query, folder: "All", location });
  if (helperOnly) {
    data = data.filter((p: any) => p.capture_source === "naukri-helper");
  }
  const counts = sqliteStore.listResdexFolders();
  res.json({
    ok: true,
    source: helperOnly ? "Naukri browser helper captures" : "NestOS Resdex queue",
    whatItDoes:
      "Profiles captured from Naukri Resdex via the NestOS Chrome helper. Import saves them into All candidates.",
    query: { query, location, helperOnly },
    count: data.length,
    folderCounts: counts,
    helperCaptures: sqliteStore.listHelperCaptures().length,
    data,
  });
});

resdexRouter.get("/stats", (_req, res) => {
  const counts = sqliteStore.listResdexFolders();
  const candidates = sqliteStore.listCandidates().filter((c) => c.source === "Resdex");
  res.json({
    pool: counts.total,
    shortlist: counts.folders["Shortlist"] || 0,
    folders: counts.folders,
    imported: candidates.length,
    helperCaptures: sqliteStore.listHelperCaptures().length,
  });
});

/** Chrome helper → NestOS: push profiles scraped/captured from Resdex page */
resdexRouter.post("/capture", (req, res, next) => {
  try {
    const body = z
      .object({
        profiles: z.array(captureProfile).min(1).max(50),
        page_url: z.string().optional(),
        folder: z.enum(["Shortlist", "Personal", "Accessed CVs", "Emailed"]).optional(),
      })
      .parse(req.body);

    const profiles = body.profiles.map((p) => ({
      ...p,
      folder: p.folder || body.folder || "Shortlist",
      page_url: p.page_url || body.page_url,
      freshness: p.freshness || "Captured from Naukri just now",
    }));

    const result = sqliteStore.upsertResdexCaptures(profiles, req.user?.id);
    res.status(201).json({
      ok: true,
      message: `Captured ${result.created} new · updated ${result.updated} from Naukri`,
      created: result.created,
      updated: result.updated,
      count: result.data.length,
      folderCounts: result.folderCounts,
      data: result.data,
      capturedBy: req.user?.name,
    });
  } catch (e) {
    next(e);
  }
});

resdexRouter.get("/captures", (_req, res) => {
  const data = sqliteStore.listHelperCaptures();
  res.json({ ok: true, count: data.length, data });
});

resdexRouter.post("/import/:id", (req, res) => {
  const result = sqliteStore.importResdex(req.params.id, req.user?.id);
  if (!result) return res.status(404).json({ error: "Resdex profile not found" });
  if (result.already) return res.status(409).json({ error: "Already imported", already: true });
  res.status(201).json({
    ok: true,
    message: `${result.candidate.name} imported to Talent Hub`,
    candidate: result.candidate,
  });
});

resdexRouter.post("/import-bulk", (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? (req.body.ids as string[]) : [];
  if (!ids.length) return res.status(400).json({ error: "ids[] required" });
  const results = ids.map((id) => {
    const r = sqliteStore.importResdex(id, req.user?.id);
    if (!r) return { id, status: "missing" as const };
    if (r.already) return { id, status: "already" as const };
    return { id, status: "imported" as const, candidate: r.candidate };
  });
  res.json({
    ok: true,
    imported: results.filter((r) => r.status === "imported").length,
    results,
  });
});
