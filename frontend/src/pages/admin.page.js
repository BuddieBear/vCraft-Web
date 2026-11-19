import { request, signedIn } from "../api/http.js";

export function mountArtisanAdministration(section, account) {
  section.innerHTML = `
    <h1 id="admin-title" class="page-title">Quản lý hồ sơ xưởng</h1>
    <p role="status"></p>
    <button class="button button-outline" type="button" data-sign-in>Đăng nhập</button>
    <div class="admin-content" hidden>
      <details class="trade-card">
        <summary>Cấp tài khoản nghệ nhân</summary>
        <form class="account-form">
          <label>Email<input name="email" type="email" required maxlength="255"></label>
          <label>Mật khẩu ban đầu<input name="password" type="password" autocomplete="new-password" required minlength="12" maxlength="72"></label>
          <label>Họ tên<input name="fullName" required maxlength="120"></label>
          <label>Tên xưởng<input name="workshopName" required maxlength="200"></label>
          <label>Địa chỉ<input name="address" required maxlength="255"></label>
          <label>Vĩ độ<input name="latitude" type="number" step="any" min="-90" max="90" required></label>
          <label>Kinh độ<input name="longitude" type="number" step="any" min="-180" max="180" required></label>
          <button class="button button-primary" type="submit">Cấp tài khoản</button>
        </form>
      </details>
      <h2>Hồ sơ chờ duyệt</h2>
      <div class="trade-content"></div>
      <button class="button button-outline" type="button" data-more hidden>Xem thêm</button>
    </div>`;
  const status = section.querySelector("[role=status]");
  const content = section.querySelector(".admin-content");
  const list = content.querySelector(".trade-content");
  const form = content.querySelector("form");
  const signIn = section.querySelector("[data-sign-in]");
  const more = section.querySelector("[data-more]");
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
    status.textContent = "Đang tải hồ sơ…";
    more.disabled = true;
    try {
      const { data } = await request(`/admin/artisans/pending?page=${page}&limit=24`, { auth: true });
      if (current !== version) return;
      if (!append) list.replaceChildren();
      for (const item of data) {
        const card = document.createElement("article");
        card.className = "trade-card";
        const heading = document.createElement("h3");
        heading.textContent = item.workshopName;
        const body = document.createElement("p");
        body.textContent = [item.user.fullName, item.user.email, item.address].join(" · ");
        const actions = document.createElement("div");
        actions.className = "trade-toolbar";
        for (const [label, value] of [["Duyệt hồ sơ", "APPROVED"], ["Từ chối", "REJECTED"]]) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "button button-outline";
          button.textContent = label;
          button.addEventListener("click", () => save(actions, async () => {
            await request("/admin/artisans/" + encodeURIComponent(item.id) + "/verification", { method: "PATCH", auth: true, body: { status: value } });
            await load(false, "Đã xử lý hồ sơ.");
          }));
          actions.append(button);
        }
        card.append(heading, body, actions);
        list.append(card);
      }
      status.textContent = message || (list.children.length ? "" : "Chưa có hồ sơ chờ duyệt.");
      more.textContent = "Xem thêm";
      more.hidden = data.length < 24;
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

  async function save(control, work) {
    control.inert = true;
    try { await work(); }
    catch (error) { if (account.profile?.role === "ADMIN") status.textContent = error.message; }
    finally { control.inert = false; }
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(form));
    body.latitude = Number(body.latitude);
    body.longitude = Number(body.longitude);
    save(form, async () => {
      await request("/admin/artisans", { method: "POST", auth: true, body });
      form.reset();
      await load(false, "Đã cấp tài khoản. Hồ sơ đang chờ duyệt.");
    });
  });
  signIn.addEventListener("click", account.open);
  more.addEventListener("click", () => load(true));
  account.onChange(() => load());
  load();
}
