import { Router } from "express";
import { z } from "zod";
import { registerBuyer, login, logout, changePassword, requestPasswordReset, resetPassword, getProfile, updateProfile, revokeAllSessions } from "../services/auth.service.js";
import { authenticate } from "../middlewares/authenticate.js";
import { validate } from "../middlewares/validate-request.js";
import { rateLimit } from "express-rate-limit";
import { mediaUrl } from "./schemas.js";
import { validRecipientPhone } from "../../../frontend/src/data/input-values.js";
const router = Router();
const email = z.string().trim().email().max(255);
const username = z.string().trim().regex(/^[a-zA-Z0-9._-]{3,50}$/).refine((v) => /[a-zA-Z0-9]/.test(v));
const optionalUsername = z.string().trim().pipe(z.union([username, z.literal("")])).nullable().optional();
const optionalPhone = z.string().trim().max(20).refine((v) => !v || validRecipientPhone(v)).nullable().optional();
const optionalAvatarUrl = z.string().trim().pipe(z.union([mediaUrl, z.literal("")])).nullable().optional();
const identifier = z.string().trim().min(1).max(255);
const password = z.string().refine((v) => Buffer.byteLength(v, "utf8") >= 12 && Buffer.byteLength(v, "utf8") <= 72);
const enteredPassword = z.string().min(1).refine((v) => Buffer.byteLength(v, "utf8") <= 72);
const loginBody = z.object({
    email: identifier.optional(),
    username: identifier.optional(),
    identifier: identifier.optional(),
    password: enteredPassword,
}).strict().refine((v) => Boolean(v.identifier || v.username || v.email), { path: ["identifier"], message: "Nhập email hoặc tên đăng nhập." });
const resetRequestBody = z.object({
    email: identifier.optional(),
    username: identifier.optional(),
    identifier: identifier.optional(),
}).strict().refine((v) => Boolean(v.identifier || v.username || v.email), { path: ["identifier"], message: "Nhập email hoặc tên đăng nhập." });
const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false, message: { error: { code: "RATE_LIMITED", message: "Thử lại sau." } } });
router.post("/register", authLimit, validate({ body: z.object({ email, username: optionalUsername, password, fullName: z.string().trim().min(1).max(120) }).strict() }), async (req, res) => res.status(201).json({ data: await registerBuyer(req.validatedBody) }));
router.post("/login", authLimit, validate({ body: loginBody }), async (req, res) => res.set("Cache-Control", "no-store").json({ data: await login(req.validatedBody) }));
router.post("/logout", authenticate, async (req, res) => res.json({ data: await logout(req.user.id, req.user.jti) }));
router.post("/logout-all", authenticate, async (req, res) => res.json({ data: await revokeAllSessions(req.user.id) }));
router.get("/me", authenticate, async (req, res) => res.json({ data: await getProfile(req.user.id) }));
router.patch("/me", authenticate, validate({ body: z.object({ fullName: z.string().trim().min(1).max(120).optional(), username: optionalUsername, phone: optionalPhone, avatarUrl: optionalAvatarUrl }).strict() }), async (req, res) => res.json({ data: await updateProfile(req.user.id, req.validatedBody) }));
router.post("/password/change", authenticate, validate({ body: z.object({ currentPassword: enteredPassword, newPassword: password }).strict() }), async (req, res) => res.json({ data: await changePassword(req.user.id, req.validatedBody.currentPassword, req.validatedBody.newPassword) }));
router.post("/password/reset/request", authLimit, validate({ body: resetRequestBody }), async (req, res) => res.set("Cache-Control", "no-store").json({ data: await requestPasswordReset(req.validatedBody.identifier ?? req.validatedBody.username ?? req.validatedBody.email) }));
router.post("/password/reset/confirm", authLimit, validate({ body: z.object({ token: z.string().min(20).max(200), newPassword: password }).strict() }), async (req, res) => res.json({ data: await resetPassword(req.validatedBody.token, req.validatedBody.newPassword) }));
export default router;
