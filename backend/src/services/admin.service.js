import { hash } from "bcryptjs";
import { createArtisanAccount, listPendingArtisans, decideArtisan } from "../repositories/users.repository.js";
import { ApiError } from "../middlewares/api-error.js";

export async function issueArtisan(adminId, { email, password, fullName, ...profile }) {
  const passwordHash = await hash(password, 12);
  return createArtisanAccount(adminId, { email: email.toLowerCase(), passwordHash, fullName }, profile);
}
export function pendingArtisans(options) { return listPendingArtisans(options); }
export async function reviewArtisan(adminId, id, status) {
  const result = await decideArtisan(adminId, id, status);
  if (!result.count) throw new ApiError(409, "CONFLICT", "Hồ sơ không tồn tại hoặc đã được xử lý.");
}
