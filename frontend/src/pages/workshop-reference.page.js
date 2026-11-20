import { request } from "../api/http.js";
import { icon } from "../components/ui.js";
import { sitePaths } from "../site-paths.js";
import { mountSearchSuggestions } from "../components/search-suggestions.js";
import { referenceProductCard } from "../components/reference-product-card.js";

function card(link, className) {
  const item = document.createElement("article");
  item.className = className;
  item.append(link);
  return item;
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
    <section class="reference-other-products" hidden>
      <h2>Các dòng sản phẩm của cơ sở</h2>
      <ul class="reference-known-products"></ul>
    </section>
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
    if (sort.value) {
      const direction = sort.value === "asc" ? 1 : -1;
      matches.sort((a, b) => {
        if (a.price == null) return b.price == null ? 0 : 1;
        if (b.price == null) return -1;
        return direction * (a.price - b.price);
      });
    }
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
        description.textContent = data.description;
        if (data.knownProducts?.length) {
          const otherProducts = section.querySelector(".reference-other-products");
          otherProducts.querySelector("ul").replaceChildren(...data.knownProducts.map(name => {
            const item = document.createElement("li");
            item.textContent = name;
            return item;
          }));
          otherProducts.hidden = false;
        }
        if (!data.products.length) {
          status.textContent = "Chưa có ảnh và giá cho từng mẫu.";
          filters.hidden = true;
          return;
        }
        products = data.products.map(product => ({ ...product, workshopName: data.name }));
      } else products = data;
      const productTypes = new Set(products.map(product => product.type));
      for (const name of [...productTypes].sort((a, b) => a.localeCompare(b, "vi"))) type.add(new Option(name, name));
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
