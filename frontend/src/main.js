import { icon } from "./components/ui.js";
import { renderHome } from "./pages/home.page.js";
import { mountCatalog } from "./pages/catalog.page.js";
import { mountExhibition } from "./pages/exhibition.page.js";
import { renderArtisans } from "./pages/artisan-profile.page.js";
import { showProduct } from "./pages/product-detail.page.js";
import { mountCart } from "./pages/cart.page.js";

const header = document.querySelector("#header");
const footer = document.querySelector("#footer");
const notice = document.querySelector("#notice");
const brand = '<img src="./public/favicon.svg" width="38" height="38" alt=""><span>vCraft</span>';

header.innerHTML = `
  <div class="masthead"><span>VẠN PHÚC · HÀ ĐÔNG</span><span>TRIỂN LÃM SỐ LÀNG NGHỀ</span><span class="demo-label">BẢN DEMO</span></div>
  <div class="header-inner section-shell">
    <a class="brand" href="#trang-chu" aria-label="vCraft — Trang chủ">${brand}</a>
    <button class="icon-button menu-toggle" type="button" aria-label="Mở menu" aria-expanded="false" aria-controls="nav">${icon("menu")}</button>
    <nav class="nav-links" id="nav" aria-label="Điều hướng chính">
      <a href="#trang-chu" aria-current="location">Trang chủ</a>
      <a href="#trien-lam">Triển lãm</a>
      <a href="#nghe-nhan">Nghệ nhân</a>
      <a href="#san-pham">Sản phẩm</a>
    </nav>
    <div class="header-actions">
      <button class="icon-button" type="button" id="search-button" aria-label="Tìm sản phẩm">${icon("search")}</button>
      <button class="icon-button cart-trigger" type="button" id="cart-button" aria-label="Mở giỏ hàng (0)">${icon("bag")}<span id="cart-count" aria-hidden="true">0</span></button>
    </div>
  </div>`;

footer.innerHTML = `
  <div class="footer-inner section-shell">
    <div><a class="brand" href="#trang-chu" aria-label="vCraft — Trang chủ">${brand}</a><p>Triển lãm số về lụa làng Vạn Phúc.</p></div>
    <p>Dữ liệu, hồ sơ nghệ nhân và hình ảnh dùng để minh họa giao diện.</p>
    <a class="text-link" href="#trang-chu">Về đầu trang ${icon("upRight")}</a>
  </div>`;

let noticeTimer;
function notify(message) {
  notice.textContent = message;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { notice.textContent = ""; }, 3300);
}

const cartButton = header.querySelector("#cart-button");
const badge = header.querySelector("#cart-count");
const cart = mountCart(document.querySelector("#cart-dialog"), count => {
  badge.textContent = count;
  cartButton.setAttribute("aria-label", `Mở giỏ hàng (${count})`);
}, notify);

renderHome(document.querySelector("#trang-chu"));
mountExhibition(document.querySelector("#trien-lam"));
renderArtisans(document.querySelector("#nghe-nhan"));
const catalog = mountCatalog(document.querySelector("#san-pham"), product => {
  showProduct(document.querySelector("#product-dialog"), product, cart.add);
});

header.querySelector("#search-button").addEventListener("click", catalog.focusSearch);
cartButton.addEventListener("click", cart.open);
document.querySelectorAll("[data-workshop]").forEach(button => {
  button.addEventListener("click", () => catalog.selectWorkshop(button.dataset.workshop));
});

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

function syncNavigation() {
  const active = location.hash || "#trang-chu";
  nav.querySelectorAll("a").forEach(link => {
    if (link.getAttribute("href") === active) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
}
window.addEventListener("hashchange", syncNavigation);
syncNavigation();
