import { formatPrice, icon, saleUnits } from "../components/ui.js";
import { mediaUrl, request } from "../api/http.js";
import { productPagePath, sitePaths } from "../site-paths.js";
import { mountSearchSuggestions } from "../components/search-suggestions.js";

export function mountCatalog(container) {
  container.innerHTML = `
    <div class="section-heading">
      <h1 id="catalog-title" class="page-title">Sản phẩm đang bán</h1>
      <p>Giá và tồn kho do xưởng đang hoạt động cập nhật.</p>
    </div>
    <div class="catalog-layout">
      <aside class="catalog-tools" aria-label="Bộ lọc danh mục">
        <p class="control-label">Tra danh mục</p>
        <div class="category-list" role="group" aria-label="Lọc theo danh mục"></div>
        <div class="catalog-fields">
          <label class="search-field">
            ${icon("search")}<span class="sr-only">Tìm sản phẩm</span>
            <input id="catalog-search" type="search" maxlength="100" placeholder="Tìm lụa, xưởng…">
          </label>
          <label class="sort-field"><span class="sr-only">Sắp xếp sản phẩm</span>
            <select id="catalog-sort"><option value="">Mặc định</option><option value="asc">Giá thấp đến cao</option><option value="desc">Giá cao đến thấp</option></select>
          </label>
        </div>
      </aside>
      <div class="catalog-body">
        <div id="catalog-results" class="catalog-summary">
          <p id="result-count" role="status"></p>
          <button type="button" class="text-button" id="clear-catalog" hidden>Xóa bộ lọc ${icon("close")}</button>
        </div>
        <div class="product-grid"></div>
        <nav class="pagination" aria-label="Phân trang sản phẩm" hidden>
          <button type="button" data-step="-1" aria-label="Trang trước">${icon("left")}</button>
          <span aria-current="page"></span>
          <button type="button" data-step="1" aria-label="Trang sau">${icon("right")}</button>
        </nav>
      </div>
    </div>`;

  const search = container.querySelector("#catalog-search");
  const showMatches = mountSearchSuggestions(search, () => resetPage());
  const sort = container.querySelector("#catalog-sort");
  const grid = container.querySelector(".product-grid");
  const pagination = container.querySelector(".pagination");
  const count = container.querySelector("#result-count");
  const clear = container.querySelector("#clear-catalog");
  const chips = container.querySelector(".category-list");
  const url = new URL(location.href);
  let category = (url.searchParams.get("category") || "").slice(0, 120);
  search.value = (url.searchParams.get("q") || "").slice(0, search.maxLength);
  sort.value = url.searchParams.get("sort") || "";
  let workshopId = url.searchParams.get("xuong");
  const title = container.querySelector("#catalog-title");
  const originalTitle = title.innerHTML;
  const originalPageTitle = document.title;
  let backToWorkshops;
  if (workshopId) {
    backToWorkshops = document.createElement("a");
    backToWorkshops.className = "text-link artisan-all";
    backToWorkshops.href = sitePaths.artisans;
    backToWorkshops.textContent = "Xem tất cả xưởng";
    container.prepend(backToWorkshops);
    const id = workshopId;
    request("/artisans/" + encodeURIComponent(id) + "?storefront=true").then(({ data }) => {
      if (workshopId !== id) return;
      title.textContent = data.workshopName;
      document.title = data.workshopName + " · vCraft";
    }).catch(() => { /* The product list reports its own loading errors. */ });
  }
  const requestedPage = url.searchParams.get("page") || "";
  let page = /^[1-9]\d{0,4}$/.test(requestedPage) && Number(requestedPage) <= 10000 ? Number(requestedPage) : 1;
  let current;
  let debounce;

  function addCategory(name, slug) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.textContent = name;
    chip.dataset.category = slug;
    chip.setAttribute("aria-pressed", slug === category);
    chip.addEventListener("click", () => {
      category = slug;
      resetPage();
    });
    chips.append(chip);
  }

  function productCard(product) {
    const card = document.createElement("article");
    card.className = "product-card";
    card.innerHTML = `
      <a class="product-open">
        <span class="product-image"><img width="414" height="414" loading="lazy" decoding="async" alt=""></span>
        <span class="product-info">
          <span class="product-tag"></span><span class="product-name"></span><span class="product-workshop"></span>
          <span class="product-bottom"><strong></strong><span class="card-arrow">${icon("upRight")}</span></span>
        </span>
      </a>`;
    const link = card.querySelector("a");
    link.href = productPagePath(product.slug);
    link.setAttribute("aria-label", "Xem " + product.name);
    const src = mediaUrl(product.mediaUrls[0]);
    if (src) card.querySelector("img").src = src;
    card.querySelector(".product-tag").textContent = product.category?.name || "Lụa Nha Xá";
    card.querySelector(".product-name").textContent = product.name;
    card.querySelector(".product-workshop").textContent = product.artisan.workshopName;
    card.querySelector("strong").textContent = formatPrice(product.price, saleUnits[product.saleUnit]);
    return card;
  }

  async function update() {
    clearTimeout(debounce);
    current?.abort();
    const { signal } = current = new AbortController();
    const query = search.value.trim();
    const address = new URL(location.href);
    address.searchParams.set("mua", "1");
    for (const [name, value] of Object.entries({ q: query, category, sort: sort.value, xuong: workshopId, page: page > 1 ? page : null })) {
      if (value) address.searchParams.set(name, value);
      else address.searchParams.delete(name);
    }
    if (address.href !== location.href) history.replaceState(history.state, "", address);
    showMatches([]);
    const params = new URLSearchParams({ page, limit: 12, storefront: "true" });
    if (category) params.set("category", category);
    if (workshopId) params.set("artisanId", workshopId);
    if (query) params.set("q", query);
    if (sort.value) params.set("sort", sort.value);
    clear.hidden = !(category || workshopId || query || sort.value);
    for (const chip of chips.querySelectorAll("[data-category]")) {
      chip.setAttribute("aria-pressed", chip.dataset.category === category);
    }
    count.textContent = "Đang tải sản phẩm…";
    grid.replaceChildren();
    pagination.hidden = true;
    try {
      const result = await request("/products?" + params, { signal });
      if (signal.aborted) return;
      if (!result.data.length && page > 1) {
        page = 1;
        return update();
      }
      grid.replaceChildren(...result.data.map(productCard));
      showMatches(result.data);
      count.textContent = result.data.length
        ? `${result.data.length} sản phẩm trên trang${workshopId ? " · " + result.data[0].artisan.workshopName : ""}`
        : (category || workshopId || query ? "Chưa tìm thấy sản phẩm phù hợp." : "Chưa có hàng do xưởng đăng bán.");
      pagination.querySelector("[aria-current]").textContent = "Trang " + page;
      pagination.querySelector('[data-step="-1"]').disabled = page === 1;
      pagination.querySelector('[data-step="1"]').disabled = !result.pagination.hasNext || page === 10000;
      pagination.hidden = page === 1 && !result.pagination.hasNext;
    } catch (error) {
      if (signal.aborted) return;
      count.textContent = error.message;
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "text-button";
      retry.textContent = "Thử lại";
      retry.addEventListener("click", update);
      grid.append(retry);
    }
  }

  function resetPage() {
    page = 1;
    update();
  }

  addCategory("Tất cả", "");
  request("/categories").then(({ data }) => {
    data.forEach(item => addCategory(item.name, item.slug));
  }).catch(() => {
    const message = document.createElement("p");
    message.textContent = "Chưa tải được bộ lọc danh mục.";
    chips.append(message);
  });
  search.addEventListener("input", event => {
    current?.abort();
    clearTimeout(debounce);
    if (event.isComposing) return;
    debounce = setTimeout(resetPage, 250);
  });
  sort.addEventListener("change", resetPage);
  clear.addEventListener("click", () => {
    category = "";
    workshopId = null;
    title.innerHTML = originalTitle;
    document.title = originalPageTitle;
    backToWorkshops?.remove();
    search.value = "";
    sort.value = "";
    resetPage();
    search.focus({ preventScroll: true });
  });
  pagination.addEventListener("click", event => {
    const button = event.target.closest("[data-step]");
    if (!button) return;
    page += Number(button.dataset.step);
    update();
    count.scrollIntoView({ block: "start" });
  });
  update();

  return {
    focusSearch() {
      container.scrollIntoView();
      search.focus({ preventScroll: true });
      return true;
    },
  };
}
