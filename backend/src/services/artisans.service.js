import { findPublicArtisan, listPublicArtisans, findOwnWorkshop, updateOwnWorkshop, addOwnCertificate, deleteOwnCertificate, resubmitWorkshop } from "../repositories/artisans.repository.js";
import { ApiError } from "../middlewares/api-error.js";

export function listArtisans(options) {
    return listPublicArtisans(options);
}

export function getArtisan(id, storefront) {
    return findPublicArtisan(id, storefront);
}

export async function getMyWorkshop(userId) {
    const result = await findOwnWorkshop(userId);
    if (!result) {
        throw new ApiError(404, "NOT_FOUND", "Không tìm thấy hồ sơ xưởng.");
    }
    return result;
}

export async function updateMyWorkshop(userId, data) {
    const result = await updateOwnWorkshop(userId, data);
    if (!result) {
        throw new ApiError(404, "NOT_FOUND", "Không tìm thấy hồ sơ xưởng.");
    }
    return result;
}

export async function resubmitMyWorkshop(userId) {
    const result = await resubmitWorkshop(userId);
    if (!result.count) throw new ApiError(409, "CONFLICT", "Chỉ nộp lại hồ sơ sau khi hồ sơ bị từ chối.");
    return getMyWorkshop(userId);
}

export async function createCertificate(userId, data) {
    const result = await addOwnCertificate(userId, data);
    if (!result) {
        throw new ApiError(404, "NOT_FOUND", "Không tìm thấy hồ sơ xưởng.");
    }
    return result;
}
export async function removeCertificate(userId, id) {
    const result = await deleteOwnCertificate(userId, id);
    if (!result.count) {
        throw new ApiError(404, "NOT_FOUND", "Không tìm thấy chứng nhận.");
    }
}
