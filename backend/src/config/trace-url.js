export function batchLandingUrl(code) {
  const url = new URL(process.env.QR_BASE_URL || `http://127.0.0.1:${process.env.PORT ?? 5000}/trace`);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error("QR_BASE_URL must be an HTTP(S) base URL without credentials, query or fragment");
  }
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/${encodeURIComponent(code)}`;
  if (url.href.length > 500) throw new Error("QR landing URL is too long");
  return url.href;
}
