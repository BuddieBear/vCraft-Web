import { asset, icon } from "../components/ui.js";
import { artisans, batches, products } from "../data/demo-data.js";

export function renderHome(container) {
  container.innerHTML = `
    <div class="issue-line section-shell">
      <span>SỔ TAY LÀNG LỤA <span aria-hidden="true">/</span> TẬP 01</span>
      <span class="issue-place">NHA XÁ · NINH BÌNH</span>
      <span class="demo-label">BẢN DEMO</span>
    </div>
    <div class="hero section-shell">
      <div class="hero-copy">
        <p class="eyebrow"><span></span> Ghi chép ven sông Hồng</p>
        <h1 id="hero-title">Nha Xá,<br><em>sắc lụa bên sông.</em></h1>
        <p class="hero-intro">Theo một tấm lụa qua bàn tay người thợ, từ khung cửi đến mẻ nhuộm củ nâu, lá bàng.</p>
        <div class="hero-actions">
          <a class="button button-primary" href="#trien-lam">Mở nhật ký lô ${icon("arrow")}</a>
          <a class="button button-outline" href="#san-pham">Xem danh mục</a>
        </div>
        <p class="hero-swatches">
          <span class="swatches" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
          <span>Sắc nâu, chàm và tơ mộc</span>
        </p>
      </div>
      <figure class="hero-photo">
        <img src="${asset("hero-nha-xa.webp")}" srcset="${asset("hero-nha-xa-small.webp")} 640w, ${asset("hero-nha-xa.webp")} 1280w"
          sizes="(max-width: 760px) calc(100vw - 52px), (max-width: 1340px) 48vw, 650px"
          width="1280" height="960" alt="Minh họa người thợ hong tấm lụa nâu đồng trong xưởng nhuộm" fetchpriority="high">
        <figcaption><span>ẢNH 01 · HONG LỤA SAU NHUỘM</span><span>MINH HỌA</span></figcaption>
      </figure>
    </div>
    <nav class="hero-index section-shell" aria-label="Mục lục sổ tay">
      <a href="#trien-lam"><span class="index-number">01</span><span><strong>Nhật ký dệt và nhuộm</strong><small>${batches.length} lô minh họa</small></span>${icon("upRight")}</a>
      <a href="#nghe-nhan"><span class="index-number">02</span><span><strong>Người giữ nghề</strong><small>${artisans.length} hồ sơ xưởng</small></span>${icon("upRight")}</a>
      <a href="#san-pham"><span class="index-number">03</span><span><strong>Danh mục lụa</strong><small>${products.length} mẫu lụa và phụ kiện</small></span>${icon("upRight")}</a>
    </nav>`;
}
