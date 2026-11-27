import { request, mediaUrl } from "../api/http.js";
import { newsArticlePath, sitePaths } from "../site-paths.js";
import { icon, keepFocus } from "../components/ui.js";
import { bindFormErrors, clearFormErrors, showFormErrors } from "../components/form-errors.js";
import { slugError } from "../data/input-values.js";

const categories = {
  PRICE_ANNOUNCEMENT: "Giá nguyên liệu", POWER_OUTAGE: "Lịch cúp điện",
  POLICY_SUPPORT: "Chính sách", FESTIVAL_EVENT: "Sự kiện",
};
const publishedDate = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });

function articleMeta(item) {
  const meta = document.createElement("p");
  meta.className = "news-meta";
  meta.textContent = categories[item.category] + " · " + publishedDate.format(new Date(item.publishedAt));
  return meta;
}

function addPicture(card, item) {
  const src = mediaUrl(item.thumbnailUrl);
  if (!src) return;
  const picture = document.createElement("img");
  picture.src = src;
  picture.alt = "";
  picture.loading = "lazy";
  picture.referrerPolicy = "no-referrer";
  card.append(picture);
}

function articleLink(item, label) {
  const link = document.createElement("a");
  link.href = newsArticlePath(item.slug);
  link.className = "text-link";
  link.textContent = label;
  return link;
}

export async function mountNewsArticle(section, slug) {
  section.innerHTML = `
    <a href="${sitePaths.news}" class="text-link product-back">${icon("left")} Tin cộng đồng</a>
    <article class="news-article trade-card">
      <h1 id="news-title" class="page-title">Tin cộng đồng</h1>
      <p role="status">Đang tải bài viết…</p>
    </article>`;
  const article = section.querySelector("article");
  const status = article.querySelector("[role=status]");
  try {
    const { data } = await request("/news/" + encodeURIComponent(slug));
    article.querySelector("h1").textContent = data.title;
    document.title = data.title + " · vCraft";
    article.append(articleMeta(data));
    addPicture(article, data);
    const body = document.createElement("p");
    body.className = "news-body";
    body.textContent = data.content;
    article.append(body);
    status.remove();
  } catch (error) {
    status.textContent = error.message;
    if (error.status !== 404) {
      const retry = document.createElement("button");
      retry.className = "text-button";
      retry.type = "button";
      retry.textContent = "Thử lại";
      retry.addEventListener("click", () => mountNewsArticle(section, slug));
      article.append(retry);
    }
  }
}

export function mountNews(section, account) {
  const options = Object.entries(categories).map(([key, label]) => `<option value="${key}">${label}</option>`).join("");
  section.innerHTML = `
    <h1 id="news-title" class="page-title">Tin cộng đồng</h1>
    <details class="trade-card news-editor" hidden>
      <summary>Quản lý tin</summary>
      <form class="account-form">
        <label>Tiêu đề<input name="title" maxlength="255" required></label>
        <label>Đường dẫn bài viết<input name="slug" placeholder="lich-le-hoi-nha-xa" maxlength="280" pattern="[a-z0-9]+(-[a-z0-9]+)*" title="${slugError}" required></label>
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
  bindFormErrors(form);
  const status = section.querySelector("[data-list-status]");
  const list = section.querySelector(".trade-content");
  const more = section.querySelector("[data-more]");
  let editing;
  let version = 0;
  let page = 1;

  function render(item, admin) {
    if (!admin) {
      const card = document.createElement("article");
      card.className = "trade-card";
      const heading = document.createElement("h2");
      heading.append(articleLink(item, (item.isPinned ? "Đã ghim · " : "") + item.title));
      card.append(heading, articleMeta(item));
      addPicture(card, item);
      return card;
    }
    const summary = document.createElement("summary");
    summary.textContent = (item.isPinned ? "Đã ghim · " : "") + item.title;
    const card = document.createElement("details");
    card.className = "trade-card";
    const body = document.createElement("p");
    body.className = "news-body";
    card.append(summary, articleMeta(item));
    addPicture(card, item);
    card.append(body);
    body.textContent = item.content;
    const actions = document.createElement("div");
    actions.className = "trade-toolbar";
    if (Date.parse(item.publishedAt) <= Date.now()) actions.append(articleLink(item, "Xem bài đã đăng"));
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
      const restoreFocus = keepFocus(status);
      actions.inert = true;
      try {
        await request("/news/" + encodeURIComponent(item.id), { method: "DELETE", auth: true });
        if (editing?.id === item.id) form.reset();
        await load(false, "Đã xóa bài.");
      } catch (error) { status.textContent = error.message; }
      finally { actions.inert = false; restoreFocus(); }
    });
    actions.append(edit, remove);
    card.append(actions);
    return card;
  }

  async function load(append = false, message = "") {
    const restoreFocus = keepFocus(status);
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
      restoreFocus();
    }
  }

  form.addEventListener("reset", () => {
    editing = undefined;
    submit.textContent = "Đăng bài";
    formStatus.textContent = "";
    clearFormErrors(form);
  });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    clearFormErrors(form);
    formStatus.textContent = "";
    const { publishedAt, thumbnailUrl, ...values } = Object.fromEntries(new FormData(form));
    const { id } = editing || {};
    const body = { ...values, thumbnailUrl: thumbnailUrl || null, isPinned: form.elements.namedItem("isPinned").checked };
    const restoreFocus = keepFocus(formStatus);
    form.inert = true;
    try {
      if (publishedAt) body.publishedAt = new Date(publishedAt).toISOString();
      await request(id ? "/news/" + encodeURIComponent(id) : "/news", { method: id ? "PUT" : "POST", auth: true, body });
      form.reset();
      await load(false, "Đã lưu bài viết.");
    } catch (error) {
      // An inert form cannot take focus, so release it before showFormErrors focuses the invalid field.
      form.inert = false;
      if (!showFormErrors(form, error.fields)) formStatus.textContent = error.message;
    } finally { form.inert = false; restoreFocus(); }
  });
  more.addEventListener("click", () => load(true));
  account.onChange(() => load());
  load();
}
