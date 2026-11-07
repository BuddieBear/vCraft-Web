import { asset, icon } from "../components/ui.js";

export function renderHome(container) {
  container.innerHTML = `
    <div class="hero section-shell">
      <div class="hero-copy">
        <p class="eyebrow"><span></span> Làng nghề 01 · Hà Đông</p>
        <h1 id="hero-title">Lụa kể chuyện<br><em>làng Vạn Phúc.</em></h1>
        <p class="hero-intro">Ghé xưởng, nghe chuyện người dệt và khám phá những tấm lụa mang dấu tay làng nghề.</p>
        <div class="hero-actions">
          <a class="button button-primary" href="#trien-lam">Khám phá làng nghề ${icon("arrow")}</a>
          <a class="button button-outline" href="#san-pham">Xem sản phẩm</a>
        </div>
      </div>
      <figure class="hero-photo">
        <img src="${asset("hero-loom.webp")}" srcset="${asset("hero-loom-small.webp")} 640w, ${asset("hero-loom.webp")} 1280w"
          sizes="(max-width: 760px) calc(100vw - 32px), (max-width: 1340px) 53vw, 680px"
          width="1280" height="960" alt="Minh họa nghệ nhân bên khung dệt lụa màu vàng và đất nung" fetchpriority="high">
        <figcaption><span>01 / TRONG XƯỞNG DỆT</span><span>Vạn Phúc, Hà Nội</span></figcaption>
      </figure>
    </div>
    <div class="hero-index section-shell">
      <a href="#trien-lam">${icon("thread")} Từ sợi tơ đến tấm lụa ${icon("upRight")}</a>
      <a href="#nghe-nhan">${icon("pin")} Gặp người giữ nghề ${icon("upRight")}</a>
      <a href="#san-pham">${icon("grid")} Bộ sưu tập lụa ${icon("upRight")}</a>
    </div>`;
}
