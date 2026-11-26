import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";
import { validate } from "../middlewares/validate-request.js";
import { byId, listPage, pageArgs, pageQuery } from "./schemas.js";
import { issueArtisan, pendingArtisans, managedArtisans, artisanReviewDetails, reviewArtisan, changeArtisanSuspension } from "../services/admin.service.js";
const router = Router();
router.use(authenticate, authorize("ADMIN"));
router.get("/artisans/pending", validate({ query: pageQuery }), async (req, res) => res.json({ data: await pendingArtisans(pageArgs(req.validatedQuery)) }));
router.get("/artisans", validate({ query: pageQuery.extend({ status: z.enum(["PENDING", "APPROVED", "SUSPENDED", "REJECTED", "IDENTITY_REVIEW"]).default("PENDING") }) }), async (req, res) => {
    res.json(await listPage(req.validatedQuery, (options) => managedArtisans({ ...options, status: req.validatedQuery.status })));
});
router.get("/artisans/:id", validate({ params: byId }), async (req, res) => {
    const data = await artisanReviewDetails(req.validatedParams.id);
    res.set("Cache-Control", "private, no-store").json({ data });
});
router.post("/artisans", validate({ body: z.object({ email: z.string().trim().email().max(255), password: z.string().refine((v) => Buffer.byteLength(v, "utf8") >= 12 && Buffer.byteLength(v, "utf8") <= 72), fullName: z.string().trim().min(1).max(120), workshopName: z.string().trim().min(1).max(200), address: z.string().trim().min(1).max(255), latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }).strict() }), async (req, res) => res.status(201).json({ data: await issueArtisan(req.user.id, req.validatedBody) }));
const reviewVersion = z.number().int().nonnegative().max(2147483647);
const decision = z.discriminatedUnion("status", [
    z.object({ status: z.literal("APPROVED"), expectedVersion: reviewVersion }).strict(),
    z.object({ status: z.literal("REJECTED"), expectedVersion: reviewVersion, reason: z.string().trim().min(1).max(2000) }).strict(),
]);
router.patch("/artisans/:id/verification", validate({ params: byId, body: decision }), async (req, res) => { await reviewArtisan(req.user.id, req.validatedParams.id, req.validatedBody); res.status(204).end(); });
router.patch("/artisans/:id/suspension", validate({ params: byId, body: z.object({ isSuspended: z.boolean() }).strict() }), async (req, res) => {
    await changeArtisanSuspension(req.user.id, req.validatedParams.id, req.validatedBody.isSuspended);
    res.status(204).end();
});
export default router;
