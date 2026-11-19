import { icon } from "./components/ui.js";
import { homeMapId, renderHome } from "./pages/home.page.js";
import { mountExhibition } from "./pages/exhibition.page.js";
import { renderArtisans } from "./pages/artisan-profile.page.js";
import { mountCart } from "./pages/cart.page.js";
import { mountAccount } from "./pages/login.page.js";
import { mountWholesale } from "./pages/wholesale.page.js";
import { mountRetailOrders } from "./pages/retail-orders.page.js";
import { mountReferenceCatalog } from "./pages/workshop-reference.page.js";
import { mountCatalog } from "./pages/catalog.page.js";
import { showProduct } from "./pages/product-detail.page.js";
import { mountNews } from "./pages/news.page.js";
import { mountArtisanMap } from "./pages/artisan-map.page.js";
import { mountNotifications } from "./pages/notifications.page.js";
import { mountArtisanAdministration } from "./pages/admin.page.js";
import { sitePaths } from "./site-paths.js";

const pages = new Map([
  [sitePaths.home, { id: "trang-chu", titleId: "hero-title" }],
  [sitePaths.journal, { id: "trien-lam", titleId: "exhibition-title", className: "exhibition", title: "Nhật ký lô" }],
  [sitePaths.artisans, { id: "nghe-nhan", titleId: "artisans-title", className: "artisans section-shell", title: "Hồ sơ xưởng" }],
  [sitePaths.catalog, { id: "san-pham", titleId: "catalog-title", className: "catalog section-shell", title: "Danh mục lụa" }],
  [sitePaths.wholesale, { id: "dat-si", titleId: "wholesale-title", className: "section-shell wholesale", title: "Đặt sỉ" }],
  [sitePaths.retailOrders, { id: "don-ban-le", titleId: "retail-orders-title", className: "section-shell wholesale", title: "Đơn bán lẻ" }],
  [sitePaths.map, { id: "ban-do", titleId: "map-title", className: "section-shell wholesale", title: "Bản đồ làng nghề" }],
  [sitePaths.news, { id: "tin-tuc", titleId: "news-title", className: "section-shell wholesale", title: "Tin cộng đồng" }],
  [sitePaths.notifications, { id: "thong-bao", titleId: "notifications-title", className: "section-shell wholesale", title: "Thông báo" }],
  [sitePaths.administration, { id: "quan-ly-xuong", titleId: "admin-title", className: "section-shell wholesale", title: "Quản lý xưởng" }],
]);
const requestedPath = location.pathname.toLowerCase().replace(/\/+$/, "");
const path = pages.has(requestedPath) ? requestedPath : sitePaths.home;
const legacyPage = path === sitePaths.home
  ? [...pages].find(([, page]) => location.hash === "#" + page.id)
  : null;
if (legacyPage) location.replace(legacyPage[0] + location.search);
else renderPage();

function renderPage() {
  const header = document.querySelector("#header");
  const footer = document.querySelector("#footer");
  const notice = document.querySelector("#notice");
  const brand = '<img src="/public/favicon.svg" width="38" height="38" alt=""><span>vCraft</span>';

  header.innerHTML = `
    <div class="header-inner section-shell">
      <div class="brand-lockup">
        <a class="brand" href="${sitePaths.home}" aria-label="vCraft — Trang chủ">${brand}</a>
        <span class="brand-note">Sổ tay<br>làng nghề</span>
      </div>
      <button class="icon-button menu-toggle" type="button" aria-label="Mở menu" aria-expanded="false" aria-controls="nav">${icon("menu")}</button>
      <nav class="nav-links" id="nav" aria-label="Điều hướng chính">
        <a href="${sitePaths.home}">Trang chủ</a>
        <a href="${sitePaths.journal}">Nhật ký lô</a>
        <a href="${sitePaths.artisans}">Hồ sơ xưởng</a>
        <a href="${sitePaths.catalog}">Danh mục</a>
        <a href="${sitePaths.wholesale}">Đặt sỉ</a>
        <a href="${sitePaths.retailOrders}" hidden>Đơn lẻ</a>
      </nav>
      <div class="header-actions">
        <button class="icon-button" type="button" id="search-button" aria-label="Tìm sản phẩm">${icon("search")}</button>
        <button class="icon-button" type="button" id="account-button" aria-label="Đăng nhập">${icon("user")}</button>
        <button class="icon-button cart-trigger" type="button" id="cart-button" aria-label="Mở giỏ hàng (0)">${icon("bag")}<span id="cart-count" aria-hidden="true">0</span></button>
      </div>
    </div>`;

  footer.innerHTML = `
    <div class="footer-inner section-shell">
      <div><a class="brand" href="${sitePaths.home}" aria-label="vCraft — Trang chủ">${brand}</a><p>Sổ tay làng lụa Nha Xá, phường Duy Tân, Ninh Bình.</p></div>
      <nav class="footer-links" aria-label="Khám phá làng nghề">
        <a class="text-link" href="${path === sitePaths.home ? "#" + homeMapId : sitePaths.map}">Bản đồ làng nghề</a>
        <a class="text-link" href="${sitePaths.news}">Tin cộng đồng</a>
      </nav>
      <a class="text-link" href="#main-content">Về đầu trang ${icon("upRight")}</a>
    </div>`;

  let noticeTimer;
  function notify(message) {
    notice.textContent = message;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => { notice.textContent = ""; }, 3300);
  }

  const cartButton = header.querySelector("#cart-button");
  const badge = header.querySelector("#cart-count");
  const account = mountAccount(document.querySelector("#account-dialog"), header.querySelector("#account-button"));
  const cart = mountCart(document.querySelector("#cart-dialog"), count => {
    badge.textContent = count;
    cartButton.setAttribute("aria-label", `Mở giỏ hàng (${count})`);
  }, notify, account);

  const main = document.querySelector("#main-content");
  const page = pages.get(path);
  const section = document.createElement("section");
  section.id = page.id;
  section.className = page.className || "";
  section.setAttribute("aria-labelledby", page.titleId);
  main.append(section);
  if (page.title) document.title = page.title + " · vCraft";

  let catalog;
  if (path === sitePaths.home) renderHome(section, document.querySelector("#product-dialog"));
  if (path === sitePaths.journal) mountExhibition(section);
  if (path === sitePaths.artisans) renderArtisans(section);
  if (path === sitePaths.catalog) {
    const query = new URLSearchParams(location.search);
    const store = !query.get("co-so") && (query.get("mua") === "1" || query.has("xuong"));
    const productDialog = document.querySelector("#product-dialog");
    catalog = store
      ? mountCatalog(section, product => showProduct(productDialog, product, cart.add))
      : mountReferenceCatalog(section, query.get("co-so"), productDialog);
    const views = document.createElement("nav");
    views.className = "catalog-switch";
    views.setAttribute("aria-label", "Loại danh mục");
    views.innerHTML = `
      <a class="button button-outline" href="${sitePaths.catalog}">Mẫu lụa tham khảo</a>
      <a class="button button-outline" href="${sitePaths.catalog}?mua=1">Sản phẩm đang bán</a>`;
    views.children[Number(store)].setAttribute("aria-current", "page");
    section.prepend(views);
    if (location.hash === "#catalog-search") catalog.focusSearch();
  }
  if (path === sitePaths.wholesale) mountWholesale(section, account);
  if (path === sitePaths.retailOrders) mountRetailOrders(section, account);
  if (path === sitePaths.news) mountNews(section, account);
  if (path === sitePaths.map) mountArtisanMap(section);
  if (path === sitePaths.notifications) mountNotifications(section, account);
  if (path === sitePaths.administration) mountArtisanAdministration(section, account);

  const retailLink = header.querySelector(`a[href="${sitePaths.retailOrders}"]`);
  account.onChange(profile => { retailLink.hidden = profile?.role !== "ADMIN"; });

  header.querySelector("#search-button").addEventListener("click", () => {
    if (!catalog?.focusSearch()) location.assign(sitePaths.catalog + "#catalog-search");
  });
  cartButton.addEventListener("click", cart.open);

  const menuToggle = header.querySelector(".menu-toggle");
  const nav = header.querySelector("#nav");
  function setMenu(open) {
    menuToggle.setAttribute("aria-expanded", open);
    menuToggle.setAttribute("aria-label", open ? "Đóng menu" : "Mở menu");
    menuToggle.innerHTML = icon(open ? "close" : "menu");
    nav.classList.toggle("is-open", open);
  }
  menuToggle.addEventListener("click", () => setMenu(menuToggle.getAttribute("aria-expanded") !== "true"));
  nav.addEventListener("click", event => {
    if (event.target.closest("a")) setMenu(false);
  });
  header.addEventListener("keydown", event => {
    if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
      setMenu(false);
      menuToggle.focus();
    }
  });

  nav.querySelector(`a[href="${path}"]`)?.setAttribute("aria-current", "page");
}
