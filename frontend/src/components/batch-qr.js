import { apiUrl } from "../api/http.js";

export function batchQr(code, { initiallyOpen = false } = {}) {
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
  const src = apiUrl(`/traceability/${encodeURIComponent(code)}/qr`);
  image.alt = `Mã QR truy xuất lô ${code}`;

  details.addEventListener("toggle", () => {
    if (!details.open || image.hasAttribute("src")) return;
    status.textContent = "Đang tải mã QR…";
    image.src = src;
  });
  image.addEventListener("load", () => {
    image.hidden = false;
    status.textContent = "";
    button.disabled = false;
  });
  image.addEventListener("error", () => {
    image.removeAttribute("src");
    image.hidden = true;
    button.disabled = true;
    status.textContent = "Chưa tải được mã QR. Đóng rồi mở lại để thử lại.";
  });
  button.addEventListener("click", async () => {
    button.disabled = true;
    status.textContent = "";
    try {
      const response = await fetch(src);
      if (!response.ok || !response.headers.get("Content-Type")?.startsWith("image/png")) throw new Error();
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `vcraft-${code}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      status.textContent = "Không tải được tệp PNG. Hãy thử lại.";
    } finally {
      button.disabled = false;
    }
  });
  details.open = initiallyOpen;
  return details;
}
