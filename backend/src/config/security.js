export function jwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret || Buffer.byteLength(secret, "utf8") < 32 || secret.includes("CHANGE_ME") || secret === "vcraft_super_secret_jwt_key_2026_vanphuc_silk") throw new Error("JWT_SECRET must be a random secret of at least 32 bytes");
    return secret;
}
