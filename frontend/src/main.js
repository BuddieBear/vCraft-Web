import { icon } from "./components/ui.js";
import { mountCart } from "./pages/cart.page.js";
import { mountAccount } from "./pages/login.page.js";
import { homeMapId, matchProductPage, pageSegment, quoteJournalRoot, quotePageRoot, referenceWorkshopRoot, sitePaths } from "./site-paths.js";

const pages = new Map([
  [sitePaths.home, { id: "trang-chu", titleId: "hero-title" }],
  [sitePaths.journal, { id: "trien-lam", titleId: "exhibition-title", className: "exhibition", title: "Nhật ký lô" }],
  [sitePaths.artisans, { id: "nghe-nhan", titleId: "artisans-title", className: "artisans section-shell", title: "Hồ sơ xưởng" }],
  [sitePaths.catalog, { id: "san-pham", titleId: "catalog-title", className: "catalog section-shell", title: "Danh mục lụa" }],
  [sitePaths.wholesale, { id: "dat-si", titleId: "wholesale-title", className: "section-shell wholesale", title: "Đặt sỉ" }],
  [sitePaths.bidding, { id: "dau-thau", titleId: "wholesale-title", className: "section-shell wholesale", title: "Đấu thầu" }],
  [sitePaths.workshop, { id: "xuong-cua-toi", titleId: "workshop-title", className: "section-shell wholesale", title: "Xưởng của tôi" }],
  [sitePaths.retailOrders, { id: "don-ban-le", titleId: "retail-orders-title", className: "section-shell wholesale", title: "Đơn bán lẻ" }],
  [sitePaths.map, { id: "ban-do", titleId: "map-title", className: "section-shell wholesale", title: "Bản đồ làng nghề" }],
  [sitePaths.news, { id: "tin-tuc", titleId: "news-title", className: "section-shell wholesale", title: "Tin cộng đồng" }],
  [sitePaths.notifications, { id: "thong-bao", titleId: "notifications-title", className: "section-shell wholesale", title: "Thông báo" }],
  [sitePaths.administration, { id: "quan-ly-xuong", titleId: "admin-title", className: "section-shell wholesale", title: "Quản lý xưởng" }],
]);
const requestedPath = location.pathname.toLowerCase().replace(/\/+$/, "");
const productPage = matchProductPage(requestedPath);
const quoteId = pageSegment(requestedPath, quotePageRoot);
const journalQuoteId = pageSegment(requestedPath, quoteJournalRoot);
const bidQuoteId = pageSegment(requestedPath, sitePaths.bidding);
const articleSlug = pageSegment(requestedPath, sitePaths.news);
const referenceWorkshopSlug = pageSegment(requestedPath, referenceWorkshopRoot);
const path = productPage ? sitePaths.catalog : quoteId ? sitePaths.wholesale : journalQuoteId ? sitePaths.journal : bidQuoteId ? sitePaths.bidding : articleSlug ? sitePaths.news
  : referenceWorkshopSlug ? sitePaths.artisans : pages.has(requestedPath) ? requestedPath : sitePaths.home;
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
        <span class="brand-note">Sổ tay làng lụa<br>Nha Xá</span>
      </div>
      <button class="icon-button menu-toggle" type="button" aria-label="Mở menu" aria-expanded="false" aria-controls="nav">${icon("menu")}</button>
      <nav class="nav-links" id="nav" aria-label="Điều hướng chính">
        <a href="${sitePaths.home}">Trang chủ</a>
        <a href="${sitePaths.journal}">Nhật ký lô</a>
        <a href="${sitePaths.artisans}">Hồ sơ xưởng</a>
        <a href="${sitePaths.catalog}">Danh mục</a>
        <a data-trade href="${sitePaths.wholesale}">Đặt sỉ</a>
        <a href="${sitePaths.retailOrders}" hidden>Đơn lẻ</a>
      </nav>
      <div class="header-actions">
        <button class="icon-button" type="button" id="search-button" aria-label="Tìm sản phẩm">${icon("search")}</button>
        <button class="icon-button" type="button" id="account-button" aria-label="Hồ sơ" aria-haspopup="dialog">${icon("user")}</button>
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

  const pageReady = mountContent(section, account, cart).catch(() => {
    section.innerHTML = `<h1 id="${page.titleId}" class="page-title">${page.title || "Trang chủ"}</h1>
      <p role="status">Chưa tải được trang. Vui lòng thử lại.</p>
      <button type="button" class="text-button">Tải lại trang</button>`;
    section.querySelector("button").addEventListener("click", () => location.reload());
  });

  const retailLink = header.querySelector(`a[href="${sitePaths.retailOrders}"]`);
  const tradeLink = header.querySelector("[data-trade]");
  function syncNavigation(profile) {
    const artisan = profile?.role === "ARTISAN";
    retailLink.hidden = !artisan && profile?.role !== "ADMIN";
    retailLink.textContent = artisan ? "Đơn bán của tôi" : "Đơn lẻ";
    tradeLink.href = artisan ? sitePaths.bidding : sitePaths.wholesale;
    tradeLink.textContent = artisan ? "Đấu thầu" : profile?.role === "ADMIN" ? "Điều phối đặt sỉ" : "Đặt sỉ";
    if (path === sitePaths.wholesale || path === sitePaths.bidding) tradeLink.setAttribute("aria-current", "page");
  }
  account.onChange(syncNavigation);
  syncNavigation(account.profile);

  header.querySelector("#search-button").addEventListener("click", async () => {
    const catalog = path === sitePaths.catalog && !productPage ? await pageReady : null;
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

async function mountContent(section, account, cart) {
  if (productPage) {
    const { mountProductDetail } = await import("./pages/product-detail.page.js");
    section.classList.add("product-detail-page");
    section.setAttribute("aria-labelledby", "detail-title");
    return mountProductDetail(section, productPage, cart.add, account);
  }
  switch (path) {
    case sitePaths.home:
      return (await import("./pages/home.page.js")).renderHome(section);
    case sitePaths.journal:
      if (journalQuoteId) {
        section.className = "section-shell wholesale";
        return (await import("./pages/wholesale.page.js")).mountWholesale(section, account, { quoteId: journalQuoteId, journal: true });
      }
      return (await import("./pages/exhibition.page.js")).mountExhibition(section);
    case sitePaths.artisans:
      return (await import("./pages/artisan-profile.page.js")).renderArtisans(section, referenceWorkshopSlug);
    case sitePaths.catalog:
      return mountCatalogPage(section);
    case sitePaths.wholesale:
      return (await import("./pages/wholesale.page.js")).mountWholesale(section, account, { quoteId, query: new URLSearchParams(location.search) });
    case sitePaths.bidding:
      return (await import("./pages/wholesale.page.js")).mountWholesale(section, account, { bidding: true, bidQuoteId });
    case sitePaths.workshop:
      return (await import("./pages/wholesale.page.js")).mountWholesale(section, account, { workshop: true });
    case sitePaths.retailOrders:
      return (await import("./pages/retail-orders.page.js")).mountRetailOrders(section, account);
    case sitePaths.news: {
      const { mountNews, mountNewsArticle } = await import("./pages/news.page.js");
      return articleSlug ? mountNewsArticle(section, articleSlug) : mountNews(section, account);
    }
    case sitePaths.map:
      return (await import("./pages/artisan-map.page.js")).mountArtisanMap(section);
    case sitePaths.notifications:
      return (await import("./pages/notifications.page.js")).mountNotifications(section, account);
    case sitePaths.administration:
      return (await import("./pages/admin.page.js")).mountArtisanAdministration(section, account);
  }
}

async function mountCatalogPage(section) {
  const query = new URLSearchParams(location.search);
  const store = !query.get("co-so") && (query.get("mua") === "1" || query.has("xuong"));
  const catalog = store
    ? (await import("./pages/catalog.page.js")).mountCatalog(section)
    : (await import("./pages/workshop-reference.page.js")).mountReferenceCatalog(section, query.get("co-so"));
  const views = document.createElement("nav");
  views.className = "catalog-switch";
  views.setAttribute("aria-label", "Loại danh mục");
  views.innerHTML = `
    <a class="button button-outline" href="${sitePaths.catalog}">Mẫu lụa tham khảo</a>
    <a class="button button-outline" href="${sitePaths.catalog}?mua=1">Sản phẩm đang bán</a>`;
  views.children[Number(store)].setAttribute("aria-current", "page");
  section.prepend(views);
  if (location.hash === "#catalog-search") catalog.focusSearch();
  return catalog;
}
