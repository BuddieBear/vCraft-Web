import { mediaUrl, request, signedIn } from "../api/http.js";
import { bindFormErrors, clearFormErrors, showFormErrors } from "../components/form-errors.js";
import { keepFocus } from "../components/ui.js";

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
    ["Tên xưởng", workshop.workshopName],
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
    ...(workshop.pendingIdentity ? [
      ["Tên đang chờ duyệt", workshop.pendingIdentity.workshopName],
      ["Địa chỉ đang chờ duyệt", workshop.pendingIdentity.address],
      ["Tọa độ đang chờ duyệt", workshop.pendingIdentity.latitude + ", " + workshop.pendingIdentity.longitude],
    ] : []),
    ...(workshop.rejectionReason ? [["Lý do từ chối gần nhất", workshop.rejectionReason]] : []),
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

function reviewPanel(item, decide, listStatus) {
  const details = document.createElement("details");
  details.className = "admin-review";
  const summary = document.createElement("summary");
  summary.textContent = "Xem hồ sơ và minh chứng";
  const result = document.createElement("div");
  const status = document.createElement("p");
  status.setAttribute("role", "status");
  details.append(summary, status, result);

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
      if (decide) {
        if (!data.user.isActive || (data.verificationStatus !== "PENDING" && !data.pendingIdentity)) {
          status.textContent = "Hồ sơ không còn chờ duyệt. Tải lại danh sách để xem trạng thái mới.";
          return;
        }
        const form = document.createElement("form");
        form.className = "account-form";
        form.innerHTML = `<label>Lý do từ chối<textarea name="reason" required maxlength="2000"></textarea></label>
          <div class="trade-toolbar">
            <button class="button button-primary" type="submit" value="APPROVED" formnovalidate>${data.pendingIdentity ? "Duyệt thay đổi" : "Duyệt hồ sơ"}</button>
            <button class="button button-outline" type="submit" value="REJECTED">Từ chối</button>
          </div>`;
        form.addEventListener("submit", async event => {
          event.preventDefault();
          const decision = event.submitter?.value ?? "REJECTED";
          const reason = form.elements.namedItem("reason").value.trim();
          if (decision === "REJECTED" && !reason) {
            status.textContent = "Nhập lý do từ chối để xưởng có thể bổ sung hồ sơ.";
            return;
          }
          const restoreFocus = keepFocus(status, listStatus);
          form.inert = true;
          try {
            await decide({ status: decision, expectedVersion: data.reviewVersion, ...(decision === "REJECTED" && { reason }) });
          } catch (error) {
            status.textContent = error.message;
            if (error.status === 409) {
              form.remove();
              loaded = false;
              const reload = document.createElement("button");
              reload.type = "button";
              reload.className = "text-button";
              reload.textContent = "Tải bản hồ sơ mới";
              reload.addEventListener("click", load);
              result.append(reload);
            }
          } finally {
            form.inert = false;
            restoreFocus();
          }
        });
        result.append(form);
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
            <label>Tên đăng nhập (tùy chọn)<input name="username" autocapitalize="none" maxlength="32" pattern="[a-zA-Z0-9][a-zA-Z0-9._\\-]{2,31}" placeholder="Ví dụ: xuong-lua-a" aria-describedby="admin-artisan-username-hint"></label>
            <span class="field-hint" id="admin-artisan-username-hint">3–32 ký tự không dấu (chữ, số, ., _, -), bắt đầu bằng chữ cái hoặc chữ số.</span>
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
            <option value="IDENTITY_REVIEW">Chờ duyệt thay đổi định danh</option>
            <option value="REJECTED">Đã từ chối</option>
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
        const review = kind === "PENDING" || kind === "IDENTITY_REVIEW";
        const actionOptions = kind === "APPROVED"
          ? [["Đình chỉ xưởng", "/suspension", { isSuspended: true }, "Đã đình chỉ xưởng."]]
          : kind === "SUSPENDED" ? [["Mở lại xưởng", "/suspension", { isSuspended: false }, "Đã mở lại xưởng."]] : [];
        for (const [label, endpoint, body, message] of actionOptions) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "button button-outline";
          button.textContent = label;
          button.disabled = !item.user.isActive;
          button.addEventListener("click", () => save(actions, async () => {
            await request("/admin/artisans/" + encodeURIComponent(item.id) + endpoint, { method: "PATCH", auth: true, body });
            await load(false, message);
          }));
          actions.append(button);
        }
        card.append(heading, body, reviewPanel(item, review ? async decision => {
          await request(`/admin/artisans/${encodeURIComponent(item.id)}/verification`, { method: "PATCH", auth: true, body: decision });
          await load(false, decision.status === "APPROVED" ? "Đã duyệt hồ sơ." : "Đã từ chối hồ sơ.");
        } : null, status));
        if (actionOptions.length) card.append(actions);
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
    const restoreFocus = keepFocus(status);
    control.inert = true;
    let failure;
    try { await work(); }
    catch (error) { failure = error; }
    finally { control.inert = false; restoreFocus(); }
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
