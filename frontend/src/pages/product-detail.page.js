import { formatPrice, icon, saleUnits } from "../components/ui.js";
import { mediaUrl, request } from "../api/http.js";
import { sitePaths } from "../site-paths.js";

let current;

export async function showProduct(dialog, summary, addToCart) {
  current?.abort();
  const controller = current = new AbortController();
  const { signal } = controller;
  dialog.innerHTML = `
    <button class="icon-button dialog-close" type="button" aria-label="Đóng chi tiết" autofocus>${icon("close")}</button>
    <div class="detail-grid">
      <div class="detail-visual"><img class="detail-image" width="414" height="414" alt="" referrerpolicy="no-referrer"></div>
      <div class="detail-copy">
        <header class="detail-heading">
          <p class="eyebrow"></p><h2 id="detail-title"></h2><p class="detail-price"></p>
        </header>
        <p class="product-description"></p>
        <dl class="detail-specs" hidden><div><dt>Chất liệu</dt><dd></dd></div></dl>
        <section class="detail-story" hidden><h3>Câu chuyện sản phẩm</h3><p></p></section>
        <div class="detail-actions"></div>
        <p class="detail-status" role="status">Đang tải chi tiết sản phẩm…</p>
        <div class="detail-batches" aria-live="polite"></div>
      </div>
    </div>`;

  const image = dialog.querySelector("img");
  const grid = dialog.querySelector(".detail-grid");
  const workshopName = dialog.querySelector(".eyebrow");
  const title = dialog.querySelector("h2");
  const price = dialog.querySelector(".detail-price");
  function showIdentity(product) {
    const src = product.mediaUrls.map(mediaUrl).find(Boolean);
    if (src) image.src = src;
    else image.removeAttribute("src");
    image.parentElement.hidden = !src;
    grid.classList.toggle("detail-no-image", !src);
    image.alt = product.name;
    workshopName.textContent = product.artisan.workshopName;
    title.textContent = product.name;
    price.textContent = formatPrice(product.price, saleUnits[product.saleUnit]);
  }
  showIdentity(summary);
  const status = dialog.querySelector("[role=status]");
  dialog.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => controller.abort(), { once: true, signal });
  if (!dialog.open) dialog.showModal();

  const slug = encodeURIComponent(summary.slug);
  try {
    const { data: product } = await request("/products/by-slug/" + slug, { signal });
    if (signal.aborted) return;
    showIdentity(product);
    status.textContent = "";
    dialog.querySelector(".product-description").textContent = product.description;
    if (product.culturalStory && product.culturalStory !== product.description) {
      const story = dialog.querySelector(".detail-story");
      story.querySelector("p").textContent = product.culturalStory;
      story.hidden = false;
    }
    if (product.rawMaterial) {
      const specs = dialog.querySelector(".detail-specs");
      specs.querySelector("dd").textContent = product.rawMaterial;
      specs.hidden = false;
    }
    const actions = dialog.querySelector(".detail-actions");
    if (product.price === null) {
      const workshop = document.createElement("a");
      workshop.className = "button button-primary";
      workshop.href = sitePaths.artisans + "?" + new URLSearchParams({ xuong: product.artisan.id });
      workshop.textContent = "Xem hồ sơ xưởng";
      workshop.addEventListener("click", () => dialog.close());
      actions.append(workshop);
    } else {
      const add = document.createElement("button");
      add.type = "button";
      add.className = "button button-primary";
      add.append(product.stockQuantity ? "Thêm vào giỏ" : "Hết hàng");
      if (product.stockQuantity) add.insertAdjacentHTML("afterbegin", icon("bag"));
      add.disabled = !product.stockQuantity;
      add.addEventListener("click", async () => {
        add.disabled = true;
        try {
          if (await addToCart(product)) status.textContent = "Đã thêm sản phẩm vào giỏ.";
        } catch (error) {
          status.textContent = error.message;
        } finally {
          add.disabled = false;
        }
      });
      actions.append(add);
    }
  } catch (error) {
    if (!signal.aborted) status.textContent = error.message;
    return;
  }

  const target = dialog.querySelector(".detail-batches");
  async function loadBatches() {
    target.textContent = "Đang tải lô sản xuất…";
    try {
      const { data } = await request("/traceability/products/" + slug, { signal });
      if (signal.aborted) return;
      if (!data.length) {
        target.textContent = "Sản phẩm chưa có lô công khai.";
        return;
      }
      const select = document.createElement("select");
      const label = document.createElement("label");
      label.className = "batch-field";
      label.append("Lô sản xuất", select);
      for (const { batchCode } of data) select.add(new Option(batchCode));
      const links = document.createElement("div");
      links.className = "detail-batch-links";
      links.innerHTML = `<a class="text-link">Xem nhật ký lô ${icon("arrow")}</a><a class="text-link">Mở mã QR</a>`;
      const [log, qr] = links.querySelectorAll("a");
      const updateLinks = () => {
        log.href = "/trace/" + encodeURIComponent(select.value);
        qr.href = sitePaths.journal + "?" + new URLSearchParams({ lo: select.value });
      };
      select.addEventListener("change", updateLinks);
      updateLinks();
      target.replaceChildren(label, links);
    } catch {
      if (signal.aborted) return;
      const retry = document.createElement("button");
      retry.className = "text-button";
      retry.type = "button";
      retry.textContent = "Thử lại";
      retry.addEventListener("click", loadBatches);
      target.replaceChildren("Chưa tải được lô sản xuất. ", retry);
    }
  }
  loadBatches();
}
