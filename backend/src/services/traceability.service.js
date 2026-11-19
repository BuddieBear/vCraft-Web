import { findPublicTimelineByBatchCode, listPublicProductBatches, createOwnedBatch, listOwnedBatches, addOwnedLog, completeOwnedBatch, editOwnedLog } from "../repositories/traceability.repository.js";
import { ApiError } from "../middlewares/api-error.js";
import { batchLandingUrl } from "../config/trace-url.js";
export function getPublicTimeline(code, options) { return findPublicTimelineByBatchCode(code, options); }
export function getProductBatches(slug) { return listPublicProductBatches(slug); }
export function getMyBatches(userId, options) { return listOwnedBatches(userId, options); }
export async function createBatch(userId, data) {
    const result = await createOwnedBatch(userId, { ...data, qrCodeUrl: batchLandingUrl(data.batchCode) });
    if (!result) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy sản phẩm hoặc phân công hợp lệ.");
    return result;
}

export async function createBatchLog(userId, batchId, data) {
    const stages = ["UOM_TO", "MAC_CUI", "DET_LUA", "NHUOM_MAU", "CAN_LANG"];
    const result = await addOwnedLog(userId, batchId, { ...data, stepOrder: stages.indexOf(data.stage) + 1 });
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
