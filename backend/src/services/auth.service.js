import { compare, hash } from "bcryptjs";
import { randomBytes, randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { jwtSecret } from "../config/security.js";
import { ApiError } from "../middlewares/api-error.js";
import { passwordResetDelivery } from "./password-reset-mail.js";
import { recipientPhoneError, validRecipientPhone } from "../../../frontend/src/data/input-values.js";
import { createBuyer, createAuthSession, createPasswordResetToken, consumePasswordResetToken, findActiveCredentialsByIdentifier, findActiveSession, findPasswordHashById, findUserById, findValidPasswordResetToken, revokeAllAuthSessions, revokeAuthSession, updatePasswordAndRevokeSessions, updateUserProfile } from "../repositories/users.repository.js";

const dummyHash = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6Ttx1g0skAUsV/2jU3BZid7jKkDmO";
const usernamePattern = /^[a-z0-9._-]{3,50}$/;
const usernameAlnum = /[a-z0-9]/;

export function validatePassword(password) {
    if (typeof password !== "string" || Buffer.byteLength(password, "utf8") < 12 || Buffer.byteLength(password, "utf8") > 72) throw new ApiError(400, "INVALID_PASSWORD", "Mật khẩu phải từ 12 đến 72 byte UTF-8.");
}

export function normalizeUsername(username) {
    if (username === undefined || username === null || username === "") return null;
    if (typeof username !== "string") throw new ApiError(400, "INVALID_USERNAME", "Tên đăng nhập không hợp lệ.");
    const trimmed = username.trim().toLowerCase();
    if (!trimmed) return null;
    if (!usernamePattern.test(trimmed) || !usernameAlnum.test(trimmed)) throw new ApiError(400, "INVALID_USERNAME", "Tên đăng nhập gồm 3–50 ký tự không dấu (chữ, số, ., _, -) và có ít nhất một chữ cái hoặc chữ số.");
    return trimmed;
}

function issueToken(user) {
    const jti = randomUUID();
    const accessToken = jwt.sign({}, jwtSecret(), { algorithm: "HS256", subject: user.id, jwtid: jti, issuer: "vcraft", audience: "vcraft-api", expiresIn: "1h" });
    return { accessToken, tokenType: "Bearer", expiresIn: 3600, jti };
}

export async function registerBuyer({ email, username, password, fullName }) {
    validatePassword(password);
    return createBuyer({ email: email.toLowerCase(), username: normalizeUsername(username), fullName: fullName.trim(), passwordHash: await hash(password, 12) });
}

export async function login({ identifier, email, username, password }) {
    const lookup = (identifier ?? username ?? email ?? "").trim();
    if (!lookup) throw new ApiError(400, "INVALID_CREDENTIALS", "Nhập email hoặc tên đăng nhập.");
    const user = await findActiveCredentialsByIdentifier(lookup);
    const valid = await compare(password, user?.passwordHash ?? dummyHash);
    if (!user || !valid) throw new ApiError(401, "INVALID_CREDENTIALS", "Email/tên đăng nhập hoặc mật khẩu không đúng.");
    const issued = issueToken(user);
    const session = await createAuthSession({ userId: user.id, expectedHash: user.passwordHash, jti: issued.jti, expiresAt: new Date(Date.now() + 3600_000) });
    if (!session) throw new ApiError(401, "INVALID_CREDENTIALS", "Email/tên đăng nhập hoặc mật khẩu không đúng.");
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

export async function requestPasswordReset(identifier) {
    const deliver = passwordResetDelivery();
    const user = await findActiveCredentialsByIdentifier(identifier);
    if (!user) return { accepted: true };
    const token = randomBytes(32).toString("base64url");
    if (!await createPasswordResetToken(user.id, user.passwordHash, token, new Date(Date.now() + 15 * 60_000))) return { accepted: true };
    if (deliver) {
        // Keep the response independent of whether the account exists.
        try { await deliver(user.email, token); }
        catch (error) { console.error("Password recovery email delivery failed.", { code: error.code }); }
        return { accepted: true };
    }
    if (process.env.NODE_ENV === "test") {
        return { accepted: true, resetToken: token };
    }
    if (process.env.NODE_ENV === "development") {
        console.info(`Password reset link for ${user.email}: /dang-nhap#reset=${token}`);
    }
    return { accepted: true };
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
    if (data.username !== undefined) allowed.username = normalizeUsername(data.username);
    if (data.phone !== undefined) {
        if (data.phone !== null && typeof data.phone !== "string") throw new ApiError(400, "INVALID_PHONE", recipientPhoneError);
        const phone = data.phone?.trim() || null;
        if (phone && !validRecipientPhone(phone)) throw new ApiError(400, "INVALID_PHONE", recipientPhoneError);
        allowed.phone = phone;
    }
    if (data.avatarUrl !== undefined) allowed.avatarUrl = data.avatarUrl?.trim() || null;
    if (allowed.fullName !== undefined && !allowed.fullName) throw new ApiError(400, "INVALID_PROFILE", "Họ tên không được để trống.");
    if (!Object.keys(allowed).length) throw new ApiError(400, "INVALID_PROFILE", "Không có thông tin hồ sơ để cập nhật.");
    return updateUserProfile(userId, allowed);
}

export async function revokeAllSessions(userId) {
    await revokeAllAuthSessions(userId);
    return { success: true };
}
