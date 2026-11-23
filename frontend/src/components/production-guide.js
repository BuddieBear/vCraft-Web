import { productProduction } from "../data/product-production.js";
import { icon } from "./ui.js";
import { productTraceSegment } from "../site-paths.js";
import { usesDefaultProductionSteps } from "../data/production-steps.js";

export const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

export function renderProductionGuide(product, { reference = false, cover, heading = "h2", headingId = "production-guide-title", showQr = false } = {}) {
  const configured = !reference && !usesDefaultProductionSteps(product.productionSteps);
  const steps = configured ? [] : productProduction(product, { reference, cover });
  const esc = escapeHtml;
  const segment = productTraceSegment(product.slug, reference);
  return `
    <section class="production-guide" aria-labelledby="${esc(headingId)}">
      <${heading} id="${esc(headingId)}">Sản phẩm được làm thế nào?</${heading}>
      ${configured ? `
        <p class="production-note">Thứ tự công đoạn do xưởng thiết lập. Nhật ký của từng lô có ngày, ghi chú và ảnh quá trình thực tế.</p>
        <ol class="production-planned">${product.productionSteps.map(title => `<li>${esc(title)}</li>`).join("")}</ol>
      ` : steps.length ? `
        <p class="production-note">${reference
          ? "Quy trình tham khảo dựa trên loại sản phẩm và thông tin công khai của cơ sở."
          : "Hướng dẫn theo mẫu sản phẩm. Xem nhật ký lô để đối chiếu các bước xưởng đã ghi."}</p>
        <ol class="production-steps" role="list">
          ${steps.map(({ title, description, image }, index) => `<li>
            <details${index === 0 ? " open" : ""}>
              <summary><span class="production-step-number" aria-hidden="true">${index + 1}</span><strong>${esc(title)}</strong><span class="production-toggle">${icon("plus")}${icon("minus")}</span></summary>
              <div class="production-step-body">
                <p>${esc(description)}</p>
                ${image ? `<figure><img loading="lazy" decoding="async" referrerpolicy="no-referrer" src="${esc(image.src)}" alt="${esc(image.alt)}"><figcaption>${esc(image.caption)}</figcaption></figure>` : ""}
              </div>
            </details></li>`).join("")}
        </ol>
      ` : "<p class='production-note'>Chưa có hướng dẫn riêng cho mẫu sản phẩm này.</p>"}
      ${showQr && (!reference || steps.length) ? `<div class="production-links">
          <a class="text-link" href="/trace/product/${esc(segment)}">Mở trang quy trình ${icon("arrow")}</a>
          <details class="production-qr">
            <summary>Mã QR quy trình</summary>
            <img width="160" height="160" loading="lazy" src="/api/traceability/product-guide/${esc(segment)}/qr" alt="Mã QR mở quy trình của ${esc(product.name)}">
          </details>
        </div>` : ""}
    </section>`;
}
