import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { sendCandidateEmail, whatsappLink } from "../services/comms.js";
import { addOutreach, getCandidate, listOutreach } from "../store/index.js";
import { config } from "../config.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";

export const commsRouter = Router();
commsRouter.use(requireAuth);

commsRouter.get("/outreach", async (_req, res, next) => {
  try {
    res.json({ data: await listOutreach() });
  } catch (e) {
    next(e);
  }
});

commsRouter.post("/whatsapp", requireRoles("admin", "manager", "recruiter", "sales"), async (req, res, next) => {
  try {
    const body = z
      .object({
        candidateId: z.string().optional(),
        phone: z.string().min(8),
        message: z.string().default("Hi — following up from HummingBrains / NestOS."),
        context: z.string().default("Candidate outreach"),
      })
      .parse(req.body);

    const link = whatsappLink(body.phone, body.message);
    await addOutreach({
      id: randomUUID(),
      candidate_id: body.candidateId || null,
      user_id: req.user?.id,
      user_name: req.user?.name,
      type: "WhatsApp",
      target: body.phone,
      context: body.context,
      outcome: "wa.me link generated",
      created_at: new Date().toISOString(),
    });

    res.json({ ok: true, link, note: "Open link to send via WhatsApp. Business API can replace this later." });
  } catch (e) {
    next(e);
  }
});

commsRouter.post("/email", requireRoles("admin", "manager", "recruiter", "sales"), async (req, res, next) => {
  try {
    const body = z
      .object({
        candidateId: z.string().optional(),
        to: z.string().email(),
        subject: z.string().min(3),
        body: z.string().min(3),
        context: z.string().default("Candidate email"),
      })
      .parse(req.body);

    if (body.candidateId) {
      const c = await getCandidate(body.candidateId);
      if (!c) return res.status(404).json({ error: "Candidate not found" });
    }

    const result = await sendCandidateEmail({
      to: body.to,
      subject: body.subject,
      body: body.body,
      replyTo: config.notifyEmail || undefined,
    });

    await addOutreach({
      id: randomUUID(),
      candidate_id: body.candidateId || null,
      user_id: req.user?.id,
      user_name: req.user?.name,
      type: "Email",
      target: body.to,
      context: body.context,
      outcome: result.ok ? `Sent (${result.mode})` : `Failed: ${result.error}`,
      created_at: new Date().toISOString(),
    });

    if (!result.ok) return res.status(502).json(result);
    res.json(result);
  } catch (e) {
    next(e);
  }
});
