import { Router } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { z } from "zod";
import { parseResumePdf } from "../services/ocr.js";
import { addVerification, getCandidate, listVerifications } from "../store/index.js";
import type { DocVerification } from "../types.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } });

export const verifyRouter = Router();
verifyRouter.use(requireAuth);
verifyRouter.use(requireRoles("admin", "manager", "recruiter"));

verifyRouter.get("/", async (_req, res, next) => {
  try {
    res.json({ data: await listVerifications() });
  } catch (e) {
    next(e);
  }
});

verifyRouter.post("/", upload.single("file"), async (req, res, next) => {
  try {
    const candidateId = z.string().parse(req.body.candidateId);
    const docType = z.string().default("Resume").parse(req.body.docType || "ID Document");
    const file = req.file;
    if (!file) return res.status(400).json({ error: "file required" });

    const cand = await getCandidate(candidateId);
    if (!cand) return res.status(404).json({ error: "Candidate not found" });

    const parsed = await parseResumePdf(file.buffer, file.originalname);
    const nameMatch =
      parsed.name && cand.name
        ? parsed.name.toLowerCase().includes(cand.name.split(" ")[0].toLowerCase()) ||
          cand.name.toLowerCase().includes(parsed.name.split(" ")[0].toLowerCase())
        : false;

    let status: DocVerification["status"] = "Review";
    let notes = "Manual review recommended.";
    if (nameMatch && parsed.confidence >= 0.7) {
      status = "Valid";
      notes = "Name matches candidate record.";
    } else if (parsed.confidence < 0.5) {
      status = "Warning";
      notes = "Low OCR confidence — check scan quality.";
    } else if (!nameMatch) {
      status = "Warning";
      notes = `Extracted name "${parsed.name}" does not clearly match candidate "${cand.name}".`;
    }

    const row: DocVerification & { created_by?: string } = {
      id: randomUUID(),
      candidate_id: candidateId,
      doc_type: docType,
      file_name: file.originalname,
      status,
      extracted: {
        name: parsed.name,
        email: parsed.email || "",
        phone: parsed.phone || "",
        method: parsed.method,
      },
      notes,
      created_at: new Date().toISOString(),
      created_by: req.user?.id,
    };
    await addVerification(row);
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
});
