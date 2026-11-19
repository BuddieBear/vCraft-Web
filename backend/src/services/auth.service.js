import { compare, hash } from "bcryptjs";
import { randomBytes, randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { jwtSecret } from "../config/security.js";
import { ApiError } from "../middlewares/api-error.js";
import { passwordResetDelivery } from "./password-reset-mail.js";
import { createBuyer, createAuthSession, createPasswordResetToken, consumePasswordResetToken, findActiveCredentialsByEmail, findActiveSession, findPasswordHashById, findUserById, findValidPasswordResetToken, revokeAllAuthSessions, revokeAuthSession, updatePasswordAndRevokeSessions, updateUserProfile } from "../repositories/users.repository.js";

const dummyHash = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6Ttx1g0skAUsV/2jU3BZid7jKkDmO";

function validatePassword(password) {
    if (typeof password !== "string" || Buffer.byteLength(password, "utf8") < 12 || Buffer.byteLength(password, "utf8") > 72) throw new ApiError(400, "INVALID_PASSWORD", "Mật khẩu phải từ 12 đến 72 byte UTF-8.");
}

function issueToken(user) {
    const jti = randomUUID();
    const accessToken = jwt.sign({}, jwtSecret(), { algorithm: "HS256", subject: user.id, jwtid: jti, issuer: "vcraft", audience: "vcraft-api", expiresIn: "1h" });
    return { accessToken, tokenType: "Bearer", expiresIn: 3600, jti };
}

export async function registerBuyer({ email, password, fullName }) {
    validatePassword(password);
    return createBuyer({ email: email.toLowerCase(), fullName: fullName.trim(), passwordHash: await hash(password, 12) });
}

export async function login({ email, password }) {
    const user = await findActiveCredentialsByEmail(email.toLowerCase());
    const valid = await compare(password, user?.passwordHash ?? dummyHash);
    if (!user || !valid) throw new ApiError(401, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng.");
    const issued = issueToken(user);
    const session = await createAuthSession({ userId: user.id, expectedHash: user.passwordHash, jti: issued.jti, expiresAt: new Date(Date.now() + 3600_000) });
    if (!session) throw new ApiError(401, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng.");
    const { jti, ...response } = issued;
    return response;
}

export async function authenticateSession(userId, jti) {
    if (!await findActiveSession(userId, jti)) throw new ApiError(401, "UNAUTHENTICATED", "Phiên đăng nhập đã bị thu hồi hoặc hết hạn.");
}

export async function logout(userId, jti) {
    await revokeAuthSession(userId, jti);
    return { success: true };
}

export async function changePassword(userId, currentPassword, newPassword) {
    validatePassword(newPassword);
    const record = await findPasswordHashById(userId);
    if (!record || !await compare(currentPassword, record.passwordHash)) throw new ApiError(401, "INVALID_PASSWORD", "Mật khẩu hiện tại không đúng.");
    if (currentPassword === newPassword) throw new ApiError(400, "PASSWORD_UNCHANGED", "Mật khẩu mới phải khác mật khẩu hiện tại.");
    if (!await updatePasswordAndRevokeSessions(userId, record.passwordHash, await hash(newPassword, 12))) {
        throw new ApiError(409, "PASSWORD_CHANGED", "Mật khẩu đã thay đổi. Hãy đăng nhập lại.");
    }
    return { success: true };
}

export async function requestPasswordReset(email) {
    const deliver = passwordResetDelivery();
    const user = await findActiveCredentialsByEmail(email.toLowerCase());
    if (!user) return { accepted: true };
    const token = randomBytes(32).toString("base64url");
    if (!await createPasswordResetToken(user.id, user.passwordHash, token, new Date(Date.now() + 15 * 60_000))) return { accepted: true };
    if (deliver) {
        // Keep the response independent of whether the account exists.
        try { await deliver(user.email, token); }
        catch (error) { console.error("Password recovery email delivery failed.", { code: error.code }); }
        return { accepted: true };
    }
    return { accepted: true, resetToken: token };
}

export async function resetPassword(token, newPassword) {
    validatePassword(newPassword);
    const record = await findValidPasswordResetToken(token);
    if (!record) throw new ApiError(400, "INVALID_RESET_TOKEN", "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.");
    if (!await consumePasswordResetToken(record.id, record.userId, await hash(newPassword, 12))) throw new ApiError(400, "INVALID_RESET_TOKEN", "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.");
    return { success: true };
}

export async function getProfile(userId) {
    const profile = await findUserById(userId);
    if (!profile) throw new ApiError(401, "UNAUTHENTICATED", "Tài khoản không hoạt động.");
    return profile;
}

export async function updateProfile(userId, data) {
    const allowed = {};
    if (data.fullName !== undefined) allowed.fullName = data.fullName.trim();
    if (data.phone !== undefined) allowed.phone = data.phone?.trim() || null;
    if (data.avatarUrl !== undefined) allowed.avatarUrl = data.avatarUrl?.trim() || null;
    if (allowed.fullName !== undefined && !allowed.fullName) throw new ApiError(400, "INVALID_PROFILE", "Họ tên không được để trống.");
    if (!Object.keys(allowed).length) throw new ApiError(400, "INVALID_PROFILE", "Không có thông tin hồ sơ để cập nhật.");
    return updateUserProfile(userId, allowed);
}

export async function revokeAllSessions(userId) {
    await revokeAllAuthSessions(userId);
    return { success: true };
}
