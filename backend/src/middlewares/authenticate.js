import jwt from "jsonwebtoken";
import { ApiError } from "./api-error.js";
import { jwtSecret } from "../config/security.js";
import { findActiveUserById } from "../repositories/users.repository.js";
import { authenticateSession } from "../services/auth.service.js";
export async function authenticate(request, response, next) {
    response.set("Cache-Control", "no-store");
    const match = /^Bearer ([^\s]+)$/.exec(request.get("Authorization") ?? "");
    if (!match) throw new ApiError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.");
    let payload;
    try { payload = jwt.verify(match[1], jwtSecret(), { algorithms: ["HS256"], issuer: "vcraft", audience: "vcraft-api", maxAge: "1h" }); } catch { throw new ApiError(401, "UNAUTHENTICATED", "Phiên đăng nhập không hợp lệ hoặc đã hết hạn."); }
    if (typeof payload !== "object" || typeof payload.sub !== "string" || typeof payload.jti !== "string") throw new ApiError(401, "UNAUTHENTICATED", "Phiên đăng nhập không hợp lệ.");
    const user = await findActiveUserById(payload.sub);
    if (!user) throw new ApiError(401, "UNAUTHENTICATED", "Tài khoản không hoạt động.");
    await authenticateSession(user.id, payload.jti);
    request.user = { id: user.id, role: user.role, jti: payload.jti };
    next();
}
