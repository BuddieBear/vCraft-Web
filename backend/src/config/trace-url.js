import { productTraceSegment } from "../../../frontend/src/site-paths.js";
import { parsePort } from "./network.js";

function landingUrl(path) {
    const base = process.env.QR_BASE_URL?.trim() || `http://127.0.0.1:${parsePort()}/trace`;
    const url = new URL(base);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
        throw new Error("QR_BASE_URL must be an HTTP(S) base URL without credentials, query or fragment");
    }
    url.pathname = `${url.pathname.replace(/\/+$/, "")}/${path}`;
    if (url.href.length > 500) throw new Error("QR landing URL is too long");
    return url.href;
}

export function batchLandingUrl(code) {
    return landingUrl(encodeURIComponent(code));
}

export function privateBatchLandingUrl(code) {
    return landingUrl("private/" + encodeURIComponent(code));
}

export function productLandingUrl(slug, reference) {
    return landingUrl("product/" + productTraceSegment(slug, reference));
}
