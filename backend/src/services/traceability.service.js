import { findPublicTimelineByBatchCode, listPublicProductBatches, createOwnedBatch, listOwnedBatches, addOwnedLog, completeOwnedBatch, editOwnedLog } from "../repositories/traceability.repository.js";
import { ApiError } from "../middlewares/api-error.js";
import { batchLandingUrl } from "../config/trace-url.js";
import { findPublicProductBySlug } from "../repositories/products.repository.js";
import { findReferenceProduct } from "../data/workshop-references.js";
import { productProduction } from "../../../frontend/src/data/product-production.js";
import { vietnamToday } from "../../../frontend/src/data/input-values.js";
import { quoteJournalPath } from "../../../frontend/src/site-paths.js";

export async function getPublicProductionProduct(slug, reference) {
    if (!productProduction({ slug }, { reference }).length) return null;
    if (!reference) return findPublicProductBySlug(slug);
    const product = findReferenceProduct(slug);
    return product && { ...product, mediaUrls: [product.image], artisan: { workshopName: product.workshopName } };
}
export function getPublicTimeline(code, options) { return findPublicTimelineByBatchCode(code, options); }
export function getProductBatches(slug) { return listPublicProductBatches(slug); }
export function getMyBatches(userId, options) { return listOwnedBatches(userId, options); }
export async function createBatch(userId, data) {
    const qrCodeUrl = batchLandingUrl(data.batchCode);
    const result = await createOwnedBatch(userId, { ...data, qrCodeUrl }, quoteId => new URL(quoteJournalPath(quoteId), qrCodeUrl).href);
    if (!result) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy sản phẩm hoặc phân công hợp lệ.");
    return result;
}

export async function createBatchLog(userId, batchId, { loggedOn, ...data }) {
    const stages = ["UOM_TO", "MAC_CUI", "DET_LUA", "NHUOM_MAU", "CAN_LANG"];
    let loggedAt;
    if (loggedOn !== undefined) {
        loggedAt = new Date(`${loggedOn}T00:00:00+07:00`);
        if (!Number.isFinite(loggedAt.valueOf()) || loggedOn < "0001-01-01" || vietnamToday(loggedAt) !== loggedOn || loggedOn > vietnamToday()) {
            throw new ApiError(400, "INVALID_LOG_DATE", "Chọn ngày công đoạn hợp lệ, tối đa đến hôm nay.");
        }
    }
    const result = await addOwnedLog(userId, batchId, { ...data, ...(loggedAt && { loggedAt }), stepOrder: stages.indexOf(data.stage) + 1 });
    if (!result) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy lô đang sản xuất.");
    return result;
}
export async function finishBatch(userId, batchId) {
    const result = await completeOwnedBatch(userId, batchId);
    if (!result) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy lô đang sản xuất.");
    return result;
}
export async function updateBatchLog(userId, batchId, logId, data) {
    const result = await editOwnedLog(userId, batchId, logId, data);
    if (!result) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy công đoạn đang sản xuất.");
    return result;
}
