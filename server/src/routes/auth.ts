import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { sqliteStore } from "../db/sqlite.js";
import { clearAuthCookie, requireAuth, requireRoles, setAuthCookie, signToken } from "../middleware/auth.js";

export const authRouter = Router();

authRouter.post("/login", (req, res) => {
  const body = z
    .object({
      email: z.string().email(),
      password: z.string().min(4),
    })
    .safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Email and password required" });

  const user = sqliteStore.findUserByEmail(body.data.email);
  if (!user || !bcrypt.compareSync(body.data.password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const authUser = { id: user.id, email: user.email, name: user.name, role: user.role as "admin" | "manager" | "recruiter" | "sales" };
  const token = signToken(authUser);
  setAuthCookie(res, token);
  res.json({ ok: true, user: authUser, token });
});

authRouter.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

authRouter.get("/users", requireAuth, requireRoles("admin"), (_req, res) => {
  res.json({ data: sqliteStore.listUsers() });
});
