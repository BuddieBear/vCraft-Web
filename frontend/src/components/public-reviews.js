import { mediaUrl, request } from "../api/http.js";

const number = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });
const date = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeZone: "Asia/Ho_Chi_Minh" });

function renderReview(review, workshop) {
  const item = document.createElement("li");
  const header = document.createElement("header");
  const author = document.createElement("strong");
  const time = document.createElement("time");
  const rating = document.createElement("p");
  const comment = document.createElement("p");
  author.textContent = review.buyer.fullName;
  time.dateTime = review.createdAt;
  time.textContent = date.format(new Date(review.createdAt));
  header.append(author, time);
  rating.className = "public-review-rating";
  rating.textContent = [
    `${review.rating}/5 sao`,
    workshop && (review.targetType === "ARTISAN" ? "Về xưởng" : "Về sản phẩm"),
    review.isVerifiedPurchase && "Đã mua hàng",
  ].filter(Boolean).join(" · ");
  comment.className = "public-review-comment";
  comment.textContent = review.comment;
  item.append(header, rating, comment);
  const gallery = document.createElement("div");
  gallery.className = "workshop-pictures";
  for (const url of review.mediaUrls) {
    const src = mediaUrl(url);
    if (!src) continue;
    const image = document.createElement("img");
    image.src = src;
    image.alt = "Ảnh khách hàng đính kèm";
    image.loading = "lazy";
    image.referrerPolicy = "no-referrer";
    gallery.append(image);
  }
  if (gallery.childElementCount) item.append(gallery);
  return item;
}

export function mountPublicReviews(parent, { productSlug, workshopId }) {
  const workshop = Boolean(workshopId);
  const path = workshop ? "/reviews/artisans/" + encodeURIComponent(workshopId) : "/reviews/products/" + encodeURIComponent(productSlug);
  const section = document.createElement("section");
  section.className = "public-reviews";
  section.setAttribute("aria-labelledby", "public-reviews-title");
  section.innerHTML = `
    <h2 id="public-reviews-title">${workshop ? "Đánh giá về xưởng" : "Đánh giá sản phẩm"}</h2>
    <p class="public-review-summary" hidden></p>
    <ul class="public-review-list"></ul>
    <p role="status"></p>
    <button class="button button-outline" type="button" hidden>Xem thêm đánh giá</button>`;
  parent.append(section);
  const summary = section.querySelector(".public-review-summary");
  const list = section.querySelector("ul");
  const status = section.querySelector("[role=status]");
  const more = section.querySelector("button");
  let page = 1;

  async function load() {
    more.disabled = true;
    status.textContent = "Đang tải đánh giá…";
    try {
      const result = await request(path + "?" + new URLSearchParams({ page, limit: 6 }));
      const { totalReviews, averageRating } = result.summary;
      summary.hidden = totalReviews === 0;
      summary.textContent = totalReviews ? `${number.format(averageRating)}/5 sao · ${number.format(totalReviews)} đánh giá` : "";
      list.append(...result.data.map(review => renderReview(review, workshop)));
      status.textContent = totalReviews === 0 ? "Chưa có đánh giá." : "";
      more.hidden = !result.pagination.hasNext;
      more.textContent = "Xem thêm đánh giá";
      page++;
    } catch {
      status.textContent = "Chưa tải được đánh giá.";
      more.textContent = "Thử lại";
      more.hidden = false;
    } finally {
      more.disabled = false;
    }
  }
  more.addEventListener("click", load);
  load();
}
