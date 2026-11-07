import { asset, icon } from "../components/ui.js";
import { batch } from "../data/demo-data.js";

export function mountExhibition(container) {
  container.innerHTML = `
    <div class="exhibition-grid section-shell">
      <figure class="exhibition-photo">
        <img src="${asset("weaving-detail.webp")}" width="480" height="480" loading="lazy" decoding="async"
          alt="Minh họa con thoi trên khung dệt với sợi lụa màu đất nung">
        <figcaption>NHẬT KÝ LÔ MẪU · ${batch.code}</figcaption>
      </figure>
      <div class="exhibition-copy">
        <p class="eyebrow"><span></span> 02 / Triển lãm số</p>
        <h2 id="exhibition-title">Một tấm lụa,<br><em>năm công đoạn.</em></h2>
        <p>Theo dấu lô Sen Hồng từ guồng tơ đến tấm lụa đã hoàn thiện. Chọn một công đoạn để đọc nhật ký.</p>
        <div class="stage-list">
          ${batch.stages.map(({ name, description }, index) => `
            <details${index === 0 ? " open" : ""} name="weaving-stage">
              <summary><span class="stage-number">0${index + 1}</span><span>${name}</span>${icon("plus")}</summary>
              <p>${description}</p>
            </details>`).join("")}
        </div>
      </div>
    </div>`;
}
