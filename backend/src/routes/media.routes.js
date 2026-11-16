import { Router } from "express";
import multer from "multer";
import { authenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";
import { saveImages } from "../services/media.service.js";
import { ApiError } from "../middlewares/api-error.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { files: 4, fileSize: 5 * 1024 * 1024, fields: 0, parts: 4 } });
const receiveImages = upload.array("images", 4);
router.post("/images", authenticate, authorize("ARTISAN", "ADMIN"), (req, res, next) => {
    receiveImages(req, res, (error) => next(error && !(error instanceof multer.MulterError)
        ? new ApiError(400, "INVALID_UPLOAD", "Yêu cầu tải ảnh không hợp lệ.")
        : error));
}, async (req, res) => res.status(201).json({ data: { urls: await saveImages(req.files) } }));
export default router;
