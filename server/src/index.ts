import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { config, hasAzure, hasResend, hasSupabase } from "./config.js";
import { authRouter } from "./routes/auth.js";
import { candidatesRouter } from "./routes/candidates.js";
import { commsRouter } from "./routes/comms.js";
import { invoicesRouter } from "./routes/invoices.js";
import { modelRouter } from "./routes/model.js";
import { resdexRouter } from "./routes/resdex.js";
import { verifyRouter } from "./routes/verify.js";
import "./db/sqlite.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NESTOS_ROOT = path.resolve(__dirname, "../..");

const app = express();
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    product: "NestOS",
    store: config.storeMode,
    database: "sqlite",
    auth: "jwt-cookie",
    supabaseConfigured: hasSupabase(),
    azureOcr: hasAzure(),
    resend: hasResend(),
    model: hasAzure() ? "azure-document-intelligence" : "unpdf-local",
    ui: "nestos-v2-demo.html",
    features: ["login-rbac", "candidates", "bulk-ocr", "resdex", "naukri-helper", "whatsapp", "email", "verify", "invoices", "model-parse"],
    extension: "/extension-guide",
    extensionDownload: "/downloads/nestos-naukri-helper.zip",
    trialGuide: "/trial-guide",
    trialGuidePdf: "/downloads/nestos-trial-guide.pdf",
  });
});

app.use("/api/auth", authRouter);
app.use("/api/candidates", candidatesRouter);
app.use("/api/comms", commsRouter);
app.use("/api/invoices", invoicesRouter);
app.use("/api/verify", verifyRouter);
app.use("/api/model", modelRouter);
app.use("/api/resdex", resdexRouter);

app.get("/", (_req, res) => {
  res.sendFile(path.join(NESTOS_ROOT, "login.html"));
});
app.get("/login", (_req, res) => {
  res.sendFile(path.join(NESTOS_ROOT, "login.html"));
});
app.get("/app", (_req, res) => {
  res.sendFile(path.join(NESTOS_ROOT, "nestos-v2-demo.html"));
});
app.get("/demo", (_req, res) => {
  res.sendFile(path.join(NESTOS_ROOT, "nestos-v2-demo.html"));
});
app.get("/extension-demo", (_req, res) => {
  res.sendFile(path.join(NESTOS_ROOT, "extension-demo.html"));
});
app.get("/extension-guide", (_req, res) => {
  res.sendFile(path.join(NESTOS_ROOT, "extension-guide.html"));
});
app.get("/trial-guide", (_req, res) => {
  res.sendFile(path.join(NESTOS_ROOT, "NestOS-Trial-Operations-Guide.html"));
});
app.get("/downloads/nestos-trial-guide.pdf", (_req, res) => {
  const pdfPath = path.join(NESTOS_ROOT, "downloads", "nestos-trial-guide.pdf");
  res.download(pdfPath, "NestOS-Trial-Operations-Guide.pdf", (err) => {
    if (err && !res.headersSent) {
      res.status(404).json({
        error: "PDF not generated yet. Open /trial-guide and use Print → Save as PDF, or ask the host to regenerate.",
      });
    }
  });
});
app.get("/downloads/nestos-naukri-helper.zip", (_req, res) => {
  const zipPath = path.join(NESTOS_ROOT, "downloads", "nestos-naukri-helper.zip");
  res.download(zipPath, "nestos-naukri-helper.zip", (err) => {
    if (err && !res.headersSent) {
      res.status(404).json({
        error: "Extension zip not found. Run: npm run pack:extension (from NestOS)",
      });
    }
  });
});
app.use("/downloads", express.static(path.join(NESTOS_ROOT, "downloads")));
app.use("/extension", express.static(path.join(NESTOS_ROOT, "extension")));

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  const message = err instanceof Error ? err.message : "Server error";
  const status = message.includes("parse") || message.includes("Zod") ? 400 : 500;
  res.status(status).json({ error: message });
});

const host = process.env.HOST || "0.0.0.0";
app.listen(config.port, host, () => {
  console.log("");
  console.log(`  NestOS listening on http://${host}:${config.port}`);
  console.log("  NestOS login   →  http://localhost:" + config.port + "/");
  console.log("  NestOS app     →  http://localhost:" + config.port + "/app");
  console.log("  API health     →  http://localhost:" + config.port + "/api/health");
  console.log(
    `  DB: SQLite | Azure OCR: ${hasAzure() ? "ON" : "unpdf"} | Resend: ${hasResend() ? "ON" : "stub"}`
  );
  console.log("  Naukri helper →  http://localhost:" + config.port + "/extension-guide");
  console.log("  Extension zip →  http://localhost:" + config.port + "/downloads/nestos-naukri-helper.zip");
  console.log("  Resdex demo   →  http://localhost:" + config.port + "/extension-demo");
  console.log("");
});
