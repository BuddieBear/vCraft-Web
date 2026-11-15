import { compare, hash } from "bcryptjs";
import jwt from "jsonwebtoken";
import { jwtSecret } from "../config/security.js";
import { ApiError } from "../middlewares/api-error.js";
import { createBuyer, findActiveCredentialsByEmail } from "../repositories/users.repository.js";

const dummyHash = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6Ttx1g0skAUsV/2jU3BZid7jKkDmO";
export async function registerBuyer({ email, password, fullName }) {
  const passwordHash = await hash(password, 12);
  return createBuyer({ email: email.toLowerCase(), fullName: fullName.trim(), passwordHash });
}
export async function login({ email, password }) {
  const secret = jwtSecret();
  const user = await findActiveCredentialsByEmail(email.toLowerCase());
  const valid = await compare(password, user?.passwordHash ?? dummyHash);
  if (!user || !valid) throw new ApiError(401, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng.");
  return { accessToken: jwt.sign({}, secret, { algorithm: "HS256", subject: user.id, issuer: "vcraft", audience: "vcraft-api", expiresIn: "1h" }), tokenType: "Bearer", expiresIn: 3600 };
}
