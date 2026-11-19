import { request } from "../api/http.js";
import { biddingPagePath, pageSegment, quotePagePath, quotePageRoot, sitePaths } from "../site-paths.js";

export function mountNotifications(section, account) {
  section.innerHTML = `
    <h1 id="notifications-title" class="page-title">Thông báo</h1>
    <p role="status"></p>
    <button class="button button-outline" type="button" data-sign-in>Đăng nhập để xem thông báo</button>
    <div class="trade-content"></div>
    <button class="button button-outline" type="button" data-more hidden>Xem thêm</button>`;
  const status = section.querySelector("[role=status]");
  const signIn = section.querySelector("[data-sign-in]");
  const more = section.querySelector("[data-more]");
  const list = section.querySelector(".trade-content");
  let page = 1;
  let version = 0;

  async function load() {
    const current = ++version;
    more.disabled = true;
    try {
      const { data } = await request(`/notifications?page=${page}&limit=24`, { auth: true });
      if (version !== current) return;
      for (const item of data) {
        const card = document.createElement("article");
        card.className = "trade-card";
        const heading = document.createElement("h2");
        heading.textContent = item.title;
        const body = document.createElement("p");
        body.textContent = item.message;
        const time = document.createElement("time");
        time.dateTime = item.createdAt;
        time.textContent = new Date(item.createdAt).toLocaleString("vi-VN");
        card.append(heading, body, time);
        const artisan = account.profile?.role === "ARTISAN";
        const canFollow = artisan || account.profile?.role === "BUYER";
        const quoteId = canFollow && typeof item.linkUrl === "string" && pageSegment(item.linkUrl, artisan ? sitePaths.bidding : quotePageRoot);
        if (quoteId && /^[a-f0-9-]{36}$/i.test(quoteId)) {
          const link = document.createElement("a");
          link.className = "text-link notification-link";
          link.href = artisan ? biddingPagePath(quoteId) : quotePagePath(quoteId);
          link.textContent = "Xem yêu cầu báo giá";
          card.append(link);
        }
        if (!item.isRead) {
          const read = document.createElement("button");
          read.className = "button button-outline";
          read.type = "button";
          read.textContent = "Đánh dấu đã đọc";
          read.addEventListener("click", async () => {
            read.disabled = true;
            try {
              await request("/notifications/" + encodeURIComponent(item.id) + "/read", { method: "PATCH", auth: true });
              read.remove();
            } catch (error) {
              if (card.isConnected) status.textContent = error.message;
            } finally {
              read.disabled = false;
            }
          });
          card.append(read);
        }
        list.append(card);
      }
      status.textContent = list.children.length ? "" : "Chưa có thông báo.";
      more.hidden = data.length < 24;
      page++;
    } catch (error) {
      if (version === current) {
        status.textContent = error.message;
        more.hidden = false;
      }
    } finally {
      if (version === current) more.disabled = false;
    }
  }

  function sync() {
    version++;
    page = 1;
    list.replaceChildren();
    more.hidden = true;
    signIn.hidden = Boolean(account.profile);
    status.textContent = account.profile ? "Đang tải thông báo…" : "";
    if (account.profile) load();
  }
  signIn.addEventListener("click", account.open);
  more.addEventListener("click", load);
  account.onChange(sync);
  sync();
}
