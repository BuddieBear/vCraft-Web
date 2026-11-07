import { asset, icon } from "../components/ui.js";
import { batches, productionStages, products } from "../data/demo-data.js";

export function mountExhibition(container) {
  container.innerHTML = `
    <div class="exhibition-grid section-shell">
      <figure class="exhibition-photo">
        <img src="${asset("weaving-detail.webp")}" width="480" height="480" loading="lazy" decoding="async"
          alt="Minh họa con thoi trên khung dệt với sợi lụa màu đất nung">
        <figcaption id="batch-caption"></figcaption>
      </figure>
      <div class="exhibition-copy">
        <p class="eyebrow"><span></span> 01 / Nhật ký lô</p>
        <h2 id="exhibition-title">Theo dấu <em>một mẻ nhuộm.</em></h2>
        <p>Củ nâu, cánh kiến và lá bàng là những nguyên liệu nhuộm được ghi nhận ở Nha Xá. Chọn một lô mẫu để theo dấu tấm lụa từ guồng tơ đến khi hoàn thiện.</p>
        <a class="text-link exhibition-source" href="https://sodulich.ninhbinh.gov.vn/vi/du-lich-lang-nghe/nghe-det-lua-nha-xa-hon-lua-gan-nghin-nam-ben-bo-song-hong-2408.html">Tìm hiểu nghề dệt Nha Xá ${icon("upRight")}</a>
        <label class="batch-field">
          <span>Lô minh họa</span>
          <select id="batch-select">
            ${batches.map(({ code }) => {
              const product = products.find(item => item.batch === code);
              return `<option value="${code}">${code} · ${product.name}</option>`;
            }).join("")}
          </select>
        </label>
        <div class="stage-list"></div>
      </div>
    </div>`;

  const select = container.querySelector("#batch-select");
  const caption = container.querySelector("#batch-caption");
  const stages = container.querySelector(".stage-list");

  function showBatch(code) {
    const batch = batches.find(item => item.code === code);
    if (!batch) return;
    select.value = code;
    caption.textContent = `NHẬT KÝ LÔ MẪU · ${code}`;
    stages.innerHTML = productionStages.map((name, index) => `
      <details${index === 0 ? " open" : ""} name="weaving-stage">
        <summary><span class="stage-number">0${index + 1}</span><span>${name}</span>${icon("plus")}</summary>
        <p>${batch.notes[index]}</p>
      </details>`).join("");
  }

  select.addEventListener("change", () => showBatch(select.value));
  showBatch(select.value);
  return showBatch;
}
