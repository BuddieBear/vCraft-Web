import { formatPrice, icon, saleUnits } from "../components/ui.js";
import { mediaUrl, request } from "../api/http.js";
import { sitePaths } from "../site-paths.js";
import { renderProductionGuide } from "../components/production-guide.js";

export async function mountProductDetail(section, { slug, reference }, addToCart) {
  section.innerHTML = `
    <a class="text-link product-back" href="${sitePaths.catalog}${reference ? "" : "?mua=1"}">${icon("left")} Về danh mục</a>
    <div class="detail-grid">
      <div class="detail-visual" hidden><img class="detail-image" width="414" height="414" alt="" referrerpolicy="no-referrer"></div>
      <div class="detail-copy">
        <header class="detail-heading">
          <p class="eyebrow"></p><h1 id="detail-title">Chi tiết sản phẩm</h1><p class="detail-price"></p>
        </header>
        <p class="product-description"></p>
        <dl class="detail-specs" hidden><div><dt>Chất liệu</dt><dd></dd></div></dl>
        <section class="detail-story" hidden><h3>Câu chuyện sản phẩm</h3><p></p></section>
        <div class="detail-actions"></div>
        <p class="detail-status" role="status">Đang tải chi tiết sản phẩm…</p>
        <div class="detail-batches" aria-live="polite"></div>
      </div>
    </div>`;

  const image = section.querySelector("img");
  const grid = section.querySelector(".detail-grid");
  const workshopName = section.querySelector(".eyebrow");
  const title = section.querySelector("h1");
  const price = section.querySelector(".detail-price");
  const status = section.querySelector("[role=status]");
  grid.classList.add("detail-no-image");
  const param = encodeURIComponent(slug);
  const endpoint = reference ? "/artisans/reference/products/" + param : "/products/by-slug/" + param + "?storefront=true";
  const previous = document.referrer && new URL(document.referrer);
  const returnToCatalog = previous?.origin === location.origin && previous.pathname === sitePaths.catalog;
  if (returnToCatalog) section.querySelector(".product-back").href = previous.href;
  try {
    const { data: product } = await request(endpoint);
    const src = (reference ? [product.image] : product.mediaUrls).map(mediaUrl).find(Boolean);
    if (src) image.src = src;
    image.parentElement.hidden = !src;
    grid.classList.toggle("detail-no-image", !src);
    image.alt = product.name;
    workshopName.textContent = reference ? product.workshopName : product.artisan.workshopName;
    title.textContent = product.name;
    document.title = product.name + " · vCraft";
    price.textContent = reference ? `${formatPrice(product.price)} / ${product.unit}` : formatPrice(product.price, saleUnits[product.saleUnit]);
    status.textContent = "";
    grid.insertAdjacentHTML("beforeend", renderProductionGuide(product, { cover: src, reference, showQr: true }));
    const description = section.querySelector(".product-description");
    const specs = section.querySelector(".detail-specs");
    if (reference) {
      if (!returnToCatalog) {
        section.querySelector(".product-back").href = sitePaths.catalog + "?" + new URLSearchParams({ "co-so": product.workshopSlug });
      }
      description.textContent = "Ảnh mẫu và giá tham khảo do cơ sở công bố.";
      specs.querySelector("dt").textContent = "Loại sản phẩm";
      specs.querySelector("dd").textContent = product.type;
      specs.hidden = false;
      return;
    }
    description.textContent = product.description ?? "";
    if (product.culturalStory && product.culturalStory !== product.description) {
      const story = section.querySelector(".detail-story");
      story.querySelector("p").textContent = product.culturalStory;
      story.hidden = false;
    }
    if (product.rawMaterial) {
      specs.querySelector("dd").textContent = product.rawMaterial;
      specs.hidden = false;
    }
    const actions = section.querySelector(".detail-actions");
    if (product.price === null) {
      const workshop = document.createElement("a");
      workshop.className = "button button-primary";
      workshop.href = sitePaths.artisans + "?" + new URLSearchParams({ xuong: product.artisan.id });
      workshop.textContent = "Xem hồ sơ xưởng";
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
    status.textContent = error.message;
    if (error.status !== 404) {
      const retry = document.createElement("button");
      retry.className = "text-button";
      retry.type = "button";
      retry.textContent = "Thử lại";
      retry.addEventListener("click", () => mountProductDetail(section, { slug, reference }, addToCart));
      status.append(" ", retry);
    }
    return;
  }

  const target = section.querySelector(".detail-batches");
  async function loadBatches() {
    target.textContent = "Đang tải lô sản xuất…";
    try {
      const { data } = await request("/traceability/products/" + param);
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
