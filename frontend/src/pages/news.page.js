import { request, mediaUrl } from "../api/http.js";

const categories = {
  PRICE_ANNOUNCEMENT: "Giá nguyên liệu", POWER_OUTAGE: "Lịch cúp điện",
  POLICY_SUPPORT: "Chính sách", FESTIVAL_EVENT: "Sự kiện",
};

export function mountNews(section, account) {
  const options = Object.entries(categories).map(([key, label]) => `<option value="${key}">${label}</option>`).join("");
  section.innerHTML = `
    <h1 id="news-title" class="page-title">Tin cộng đồng</h1>
    <details class="trade-card news-editor" hidden>
      <summary>Quản lý tin</summary>
      <form class="account-form">
        <label>Tiêu đề<input name="title" maxlength="255" required></label>
        <label>Đường dẫn bài viết<input name="slug" placeholder="lich-le-hoi-nha-xa" maxlength="280" required></label>
        <label>Danh mục<select name="category">${options}</select></label>
        <label>Nội dung<textarea name="content" maxlength="50000" required></textarea></label>
        <label>URL ảnh bìa<input name="thumbnailUrl" type="url" maxlength="500"></label>
        <label>Thời điểm đăng<input name="publishedAt" type="datetime-local"></label>
        <label class="trade-choice"><input name="isPinned" type="checkbox">Ghim bài viết</label>
        <p role="status" data-form-status></p>
        <div class="trade-toolbar">
          <button class="button button-primary" type="submit">Đăng bài</button>
          <button class="button button-outline" type="reset">Tạo bài mới</button>
        </div>
      </form>
    </details>
    <p role="status" data-list-status></p>
    <div class="trade-content"></div>
    <button class="button button-outline" type="button" data-more hidden>Xem thêm</button>`;
  const editor = section.querySelector(".news-editor");
  const form = editor.querySelector("form");
  const submit = form.querySelector("[type=submit]");
  const formStatus = form.querySelector("[data-form-status]");
  const status = section.querySelector("[data-list-status]");
  const list = section.querySelector(".trade-content");
  const more = section.querySelector("[data-more]");
  let editing;
  let version = 0;
  let page = 1;

  function render(item, admin) {
    const summary = document.createElement("summary");
    summary.textContent = (item.isPinned ? "Đã ghim · " : "") + item.title;
    const card = document.createElement("details");
    card.className = "trade-card";
    const meta = document.createElement("p");
    meta.textContent = categories[item.category] + " · " + new Date(item.publishedAt).toLocaleString("vi-VN");
    const picture = document.createElement("img");
    const src = mediaUrl(item.thumbnailUrl);
    picture.alt = "";
    picture.loading = "lazy";
    const body = document.createElement("p");
    body.className = "news-body";
    card.append(summary, meta);
    if (src) {
      picture.src = src;
      card.append(picture);
    }
    card.append(body);
    if (!admin) {
      let loaded = false;
      card.addEventListener("toggle", async () => {
        if (!card.open || loaded) return;
        loaded = true;
        body.textContent = "Đang tải nội dung…";
        try {
          const { data } = await request("/news/" + encodeURIComponent(item.slug));
          body.textContent = data.content;
        } catch (error) {
          body.textContent = error.message + " Đóng rồi mở lại để thử lại.";
          loaded = false;
        }
      });
      return card;
    }
    body.textContent = item.content;
    const actions = document.createElement("div");
    actions.className = "trade-toolbar";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "button button-outline";
    edit.textContent = "Sửa bài";
    edit.addEventListener("click", () => {
      editing = item;
      formStatus.textContent = "";
      for (const name of ["title", "slug", "category", "content", "thumbnailUrl"]) form.elements.namedItem(name).value = item[name] || "";
      const date = new Date(item.publishedAt);
      date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
      form.elements.namedItem("publishedAt").value = date.toISOString().slice(0, 16);
      form.elements.namedItem("isPinned").checked = item.isPinned;
      submit.textContent = "Lưu thay đổi";
      editor.open = true;
      form.elements.namedItem("title").focus();
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "button button-outline";
    remove.textContent = "Xóa bài";
    remove.addEventListener("click", async () => {
      if (!window.confirm("Xóa bài “" + item.title + "”?")) return;
      actions.inert = true;
      try {
        await request("/news/" + encodeURIComponent(item.id), { method: "DELETE", auth: true });
        if (editing?.id === item.id) form.reset();
        await load(false, "Đã xóa bài.");
      } catch (error) { status.textContent = error.message; }
      finally { actions.inert = false; }
    });
    actions.append(edit, remove);
    card.append(actions);
    return card;
  }

  async function load(append = false, message = "") {
    const current = ++version;
    const admin = account.profile?.role === "ADMIN";
    editor.hidden = !admin;
    if (!admin) form.reset();
    if (!append) {
      page = 1;
      list.replaceChildren();
      more.hidden = true;
    }
    more.disabled = true;
    status.textContent = "Đang tải tin…";
    try {
      const { data } = await request(`/news${admin ? "/admin/list" : ""}?page=${page}&limit=24`, { auth: admin });
      if (current !== version) return;
      list.append(...data.map(item => render(item, admin)));
      status.textContent = message || (list.children.length ? "" : "Chưa có tin cộng đồng.");
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

  form.addEventListener("reset", () => {
    editing = undefined;
    submit.textContent = "Đăng bài";
    formStatus.textContent = "";
  });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const { publishedAt, thumbnailUrl, ...values } = Object.fromEntries(new FormData(form));
    const { id } = editing || {};
    const body = { ...values, thumbnailUrl: thumbnailUrl || null, isPinned: form.elements.namedItem("isPinned").checked };
    form.inert = true;
    try {
      if (publishedAt) body.publishedAt = new Date(publishedAt).toISOString();
      await request(id ? "/news/" + encodeURIComponent(id) : "/news", { method: id ? "PUT" : "POST", auth: true, body });
      form.reset();
      await load(false, "Đã lưu bài viết.");
    } catch (error) { formStatus.textContent = error.message; }
    finally { form.inert = false; }
  });
  more.addEventListener("click", () => load(true));
  account.onChange(() => load());
  load();
}
