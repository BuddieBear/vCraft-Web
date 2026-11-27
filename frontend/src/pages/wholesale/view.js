import { request } from "../../api/http.js";
import { formatPrice, keepFocus } from "../../components/ui.js";
import { vietnamToday } from "../../data/input-values.js";
import { allocatedPriceCents, decimalFromCents, moneyCents } from "../../data/quote-pricing.js";

export const labels = {
  DRAFT: "Bản nháp riêng", PENDING_DISPATCH: "Chờ Ban quản lý điều phối", SENT_TO_ARTISANS: "Đã gửi", ARTISANS_BIDDING: "Đang nhận báo giá",
  BUYER_ACCEPTED: "Đã chốt báo giá", ASSIGNED: "Đã phân công", IN_PRODUCTION: "Đang sản xuất",
  READY_FOR_DELIVERY: "Sẵn sàng giao", COMPLETED: "Hoàn thành", DELIVERED: "Đã giao", CANCELLED: "Đã hủy",
  SUBMITTED: "Đã gửi", ACCEPTED: "Đã chọn", REJECTED: "Không được chọn", WITHDRAWN: "Đã rút",
};
const quoteSteps = ["DRAFT", "SENT_TO_ARTISANS", "ARTISANS_BIDDING", "BUYER_ACCEPTED", "IN_PRODUCTION", "DELIVERED"];
export const hasQuoteJournal = status => quoteSteps.indexOf(status) >= quoteSteps.indexOf("BUYER_ACCEPTED");

export function quoteProgress(status) {
  if (status === "CANCELLED") return paragraph(labels[status]);
  const current = quoteSteps.indexOf(status === "PENDING_DISPATCH" ? "DRAFT" : status);
  const list = document.createElement("ol");
  list.className = "quote-progress";
  list.setAttribute("aria-label", "Tiến độ đặt sỉ");
  for (const [index, step] of quoteSteps.entries()) {
    const item = document.createElement("li");
    item.textContent = step === "SENT_TO_ARTISANS" ? "Đã gửi tới xưởng" : labels[step];
    if (index < current) item.dataset.completed = "";
    if (index === current) item.setAttribute("aria-current", "step");
    list.append(item);
  }
  return list;
}

export const displayDate = new Intl.DateTimeFormat("vi-VN", { timeZone: "UTC", dateStyle: "medium" });
export const displayLogDate = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "medium" });
export const quoteExpired = quote => quote.deadline.slice(0, 10) < vietnamToday();
export const quoteLabel = quote => ["DRAFT", "PENDING_DISPATCH", "SENT_TO_ARTISANS", "ARTISANS_BIDDING"].includes(quote.status) && quoteExpired(quote) ? "Đã hết hạn" : labels[quote.status];
export function allocationPreview(output, quote, bids, allocations) {
  if (!allocations.length || allocations.some(item => !Number.isInteger(item.quantity) || item.quantity <= 0) || allocations.reduce((sum, item) => sum + item.quantity, 0) !== quote.targetQuantity) {
    output.textContent = `Chia đủ ${quote.targetQuantity} sản phẩm để xem tổng tiền.`;
    return;
  }
  const prices = allocations.map(item => allocatedPriceCents(bids.find(bid => bid.id === item.bidId).proposedPrice, item.quantity, quote.targetQuantity));
  const total = prices.reduce((sum, value) => sum + value, 0n);
  output.textContent = `Tổng tiền phân công · ${formatPrice(decimalFromCents(total))}`;
  if (prices.includes(0n)) output.textContent += " · Có phần hàng dưới 0,01 ₫.";
  if (quote.maxBudget != null && total > moneyCents(quote.maxBudget)) output.textContent += " · Vượt ngân sách tối đa.";
}
export const get = async (path, signal) => (await request(path, { auth: true, signal })).data;
export const write = (path, body, method = "POST") => request(path, { method, body, auth: true });

export function mountPageList(target, { key, path, label, empty, render, state, signal, auth = true, limit = 10 }) {
  const items = document.createElement("div");
  items.className = "trade-list-items";
  const toolbar = document.createElement("div");
  toolbar.className = "trade-toolbar trade-list-toolbar";
  const status = paragraph("");
  status.setAttribute("role", "status");
  const retry = document.createElement("button");
  retry.type = "button";
  retry.className = "text-button";
  retry.textContent = "Thử lại";
  retry.hidden = true;
  const nav = document.createElement("nav");
  nav.className = "trade-toolbar";
  nav.setAttribute("aria-label", "Phân trang " + label);
  nav.innerHTML = `<button type="button" class="button button-outline">Trang trước</button>
    <span aria-current="page"></span><button type="button" class="button button-outline">Trang sau</button>`;
  nav.hidden = true;
  const [previous, pageLabel, next] = nav.children;
  toolbar.append(status, retry, nav);
  target.append(items, toolbar);

  let pending = false;
  let hasNext = false;
  let page = state.get(key) || 1;
  let requestedPage = page;
  let visiblePage;
  let restoreFocus;
  function sync() {
    items.inert = pending;
    items.setAttribute("aria-busy", String(pending));
    previous.disabled = pending || page === 1;
    next.disabled = pending || !hasNext;
    if (!pending) {
      restoreFocus?.();
      restoreFocus = undefined;
    }
  }

  async function load(destination) {
    if (pending || signal.aborted) return;
    restoreFocus ??= keepFocus(status);
    pending = true;
    requestedPage = destination;
    retry.hidden = true;
    status.textContent = "Đang tải…";
    sync();
    try {
      const fetchPage = (number) => request(path + (path.includes("?") ? "&" : "?") + new URLSearchParams({ page: number, limit }), { auth, signal });
      let result = await fetchPage(destination);
      if (signal.aborted) return;
      if (!result.data.length && destination > 1) {
        result = await fetchPage(destination - 1);
        if (signal.aborted) return;
        if (!result.data.length && destination > 2) result = await fetchPage(1);
      }
      if (signal.aborted) return;
      const fragment = document.createDocumentFragment();
      const controller = new AbortController();
      signal.addEventListener("abort", () => controller.abort(), { once: true, signal: controller.signal });
      try {
        if (result.data.length) render(result.data, fragment, controller.signal);
      } catch (error) {
        controller.abort();
        throw error;
      }
      visiblePage?.abort();
      visiblePage = controller;
      items.replaceChildren(fragment);
      page = result.pagination.page;
      hasNext = result.pagination.hasNext;
      state.set(key, page);
      pageLabel.textContent = "Trang " + page;
      nav.hidden = page === 1 && !hasNext;
      status.textContent = result.data.length ? "" : empty;
    } catch (error) {
      if (signal.aborted) return;
      status.textContent = error.message;
      retry.hidden = false;
    } finally {
      if (!signal.aborted) {
        pending = false;
        sync();
      }
    }
  }

  previous.addEventListener("click", () => load(page - 1));
  next.addEventListener("click", () => load(page + 1));
  retry.addEventListener("click", () => load(requestedPage));
  load(page);
  return () => load(page);
}

export function paragraph(text) {
  const p = document.createElement("p");
  p.textContent = text;
  return p;
}

export function card(target, title, subtitle) {
  const panel = document.createElement("article");
  panel.className = "trade-card";
  const h = document.createElement("h3");
  h.textContent = title;
  panel.append(h, paragraph(subtitle));
  target.append(panel);
  return panel;
}

export function listSection(target, title) {
  const section = document.createElement("section");
  section.className = "trade-list-section";
  const heading = document.createElement("h2");
  heading.textContent = title;
  section.append(heading);
  target.append(section);
  return section;
}

export const workshopName = record => record.artisan?.workshopName || "Xưởng";
export const bidText = bid => workshopName(bid) + " · " + formatPrice(bid.proposedPrice) + " · " + bid.proposedCompletionDays + " ngày";
