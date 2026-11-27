import { Router } from "express";
import { z } from "zod";
import { validate } from "../middlewares/validate-request.js";
import { ApiError } from "../middlewares/api-error.js";
import QRCode from "qrcode";
import { findBuyerTimelineByBatchCode, findPrivateTimelineByBatchCode, listRecentPublicBatches } from "../repositories/traceability.repository.js";
import { getPublicTimeline, getPublicProductionProduct, getProductBatches, getMyBatches, createBatch, createBatchLog, updateBatchLog, finishBatch, cancelBatch } from "../services/traceability.service.js";
import { batchLandingUrl, privateBatchLandingUrl, productLandingUrl } from "../config/trace-url.js";
import { authenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";
import { byId, uuid, mediaUrl, listPage, pageQuery } from "./schemas.js";
import { batchImageParts } from "../../../frontend/src/data/batch-media.js";
import { timeline } from "../controllers/traceability.controller.js";
import { defaultStageCodes, maxProductionSteps } from "../../../frontend/src/data/production-steps.js";
const router = Router();
const own = [authenticate, authorize("ARTISAN")];
const codeParams = z.object({ code: z.string().trim().min(1).max(50) });
const productParams = z.object({ slug: z.string().min(1).max(280) });
function productQr(reference) {
    return async (req, res) => {
        const { slug } = req.validatedParams;
        if (!await getPublicProductionProduct(slug, reference)) {
            throw new ApiError(404, "NOT_FOUND", "Không tìm thấy hướng dẫn sản xuất.");
        }
        res.type("png").send(await QRCode.toBuffer(productLandingUrl(slug, reference), { type: "png", width: 320, margin: 4 }));
    };
}
router.get("/mine", ...own, validate({ query: pageQuery.extend({ assignmentId: uuid.optional(), productId: uuid.optional() }) }), async (req, res) => {
    const query = req.validatedQuery;
    res.json(await listPage(query, (options) => getMyBatches(req.user.id, { ...options, assignmentId: query.assignmentId, productId: query.productId })));
});
router.get("/public/recent", async (_req, res) => res.json({ data: await listRecentPublicBatches() }));
router.get("/purchased/:code", authenticate, authorize("BUYER"), validate({ params: codeParams }), async (req, res) => {
    const batch = await findBuyerTimelineByBatchCode(req.validatedParams.code, req.user.id);
    if (!batch) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy lô trong đơn của bạn.");
    res.set("Cache-Control", "private, no-store").json({ data: batch });
});
router.get("/private/:code/qr", authenticate, authorize("BUYER", "ARTISAN"), validate({ params: codeParams }), async (req, res) => {
    if (!await findPrivateTimelineByBatchCode(req.validatedParams.code, req.user)) {
        throw new ApiError(404, "NOT_FOUND", "Không tìm thấy nhật ký lô được phép xem.");
    }
    res.set("Cache-Control", "private, no-store").type("png").send(await QRCode.toBuffer(privateBatchLandingUrl(req.validatedParams.code), { type: "png", width: 320, margin: 2 }));
});
router.get("/private/:code/timeline", authenticate, authorize("BUYER", "ARTISAN"), validate({ params: codeParams }), async (req, res) => {
    const batch = await findPrivateTimelineByBatchCode(req.validatedParams.code, req.user);
    if (!batch) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy nhật ký lô được phép xem.");
    res.set("Cache-Control", "private, no-store").json({ data: batch });
});
router.get("/products/:slug", validate({ params: productParams }), async (req, res) => res.json({ data: await getProductBatches(req.validatedParams.slug) }));
router.get("/product-guide/reference/:slug/qr", validate({ params: productParams }), productQr(true));
router.get("/product-guide/:slug/qr", validate({ params: productParams }), productQr(false));
router.post("/batches", ...own, validate({ body: z.object({ productId: uuid, orderAssignmentId: uuid.nullable().optional(), batchCode: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_-]+$/).refine((value) => value.toLowerCase() !== "mine"), totalQuantity: z.number().int().positive().max(2147483647) }).strict() }), async (req, res) => res.status(201).json({ data: await createBatch(req.user.id, req.validatedBody) }));
const evidenceUrls = z.array(z.union([mediaUrl, z.string().max(500).refine(url => Boolean(batchImageParts(url)))])).max(20);
const logContent = z.object({
    stageTitle: z.string().trim().min(1).max(150),
    description: z.string().trim().min(1).max(10000),
    loggedOn: z.iso.date().optional(),
    evidenceImageUrls: evidenceUrls,
}).strict();
const newLog = logContent.extend({
    stage: z.enum(defaultStageCodes).optional(),
    stepOrder: z.number().int().min(1).max(maxProductionSteps).optional(),
    evidenceImageUrls: evidenceUrls.optional(),
}).refine(log => log.stepOrder !== undefined || log.stage !== undefined, { path: ["stepOrder"], message: "Chọn công đoạn." });
router.post("/batches/:id/logs", ...own, validate({ params: byId, body: newLog }), async (req, res) => res.status(201).json({ data: await createBatchLog(req.user.id, req.validatedParams.id, req.validatedBody) }));
router.put("/batches/:id/logs/:logId", ...own, validate({ params: z.object({ id: uuid, logId: uuid }), body: logContent }), async (req, res) => res.json({ data: await updateBatchLog(req.user.id, req.validatedParams.id, req.validatedParams.logId, req.validatedBody) }));
router.post("/batches/:id/complete", ...own, validate({ params: byId }), async (req, res) => res.json({ data: await finishBatch(req.user.id, req.validatedParams.id) }));
router.post("/batches/:id/cancel", ...own, validate({ params: byId }), async (req, res) => res.json({ data: await cancelBatch(req.user.id, req.validatedParams.id) }));
router.get("/:code/qr", validate({ params: codeParams }), async (req, res) => { if (!await getPublicTimeline(req.validatedParams.code)) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy lô sản phẩm."); res.type("png").send(await QRCode.toBuffer(batchLandingUrl(req.validatedParams.code), { type: "png", width: 320, margin: 2 })); });
router.get("/by-code/:code", validate({ params: codeParams }), timeline);
router.get("/:code", validate({ params: codeParams }), timeline);
export default router;
