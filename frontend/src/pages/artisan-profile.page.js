import { mountReferenceShowroom, mountReferenceWorkshops } from "./workshop-reference.page.js";
import { mediaUrl, request } from "../api/http.js";
import { sitePaths } from "../site-paths.js";
import { card, mountPageList, paragraph } from "./wholesale/view.js";
import { mountPublicReviews } from "../components/public-reviews.js";

export function renderArtisans(container, referenceSlug) {
  if (referenceSlug) return mountReferenceShowroom(container, referenceSlug);
  const workshopId = new URLSearchParams(location.search).get("xuong");
  if (workshopId) return renderWorkshop(container, workshopId);
  container.innerHTML = `
    <div class="section-heading">
      <div><p class="eyebrow"><span></span> Người giữ nghề</p><h1 id="artisans-title" class="page-title">Hồ sơ <em>xưởng lụa.</em></h1></div>
      <a class="text-link" href="${sitePaths.map}">Bản đồ làng nghề</a>
    </div>
    <section class="workshop-directory trade-list-section" aria-labelledby="registered-workshops-title">
      <h2 id="registered-workshops-title">Xưởng đã xác minh trên vCraft</h2>
    </section>
    <section class="reference-workshops" aria-labelledby="reference-workshops"></section>`;
  mountPageList(container.querySelector(".workshop-directory"), {
    key: "public-workshops", path: "/artisans?storefront=true", label: "xưởng đã xác minh", auth: false,
    state: new Map(), signal: new AbortController().signal, empty: "Chưa có xưởng được công bố trên vCraft.",
    render(workshops, target) {
      for (const workshop of workshops) {
        const entry = card(target, workshop.workshopName, workshop.address);
        entry.append(paragraph(visitorStatus(workshop)));
        const link = document.createElement("a");
        link.className = "text-link";
        link.href = sitePaths.artisans + "?" + new URLSearchParams({ xuong: workshop.id });
        link.textContent = "Xem hồ sơ và sản phẩm";
        entry.append(link);
      }
    },
  });
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
      <p class="workshop-title"></p>
      <p class="workshop-story"></p>
      <div class="workshop-pictures"></div>
      <section class="workshop-certificates" hidden><h2>Chứng nhận chất lượng</h2><ul></ul></section>
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
    article.querySelector(".workshop-hours").textContent = visitorStatus(workshop);
    article.querySelector(".workshop-title").textContent = workshop.artisanTitle || "";
    article.querySelector(".workshop-story").textContent = workshop.familyHistory || "";
    for (const [index, photo] of workshop.galleryImages.entries()) {
      const src = mediaUrl(photo);
      if (!src) continue;
      const image = document.createElement("img");
      image.alt = `Ảnh xưởng ${index + 1}`;
      image.loading = "lazy";
      image.referrerPolicy = "no-referrer";
      image.src = src;
      article.querySelector(".workshop-pictures").append(image);
    }
    const certificates = article.querySelector(".workshop-certificates");
    for (const documentInfo of workshop.certificates) {
      const item = document.createElement("li");
      item.textContent = `${documentInfo.title} · ${documentInfo.issuingAuthority} · ${documentInfo.issuedYear}`;
      const url = mediaUrl(documentInfo.certificateImageUrl);
      if (url) {
        const link = document.createElement("a");
        link.className = "text-link";
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Xem ảnh chứng nhận";
        item.append(" ", link);
      }
      certificates.querySelector("ul").append(item);
    }
    certificates.hidden = !workshop.certificates.length;
    article.querySelector("a.button").href = sitePaths.catalog + "?" + new URLSearchParams({ mua: "1", xuong: workshop.id });
    article.hidden = false;
    status.textContent = "";
    mountPublicReviews(container, { workshopId: workshop.id });
  } catch (error) {
    status.textContent = error.message;
  }
}

function visitorStatus(workshop) {
  if (!workshop.isOpenForVisitors) return "Chưa mở cửa tham quan";
  return workshop.openingHours ? "Đón khách · " + workshop.openingHours : "Đón khách tham quan";
}
