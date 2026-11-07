import { asset, formatPrice, icon } from "../components/ui.js";
import { artisans, categories, products } from "../data/demo-data.js";

const pageSize = 4;
const fold = text => text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replaceAll("đ", "d");

function productCard(product) {
  const workshop = artisans.find(artisan => artisan.id === product.artisanId);
  return `
    <article class="product-card">
      <button class="product-open" type="button" data-product="${product.id}" aria-label="Xem ${product.name}">
        <span class="product-image">
          <img src="${asset(product.image)}" alt="${product.alt}" width="414" height="414" loading="lazy" decoding="async">
        </span>
        <span class="product-info">
          <span class="product-tag">${product.category}</span>
          <span class="product-name">${product.name}</span>
          <span class="product-workshop">${workshop.name}</span>
          <span class="product-bottom"><strong>${formatPrice(product.price, product.unit)}</strong><span class="card-arrow">${icon("upRight")}</span></span>
        </span>
      </button>
    </article>`;
}

export function mountCatalog(container, openProduct) {
  container.innerHTML = `
    <div class="section-heading">
      <div><p class="eyebrow"><span></span> 03 / Gian lụa</p><h2 id="catalog-title">Mục lục <em>chất liệu.</em></h2></div>
      <p>Tra mẫu theo loại lụa hoặc tên xưởng. Mở từng mẫu để xem chất liệu, kích thước và nhật ký lô nếu có.</p>
    </div>
    <div class="catalog-layout">
      <aside class="catalog-tools" aria-label="Bộ lọc danh mục">
        <p class="control-label">Tra danh mục</p>
        <div class="category-list" role="group" aria-label="Lọc theo danh mục">
          ${categories.map((name, index) => `<button type="button" data-category="${index}" aria-pressed="${index === 0}">${name}</button>`).join("")}
        </div>
        <div class="catalog-fields">
          <label class="search-field">
            ${icon("search")}<span class="sr-only">Tìm sản phẩm</span>
            <input id="catalog-search" type="search" placeholder="Tìm lụa, xưởng…">
          </label>
          <label class="sort-field"><span class="sr-only">Sắp xếp sản phẩm</span>
            <select id="catalog-sort"><option value="featured">Nổi bật</option><option value="asc">Giá thấp đến cao</option><option value="desc">Giá cao đến thấp</option></select>
          </label>
        </div>
      </aside>
      <div class="catalog-body">
        <div id="catalog-results" class="catalog-summary">
          <p id="result-count" role="status"></p>
          <button type="button" class="text-button" id="clear-catalog" hidden>Xóa bộ lọc ${icon("close")}</button>
        </div>
        <div class="product-grid" id="product-grid"></div>
        <nav class="pagination" id="catalog-pages" aria-label="Phân trang sản phẩm"></nav>
      </div>
    </div>`;

  const search = container.querySelector("#catalog-search");
  const sort = container.querySelector("#catalog-sort");
  const grid = container.querySelector("#product-grid");
  const pagination = container.querySelector("#catalog-pages");
  const count = container.querySelector("#result-count");
  const clear = container.querySelector("#clear-catalog");
  const chips = [...container.querySelectorAll("[data-category]")];
  let category = 0;
  let page = 1;
  let workshopId = "";

  function update() {
    const query = fold(search.value.trim());
    const workshop = artisans.find(artisan => artisan.id === workshopId);
    const matches = products.filter(product => {
      const workshopName = artisans.find(artisan => artisan.id === product.artisanId).name;
      const searchable = fold(`${product.name} ${product.category} ${workshopName} ${product.material}`);
      return (!category || product.category === categories[category])
        && (!workshop || product.artisanId === workshop.id)
        && searchable.includes(query);
    });

    if (sort.value !== "featured") {
      const direction = sort.value === "asc" ? 1 : -1;
      matches.sort((first, second) => {
        if (first.price === null || second.price === null) return Number(first.price === null) - Number(second.price === null);
        return direction * (first.price - second.price);
      });
    }

    count.textContent = `${matches.length} sản phẩm${workshop ? ` · ${workshop.name}` : ""}`;
    clear.hidden = !category && !query && !workshop && sort.value === "featured";
    chips.forEach((chip, index) => chip.setAttribute("aria-pressed", index === category));
    const totalPages = Math.ceil(matches.length / pageSize);
    const start = (page - 1) * pageSize;
    grid.innerHTML = matches.length
      ? matches.slice(start, start + pageSize).map(productCard).join("")
      : '<p class="empty-results">Chưa tìm thấy sản phẩm phù hợp. Thử từ khóa khác hoặc xóa bộ lọc.</p>';
    pagination.hidden = totalPages < 2;
    pagination.innerHTML = totalPages < 2 ? "" : `
      <button type="button" data-page="${page - 1}" aria-label="Trang trước" ${page === 1 ? "disabled" : ""}>${icon("left")}</button>
      <span tabindex="-1" id="current-page" aria-current="page">Trang ${page} / ${totalPages}</span>
      <button type="button" data-page="${page + 1}" aria-label="Trang sau" ${page === totalPages ? "disabled" : ""}>${icon("right")}</button>`;
  }

  function resetPage() {
    page = 1;
    update();
  }

  chips.forEach((chip, index) => chip.addEventListener("click", () => {
    category = index;
    resetPage();
  }));
  search.addEventListener("input", resetPage);
  sort.addEventListener("change", resetPage);
  clear.addEventListener("click", () => {
    category = 0;
    workshopId = "";
    search.value = "";
    sort.value = "featured";
    resetPage();
    search.focus({ preventScroll: true });
  });
  grid.addEventListener("click", event => {
    const button = event.target.closest("[data-product]");
    if (button) openProduct(products.find(product => product.id === button.dataset.product));
  });
  pagination.addEventListener("click", event => {
    const button = event.target.closest("[data-page]");
    if (!button) return;
    page = Number(button.dataset.page);
    update();
    pagination.querySelector("#current-page").focus({ preventScroll: true });
    count.scrollIntoView({ block: "start" });
  });
  update();

  return {
    focusSearch() {
      container.scrollIntoView();
      search.focus({ preventScroll: true });
    },
    selectWorkshop(id) {
      category = 0;
      search.value = "";
      workshopId = id;
      resetPage();
      container.scrollIntoView();
      search.focus({ preventScroll: true });
    },
  };
}
