import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

/**
 * Listen FIRST so Railway healthchecks succeed even if DB / routes need a moment.
 * Always return 200 on /api/health once the HTTP server is up.
 */
const port = Number(process.env.PORT) || 4100;
// Railway: plain app.listen(port) resolves host as "[::]" → ENOTFOUND and crash-loop.
// Always bind IPv4 all-interfaces.
const host = "0.0.0.0";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NESTOS_ROOT = path.resolve(__dirname, "../..");

const app = express();
let ready = false;
let bootError: string | null = null;
let healthExtra: Record<string, unknown> = {};

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    ready,
    product: "NestOS",
    port,
    host,
    bootError,
    ...healthExtra,
  });
});

const server = app.listen(port, host, () => {
  console.log(`NestOS HTTP up on http://${host}:${port} (PORT env=${process.env.PORT ?? "unset"})`);
  void boot();
});

server.on("error", (err) => {
  console.error("Listen failed:", err);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("uncaughtException:", err);
  bootError = err instanceof Error ? err.message : String(err);
});
process.on("unhandledRejection", (err) => {
  console.error("unhandledRejection:", err);
  bootError = err instanceof Error ? (err as Error).message : String(err);
});

async function boot() {
  try {
    const { config, hasAzure, hasResend, hasSupabase } = await import("./config.js");
    await import("./db/sqlite.js");

    const { authRouter } = await import("./routes/auth.js");
    const { candidatesRouter } = await import("./routes/candidates.js");
    const { commsRouter } = await import("./routes/comms.js");
    const { invoicesRouter } = await import("./routes/invoices.js");
    const { modelRouter } = await import("./routes/model.js");
    const { resdexRouter } = await import("./routes/resdex.js");
    const { verifyRouter } = await import("./routes/verify.js");

    app.use(
      cors({
        origin: true,
        credentials: true,
      })
    );
    app.use(cookieParser());
    app.use(express.json({ limit: "2mb" }));

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
            error:
              "PDF not generated yet. Open /trial-guide and use Print → Save as PDF, or ask the host to regenerate.",
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

    healthExtra = {
      store: config.storeMode,
      database: "sqlite",
      auth: "jwt-cookie",
      supabaseConfigured: hasSupabase(),
      azureOcr: hasAzure(),
      resend: hasResend(),
      model: hasAzure() ? "azure-document-intelligence" : "unpdf-local",
      ui: "nestos-v2-demo.html",
      features: [
        "login-rbac",
        "candidates",
        "bulk-ocr",
        "resdex",
        "naukri-helper",
        "whatsapp",
        "email",
        "verify",
        "invoices",
        "model-parse",
      ],
      extension: "/extension-guide",
      extensionDownload: "/downloads/nestos-naukri-helper.zip",
      trialGuide: "/trial-guide",
      trialGuidePdf: "/downloads/nestos-trial-guide.pdf",
    };

    ready = true;
    bootError = null;
    console.log(
      `  NestOS ready | DB: SQLite | Azure OCR: ${hasAzure() ? "ON" : "unpdf"} | Resend: ${hasResend() ? "ON" : "stub"}`
    );
  } catch (err) {
    bootError = err instanceof Error ? err.message : String(err);
    console.error("Boot failed (HTTP still up for health/debug):", err);
  }
}
