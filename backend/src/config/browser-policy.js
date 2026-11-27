const policy = [
    "default-src 'none'",
    "base-uri 'none'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "style-src-attr 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data: blob: https: http:",
    "connect-src 'self' https://tiles.openfreemap.org",
    "worker-src 'self' blob:",
].join("; ");

export function browserDocumentPolicy(request, response, next) {
    if (!/^\/trace(?:\/|$)/i.test(request.path) || /^\/trace\/private(?:\/|$)/i.test(request.path)) {
        const name = process.env.SITE_CSP_REPORT_ONLY === "true"
            ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy";
        response.set(name, policy);
    }
    next();
}
