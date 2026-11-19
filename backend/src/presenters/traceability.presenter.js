import { describeSilkStages } from "../../../frontend/src/data/silk-stages.js";
import { batches as demoBatches } from "../../../frontend/src/data/demo-data.js";
import { sitePaths } from "../../../frontend/src/site-paths.js";
import { icon } from "../../../frontend/src/components/ui.js";

const demoCodes = new Set(demoBatches.map(({ code }) => code));
const stagePhotos = new Map([
    ["DET_LUA", {
        src: "https://cdn.nhandan.vn/images/d224a8e411028f91825a26a6c26999575b63faaf2af9afbe94f56eef5ab6e78e82b7618fffdfc0fdf983561969027e33d26f03e8ff096a0ba2adcaaf5dfec039/2025-08-12-20h31-21.png.avif",
        alt: "Người thợ dệt lụa tại làng Nha Xá.",
        credit: "Ảnh tư liệu nghề dệt tại Nha Xá · Báo Nhân Dân",
    }],
    ["NHUOM_MAU", {
        src: "https://i1-vnexpress.vnecdn.net/2012/01/08/nhaxa6-1349675525.jpg?w=480&h=0&q=100&dpr=1&fit=crop&s=iX9uWP-a6aljDm41giTsnw",
        alt: "Công đoạn nhuộm lụa thủ công tại làng Nha Xá.",
        credit: "Ảnh tư liệu nhuộm lụa tại Nha Xá · Lê Hiếu, VnExpress",
    }],
]);

const html = (value) => String(value ?? "").replace(/[&<>"']/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const date = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeZone: "Asia/Ho_Chi_Minh" });

function imageUrl(value) {
    if (/^\/(?:uploads\/[a-f0-9-]+\.webp|public\/images\/[a-z0-9_-]+\.(?:webp|png|jpe?g|avif))$/i.test(value)) return value;
    try {
        const url = new URL(value);
        if (["http:", "https:"].includes(url.protocol) && !url.username && !url.password) return url.href;
    } catch { /* skip malformed links */ }
    return null;
}

function renderStage({ code, title, guide, number, illustration, log }, index) {
    const images = (log?.evidenceImageUrls ?? []).map(imageUrl).filter(Boolean)
        .map((url) => `<img loading="lazy" decoding="async" referrerpolicy="no-referrer" src="${html(url)}" alt="Ảnh minh chứng · ${html(title)}">`).join("");
    const example = stagePhotos.get(code) || illustration;
    const dimensions = example.width ? ` width="${example.width}" height="${example.height}"` : "";
    const media = images
        ? `<figure><div class="trace-evidence">${images}</div><figcaption>Ảnh minh chứng của lô</figcaption></figure>`
        : `<figure><img loading="lazy" decoding="async" referrerpolicy="no-referrer"${dimensions} src="${html(example.src)}" alt="${html(example.alt)}"><figcaption>${html(example.credit || "Ảnh minh họa công đoạn")}</figcaption></figure>`;
    const recorded = log?.loggedAt
        ? `<time datetime="${log.loggedAt.toISOString()}">${date.format(log.loggedAt)}</time>`
        : `<span class="trace-stage-pending">Chưa ghi nhận</span>`;
    const customTitle = log && !title.toLowerCase().includes(log.stageTitle.toLowerCase()) ? log.stageTitle : "";

    return `<li><details class="trace-stage"${index === 0 ? " open" : ""}>
          <summary>
            <span class="trace-step"><span class="sr-only">Công đoạn </span>${html(number)}</span>
            <span class="trace-stage-overview">
              <span class="trace-stage-title">${html(title)}</span>
              <span class="trace-stage-guide">${html(guide)}</span>
            </span>
            ${recorded}
            <span class="trace-toggle">${icon("plus")}${icon("minus")}</span>
          </summary>
          <div class="trace-stage-body">
            <div class="trace-stage-record">
              <h3>Ghi chú của lô</h3>
              ${customTitle ? `<p><strong>${html(customTitle)}</strong></p>` : ""}
              <p>${log ? html(log.description) : "Chưa có nhật ký cho công đoạn này."}</p>
            </div>
            <div class="trace-stage-media">${media}</div>
          </div>
        </details></li>`;
}

export function renderTraceabilityPage(batch) {
    const { batchCode, product, logs, status } = batch;
    const isComplete = status === "COMPLETED";
    const workshop = demoCodes.has(batchCode) ? "Nhật ký minh họa" : product.artisan.workshopName;
    const story = product.culturalStory || product.description;
    const cover = product.mediaUrls?.map(imageUrl).find(Boolean);
    const journalUrl = sitePaths.journal + "?" + new URLSearchParams({ lo: batchCode });
    const stages = describeSilkStages(logs);
    const recorded = stages.filter(stage => stage.log).length;
    return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Truy xuất lô ${html(batchCode)} · vCraft</title>
  <link rel="icon" href="/public/favicon.svg">
  <link rel="stylesheet" href="/src/styles/main.css">
  <link rel="stylesheet" href="/src/styles/trace.css">
</head>
<body>
  <a class="skip-link" href="#main-content">Đến nội dung chính</a>
  <header class="trace-header">
    <nav class="section-shell" aria-label="Điều hướng nhật ký">
      <a class="brand" href="${sitePaths.home}" aria-label="vCraft — Trang chủ"><img src="/public/favicon.svg" width="38" height="38" alt=""><span>vCraft</span></a>
      <a class="text-link" href="${html(journalUrl)}">${icon("left")} Tra mã lô khác</a>
    </nav>
  </header>
  <main id="main-content" class="trace-main section-shell">
    <section class="trace-hero${cover ? " trace-hero-with-cover" : ""}" aria-labelledby="trace-title">
      <div class="trace-intro">
        <p class="eyebrow"><span></span> Truy xuất nguồn gốc</p>
        <h1 id="trace-title">${html(product.name)}</h1>
        ${story ? `<p class="trace-story">${html(story)}</p>` : ""}
        <dl class="trace-meta">
          <div><dt>Mã lô</dt><dd>${html(batchCode)}</dd></div>
          <div><dt>Nguồn nhật ký</dt><dd>${html(workshop)}</dd></div>
        </dl>
      </div>
      ${cover ? `<img class="trace-cover" src="${html(cover)}" alt="${html(product.name)}" fetchpriority="high" referrerpolicy="no-referrer">` : ""}
    </section>
    <section class="trace-timeline" aria-labelledby="trace-timeline-title">
      <div class="trace-timeline-head">
        <h2 id="trace-timeline-title">Nhật ký sản xuất</h2>
        <span class="trace-state${isComplete ? " is-complete" : ""}">${icon(isComplete ? "check" : "thread")} ${isComplete ? "Đã hoàn thành" : "Đang sản xuất"}</span>
      </div>
      <p class="trace-timeline-guide">Năm mục bên dưới giải thích quy trình dệt lụa Nha Xá. Mở từng công đoạn để xem ghi chú và ảnh.</p>
      <div class="trace-progress">
        <label for="stage-progress"><strong>${recorded}/${stages.length}</strong> công đoạn đã ghi nhận</label>
        <progress id="stage-progress" max="${stages.length}" value="${recorded}"></progress>
      </div>
      <ol class="trace-stages" role="list">${stages.map(renderStage).join("")}</ol>
    </section>
  </main>
</body>
</html>`;
}
