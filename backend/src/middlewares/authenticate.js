import jwt from "jsonwebtoken";
import { prisma } from "../database/prisma.js";
import { ApiError } from "./api-error.js";
import { jwtSecret } from "../config/security.js";

export async function authenticate(request, response, next) {
  response.set("Cache-Control", "no-store");
  const match = /^Bearer ([^\s]+)$/.exec(request.get("Authorization") ?? "");
  if (!match) throw new ApiError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.");
  const secret = jwtSecret();
  let payload;
  try { payload = jwt.verify(match[1], secret, { algorithms: ["HS256"], issuer: "vcraft", audience: "vcraft-api", maxAge: "1h" }); }
  catch { throw new ApiError(401, "UNAUTHENTICATED", "Phiên đăng nhập không hợp lệ hoặc đã hết hạn."); }
  if (typeof payload !== "object" || typeof payload.sub !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.sub) || !Number.isInteger(payload.exp)) throw new ApiError(401, "UNAUTHENTICATED", "Phiên đăng nhập không hợp lệ.");
  const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, role: true, isActive: true } });
  if (!user?.isActive) throw new ApiError(401, "UNAUTHENTICATED", "Tài khoản không hoạt động.");
  request.user = { id: user.id, role: user.role };
  next();
}
