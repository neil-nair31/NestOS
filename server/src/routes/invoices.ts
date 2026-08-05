import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { listInvoices, upsertInvoice } from "../store/index.js";
import type { Invoice } from "../types.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";

export const invoicesRouter = Router();
invoicesRouter.use(requireAuth);

invoicesRouter.get("/", async (_req, res, next) => {
  try {
    res.json({ data: await listInvoices() });
  } catch (e) {
    next(e);
  }
});

invoicesRouter.post("/", requireRoles("admin", "manager", "sales"), async (req, res, next) => {
  try {
    const body = z
      .object({
        client_name: z.string().min(2),
        service_line: z.enum(["IaaS", "Staff Aug", "Talent Acq"]),
        description: z.string().min(2),
        amount: z.number().positive(),
        gst_percent: z.number().min(0).max(28).default(18),
        due_date: z.string().optional(),
        status: z.enum(["Draft", "Sent", "Paid", "Overdue"]).default("Draft"),
      })
      .parse(req.body);

    const count = (await listInvoices()).length + 1;
    const inv: Invoice & { created_by?: string } = {
      id: randomUUID(),
      invoice_no: `HB-INV-${new Date().getFullYear()}-${String(count).padStart(4, "0")}`,
      client_name: body.client_name,
      service_line: body.service_line,
      description: body.description,
      amount: body.amount,
      gst_percent: body.gst_percent,
      status: body.status,
      due_date: body.due_date || new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
      created_at: new Date().toISOString(),
      created_by: req.user?.id,
    };
    await upsertInvoice(inv);
    res.status(201).json(inv);
  } catch (e) {
    next(e);
  }
});

invoicesRouter.patch("/:id/status", requireRoles("admin", "manager", "sales"), async (req, res, next) => {
  try {
    const status = z.enum(["Draft", "Sent", "Paid", "Overdue"]).parse(req.body.status);
    const list = await listInvoices();
    const inv = list.find((i) => i.id === req.params.id);
    if (!inv) return res.status(404).json({ error: "Not found" });
    inv.status = status;
    await upsertInvoice(inv);
    res.json(inv);
  } catch (e) {
    next(e);
  }
});
