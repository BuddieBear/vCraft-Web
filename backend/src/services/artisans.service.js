import { findPublicArtisan, listPublicArtisans, findOwnWorkshop, updateOwnWorkshop, addOwnCertificate, deleteOwnCertificate } from "../repositories/artisans.repository.js";
import { ApiError } from "../middlewares/api-error.js";

export function listArtisans(options) { return listPublicArtisans(options); }
export function getArtisan(id) { return findPublicArtisan(id); }
export async function getMyWorkshop(userId) { const result = await findOwnWorkshop(userId); if (!result) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy hồ sơ xưởng."); return result; }
export async function updateMyWorkshop(userId, data) { const result = await updateOwnWorkshop(userId, data); if (!result.count) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy hồ sơ xưởng."); return getMyWorkshop(userId); }
export async function createCertificate(userId, data) { const result = await addOwnCertificate(userId, data); if (!result) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy hồ sơ xưởng."); return result; }
export async function removeCertificate(userId, id) { const result = await deleteOwnCertificate(userId, id); if (!result.count) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy chứng nhận."); }
