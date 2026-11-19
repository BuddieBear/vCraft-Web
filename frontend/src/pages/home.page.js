import { asset, icon } from "../components/ui.js";
import { request } from "../api/http.js";
import { sitePaths } from "../site-paths.js";
import { referenceProductCard } from "./workshop-reference.page.js";
import { mountArtisanMap } from "./artisan-map.page.js";

export const homeMapId = "ban-do-lang-nghe";

export function renderHome(container, productDialog) {
  container.innerHTML = `
    <div class="hero section-shell">
      <div class="hero-copy">
        <p class="eyebrow"><span></span> Sổ tay làng lụa · Ninh Bình</p>
        <h1 id="hero-title">Nha Xá, <em>sắc lụa bên sông.</em></h1>
        <p class="hero-intro">Theo một tấm lụa qua bàn tay người thợ, từ khung cửi đến mẻ nhuộm củ nâu, lá bàng.</p>
        <div class="hero-actions">
          <a class="button button-primary" href="${sitePaths.catalog}">Khám phá mẫu lụa ${icon("arrow")}</a>
          <a class="button button-outline" href="${sitePaths.journal}">Nhật ký lô</a>
        </div>
      </div>
      <figure class="hero-photo">
        <img src="${asset("hero-nha-xa.webp")}" srcset="${asset("hero-nha-xa-small.webp")} 640w, ${asset("hero-nha-xa.webp")} 1280w"
          sizes="(max-width: 760px) calc(100vw - 32px), (max-width: 1400px) 52vw, 740px"
          width="1280" height="960" alt="Minh họa người thợ hong tấm lụa nâu đồng trong xưởng nhuộm" fetchpriority="high">
        <figcaption>Minh họa hong lụa sau nhuộm</figcaption>
      </figure>
    </div>
    <nav class="hero-index section-shell" aria-label="Mục lục sổ tay">
      <a href="${sitePaths.artisans}"><strong>Hồ sơ xưởng</strong>${icon("upRight")}</a>
      <a href="#${homeMapId}"><strong>Bản đồ làng nghề</strong>${icon("arrow")}</a>
      <a href="${sitePaths.news}"><strong>Tin cộng đồng</strong>${icon("upRight")}</a>
    </nav>

    <section class="home-featured section-shell" aria-labelledby="home-silk-title" hidden>
      <div class="section-heading">
        <div><h2 id="home-silk-title">Mẫu lụa nổi bật</h2><p>Ảnh mẫu và giá tham khảo theo công bố của từng cơ sở.</p></div>
        <a class="text-link" href="${sitePaths.catalog}">Xem tất cả mẫu lụa ${icon("arrow")}</a>
      </div>
      <div class="reference-grid"></div>
    </section>

    <section class="home-story" aria-labelledby="home-story-title">
      <div class="home-story-grid section-shell">
        <figure>
          <img src="${asset("weaving-detail.webp")}" width="414" height="414" loading="lazy" decoding="async" alt="Con thoi gỗ trên khung cửi với những sợi lụa màu nâu đỏ">
          <figcaption>Minh họa khung cửi và con thoi</figcaption>
        </figure>
        <div class="home-story-copy">
          <p class="eyebrow"><span></span> Nha Xá · Ninh Bình</p>
          <h2 id="home-story-title">Làng lụa bên <em>sông Hồng.</em></h2>
          <p>Nằm ở phường Duy Tân, Nha Xá lưu giữ nghề dệt lụa qua nhiều thế hệ. Vân dệt và những sắc nhuộm từ củ nâu, lá bàng tạo nên vẻ riêng của lụa làng.</p>
          <a class="text-link" href="https://sodulich.ninhbinh.gov.vn/vi/du-lich-lang-nghe/nghe-det-lua-nha-xa-hon-lua-gan-nghin-nam-ben-bo-song-hong-2408.html">Đọc về nghề dệt Nha Xá ${icon("upRight")}</a>
        </div>
      </div>
    </section>

    <section id="${homeMapId}" class="home-map section-shell" aria-labelledby="home-map-title"></section>

    <div class="home-discover section-shell">
      <section aria-labelledby="home-news-title">
        <h2 id="home-news-title">Tin cộng đồng</h2>
        <p data-news-intro>Lịch lễ hội, thông báo và tin tức của làng nghề.</p>
        <ul class="home-news-titles" hidden></ul>
        <a class="text-link" href="${sitePaths.news}">Xem bảng tin ${icon("arrow")}</a>
      </section>
      <section aria-labelledby="home-order-title">
        <h2 id="home-order-title">Đặt lụa theo nhu cầu</h2>
        <p>Gửi số lượng, quy cách và ngày cần hàng để nhận báo giá từ xưởng.</p>
        <a class="text-link" href="${sitePaths.wholesale}">Mở trang đặt sỉ ${icon("arrow")}</a>
      </section>
    </div>`;

  const mapSection = container.querySelector("#" + homeMapId);
  mountArtisanMap(mapSection, { embedded: true });
  if (location.hash === "#" + homeMapId) mapSection.scrollIntoView();

  const featured = container.querySelector(".home-featured");
  request("/artisans/reference/products").then(({ data }) => {
    const groups = new Set();
    const highlights = data.filter(product => {
      const group = product.workshopName + " · " + product.type;
      if (groups.has(group)) return false;
      groups.add(group);
      return true;
    }).slice(0, 3);
    if (!highlights.length) return;
    featured.querySelector(".reference-grid").append(...highlights.map(product => referenceProductCard(product, productDialog)));
    featured.hidden = false;
  }).catch(() => { /* The full catalog handles loading errors and retries. */ });

  request("/news?limit=3").then(({ data }) => {
    if (!data.length) return;
    const list = container.querySelector(".home-news-titles");
    for (const { title } of data) {
      const item = document.createElement("li");
      item.textContent = title;
      list.append(item);
    }
    list.hidden = false;
    container.querySelector("[data-news-intro]").hidden = true;
  }).catch(() => { /* The full news page handles loading errors. */ });
}
