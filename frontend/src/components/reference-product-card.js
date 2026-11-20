import { mediaUrl } from "../api/http.js";
import { productPagePath } from "../site-paths.js";
import { formatPrice } from "./ui.js";

export function referenceProductPrice({ price, unit }) {
  if (price == null) return "Chưa công bố giá";
  return unit ? `${formatPrice(price)} / ${unit}` : formatPrice(price);
}

export function referenceProductCard(product) {
  const control = document.createElement("a");
  control.href = productPagePath(product.slug, true);
  control.className = "reference-product-open";
  control.setAttribute("aria-label", "Xem " + product.name);
  control.innerHTML = `
    <span class="reference-product-image"></span>
    <span class="reference-product-copy">
      <span class="product-tag"></span><span class="reference-product-title"></span>
      <span class="reference-product-owner"></span><strong></strong>
    </span>`;
  const image = document.createElement("img");
  const src = mediaUrl(product.image);
  image.width = 600;
  image.height = 600;
  image.loading = "lazy";
  image.decoding = "async";
  image.alt = product.name;
  image.referrerPolicy = "no-referrer";
  if (src) image.src = src;
  control.querySelector(".reference-product-image").append(image);
  control.querySelector(".product-tag").textContent = product.type;
  control.querySelector(".reference-product-title").textContent = product.name;
  control.querySelector(".reference-product-owner").textContent = product.workshopName;
  control.querySelector("strong").textContent = referenceProductPrice(product);
  const item = document.createElement("article");
  item.className = "reference-card reference-product";
  item.append(control);
  return item;
}
