import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { authenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";
import { privateBatchDirectory, saveImages, uploadDirectory } from "../services/media.service.js";
import { ApiError } from "../middlewares/api-error.js";
import { findPrivateImageBatch } from "../repositories/traceability.repository.js";
import { validate } from "../middlewares/validate-request.js";
import { uuid } from "./schemas.js";
import { imageFilename } from "../../../frontend/src/data/batch-media.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { files: 4, fileSize: 5 * 1024 * 1024, fields: 0, parts: 4 } });
const receiveImages = upload.array("images", 4);
const missing = () => new ApiError(404, "NOT_FOUND", "Không tìm thấy ảnh.");
router.post("/images", authenticate, authorize("ARTISAN", "ADMIN"), validate({ query: z.object({ batchId: uuid.optional() }).strict() }), async (req, _res, next) => {
    const { batchId } = req.validatedQuery;
    if (batchId && (req.user.role !== "ARTISAN" || !await findPrivateImageBatch(req.user, batchId))) throw missing();
    next();
}, (req, res, next) => {
    receiveImages(req, res, (error) => next(error && !(error instanceof multer.MulterError)
        ? new ApiError(400, "INVALID_UPLOAD", "Yêu cầu tải ảnh không hợp lệ.")
        : error));
}, async (req, res) => res.status(201).json({ data: { urls: await saveImages(req.files, req.validatedQuery.batchId) } }));

const imageParams = z.object({ id: uuid, filename: z.string().regex(imageFilename) });
function serveBatchImage(legacy) {
    return async (req, res, next) => {
        const { id, filename } = req.validatedParams;
        res.set("Cache-Control", "private, no-store");
        if (!await findPrivateImageBatch(req.user, id, { filename, legacy })) throw missing();
        res.sendFile(filename, { root: legacy ? uploadDirectory : privateBatchDirectory(id), cacheControl: false, lastModified: false, acceptRanges: false, dotfiles: "deny" }, error => {
            if (error) next(error.status === 404 ? missing() : error);
        });
    };
}
router.get("/batches/:id/legacy/:filename", authenticate, authorize("ARTISAN", "BUYER"), validate({ params: imageParams }), serveBatchImage(true));
router.get("/batches/:id/:filename", authenticate, authorize("ARTISAN", "BUYER"), validate({ params: imageParams }), serveBatchImage(false));
export default router;
