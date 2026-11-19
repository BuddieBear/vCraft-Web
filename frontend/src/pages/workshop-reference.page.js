import { mediaUrl, request } from "../api/http.js";
import { formatPrice, icon } from "../components/ui.js";
import { productPagePath, sitePaths } from "../site-paths.js";
import { mountSearchSuggestions } from "../components/search-suggestions.js";

function card(link, className) {
  const item = document.createElement("article");
  item.className = className;
  item.append(link);
  return item;
}

function listedPrice(product) {
  return `${formatPrice(product.price)} / ${product.unit}`;
}

export function mountReferenceWorkshops(section) {
  section.innerHTML = `
    <h2 id="reference-workshops">Cơ sở dệt lụa Nha Xá</h2>
    <p class="reference-status" role="status">Đang tải danh sách cơ sở…</p>
    <div class="reference-grid"></div>
    <button class="text-button" type="button" hidden>Thử lại</button>`;
  const status = section.querySelector("[role=status]");
  const grid = section.querySelector(".reference-grid");
  const retry = section.querySelector("button");

  async function load() {
    retry.hidden = true;
    status.textContent = "Đang tải danh sách cơ sở…";
    try {
      const { data } = await request("/artisans/reference");
      grid.replaceChildren(...data.map(workshop => {
        const link = document.createElement("a");
        link.href = sitePaths.catalog + "?" + new URLSearchParams({ "co-so": workshop.slug });
        link.innerHTML = `<h3></h3><p></p><span class="reference-link"></span>`;
        link.querySelector("h3").textContent = workshop.name;
        link.querySelector("p").textContent = workshop.description;
        const action = link.querySelector(".reference-link");
        action.textContent = workshop.productCount ? `Xem ${workshop.productCount} mẫu` : "Xem dòng sản phẩm";
        action.insertAdjacentHTML("beforeend", icon("arrow"));
        return card(link, "reference-card");
      }));
      status.textContent = "";
    } catch (error) {
      status.textContent = error.message;
      retry.hidden = false;
    }
  }

  retry.addEventListener("click", load);
  load();
}

export function mountReferenceCatalog(section, slug) {
  section.innerHTML = `
    <a class="text-link artisan-all" href="${sitePaths.artisans}">${icon("left")} Tất cả cơ sở dệt lụa</a>
    <div class="section-heading">
      <h1 class="page-title" id="catalog-title">Mẫu lụa Nha Xá</h1>
      <p class="reference-description">Giá tham khảo theo niêm yết của từng cơ sở.</p>
    </div>
    <div class="reference-filters">
      <label class="search-field">
        ${icon("search")}<span class="sr-only">Tìm sản phẩm</span>
        <input id="catalog-search" type="search" maxlength="100" placeholder="Tìm theo mẫu lụa, mã hoặc tên cơ sở…">
      </label>
      <label class="sort-field"><span class="sr-only">Lọc chất liệu</span>
        <select data-type><option value="">Tất cả loại sản phẩm</option></select>
      </label>
      <label class="sort-field"><span class="sr-only">Sắp xếp sản phẩm</span>
        <select data-sort><option value="">Mặc định</option><option value="asc">Giá thấp đến cao</option><option value="desc">Giá cao đến thấp</option></select>
      </label>
    </div>
    <p class="reference-status" role="status"></p>
    <div class="reference-grid"></div>
    <button class="text-button" type="button" hidden>Thử lại</button>`;
  const heading = section.querySelector("h1");
  const description = section.querySelector(".reference-description");
  const status = section.querySelector("[role=status]");
  const grid = section.querySelector(".reference-grid");
  const retry = section.querySelector(".text-button");
  const search = section.querySelector('input[type="search"]');
  const url = new URL(location.href);
  search.value = (url.searchParams.get("q") || "").slice(0, search.maxLength);
  const showMatches = mountSearchSuggestions(search, updateProducts);
  const type = section.querySelector("[data-type]");
  const sort = section.querySelector("[data-sort]");
  const requestedType = url.searchParams.get("loai");
  sort.value = url.searchParams.get("sort") || "";
  const filters = section.querySelector(".reference-filters");
  let products;

  function searchKey(text) {
    return text.toLowerCase().normalize("NFD").replace(/\p{Mark}/gu, "").replaceAll("đ", "d").trim();
  }

  function updateProducts() {
    if (!products) return;
    const query = searchKey(search.value);
    const address = new URL(location.href);
    for (const [name, value] of Object.entries({ q: search.value.trim(), loai: type.value, sort: sort.value })) {
      if (value) address.searchParams.set(name, value);
      else address.searchParams.delete(name);
    }
    if (address.href !== location.href) history.replaceState(history.state, "", address);
    const matches = products.filter(product =>
      (!type.value || product.type === type.value) && searchKey(`${product.name} ${product.type} ${product.workshopName}`).includes(query));
    if (sort.value) matches.sort((a, b) => sort.value === "asc" ? a.price - b.price : b.price - a.price);
    grid.replaceChildren(...matches.map(referenceProductCard));
    showMatches(matches);
    status.textContent = matches.length ? "" : "Chưa tìm thấy mẫu phù hợp.";
  }

  async function load() {
    retry.hidden = true;
    status.textContent = "Đang tải sản phẩm…";
    try {
      const { data } = await request("/artisans/reference/" + (slug ? encodeURIComponent(slug) : "products"));
      if (slug) {
        heading.textContent = data.name;
        document.title = data.name + " · vCraft";
        if (!data.products.length && data.knownProducts?.length) {
          description.textContent = "Các dòng sản phẩm ghi nhận theo Cục Du lịch Quốc gia Việt Nam.";
          status.textContent = "Chưa tìm thấy ảnh từng mẫu và giá niêm yết của cơ sở.";
          filters.hidden = true;
          const list = document.createElement("ul");
          list.className = "reference-known-products";
          for (const name of data.knownProducts) {
            const item = document.createElement("li");
            item.textContent = name;
            list.append(item);
          }
          grid.replaceChildren(list);
          return;
        }
        products = data.products.map(product => ({ ...product, workshopName: data.name }));
      } else products = data;
      const productTypes = new Set(products.map(product => product.type));
      for (const name of productTypes) type.add(new Option(name, name));
      if (productTypes.has(requestedType)) type.value = requestedType;
      updateProducts();
    } catch (error) {
      status.textContent = error.message;
      retry.hidden = error.status === 404;
    }
  }

  retry.addEventListener("click", load);
  search.addEventListener("input", event => { if (!event.isComposing) updateProducts(); });
  type.addEventListener("change", updateProducts);
  sort.addEventListener("change", updateProducts);
  load();
  return {
    focusSearch() {
      if (filters.hidden) return false;
      search.focus();
      return true;
    },
  };
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
  control.querySelector(".reference-product-image").append(productImage(product));
  control.querySelector(".product-tag").textContent = product.type;
  control.querySelector(".reference-product-title").textContent = product.name;
  control.querySelector(".reference-product-owner").textContent = product.workshopName;
  control.querySelector("strong").textContent = listedPrice(product);
  return card(control, "reference-card reference-product");
}

function productImage(product) {
  const image = document.createElement("img");
  const src = mediaUrl(product.image);
  image.width = 600;
  image.height = 600;
  image.loading = "lazy";
  image.decoding = "async";
  image.alt = product.name;
  image.referrerPolicy = "no-referrer";
  if (src) image.src = src;
  return image;
}
