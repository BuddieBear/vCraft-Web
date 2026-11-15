import { Router } from "express";
import { z } from "zod";
import { registerBuyer, login } from "../services/auth.service.js";
import { authenticate } from "../middlewares/authenticate.js";
import { validate } from "../middlewares/validate-request.js";
import { findActiveUserProfile } from "../repositories/users.repository.js";
import { rateLimit } from "express-rate-limit";

const router = Router();
const email = z.string().trim().email().max(255);
const password = z.string().refine((v) => Buffer.byteLength(v, "utf8") >= 12 && Buffer.byteLength(v, "utf8") <= 72);
const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false, message: { error: { code: "RATE_LIMITED", message: "Thử lại sau." } } });
router.post("/register", authLimit, validate({ body: z.object({ email, password, fullName: z.string().trim().min(1).max(120) }).strict() }), async (req, res) => res.status(201).json({ data: await registerBuyer(req.validatedBody) }));
router.post("/login", authLimit, validate({ body: z.object({ email, password: z.string().min(1).refine((v) => Buffer.byteLength(v, "utf8") <= 72) }).strict() }), async (req, res) => res.set("Cache-Control", "no-store").json({ data: await login(req.validatedBody) }));
router.get("/me", authenticate, async (req, res) => res.json({ data: await findActiveUserProfile(req.user.id) }));
export default router;
