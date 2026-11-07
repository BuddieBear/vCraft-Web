import { asset, icon } from "../components/ui.js";
import { artisans } from "../data/demo-data.js";

export function renderArtisans(container) {
  container.innerHTML = `
    <div class="section-heading">
      <div><p class="eyebrow"><span></span> 03 / Người giữ nghề</p><h2 id="artisans-title">Ghé thăm <em>hai xưởng lụa.</em></h2></div>
      <p>Hai hồ sơ minh họa cho cách vCraft giới thiệu nghệ nhân, kỹ thuật và sản phẩm của từng xưởng.</p>
    </div>
    <div class="artisan-grid">
      ${artisans.map(workshop => `
        <article class="artisan-card" id="xuong-${workshop.id}" tabindex="-1">
          <img src="${asset(workshop.image)}" width="480" height="480" loading="lazy" decoding="async" alt="Ảnh minh họa ${workshop.name}">
          <div class="artisan-copy">
            <p class="eyebrow">${workshop.specialty}</p>
            <h3>${workshop.name}</h3>
            <p class="artisan-name">${workshop.artisan}</p>
            <p>${workshop.story}</p>
            <button class="text-button" type="button" data-workshop="${workshop.id}">Xem sản phẩm của xưởng ${icon("arrow")}</button>
          </div>
        </article>`).join("")}
    </div>`;
}
