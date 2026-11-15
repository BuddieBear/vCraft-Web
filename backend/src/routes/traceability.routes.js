import { Router } from "express";
import { z } from "zod";
import { validate } from "../middlewares/validate-request.js";
import { ApiError } from "../middlewares/api-error.js";
import QRCode from "qrcode";
import { getPublicTimeline, getProductBatches, getMyBatches, createBatch, createBatchLog, updateBatchLog, finishBatch } from "../services/traceability.service.js";
import { batchLandingUrl } from "../config/trace-url.js";
import { authenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";
import { byId, uuid, urls, pageArgs, pageQuery } from "./schemas.js";
const router = Router();
const own = [authenticate, authorize("ARTISAN")];
const codeParams = z.object({ code: z.string().trim().min(1).max(50) });
async function timeline(req, res) {
  const batch = await getPublicTimeline(req.validatedParams.code);
  if (!batch) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy lô sản phẩm.");
  res.json({ data: batch });
}
router.get("/mine", ...own, validate({ query: pageQuery }), async (req, res) => res.json({ data: await getMyBatches(req.user.id, pageArgs(req.validatedQuery)) }));
router.get("/products/:slug", validate({ params: z.object({ slug: z.string().min(1).max(280) }) }), async (req, res) => res.json({ data: await getProductBatches(req.validatedParams.slug) }));
router.post("/batches", ...own, validate({ body: z.object({ productId: uuid, orderAssignmentId: uuid.nullable().optional(), batchCode: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_-]+$/).refine((value) => value.toLowerCase() !== "mine"), totalQuantity: z.number().int().positive().max(2147483647) }).strict() }), async (req, res) => res.status(201).json({ data: await createBatch(req.user.id, req.validatedBody) }));
router.post("/batches/:id/logs", ...own, validate({ params: byId, body: z.object({ stage: z.enum(["UOM_TO", "MAC_CUI", "DET_LUA", "NHUOM_MAU", "CAN_LANG"]), stageTitle: z.string().trim().min(1).max(150), description: z.string().trim().min(1).max(10000), evidenceImageUrls: urls.optional() }).strict() }), async (req, res) => res.status(201).json({ data: await createBatchLog(req.user.id, req.validatedParams.id, req.validatedBody) }));
router.put("/batches/:id/logs/:logId", ...own, validate({ params: z.object({ id: uuid, logId: uuid }), body: z.object({ stageTitle: z.string().trim().min(1).max(150), description: z.string().trim().min(1).max(10000), evidenceImageUrls: urls }).strict() }), async (req, res) => res.json({ data: await updateBatchLog(req.user.id, req.validatedParams.id, req.validatedParams.logId, req.validatedBody) }));
router.post("/batches/:id/complete", ...own, validate({ params: byId }), async (req, res) => res.json({ data: await finishBatch(req.user.id, req.validatedParams.id) }));
router.get("/:code/qr", validate({ params: codeParams }), async (req, res) => { if (!await getPublicTimeline(req.validatedParams.code)) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy lô sản phẩm."); res.type("png").send(await QRCode.toBuffer(batchLandingUrl(req.validatedParams.code), { type: "png", width: 320, margin: 2 })); });
router.get("/by-code/:code", validate({ params: codeParams }), timeline);
router.get("/:code", validate({ params: codeParams }), timeline);
export default router;
