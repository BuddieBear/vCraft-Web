const html = (value) => String(value ?? "").replace(/[&<>"']/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const date = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeZone: "Asia/Ho_Chi_Minh" });

function evidenceUrl(value) {
    if (/^\/uploads\/[a-f0-9-]+\.webp$/.test(value)) return value;
    try {
        const url = new URL(value);
        if (["http:", "https:"].includes(url.protocol) && !url.username && !url.password) return url.href;
    } catch { /* skip malformed links */ }
    return null;
}

export function renderTraceabilityPage(batch) {
    const stages = batch.logs.map((log) => {
        const images = log.evidenceImageUrls.map(evidenceUrl).filter(Boolean)
            .map((url) => `<img loading="lazy" referrerpolicy="no-referrer" src="${html(url)}" alt="Ảnh minh chứng công đoạn">`).join("");
        return `<li><h2>${html(log.stageTitle)}</h2><time datetime="${log.loggedAt.toISOString()}">${date.format(log.loggedAt)}</time><p>${html(log.description)}</p>${images}</li>`;
    }).join("");
    return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Truy xuất lô ${html(batch.batchCode)} · vCraft</title>
<style>body{margin:0;background:#faf7f0;color:#27231e;font:1rem/1.6 system-ui,sans-serif}main{max-width:42rem;margin:auto;padding:2rem 1.25rem}h1,h2{line-height:1.2}ol{padding-left:1.5rem}li{margin-block:1.5rem}img{display:block;max-width:100%;height:auto;margin-block:.75rem}time{color:#5a5046}p{white-space:pre-wrap}</style></head>
<body><main><strong>vCraft · Truy xuất nguồn gốc</strong><h1>${html(batch.product.name)}</h1><p>Lô ${html(batch.batchCode)} · ${html(batch.product.artisan.workshopName)} · ${batch.status === "COMPLETED" ? "Đã hoàn thành" : "Đang sản xuất"}</p>
${batch.product.culturalStory ? `<p>${html(batch.product.culturalStory)}</p>` : ""}${stages ? `<ol>${stages}</ol>` : "<p>Chưa ghi nhận công đoạn sản xuất.</p>"}</main></body></html>`;
}
