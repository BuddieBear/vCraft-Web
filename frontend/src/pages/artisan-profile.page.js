import { mountReferenceWorkshops } from "./workshop-reference.page.js";
import { mediaUrl, request } from "../api/http.js";
import { sitePaths } from "../site-paths.js";

export function renderArtisans(container) {
  const workshopId = new URLSearchParams(location.search).get("xuong");
  if (workshopId) return renderWorkshop(container, workshopId);
  container.innerHTML = `
    <div class="section-heading">
      <div><p class="eyebrow"><span></span> Người giữ nghề</p><h1 id="artisans-title" class="page-title">Hồ sơ <em>xưởng lụa.</em></h1></div>
      <a class="text-link" href="${sitePaths.map}">Bản đồ làng nghề</a>
    </div>
    <section class="reference-workshops" aria-labelledby="reference-workshops"></section>`;
  mountReferenceWorkshops(container.querySelector(".reference-workshops"));
}

async function renderWorkshop(container, id) {
  container.innerHTML = `
    <a class="text-link artisan-all" href="${sitePaths.artisans}">Tất cả xưởng</a>
    <h1 id="artisans-title" class="page-title">Hồ sơ xưởng</h1>
    <p class="reference-status" role="status">Đang tải hồ sơ…</p>
    <article class="trade-card workshop-showroom" hidden>
      <img alt="" width="440" height="330" loading="lazy" hidden>
      <p class="workshop-address"></p>
      <p class="workshop-hours"></p>
      <p class="workshop-story"></p>
      <a class="button button-primary">Xem sản phẩm đang bán</a>
    </article>`;
  const status = container.querySelector("[role=status]");
  try {
    const { data: workshop } = await request("/artisans/" + encodeURIComponent(id) + "?storefront=true");
    container.querySelector("h1").textContent = workshop.workshopName;
    document.title = workshop.workshopName + " · vCraft";
    const article = container.querySelector("article");
    const picture = article.querySelector("img");
    const src = mediaUrl(workshop.coverImageUrl);
    if (src) {
      picture.src = src;
      picture.hidden = false;
    }
    article.querySelector(".workshop-address").textContent = workshop.address;
    article.querySelector(".workshop-hours").textContent = workshop.isOpenForVisitors ? workshop.openingHours || "Xưởng mở cửa tham quan" : "";
    article.querySelector(".workshop-story").textContent = workshop.familyHistory || "";
    article.querySelector("a").href = sitePaths.catalog + "?" + new URLSearchParams({ mua: "1", xuong: workshop.id });
    article.hidden = false;
    status.textContent = "";
  } catch (error) {
    status.textContent = error.message;
  }
}
