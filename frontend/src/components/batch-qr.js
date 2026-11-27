import { requestPng } from "../api/http.js";

export function batchQr(code, { initiallyOpen = false, private: privateQr = false, label } = {}) {
  const details = document.createElement("details");
  details.className = "batch-qr";
  details.innerHTML = `<summary>Xem mã QR</summary>
    <img width="180" height="180" alt="" hidden>
    <div class="batch-actions">
      <button class="button button-outline" type="button" disabled>Tải PNG</button>
    </div>
    <p class="batch-feedback" role="status"></p>`;
  const image = details.querySelector("img");
  const button = details.querySelector("button");
  const status = details.querySelector("[role=status]");
  details.querySelector("summary").textContent = label || "Xem mã QR";
  const path = privateQr
    ? `/traceability/private/${encodeURIComponent(code)}/qr`
    : `/traceability/${encodeURIComponent(code)}/qr`;
  image.alt = `Mã QR truy xuất lô ${code}`;
  let previewUrl;
  let loading = false;

  details.addEventListener("toggle", () => {
    if (!details.open) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = undefined;
      image.removeAttribute("src");
      image.hidden = true;
      button.disabled = true;
      return;
    }
    if (loading || image.hasAttribute("src")) return;
    status.textContent = "Đang tải mã QR…";
    loading = true;
    requestPng(path, { auth: privateQr }).then(blob => {
      if (details.open) {
        previewUrl = URL.createObjectURL(blob);
        image.src = previewUrl;
      }
    }).catch(() => {
      status.textContent = "Chưa tải được mã QR. Đóng rồi mở lại để thử lại.";
    }).finally(() => { loading = false; });
  });
  image.addEventListener("load", () => {
    image.hidden = false;
    status.textContent = "";
    button.disabled = false;
  });
  image.addEventListener("error", () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = undefined;
    image.removeAttribute("src");
    image.hidden = true;
    button.disabled = true;
    status.textContent = "Chưa tải được mã QR. Đóng rồi mở lại để thử lại.";
  });
  button.addEventListener("click", async () => {
    button.disabled = true;
    status.textContent = "";
    try {
      const url = URL.createObjectURL(await requestPng(path, { auth: privateQr }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `vcraft-${code}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      status.textContent = "Không tải được tệp PNG. Hãy thử lại.";
    } finally {
      button.disabled = !image.hasAttribute("src");
    }
  });
  details.open = initiallyOpen;
  return details;
}
