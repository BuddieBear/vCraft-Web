import { batchImageParts } from "../data/batch-media.js";

let token = sessionStorage.getItem("vcraft-access-token");
const listeners = new Set();

export function setToken(value) {
  token = value;
  if (value) sessionStorage.setItem("vcraft-access-token", value);
  else sessionStorage.removeItem("vcraft-access-token");
  listeners.forEach(listener => listener());
}

export function onSessionChange(listener) {
  listeners.add(listener);
}

export function signedIn() {
  return Boolean(token);
}

export async function request(path, { method = "GET", body, signal, auth = false } = {}) {
  const headers = { Accept: "application/json" };
  const session = auth ? token : null;
  if (session) headers.Authorization = "Bearer " + session;
  const multipart = body instanceof FormData;
  if (body !== undefined && !multipart) headers["Content-Type"] = "application/json";
  let response;
  try {
    response = await fetch("/api" + path, {
      method, headers, signal, body: multipart ? body : JSON.stringify(body),
    });
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    throw new Error("Không kết nối được với máy chủ. Hãy thử lại.", { cause: error });
  }
  if (response.status === 204 || (method === "HEAD" && response.ok)) return {};
  const result = await response.json().catch(() => null);
  if (!response.ok || !result) {
    if (response.status === 401 && session && token === session && (!result || result.error?.code === "UNAUTHENTICATED")) setToken(null);
    const error = new Error(result?.error?.message || "Không nhận được phản hồi hợp lệ từ máy chủ.");
    error.status = response.status;
    error.code = result?.error?.code;
    error.fields = Array.isArray(result?.error?.fields) ? result.error.fields : [];
    throw error;
  }
  return result;
}

export async function requestPng(path, { auth = false } = {}) {
  const session = auth ? token : null;
  const headers = { Accept: "image/png" };
  if (session) headers.Authorization = "Bearer " + session;
  const response = await fetch("/api" + path, {
    headers, cache: auth ? "no-store" : "default", redirect: "error",
  });
  if (!response.ok || !response.headers.get("Content-Type")?.startsWith("image/png")) {
    if (response.status === 401 && session && token === session) setToken(null);
    throw new Error(response.status === 401 ? "Vui lòng đăng nhập lại để tải mã QR." : "Không tải được mã QR.");
  }
  return response.blob();
}

export function mediaUrl(path) {
  if (!path) return null;
  try {
    const url = new URL(path, location.origin);
    if (["https:", "http:"].includes(url.protocol) && !url.username && !url.password) return url.href;
  } catch { /* Invalid media URL. */ }
  return null;
}

export function setEvidenceImage(image, path) {
  if (!batchImageParts(path)) {
    const src = mediaUrl(path);
    if (!src) return false;
    image.src = src;
    image.loading = "lazy";
    return true;
  }
  const session = token;
  if (!session) return false;
  fetch(path, { headers: { Authorization: "Bearer " + session }, cache: "no-store", redirect: "error" })
    .then(response => {
      if (!response.ok || response.headers.get("Content-Type") !== "image/webp") throw new Error("Image unavailable");
      return response.blob();
    })
    .then(blob => {
      if (session !== token || !image.isConnected) return;
      const source = URL.createObjectURL(blob);
      const release = () => URL.revokeObjectURL(source);
      image.addEventListener("load", release, { once: true });
      image.addEventListener("error", release, { once: true });
      image.src = source;
    })
    .catch(() => { image.hidden = true; });
  return true;
}

export function apiUrl(path) {
  return "/api" + path;
}
