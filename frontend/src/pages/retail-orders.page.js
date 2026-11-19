import { request, signedIn } from "../api/http.js";
import { formatPrice } from "../components/ui.js";

const orderStates = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  SHIPPING: "Đang giao",
  DELIVERED: "Đã giao",
  CANCELLED: "Đã hủy",
};
const paymentStates = { UNPAID: "Chưa thu tiền", PAID: "Đã thu tiền", FAILED: "Thất bại", REFUNDED: "Đã hoàn tiền" };
const nextState = { PENDING: "CONFIRMED", CONFIRMED: "SHIPPING", SHIPPING: "DELIVERED" };
const nextLabel = { CONFIRMED: "Xác nhận đơn", SHIPPING: "Bắt đầu giao", DELIVERED: "Xác nhận đã giao" };
const pageSize = 50;

export function paymentLabel(order) {
  return (order.paymentMethod === "COD" ? "COD · " : "") + (paymentStates[order.paymentStatus] || order.paymentStatus);
}

export function mountRetailOrders(section, account) {
  section.innerHTML = `
    <div class="section-heading"><h1 id="retail-orders-title" class="page-title">Xử lý đơn bán lẻ</h1></div>
    <div class="retail-access">
      <p>Trang này dành cho ban quản lý.</p>
      <button type="button" class="button button-outline">Đăng nhập</button>
    </div>
    <div class="trade-toolbar retail-toolbar" hidden>
      <button type="button" class="button button-outline" data-refresh>Tải lại đơn lẻ</button>
      <p role="status" class="trade-feedback"></p>
    </div>
    <div class="trade-content" hidden></div>
    <div class="trade-toolbar retail-pagination" role="group" aria-label="Phân trang đơn bán lẻ" hidden>
      <button type="button" class="button button-outline" data-previous>Trang trước</button>
      <span></span>
      <button type="button" class="button button-outline" data-next>Trang sau</button>
    </div>`;
  const refresh = section.querySelector("[data-refresh]");
  const toolbar = section.querySelector(".retail-toolbar");
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
    refresh.disabled = content.inert = busy;
    previous.disabled = busy || page === 1;
    nextPage.disabled = busy || !hasNext;
  }

  async function load(targetPage = page, message = "") {
    const revision = ++version;
    const allowed = account.profile?.role === "ADMIN";
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
      const { data } = await request(`/retail/admin/orders?limit=${pageSize}&page=${targetPage}`, { auth: true });
      if (revision !== version) return;
      if (targetPage > page && !data.length) {
        hasNext = false;
        status.textContent = "Bạn đang ở trang cuối.";
        return;
      }
      page = targetPage;
      hasNext = data.length === pageSize && page < 10000;
      content.replaceChildren(...data.map(renderOrder));
      pagination.hidden = page === 1 && !hasNext;
      pagination.querySelector("span").textContent = "Trang " + page;
      status.textContent = message || (data.length ? "" : "Chưa có đơn bán lẻ.");
    } catch (error) {
      if (revision === version) status.textContent = error.message;
    } finally {
      if (revision === version) {
        loading = false;
        syncControls();
      }
    }
  }

  function renderOrder(order) {
    const card = document.createElement("article");
    card.className = "trade-card";
    const heading = document.createElement("h3");
    heading.textContent = order.orderCode;
    const summary = document.createElement("p");
    summary.textContent = [orderStates[order.status], formatPrice(order.totalAmount), paymentLabel(order)].join(" · ");
    card.append(heading, summary);

    const next = nextState[order.status];
    if (!next) return card;
    const form = document.createElement("form");
    form.className = "account-form";
    const collect = next === "DELIVERED" && order.paymentMethod === "COD" && order.paymentStatus === "UNPAID";
    if (next === "DELIVERED" && !collect && order.paymentStatus !== "PAID") {
      const feedback = document.createElement("p");
      feedback.textContent = "Chỉ xác nhận giao hàng khi đơn đã thanh toán.";
      card.append(feedback);
      return card;
    }
    if (collect) {
      const label = document.createElement("label");
      label.className = "trade-choice";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.required = true;
      label.append(input, "Đã thu tiền COD");
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
        await request("/retail/orders/" + encodeURIComponent(order.id) + "/status", {
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
    return card;
  }

  account.onChange(() => load());
  signIn.addEventListener("click", account.open);
  refresh.addEventListener("click", () => load());
  previous.addEventListener("click", () => load(page - 1));
  nextPage.addEventListener("click", () => load(page + 1));
  load();
}
