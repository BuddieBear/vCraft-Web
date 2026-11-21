import { batches as demoBatches } from "../../../frontend/src/data/demo-data.js";
import { sitePaths } from "../../../frontend/src/site-paths.js";
import { icon } from "../../../frontend/src/components/ui.js";
import { escapeHtml as html, renderProductionGuide } from "../../../frontend/src/components/production-guide.js";

const demoCodes = new Set(demoBatches.map(({ code }) => code));
const date = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeZone: "Asia/Ho_Chi_Minh" });

function imageUrl(value) {
    if (/^\/(?:uploads\/[a-f0-9-]+\.webp|public\/images\/[a-z0-9_-]+\.(?:webp|png|jpe?g|avif))$/i.test(value)) return value;
    try {
        const url = new URL(value);
        if (["http:", "https:"].includes(url.protocol) && !url.username && !url.password) return url.href;
    } catch { /* Skip malformed media URLs. */ }
    return null;
}

function renderLog(log, index) {
    const { loggedAt, stageTitle, description, evidenceImageUrls } = log;
    const images = evidenceImageUrls.map(imageUrl).filter(Boolean).map(url =>
        '<img loading="lazy" decoding="async" referrerpolicy="no-referrer" src="' + html(url) + '" alt="Ảnh minh chứng · ' + html(stageTitle) + '">').join("");
    return `<li><details class="trace-stage"${index === 0 ? " open" : ""}>
      <summary>
        <span class="trace-step" aria-hidden="true">${index + 1}</span>
        <span class="trace-stage-title">${html(stageTitle)}</span>
        <time datetime="${loggedAt.toISOString()}">${date.format(loggedAt)}</time>
        <span class="trace-toggle">${icon("plus")}${icon("minus")}</span>
      </summary>
      <div class="trace-stage-body${images ? "" : " trace-stage-body-text"}">
        <p>${html(description)}</p>
        ${images ? `<figure class="trace-stage-media"><div class="trace-evidence">${images}</div><figcaption>Ảnh minh chứng của lô</figcaption></figure>` : ""}
      </div>
    </details></li>`;
}

function renderPage(product, { title, eyebrow, caption, attribution, cover, back, backLabel, body }) {
    const story = product.culturalStory || product.description;
    return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${html(title)} · vCraft</title>
  <link rel="icon" href="/public/favicon.svg">
  <link rel="stylesheet" href="/src/styles/main.css">
  <link rel="stylesheet" href="/src/styles/trace.css">
</head>
<body>
  <a class="skip-link" href="#main-content">Đến nội dung chính</a>
  <header class="trace-header">
    <nav class="section-shell" aria-label="Điều hướng truy xuất">
      <a class="brand" href="${sitePaths.home}" aria-label="vCraft — Trang chủ"><img src="/public/favicon.svg" width="38" height="38" alt=""><span>vCraft</span></a>
      <a class="text-link" href="${html(back)}">${icon("left")} ${html(backLabel)}</a>
    </nav>
  </header>
  <main id="main-content" class="trace-main section-shell">
    <section class="trace-hero${cover ? " trace-hero-with-cover" : ""}" aria-labelledby="trace-title">
      <div class="trace-intro">
        <p class="eyebrow"><span></span> ${html(eyebrow)}</p>
        <h1 id="trace-title">${html(product.name)}</h1>
        ${story ? `<p class="trace-story">${html(story)}</p>` : ""}
        <dl class="trace-meta">
          ${caption ? `<div><dt>Mã lô</dt><dd>${html(caption)}</dd></div>` : ""}
          <div><dt>${caption ? "Nguồn nhật ký" : "Cơ sở"}</dt><dd>${html(attribution)}</dd></div>
        </dl>
        ${caption ? `<a class="trace-guide-link" href="#production-guide-title">Xem cách làm sản phẩm ${icon("arrow")}</a>` : ""}
      </div>
      ${cover ? `<img class="trace-cover" src="${html(cover)}" alt="${html(product.name)}" fetchpriority="high" referrerpolicy="no-referrer">` : ""}
    </section>
    ${body}
  </main>
</body>
</html>`;
}

export function renderTraceabilityPage({ batchCode, product, logs, status }) {
    const isComplete = status === "COMPLETED";
    const cover = product.mediaUrls?.map(imageUrl).find(Boolean);
    const steps = logs.length;
    return renderPage(product, {
        title: "Truy xuất lô " + batchCode,
        eyebrow: "Truy xuất nguồn gốc",
        caption: batchCode,
        attribution: demoCodes.has(batchCode) ? "Nhật ký minh họa" : product.artisan.workshopName,
        cover,
        back: sitePaths.journal + "?" + new URLSearchParams({ lo: batchCode }),
        backLabel: "Tra mã lô khác",
        body: `
    <section class="trace-timeline" aria-labelledby="trace-timeline-title">
      <div class="trace-timeline-head">
        <h2 id="trace-timeline-title">Nhật ký sản xuất</h2>
        <span class="trace-state${isComplete ? " is-complete" : ""}">${icon(isComplete ? "check" : "thread")} ${isComplete ? "Đã hoàn thành" : "Đang sản xuất"}</span>
      </div>
      ${steps ? `<p class="trace-timeline-guide">${steps} công đoạn có ghi nhận trong nhật ký lô.</p>
      <ol class="trace-stages" role="list">${logs.map(renderLog).join("")}</ol>`
          : '<p class="trace-timeline-guide">Lô chưa có công đoạn nào được ghi nhận.</p>'}
    </section>
    ${renderProductionGuide(product, { cover })}`,
    });
}

export function renderProductProductionPage(product, reference) {
    const cover = product.mediaUrls.map(imageUrl).find(Boolean);
    return renderPage(product, {
        title: "Quy trình " + product.name,
        eyebrow: "Quy trình sản xuất",
        attribution: product.artisan.workshopName,
        cover,
        back: sitePaths.catalog,
        backLabel: "Xem danh mục",
        body: renderProductionGuide(product, { reference, cover }),
    });
}
