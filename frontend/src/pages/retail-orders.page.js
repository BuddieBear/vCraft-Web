import { request, signedIn } from "../api/http.js";
import { formatPrice } from "../components/ui.js";
import { paymentLabel } from "../data/payment-labels.js";

const orderStates = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  SHIPPING: "Đang giao",
  DELIVERED: "Đã giao",
  CANCELLED: "Đã hủy",
};
const nextState = { PENDING: "CONFIRMED", CONFIRMED: "SHIPPING", SHIPPING: "DELIVERED" };
const nextLabel = { CONFIRMED: "Xác nhận đơn", SHIPPING: "Bắt đầu giao", DELIVERED: "Xác nhận đã giao" };
const pageSize = 12;
const orderDate = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });

export function mountRetailOrders(section, account) {
  section.innerHTML = `
    <div class="section-heading"><h1 id="retail-orders-title" class="page-title">Đơn bán lẻ</h1></div>
    <div class="retail-access">
      <p>Trang này dành cho nghệ nhân và ban quản lý.</p>
      <button type="button" class="button button-outline">Đăng nhập</button>
    </div>
    <div class="trade-toolbar retail-toolbar" hidden>
      <div class="retail-filter">
        <label for="retail-status-filter">Trạng thái</label>
        <select id="retail-status-filter" data-filter>
          <option value="">Tất cả</option>
          ${Object.entries(orderStates).map(([state, label]) => `<option value="${state}">${label}</option>`).join("")}
        </select>
      </div>
      <button type="button" class="button button-outline" data-refresh>Tải lại đơn lẻ</button>
      <p role="status" class="trade-feedback"></p>
    </div>
    <div class="trade-content retail-order-list" hidden></div>
    <div class="trade-toolbar retail-pagination" role="group" aria-label="Phân trang đơn bán lẻ" hidden>
      <button type="button" class="button button-outline" data-previous>Trang trước</button>
      <span></span>
      <button type="button" class="button button-outline" data-next>Trang sau</button>
    </div>`;
  const refresh = section.querySelector("[data-refresh]");
  const toolbar = section.querySelector(".retail-toolbar");
  const filter = toolbar.querySelector("[data-filter]");
  const title = section.querySelector("h1");
  const access = section.querySelector(".retail-access");
  const signIn = access.querySelector("button");
  const status = section.querySelector("[role=status]");
  const content = section.querySelector(".trade-content");
  const pagination = section.querySelector(".retail-pagination");
  const previous = pagination.querySelector("[data-previous]");
  const nextPage = pagination.querySelector("[data-next]");
  let page = 1;
  let hasNext = false;
  let version = 0;
  let saving = false;
  let loading = false;

  function syncControls() {
    const busy = saving || loading;
    refresh.disabled = filter.disabled = content.inert = busy;
    previous.disabled = busy || page === 1;
    nextPage.disabled = busy || !hasNext;
  }

  async function load(targetPage = page, message = "") {
    const revision = ++version;
    const seller = account.profile?.role === "ARTISAN";
    const allowed = seller || account.profile?.role === "ADMIN";
    title.textContent = seller ? "Đơn bán của xưởng" : "Đơn bán lẻ";
    toolbar.hidden = content.hidden = !allowed;
    access.hidden = allowed;
    signIn.hidden = signedIn();
    loading = allowed;
    syncControls();
    if (!allowed) {
      page = 1;
      hasNext = false;
      content.replaceChildren();
      status.textContent = "";
      pagination.hidden = true;
      return;
    }
    status.textContent = "Đang tải đơn bán lẻ…";
    try {
      const query = new URLSearchParams({ limit: pageSize, page: targetPage });
      if (filter.value) query.set("status", filter.value);
      const path = seller ? "/retail/sales" : "/retail/admin/orders";
      const { data, pagination: pages } = await request(path + "?" + query, { auth: true });
      if (revision !== version) return;
      if (targetPage > 1 && !data.length) return load(targetPage - 1, message);
      page = targetPage;
      hasNext = pages.hasNext;
      content.replaceChildren(...data.map(order => renderOrder(order, seller)));
      pagination.hidden = page === 1 && !hasNext;
      pagination.querySelector("span").textContent = "Trang " + page;
      status.textContent = message || (data.length ? "" : "Không có đơn bán lẻ ở trạng thái đã chọn.");
    } catch (error) {
      if (revision === version) status.textContent = error.message;
    } finally {
      if (revision === version) {
        loading = false;
        syncControls();
      }
    }
  }

  function renderOrder(order, seller) {
    const card = document.createElement("article");
    card.className = "trade-card retail-order";
    const header = document.createElement("header");
    const heading = document.createElement("h2");
    heading.textContent = order.orderCode;
    const badge = document.createElement("span");
    badge.className = "retail-order-badge";
    badge.dataset.state = order.status;
    badge.textContent = orderStates[order.status];
    header.append(heading, badge);
    const summary = document.createElement("p");
    summary.className = "retail-order-meta";
    summary.textContent = [orderDate.format(new Date(order.createdAt)), formatPrice(order.totalAmount), paymentLabel(order)].join(" · ");
    card.append(header, summary);
    if (seller) {
      card.append(renderSellerDetails(order));
      appendAction(card, order, order);
    } else {
      for (const part of order.fulfillments) {
        const workshop = document.createElement("section");
        workshop.className = "retail-order-part";
        const heading = document.createElement("h3");
        heading.textContent = part.artisan.workshopName;
        const summary = document.createElement("p");
        summary.textContent = orderStates[part.status] + " · " + paymentLabel({ ...part, paymentMethod: order.paymentMethod });
        workshop.append(heading, summary);
        appendAction(workshop, order, part);
        card.append(workshop);
      }
    }
    return card;
  }

  function renderSellerDetails(order) {
    const details = document.createElement("div");
    details.className = "retail-order-details";
    const lines = document.createElement("ul");
    lines.className = "retail-order-items";
    for (const item of order.items) {
      const row = document.createElement("li");
      const name = document.createElement("strong");
      name.textContent = item.product.name;
      const value = document.createElement("span");
      value.textContent = `${item.quantity} × ${formatPrice(item.unitPrice)} · ${formatPrice(item.subtotal)}`;
      row.append(name, value);
      lines.append(row);
    }
    const shipping = document.createElement("dl");
    for (const [label, value] of [
      ["Người nhận", order.recipientName], ["Điện thoại", order.recipientPhone],
      ["Địa chỉ giao", order.shippingAddress], ["Ghi chú giao hàng", order.shippingNote],
    ]) {
      if (!value) continue;
      const term = document.createElement("dt");
      term.textContent = label;
      const detail = document.createElement("dd");
      detail.textContent = value;
      shipping.append(term, detail);
    }
    details.append(lines, shipping);
    return details;
  }

  function appendAction(card, order, part) {
    const next = nextState[part.status];
    if (!next) return;
    const form = document.createElement("form");
    form.className = "account-form";
    const collect = next === "DELIVERED" && order.paymentMethod === "COD" && part.paymentStatus === "UNPAID";
    if (next === "DELIVERED" && !collect && part.paymentStatus !== "PAID") {
      const feedback = document.createElement("p");
      feedback.textContent = "Chỉ xác nhận giao hàng khi đơn đã thanh toán.";
      card.append(feedback);
      return;
    }
    if (collect) {
      const label = document.createElement("label");
      label.className = "trade-choice";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.required = true;
      label.append(input, "Đã thu tiền COD cho phần hàng của xưởng này");
      form.append(label);
    }
    const button = document.createElement("button");
    button.type = "submit";
    button.className = "button button-primary";
    button.textContent = nextLabel[next];
    const feedback = document.createElement("p");
    feedback.className = "trade-feedback";
    feedback.setAttribute("role", "status");
    form.append(button, feedback);
    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (saving || loading) return;
      const profile = account.profile;
      saving = button.disabled = true;
      syncControls();
      status.textContent = "";
      feedback.textContent = "Đang lưu trạng thái…";
      try {
        await request("/retail/orders/" + encodeURIComponent(order.id) + "/workshops/" + encodeURIComponent(part.artisanId) + "/status", {
          method: "PATCH",
          auth: true,
          body: { status: next, ...(collect ? { paymentCollected: true } : {}) },
        });
        if (profile === account.profile) {
          feedback.textContent = "Đã cập nhật trạng thái.";
          await load(page, "Đã cập nhật đơn " + order.orderCode + ".");
        }
      } catch (error) {
        if (profile === account.profile) feedback.textContent = error.message;
      } finally {
        saving = button.disabled = false;
        syncControls();
      }
    });
    card.append(form);
  }

  account.onChange(() => {
    filter.value = "";
    page = 1;
    hasNext = false;
    content.replaceChildren();
    pagination.hidden = true;
    load(1);
  });
  signIn.addEventListener("click", account.open);
  refresh.addEventListener("click", () => load());
  filter.addEventListener("change", () => load(1));
  previous.addEventListener("click", () => load(page - 1));
  nextPage.addEventListener("click", () => load(page + 1));
  load();
}
