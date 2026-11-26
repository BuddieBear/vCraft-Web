import { hash } from "bcryptjs";
import { createArtisanAccount, listAdminArtisans, decideArtisan, setArtisanSuspension } from "../repositories/users.repository.js";
import { ApiError } from "../middlewares/api-error.js";
import { findArtisanForReview } from "../repositories/artisans.repository.js";

export async function issueArtisan(adminId, { email, username, password, fullName, ...profile }) {
    const passwordHash = await hash(password, 12);
    const normalizedUsername = typeof username === "string" && username.trim() ? username.trim().toLowerCase() : null;
    return createArtisanAccount(adminId, { email: email.toLowerCase(), username: normalizedUsername, passwordHash, fullName }, {
        ...profile, isOpenForVisitors: false, openingHours: "",
    });
}

export function pendingArtisans(options) {
    return listAdminArtisans({ ...options, status: "PENDING" });
}
export const managedArtisans = listAdminArtisans;

export async function artisanReviewDetails(id) {
    const workshop = await findArtisanForReview(id);
    if (!workshop) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy hồ sơ xưởng.");
    return workshop;
}

export async function reviewArtisan(adminId, id, status) {
    const result = await decideArtisan(adminId, id, status);
    if (!result.count) {
        throw new ApiError(409, "CONFLICT", "Hồ sơ không tồn tại hoặc đã được xử lý.");
    }
}

export async function changeArtisanSuspension(adminId, id, isSuspended) {
    const result = await setArtisanSuspension(adminId, id, isSuspended);
    if (!result.count) throw new ApiError(409, "CONFLICT", "Trạng thái xưởng đã thay đổi hoặc xưởng chưa đủ điều kiện. Vui lòng tải lại danh sách.");
}
