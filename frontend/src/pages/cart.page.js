import { formatPrice, icon, saleUnits } from "../components/ui.js";
import { request, signedIn } from "../api/http.js";
import { paymentLabel } from "../data/payment-labels.js";
import { reviewForm } from "./reviews.page.js";
import { bindFormErrors, clearFormErrors, showFormErrors } from "../components/form-errors.js";
import { recipientPhoneError, validRecipientPhone } from "../data/input-values.js";

export function mountCart(dialog, updateBadge, notify, account) {
  let items = [];
  let busy = false;
  let revision = 0;
  const orderStatus = {
    PENDING: "Chờ xác nhận", CONFIRMED: "Đã xác nhận", SHIPPING: "Đang giao", DELIVERED: "Đã giao", CANCELLED: "Đã hủy",
  };

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
        <label>Địa chỉ giao hàng<textarea name="shippingAddress" autocomplete="street-address" maxlength="2000" required></textarea></label>
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
    form.elements.namedItem("recipientPhone").value = account.profile?.phone || "";
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
      if (action === "orders") {
        const { data } = await request("/retail/orders?limit=24", { auth: true });
        const target = dialog.querySelector(".cart-orders");
        const heading = document.createElement("h3");
        heading.textContent = data.length ? "Đơn hàng gần đây" : "Bạn chưa có đơn hàng.";
        const orders = document.createElement("ul");
        for (const order of data) {
          const item = document.createElement("li");
          item.textContent = `${order.orderCode} · ${orderStatus[order.status]} · ${formatPrice(order.totalAmount)} · ${paymentLabel(order)}`;
          if (order.fulfillments.length > 1) {
            const progress = document.createElement("ul");
            for (const part of order.fulfillments) {
              const row = document.createElement("li");
              row.textContent = `${part.artisan.workshopName} · ${orderStatus[part.status]} · ${paymentLabel({ ...part, paymentMethod: order.paymentMethod })}`;
              progress.append(row);
            }
            item.append(progress);
          }
          if (order.status === "DELIVERED" && order.paymentStatus === "PAID") {
            const review = reviewForm(order, "retailOrderId", order.items.map(line => ({
              productId: line.productId, productName: line.product.name,
              artisanId: line.artisanId, workshopName: line.artisan.workshopName,
            })));
            if (review) item.append(review);
          }
          orders.append(item);
        }
        target.replaceChildren(heading, orders);
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
        method: "POST", auth: true, body: { ...values, paymentMethod: "COD" },
      });
      items = [];
      updateBadge(0);
      dialog.close();
      notify("Đã tạo đơn " + data.orderCode + ".");
    } catch (error) {
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
    async open() {
      if (busy) return;
      busy = true;
      try {
        const buyer = await requireBuyer();
        if (!buyer) return;
        await refresh();
        if (buyer !== account.profile) return;
        render();
        if (!dialog.open) dialog.showModal();
      } catch (error) { notify(error.message); }
      finally { busy = false; }
    },
  };
}
