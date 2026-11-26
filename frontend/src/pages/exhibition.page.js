import { request } from "../api/http.js";
import { batchQr } from "../components/batch-qr.js";
import { sitePaths } from "../site-paths.js";

export function mountExhibition(container) {
  container.innerHTML = `
    <div class="exhibition-grid section-shell">
      <div class="exhibition-copy">
        <h1 id="exhibition-title" class="page-title">Nhật ký lô</h1>
        <p>Chọn lô rồi quét mã QR hoặc mở trực tiếp để xem ảnh và mô tả từng công đoạn.</p>
        <a class="text-link" href="${sitePaths.wholesale}">Theo dõi nhật ký đơn đặt sỉ của bạn</a>
      </div>
      <div class="exhibition-controls">
        <label class="batch-field">Lô sản xuất <select id="batch-select" disabled><option value="" disabled selected>Chọn lô sản xuất</option></select></label>
        <form class="batch-search">
          <label class="search-field"><span class="sr-only">Mã lô</span>
            <input name="code" placeholder="Nhập mã lô, ví dụ NX-004" required maxlength="50" pattern="[A-Za-z0-9_\\-]+">
          </label>
          <button type="submit" class="button button-outline">Tìm mã lô</button>
        </form>
        <p class="exhibition-status" role="status"></p>
        <button type="button" class="text-button" data-retry hidden>Thử lại</button>
      </div>
      <div class="journal-qr"></div>
    </div>`;

  const select = container.querySelector("#batch-select");
  const target = container.querySelector(".journal-qr");
  const status = container.querySelector("[role=status]");
  const retry = container.querySelector("[data-retry]");
  const search = container.querySelector("form");
  const find = search.querySelector("button");
  let revision = 0;
  const url = new URL(location.href);

  async function loadBatches() {
    const current = revision;
    let errorMessage;
    retry.hidden = true;
    status.textContent = "Đang tải danh sách lô…";
    try {
      const { data } = await request("/traceability/public/recent");
      for (const { batchCode, product } of data) {
        const label = batchCode + " · " + product.name;
        const option = [...select.options].find(item => item.value === batchCode);
        if (option) option.textContent = label;
        else select.add(new Option(label, batchCode));
      }
      select.disabled = select.options.length < 2;
    } catch (error) {
      errorMessage = error.message;
      retry.hidden = false;
    }
    if (current !== revision) return;
    const requestedCode = url.searchParams.get("lo");
    if (select.value) {
      status.textContent = errorMessage || "";
    } else if (requestedCode) {
      if (!/^[a-zA-Z0-9_-]{1,50}$/.test(requestedCode)) {
        status.textContent = "Mã lô trong đường dẫn không hợp lệ.";
      } else if ([...select.options].some(option => option.value === requestedCode)) {
        showCode(requestedCode, false);
        status.textContent = "";
      } else {
        await lookupCode(requestedCode, current);
      }
    } else if (select.options.length > 1) {
      showCode(select.options[1].value, false);
      status.textContent = "";
    } else {
      status.textContent = errorMessage || "Chưa có lô công khai.";
    }
  }

  function showCode(code, updateUrl = true) {
    if (![...select.options].some(option => option.value === code)) select.add(new Option(code, code));
    select.value = code;
    select.disabled = false;
    const link = document.createElement("a");
    link.className = "button button-primary journal-open";
    link.href = "/trace/" + encodeURIComponent(code);
    link.textContent = "Xem nhật ký lô";
    target.replaceChildren(batchQr(code, { initiallyOpen: true }), link);
    if (updateUrl) setCodeQuery(code);
  }

  function setCodeQuery(code) {
    if (url.searchParams.get("lo") === code) return;
    url.searchParams.set("lo", code);
    history.replaceState(null, "", url);
  }

  async function lookupCode(code, current) {
    find.disabled = true;
    status.textContent = "Đang tra mã lô…";
    try {
      await request("/traceability/by-code/" + encodeURIComponent(code), { method: "HEAD" });
      if (current === revision) {
        showCode(code);
        status.textContent = "";
      }
    } catch (error) {
      if (current === revision) status.textContent = error.status === 404 ? "Không tìm thấy lô công khai với mã này." : error.message;
    } finally {
      find.disabled = false;
    }
  }

  select.addEventListener("change", () => {
    revision++;
    status.textContent = "";
    showCode(select.value);
  });
  search.addEventListener("submit", event => {
    event.preventDefault();
    if (find.disabled) return;
    const code = search.elements.namedItem("code").value.trim();
    select.value = "";
    target.replaceChildren();
    setCodeQuery(code);
    lookupCode(code, ++revision);
  });
  retry.addEventListener("click", loadBatches);
  loadBatches();
}
