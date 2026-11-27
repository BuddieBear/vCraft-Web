import { formatPrice, icon, saleUnits } from "../components/ui.js";
import { request, signedIn } from "../api/http.js";
import { paymentLabel } from "../data/payment-labels.js";
import { reviewForm } from "./reviews.page.js";
import { bindFormErrors, clearFormErrors, showFormErrors } from "../components/form-errors.js";
import { recipientPhoneError, shippingAddressMin, validRecipientPhone } from "../data/input-values.js";
import { retailStatusLabels as orderStatus } from "../data/retail-status.js";

export function mountCart(dialog, updateBadge, notify, account) {
  let items = [];
  let busy = false;
  let revision = 0;
  let confirmedItems = [];

  async function refresh() {
    const version = ++revision;
    if (!signedIn() || account.profile?.role !== "BUYER") {
      items = [];
      updateBadge(0);
      return;
    }
    const { data } = await request("/retail/cart", { auth: true });
    if (version !== revision) return;
    items = data;
    updateBadge(itemCount());
  }

  function itemCount() {
    return items.reduce((count, item) => count + item.quantity, 0);
  }

  function render() {
    confirmedItems = items.map(({ product, quantity }) => ({ productId: product.id, unitPrice: String(product.price), quantity }));
    dialog.innerHTML = `
      <div class="cart-header"><h2 id="cart-title">Giỏ lụa <small>(${itemCount()})</small></h2>
        <button type="button" class="icon-button" data-action="close" aria-label="Đóng giỏ hàng">${icon("close")}</button>
      </div>
      <p class="cart-footnote" role="status"></p>
      <ul class="cart-items"></ul>
      <div class="cart-total" hidden><span>Tạm tính</span><strong></strong></div>
      <form class="account-form checkout-form" hidden>
        <label>Tên người nhận<input name="recipientName" autocomplete="name" maxlength="120" required></label>
        <label>Số điện thoại<input name="recipientPhone" type="tel" autocomplete="tel" inputmode="tel" maxlength="20" required></label>
        <label>Địa chỉ giao hàng<textarea name="shippingAddress" autocomplete="street-address" minlength="${shippingAddressMin}" maxlength="2000" required></textarea></label>
        <label>Ghi chú giao hàng<textarea name="shippingNote" maxlength="2000"></textarea></label>
        <button class="button button-primary cart-checkout" type="submit">Đặt hàng · trả khi nhận</button>
      </form>
      <button class="text-button" type="button" data-action="orders">Xem đơn hàng</button>
      <div class="cart-orders"></div>`;
    const list = dialog.querySelector(".cart-items");
    const status = dialog.querySelector("[role=status]");
    const orders = dialog.querySelector('[data-action="orders"]');
    orders.hidden = account.profile?.role !== "BUYER";
    if (!items.length) {
      status.textContent = "Giỏ lụa đang trống.";
      return;
    }
    let canCheckout = true;
    for (const { product, quantity } of items) {
      const line = document.createElement("li");
      line.innerHTML = `
        <div>
          <strong></strong><p></p>
          <div class="quantity">
            <button type="button" data-action="decrease" aria-label="Giảm số lượng">${icon("minus")}</button>
            <span></span>
            <button type="button" data-action="increase" aria-label="Tăng số lượng">${icon("plus")}</button>
            <button class="remove" type="button" data-action="remove">Xóa</button>
          </div>
        </div>`;
      line.dataset.product = product.id;
      line.querySelector("strong").textContent = product.name;
      const price = line.querySelector("p");
      price.textContent = formatPrice(product.price, saleUnits[product.saleUnit]);
      const available = product.isAvailable ?? (product.isPublished && product.price !== null);
      if (!available || quantity > product.stockQuantity) {
        canCheckout = false;
        const warning = document.createElement("p");
        warning.textContent = available
          ? `Tồn kho còn ${product.stockQuantity}. Hãy giảm số lượng hoặc xóa sản phẩm.`
          : "Sản phẩm hiện không thể đặt. Hãy xóa khỏi giỏ để tiếp tục.";
        price.after(warning);
      }
      line.querySelector("span").textContent = quantity;
      line.querySelector('[data-action="increase"]').disabled = !available || quantity >= product.stockQuantity;
      list.append(line);
    }
    const total = dialog.querySelector(".cart-total");
    total.hidden = false;
    total.querySelector("strong").textContent = formatPrice(items.reduce((sum, { product, quantity }) => sum + Number(product.price) * quantity, 0));
    const form = dialog.querySelector("form");
    bindFormErrors(form);
    form.hidden = false;
    form.querySelector('[type="submit"]').disabled = !canCheckout;
    form.elements.namedItem("recipientName").value = account.profile?.fullName || "";
    const phone = account.profile?.phone;
    form.elements.namedItem("recipientPhone").value = phone && validRecipientPhone(phone) ? phone : "";
  }

  async function updateQuantity(id, quantity, product) {
    const buyer = account.profile;
    await request("/retail/cart/" + encodeURIComponent(id), { method: "PUT", body: { quantity }, auth: true });
    try {
      await refresh();
    } catch {
      if (buyer !== account.profile) return;
      const item = items.find(entry => entry.product.id === id);
      if (quantity === 0) items = items.filter(entry => entry !== item);
      else if (item) item.quantity = quantity;
      else if (product) items.push({ product: { ...product, isAvailable: true }, quantity });
      updateBadge(itemCount());
      notify("Đã cập nhật giỏ hàng. Danh sách sẽ được tải lại khi mở giỏ.");
    }
  }

  function report(error) {
    const status = dialog.querySelector("[role=status]");
    if (status) status.textContent = error.message;
  }

  async function requireBuyer() {
    const profile = await account.resolveProfile();
    if (profile?.role === "BUYER") return profile;
    if (signedIn()) throw new Error("Giỏ hàng dành cho tài khoản người mua.");
    account.open();
    return false;
  }

  async function showOrders(page = 1, id) {
    const target = dialog.querySelector(".cart-orders");
    const profile = account.profile;
    const { data, pagination } = await request(id ? `/retail/orders/${encodeURIComponent(id)}` : `/retail/orders?limit=24&page=${page}`, { auth: true });
    if (!target.isConnected || !dialog.open || account.profile !== profile) return;
    const rows = id ? [data] : data;
    const heading = document.createElement("h3");
    heading.textContent = id ? "Chi tiết đơn hàng" : rows.length ? "Lịch sử đơn hàng" : "Bạn chưa có đơn hàng.";
    const orders = document.createElement("ul");
    for (const order of rows) {
      const item = document.createElement("li");
      item.textContent = `${order.orderCode} · ${orderStatus[order.status]} · ${formatPrice(order.totalAmount)} · ${paymentLabel(order)}`;
      if (order.fulfillments.length > 1 || id) {
        const progress = document.createElement("ul");
        for (const part of order.fulfillments) {
          const row = document.createElement("li");
          row.textContent = `${part.artisan.workshopName} · ${orderStatus[part.status]} · ${paymentLabel({ ...part, paymentMethod: order.paymentMethod })}`;
          progress.append(row);
        }
        item.append(progress);
      }
      if (id) {
        const lines = document.createElement("ul");
        for (const line of order.items) {
          const row = document.createElement("li");
          row.textContent = `${line.quantity} × ${line.product.name} · ${formatPrice(line.subtotal)}`;
          lines.append(row);
        }
        const shipping = document.createElement("p");
        shipping.textContent = [order.recipientName, order.recipientPhone, order.shippingAddress, order.shippingNote].filter(Boolean).join(" · ");
        item.append(lines, shipping);
      }
      if (order.status === "PENDING" && order.paymentStatus === "UNPAID" && order.fulfillments.every(part => ["PENDING", "CANCELLED"].includes(part.status))) {
        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.className = "button button-outline";
        cancel.dataset.action = "cancel-order";
        cancel.dataset.order = order.id;
        cancel.dataset.page = page;
        if (id) cancel.dataset.detail = id;
        cancel.textContent = "Hủy đơn";
        item.append(cancel);
      }
      if (order.status === "DELIVERED" && order.paymentStatus === "PAID") {
        const delivered = new Set(order.fulfillments.filter(part => part.status === "DELIVERED").map(part => part.artisanId));
        const review = reviewForm(order, "retailOrderId", order.items.filter(line => delivered.has(line.artisanId)).map(line => ({
          productId: line.productId, productName: line.product.name,
          artisanId: line.artisanId, workshopName: line.artisan.workshopName,
        })));
        if (review) item.append(review);
      }
      orders.append(item);
    }
    target.replaceChildren(heading, orders);
    if (!pagination) return;
    for (const [available, next, label] of [[page > 1, page - 1, "Trang trước"], [pagination.hasNext, page + 1, "Trang sau"]]) {
      if (!available) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "button button-outline";
      button.dataset.action = "orders";
      button.dataset.page = next;
      button.textContent = label;
      target.append(button);
    }
  }

  dialog.addEventListener("click", async event => {
    const control = event.target.closest("[data-action]");
    if (!control) return;
    const action = control.dataset.action;
    if (action === "close") {
      dialog.close();
      return;
    }
    if (busy) return;
    busy = control.disabled = true;
    try {
      if (action === "orders" || action === "cancel-order") {
        if (action === "cancel-order") {
          if (!window.confirm("Hủy đơn hàng này?")) return;
          await request(`/retail/orders/${encodeURIComponent(control.dataset.order)}/status`, { method: "PATCH", auth: true, body: { status: "CANCELLED" } });
          notify("Đã hủy đơn hàng.");
        }
        await showOrders(Number(control.dataset.page || 1), control.dataset.detail);
        return;
      }
      const id = control.closest("[data-product]").dataset.product;
      const item = items.find(entry => entry.product.id === id);
      const form = dialog.querySelector("form");
      const draft = new FormData(form);
      await updateQuantity(id, action === "remove" ? 0 : item.quantity + (action === "increase" ? 1 : -1));
      if (!dialog.open) return;
      render();
      for (const [key, value] of draft) dialog.querySelector("form").elements.namedItem(key).value = value;
    } catch (error) {
      report(error);
    } finally { busy = control.disabled = false; }
  });

  dialog.addEventListener("submit", async event => {
    if (!event.target.matches(".checkout-form")) return;
    event.preventDefault();
    const form = event.target;
    const button = form.querySelector("button");
    if (busy || button.disabled) return;
    clearFormErrors(form);
    dialog.querySelector("[role=status]").textContent = "";
    const values = Object.fromEntries(new FormData(form));
    if (!validRecipientPhone(values.recipientPhone)) {
      showFormErrors(form, [{ name: "recipientPhone", message: recipientPhoneError }]);
      return;
    }
    busy = button.disabled = true;
    try {
      const { data } = await request("/retail/checkout", {
        method: "POST", auth: true, body: { ...values, paymentMethod: "COD", confirmedItems },
      });
      items = [];
      updateBadge(0);
      dialog.close();
      notify("Đã tạo đơn " + data.orderCode + ".");
    } catch (error) {
      if (error.code === "CART_CHANGED" && dialog.open) {
        try {
          await refresh();
          if (!dialog.open) return;
          render();
          for (const [key, value] of Object.entries(values)) dialog.querySelector("form").elements.namedItem(key).value = value;
        } catch (refreshError) {
          report(refreshError);
          return;
        }
      }
      if (!showFormErrors(form, error.fields)) report(error);
    } finally { busy = button.disabled = false; }
  });

  account.onChange(() => {
    if (!account.profile && dialog.open) dialog.close();
    refresh().catch(() => { /* Keep the last confirmed cart while the API is unreachable. */ });
  });

  return {
    async add(product) {
      if (busy) return false;
      busy = true;
      try {
        const buyer = await requireBuyer();
        if (!buyer) return false;
        await refresh();
        if (buyer !== account.profile) return false;
        const quantity = items.find(item => item.product.id === product.id)?.quantity || 0;
        await updateQuantity(product.id, quantity + 1, product);
        return true;
      } finally { busy = false; }
    },
    async open(orderId) {
      if (busy) return;
      busy = true;
      try {
        const buyer = await requireBuyer();
        if (!buyer) return;
        await refresh();
        if (buyer !== account.profile) return;
        render();
        if (!dialog.open) dialog.showModal();
        if (typeof orderId === "string") await showOrders(1, orderId);
      } catch (error) { notify(error.message); }
      finally { busy = false; }
    },
  };
}
