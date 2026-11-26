import { mediaUrl, request, signedIn } from "../api/http.js";
import { bindFormErrors, clearFormErrors, showFormErrors } from "../components/form-errors.js";

function evidencePhoto(value, label, lazy = true) {
  const src = mediaUrl(value);
  if (!src) return null;
  const link = document.createElement("a");
  link.href = src;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.setAttribute("aria-label", "Mở ảnh đầy đủ · " + label);
  const image = document.createElement("img");
  image.src = src;
  image.alt = label;
  if (lazy) image.loading = "lazy";
  image.referrerPolicy = "no-referrer";
  link.append(image);
  return link;
}

function renderEvidence(target, workshop) {
  target.replaceChildren();
  const info = document.createElement("dl");
  const { user } = workshop;
  for (const [label, value] of [
    ["Người phụ trách", user.fullName],
    ["Tên đăng nhập", user.username ? "@" + user.username : "Chưa đặt"],
    ["Email", user.email],
    ["Điện thoại", user.phone],
    ["Địa chỉ", workshop.address],
    ["Tọa độ", workshop.latitude + ", " + workshop.longitude],
    ["Giờ đón khách", workshop.isOpenForVisitors ? workshop.openingHours : "Chưa mở cửa tham quan"],
    ["Danh xưng", workshop.artisanTitle],
    ["Số năm kinh nghiệm", workshop.experienceYears],
    ["Lịch sử xưởng và tiểu sử", workshop.familyHistory],
  ]) {
    const term = document.createElement("dt");
    const detail = document.createElement("dd");
    term.textContent = label;
    detail.textContent = value ?? "Chưa cung cấp";
    if (value === "") detail.textContent = "Chưa cung cấp";
    info.append(term, detail);
  }
  const heading = document.createElement("h4");
  heading.textContent = "Ảnh xưởng";
  const gallery = document.createElement("div");
  gallery.className = "workshop-pictures";
  const urls = [workshop.coverImageUrl, ...workshop.galleryImages].filter(Boolean);
  for (const [index, value] of [...new Set(urls)].entries()) {
    const photo = evidencePhoto(value, "Ảnh xưởng " + (index + 1));
    if (photo) gallery.append(photo);
  }
  const missing = document.createElement("p");
  missing.textContent = "Xưởng chưa cung cấp ảnh.";
  const certificates = document.createElement("h4");
  certificates.textContent = "Chứng nhận chất lượng";
  const list = document.createElement("ul");
  list.className = "admin-proof-list";
  for (const certificate of workshop.certificates) {
    const item = document.createElement("li");
    const summary = document.createElement("p");
    summary.textContent = [certificate.title, certificate.issuingAuthority, certificate.issuedYear].join(" · ");
    item.append(summary);
    const photo = evidencePhoto(certificate.certificateImageUrl, certificate.title);
    if (photo) item.append(photo);
    list.append(item);
  }
  if (!list.childElementCount) {
    const item = document.createElement("li");
    item.textContent = "Xưởng chưa cung cấp chứng nhận.";
    list.append(item);
  }
  target.append(info, heading, gallery.childElementCount ? gallery : missing, certificates, list);
}

function reviewPanel(item, actions) {
  const details = document.createElement("details");
  details.className = "admin-review";
  const summary = document.createElement("summary");
  summary.textContent = "Xem hồ sơ và minh chứng";
  const result = document.createElement("div");
  const status = document.createElement("p");
  status.setAttribute("role", "status");
  details.append(summary, status, result);
  if (actions) {
    actions.hidden = true;
    details.append(actions);
  }

  let loaded = false;
  let loading = false;
  async function load() {
    if (loading || loaded) return;
    loading = true;
    status.textContent = "Đang tải minh chứng…";
    result.replaceChildren();
    try {
      const { data } = await request("/admin/artisans/" + encodeURIComponent(item.id), { auth: true });
      if (!details.isConnected) return;
      renderEvidence(result, data);
      loaded = true;
      status.textContent = "";
      if (actions) {
        actions.hidden = data.verificationStatus !== "PENDING";
        if (actions.hidden) status.textContent = "Hồ sơ đã được xử lý. Tải lại danh sách để xem trạng thái mới.";
      }
    } catch (error) {
      status.textContent = error.message;
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "text-button";
      retry.textContent = "Thử tải lại hồ sơ";
      retry.addEventListener("click", load);
      result.append(retry);
    } finally {
      loading = false;
    }
  }
  details.addEventListener("toggle", () => { if (details.open && details.isConnected) load(); });
  return details;
}

export function mountArtisanAdministration(section, account) {
  section.innerHTML = `
    <h1 id="admin-title" class="page-title">Quản lý hồ sơ xưởng</h1>
    <p role="status"></p>
    <button class="button button-outline" type="button" data-sign-in>Đăng nhập</button>
    <div class="admin-content" hidden>
      <details class="trade-card" data-issue-artisan>
        <summary>Cấp tài khoản nghệ nhân</summary>
        <form class="account-form">
          <label>Email<input name="email" type="email" required maxlength="255"></label>
          <div class="account-field">
            <label>Tên đăng nhập (tùy chọn)<input name="username" maxlength="50" pattern="(?=.*[a-zA-Z0-9])[a-zA-Z0-9._\\-]{3,50}" placeholder="Ví dụ: xuong-lua-a" aria-describedby="admin-artisan-username-hint"></label>
            <span class="field-hint" id="admin-artisan-username-hint">3–50 ký tự không dấu (chữ, số, ., _, -), ít nhất một chữ hoặc số.</span>
          </div>
          <div class="account-field">
            <label>Mật khẩu ban đầu<input name="password" type="password" autocomplete="new-password" required minlength="12" maxlength="72" aria-describedby="admin-artisan-password-hint"></label>
            <span class="field-hint" id="admin-artisan-password-hint">Tối thiểu 12 ký tự (tối đa 72 byte UTF-8).</span>
          </div>
          <label>Họ tên<input name="fullName" required maxlength="120"></label>
          <label>Tên xưởng<input name="workshopName" required maxlength="200"></label>
          <label>Địa chỉ<input name="address" required maxlength="255"></label>
          <div class="workshop-coordinates">
            <div class="account-field"><label>Vĩ độ<input name="latitude" type="number" step="any" min="-90" max="90" required></label></div>
            <div class="account-field"><label>Kinh độ<input name="longitude" type="number" step="any" min="-180" max="180" required></label></div>
          </div>
          <button class="button button-primary" type="submit">Cấp tài khoản</button>
        </form>
      </details>
      <div class="trade-toolbar" data-workshop-filter>
        <label>Trạng thái xưởng
          <select name="workshopStatus">
            <option value="PENDING">Chờ duyệt</option>
            <option value="APPROVED">Đang hoạt động</option>
            <option value="SUSPENDED">Đang đình chỉ</option>
          </select>
        </label>
      </div>
      <div class="trade-content"></div>
      <button class="button button-outline" type="button" data-more hidden>Xem thêm</button>
    </div>`;
  const status = section.querySelector("[role=status]");
  const content = section.querySelector(".admin-content");
  const list = content.querySelector(".trade-content");
  const form = content.querySelector("form");
  const signIn = section.querySelector("[data-sign-in]");
  const more = section.querySelector("[data-more]");
  const filter = section.querySelector("[name=workshopStatus]");
  let page = 1;
  let version = 0;

  async function load(append = false, message = "") {
    const current = ++version;
    const allowed = account.profile?.role === "ADMIN";
    content.hidden = !allowed;
    signIn.hidden = signedIn();
    if (!allowed) {
      list.replaceChildren();
      status.textContent = "Trang này dành cho ban quản lý.";
      return;
    }
    if (!append) page = 1;
    const kind = filter.value;
    status.textContent = "Đang tải hồ sơ…";
    more.disabled = true;
    try {
      const params = new URLSearchParams({ page, limit: 24, status: kind });
      const { data, pagination } = await request("/admin/artisans?" + params, { auth: true });
      if (current !== version) return;
      if (!append) list.replaceChildren();
      for (const item of data) {
        const card = document.createElement("article");
        card.className = "trade-card";
        const heading = document.createElement("h3");
        heading.textContent = item.workshopName;
        const body = document.createElement("p");
        body.textContent = [item.user.fullName, item.user.username ? "@" + item.user.username : null, item.user.email, item.address].filter(Boolean).join(" · ");
        const actions = document.createElement("div");
        actions.className = "trade-toolbar";
        const actionOptions = kind === "PENDING"
          ? [["Duyệt hồ sơ", "/verification", { status: "APPROVED" }, "Đã duyệt hồ sơ."], ["Từ chối", "/verification", { status: "REJECTED" }, "Đã từ chối hồ sơ."]]
          : kind === "APPROVED"
            ? [["Đình chỉ xưởng", "/suspension", { isSuspended: true }, "Đã đình chỉ xưởng."]]
            : [["Mở lại xưởng", "/suspension", { isSuspended: false }, "Đã mở lại xưởng."]];
        for (const [label, endpoint, body, message] of actionOptions) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "button button-outline";
          button.textContent = label;
          button.disabled = kind !== "PENDING" && !item.user.isActive;
          button.addEventListener("click", () => save(actions, async () => {
            await request("/admin/artisans/" + encodeURIComponent(item.id) + endpoint, { method: "PATCH", auth: true, body });
            await load(false, message);
          }));
          actions.append(button);
        }
        card.append(heading, body, reviewPanel(item, kind === "PENDING" ? actions : null));
        if (kind !== "PENDING") card.append(actions);
        list.append(card);
      }
      status.textContent = message || (list.children.length ? "" : "Chưa có xưởng ở trạng thái này.");
      more.textContent = "Xem thêm";
      more.hidden = !pagination.hasNext;
      page++;
    } catch (error) {
      if (current === version) {
        status.textContent = error.message;
        more.textContent = "Thử tải lại";
        more.hidden = false;
      }
    } finally {
      if (current === version) more.disabled = false;
    }
  }

  async function save(control, work, onError) {
    control.inert = true;
    let failure;
    try { await work(); }
    catch (error) { failure = error; }
    finally { control.inert = false; }
    if (failure && account.profile?.role === "ADMIN") {
      if (!onError?.(failure)) status.textContent = failure.message;
    }
  }

  bindFormErrors(form);
  const issueSection = content.querySelector("[data-issue-artisan]");
  form.addEventListener("submit", event => {
    event.preventDefault();
    clearFormErrors(form);
    status.textContent = "";
    const raw = Object.fromEntries(new FormData(form));
    const body = {
      email: raw.email.trim(),
      ...(raw.username?.trim() ? { username: raw.username.trim() } : {}),
      password: raw.password,
      fullName: raw.fullName.trim(),
      workshopName: raw.workshopName.trim(),
      address: raw.address.trim(),
      latitude: Number(raw.latitude),
      longitude: Number(raw.longitude),
    };
    save(form, async () => {
      await request("/admin/artisans", { method: "POST", auth: true, body });
      form.reset();
      if (issueSection) issueSection.open = false;
      filter.value = "PENDING";
      await load(false, "Đã cấp tài khoản. Hồ sơ đang chờ duyệt.");
    }, error => showFormErrors(form, error.fields));
  });
  signIn.addEventListener("click", account.open);
  filter.addEventListener("change", () => {
    list.replaceChildren();
    more.hidden = true;
    load();
  });
  more.addEventListener("click", () => load(true));
  account.onChange(() => load());
  load();
}
