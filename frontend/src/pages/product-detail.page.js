import { asset, formatPrice, icon } from "../components/ui.js";
import { artisans } from "../data/demo-data.js";

export function showProduct(dialog, product, addToCart, showBatch) {
  const workshop = artisans.find(artisan => artisan.id === product.artisanId);
  dialog.innerHTML = `
    <button class="icon-button dialog-close" type="button" data-close aria-label="Đóng chi tiết">${icon("close")}</button>
    <div class="detail-grid">
      <img class="detail-image" src="${asset(product.image)}" alt="${product.alt}" width="414" height="414">
      <div class="detail-copy">
        <p class="eyebrow">${product.category} · ${workshop.name}</p>
        <h2 id="detail-title">${product.name}</h2>
        <p class="detail-price">${formatPrice(product.price, product.unit)}</p>
        <p>${product.description}</p>
        <dl class="detail-specs">
          <div><dt>Chất liệu</dt><dd>${product.material}</dd></div>
          <div><dt>Kích thước</dt><dd>${product.size}</dd></div>
        </dl>
        ${product.price === null
          ? `<a href="#xuong-${workshop.id}" class="button button-primary" data-close>Xem hồ sơ xưởng ${icon("arrow")}</a>`
          : `<button class="button button-primary" type="button" data-add>${icon("bag")} Thêm vào giỏ</button>
             <p class="detail-status" role="status"></p>`}
        ${product.batch ? `<a class="text-link" href="#trien-lam" data-close>Xem nhật ký lô ${product.batch} ${icon("upRight")}</a>` : ""}
      </div>
    </div>`;
  dialog.querySelectorAll("[data-close]").forEach(control => control.addEventListener("click", () => dialog.close()));
  dialog.querySelector('a[href="#trien-lam"]')?.addEventListener("click", () => showBatch(product.batch));
  dialog.querySelector("[data-add]")?.addEventListener("click", () => {
    const added = addToCart(product);
    dialog.querySelector(".detail-status").textContent = added
      ? "Đã thêm sản phẩm vào giỏ mẫu."
      : "Số lượng sản phẩm trong giỏ đã đạt giới hạn.";
  });
  dialog.showModal();
}
