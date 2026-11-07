import { asset, formatPrice, icon } from "../components/ui.js";
import { products } from "../data/demo-data.js";

const key = "vcraft-demo-cart-v1";
const maxQuantity = 99;
const orderable = new Map(products.filter(product => product.price !== null).map(product => [product.id, product]));

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "{}");
    return new Map(Object.entries(saved || {}).filter(([id, quantity]) =>
      orderable.has(id) && Number.isInteger(quantity) && quantity > 0 && quantity <= maxQuantity));
  } catch {
    return new Map();
  }
}

export function mountCart(dialog, updateBadge, notify) {
  const cart = loadCart();

  function itemCount() {
    return [...cart.values()].reduce((total, quantity) => total + quantity, 0);
  }

  function save() {
    try {
      localStorage.setItem(key, JSON.stringify(Object.fromEntries(cart)));
    } catch {
      // The current page can still hold the cart if browser storage is unavailable.
    }
    updateBadge(itemCount());
  }

  function render() {
    const items = [...cart].map(([id, quantity]) => [orderable.get(id), quantity]);
    const total = items.reduce((sum, [product, quantity]) => sum + product.price * quantity, 0);
    dialog.innerHTML = `
      <div class="cart-header"><h2 id="cart-title">Giỏ lụa <small>(${itemCount()})</small></h2>
        <button type="button" class="icon-button" data-cart-action="close" aria-label="Đóng giỏ hàng">${icon("close")}</button>
      </div>
      ${items.length ? `
        <ul class="cart-items">
          ${items.map(([product, quantity]) => `
            <li>
              <img src="${asset(product.image)}" alt="" width="76" height="76">
              <div>
                <strong>${product.name}</strong><p>${formatPrice(product.price, product.unit)}</p>
                <div class="quantity">
                  <button type="button" data-id="${product.id}" data-cart-action="decrease" aria-label="Giảm số lượng ${product.name}">${icon("minus")}</button>
                  <span>${quantity}</span>
                  <button type="button" data-id="${product.id}" data-cart-action="increase" aria-label="Tăng số lượng ${product.name}" ${quantity === maxQuantity ? "disabled" : ""}>${icon("plus")}</button>
                  <button class="remove" type="button" data-id="${product.id}" data-cart-action="remove" aria-label="Xóa ${product.name}">Xóa</button>
                </div>
              </div>
            </li>`).join("")}
        </ul>
        <div class="cart-total"><span>Tạm tính</span><strong>${formatPrice(total)}</strong></div>
        <button class="button button-primary cart-checkout" type="button" data-cart-action="checkout">Xác nhận đơn mẫu ${icon("arrow")}</button>
        <p class="cart-footnote">Đơn thử chỉ dùng dữ liệu trong trình duyệt.</p>` : `
        <div class="cart-empty">${icon("bag")}<p>Giỏ lụa đang trống.</p>
        <button class="button button-outline" type="button" data-cart-action="close">Tiếp tục khám phá</button></div>`}
    `;
  }

  dialog.addEventListener("click", event => {
    const control = event.target.closest("[data-cart-action]");
    if (!control) return;
    const action = control.dataset.cartAction;
    const id = control.dataset.id;
    if (action === "close") {
      dialog.close();
      return;
    }
    if (action === "checkout") {
      cart.clear();
      save();
      dialog.close();
      notify("Đã xác nhận đơn mẫu.");
      return;
    }
    const quantity = cart.get(id);
    if (action === "remove" || (action === "decrease" && quantity === 1)) cart.delete(id);
    else if (action === "increase" && quantity < maxQuantity) cart.set(id, quantity + 1);
    else if (action === "decrease") cart.set(id, quantity - 1);
    save();
    render();
    const next = dialog.querySelector(`[data-id="${id}"][data-cart-action="${action}"]:enabled`);
    (next || dialog.querySelector("[data-cart-action=close]")).focus();
  });

  updateBadge(itemCount());
  return {
    add(product) {
      const quantity = cart.get(product.id) || 0;
      if (!orderable.has(product.id) || quantity === maxQuantity) return false;
      cart.set(product.id, quantity + 1);
      save();
      return true;
    },
    open() {
      render();
      dialog.showModal();
    },
  };
}
