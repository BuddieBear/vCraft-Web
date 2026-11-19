import { asset, icon } from "../components/ui.js";
import { request } from "../api/http.js";
import { homeMapId, newsArticlePath, sitePaths } from "../site-paths.js";
import { referenceProductCard } from "../components/reference-product-card.js";

export function renderHome(container) {
  container.innerHTML = `
    <div class="hero">
      <div class="hero-copy section-shell">
        <p class="eyebrow"><span></span> Sổ tay làng nghề · Ninh Bình</p>
        <h1 id="hero-title">Lụa Nha Xá <em>bên sông Hồng</em></h1>
        <p class="hero-intro">Xem những mẫu lụa của làng, tìm xưởng để ghé thăm và theo dõi từng lô từ khung cửi đến thành phẩm.</p>
        <div class="hero-actions">
          <a class="button button-primary" href="${sitePaths.catalog}">Xem mẫu lụa ${icon("arrow")}</a>
          <a class="button button-outline" href="${sitePaths.journal}">Tra nhật ký lô</a>
        </div>
      </div>
      <figure class="hero-photo">
        <img src="${asset("nha-xa-weaver.webp")}" srcset="${asset("nha-xa-weaver-small.webp")} 720w, ${asset("nha-xa-weaver.webp")} 1600w"
          sizes="100vw" width="1600" height="900" alt="Người thợ nâng mép tấm lụa đỏ bên khung cửi gỗ" fetchpriority="high">
        <figcaption>Ảnh minh họa nghề dệt lụa</figcaption>
      </figure>
    </div>
    <nav class="hero-index section-shell" aria-label="Mục lục sổ tay">
      <a href="${sitePaths.artisans}"><span class="hero-index-icon">${icon("thread")}</span><strong>Hồ sơ xưởng</strong>${icon("upRight")}</a>
      <a href="#${homeMapId}"><span class="hero-index-icon">${icon("pin")}</span><strong>Bản đồ làng nghề</strong>${icon("arrow")}</a>
      <a href="${sitePaths.news}"><span class="hero-index-icon">${icon("grid")}</span><strong>Tin cộng đồng</strong>${icon("upRight")}</a>
    </nav>

    <section class="home-featured section-shell" aria-labelledby="home-silk-title" hidden>
      <div class="section-heading">
        <div><h2 id="home-silk-title">Mẫu lụa từ các xưởng</h2><p>Ảnh mẫu và giá tham khảo theo công bố của từng cơ sở.</p></div>
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

    <section id="${homeMapId}" class="home-map section-shell" aria-labelledby="home-map-title">
      <h2 id="home-map-title" class="page-title">Bản đồ làng nghề</h2>
      <p role="status">Đang tải bản đồ khi bạn cuộn tới đây…</p>
    </section>

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
  loadHomeMap(mapSection);
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
    featured.querySelector(".reference-grid").append(...highlights.map(referenceProductCard));
    featured.hidden = false;
  }).catch(() => { /* The full catalog handles loading errors and retries. */ });

  request("/news?limit=3").then(({ data }) => {
    if (!data.length) return;
    const list = container.querySelector(".home-news-titles");
    for (const { title, slug } of data) {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = newsArticlePath(slug);
      link.textContent = title;
      item.append(link);
      list.append(item);
    }
    list.hidden = false;
    container.querySelector("[data-news-intro]").hidden = true;
  }).catch(() => { /* The full news page handles loading errors. */ });
}

function loadHomeMap(section) {
  async function start() {
    try {
      const { mountArtisanMap } = await import("./artisan-map.page.js");
      mountArtisanMap(section, { embedded: true });
    } catch {
      section.querySelector("[role=status]").textContent = "Chưa tải được bản đồ.";
      const link = document.createElement("a");
      link.className = "text-link";
      link.href = sitePaths.map;
      link.textContent = "Mở trang bản đồ";
      section.append(link);
    }
  }
  if (!("IntersectionObserver" in window)) {
    start();
    return;
  }
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    observer.disconnect();
    start();
  }, { rootMargin: "240px 0px" });
  observer.observe(section);
}
