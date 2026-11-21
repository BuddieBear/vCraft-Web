import { request } from "../api/http.js";

export function reviewForm(order, orderKey, items) {
  const targets = new Map();
  for (const { productId, productName, artisanId, workshopName } of items) {
    if (productId) targets.set(productId, { name: "Sản phẩm · " + productName, targetType: "PRODUCT", productId, artisanId });
    targets.set(artisanId, { name: "Xưởng · " + workshopName, targetType: "ARTISAN", artisanId });
  }
  for (const review of order.reviews || []) targets.delete(review.targetType === "PRODUCT" ? review.productId : review.artisanId);
  if (!targets.size) return null;

  const details = document.createElement("details");
  details.className = "order-review";
  details.innerHTML = `
    <summary>Viết đánh giá</summary>
    <form class="account-form">
      <label>Đối tượng đánh giá<select name="target" required></select></label>
      <label>Số sao<select name="rating"><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select></label>
      <label>Nhận xét<textarea name="comment" required maxlength="10000"></textarea></label>
      <p role="status"></p>
      <button class="button button-primary" type="submit">Gửi đánh giá</button>
    </form>`;
  const form = details.querySelector("form");
  const choice = form.elements.namedItem("target");
  const status = form.querySelector("[role=status]");
  const submit = form.querySelector("button");
  for (const [id, { name }] of targets) choice.add(new Option(name, id));
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const targetId = choice.value;
    const option = choice.selectedOptions[0];
    if (!option || submit.disabled) return;
    const { name, ...target } = targets.get(targetId);
    const comment = form.elements.namedItem("comment").value.trim();
    if (!comment) {
      status.textContent = "Nhập nhận xét trước khi gửi.";
      return;
    }
    submit.disabled = true;
    try {
      await request("/reviews", {
        method: "POST", auth: true,
        body: { ...target, [orderKey]: order.id, rating: Number(form.elements.namedItem("rating").value), comment },
      });
      option.remove();
      form.elements.namedItem("comment").value = "";
      status.textContent = "Đã gửi đánh giá cho " + name + ".";
      if (!choice.options.length) {
        details.querySelector("summary").textContent = "Đã gửi đánh giá";
        form.replaceChildren(status);
      }
    } catch (error) { status.textContent = error.message; }
    finally { submit.disabled = false; }
  });
  return details;
}
