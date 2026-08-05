import { Router } from "express";
import multer from "multer";
import { parseResumePdf } from "../services/ocr.js";
import { hasAzure } from "../config.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
});

export const modelRouter = Router();

modelRouter.use(requireAuth);

modelRouter.get("/status", (_req, res) => {
  res.json({
    service: "NestOS Parse Model",
    hosting: "local-server",
    engine: hasAzure() ? "azure-document-intelligence" : "unpdf-text-layer",
    azure: hasAzure(),
    endpoints: {
      parse: "POST /api/model/parse",
      status: "GET /api/model/status",
    },
    note: hasAzure()
      ? "Azure Document Intelligence is configured for scanned PDFs."
      : "Using local unpdf parser. Set AZURE_DI_ENDPOINT + AZURE_DI_KEY for production OCR.",
  });
});

modelRouter.post(
  "/parse",
  requireRoles("admin", "manager", "recruiter"),
  upload.single("file"),
  async (req, res, next) => {
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ error: "PDF file required (field: file)" });
      const parsed = await parseResumePdf(file.buffer, file.originalname);
      res.json({
        ok: true,
        hosting: "NestOS model service",
        engine: parsed.method,
        file: file.originalname,
        bytes: file.size,
        parsed: {
          name: parsed.name,
          email: parsed.email,
          phone: parsed.phone,
          role: parsed.role,
          skills: parsed.skills,
          experience: parsed.experience,
          ctc: parsed.ctc,
          notice: parsed.notice,
          location: parsed.location,
          confidence: parsed.confidence,
          preview: parsed.rawText.slice(0, 400),
        },
      });
    } catch (e) {
      next(e);
    }
  }
);
