import { fileURLToPath } from "node:url";

export const frontendDirectory = fileURLToPath(new URL("../../../frontend/", import.meta.url));

// /trace/* skips the site CSP (see browser-policy.js), so trace pages and their 404 set this one.
export const traceSecurityHeaders = {
    "Content-Security-Policy": "default-src 'none'; style-src 'self'; font-src 'self'; img-src 'self' https: http:; base-uri 'none'; frame-ancestors 'none'",
    "X-Content-Type-Options": "nosniff",
};

export const sendNotFound = (response, headers = {}) => response.status(404).set(headers).sendFile("404.html", { root: frontendDirectory });
