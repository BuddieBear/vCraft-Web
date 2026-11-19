import { formatPrice } from "../../components/ui.js";
import { request } from "../../api/http.js";
import { getCatalogProduct } from "../../api/catalog.js";
import { batchQr } from "../../components/batch-qr.js";
import { vietnamToday } from "../../data/input-values.js";
import { weaveTypes } from "../../data/weave-types.js";
import { productPagePath, quotePagePath } from "../../site-paths.js";
import { renderTimeline } from "../traceability.page.js";
import { reviewForm } from "../reviews.page.js";
import { bidText, card, displayDate, get, labels, paragraph, workshopName, write } from "./view.js";

async function draftSource(query, signal) {
  const sample = query.get("mau");
  const slug = sample || query.get("san-pham");
  if (!slug) return null;
  if (slug.length > 280 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error("Đường dẫn mẫu lụa không hợp lệ.");
  const reference = Boolean(sample);
  const product = await getCatalogProduct(slug, reference, signal);
  return { reference, product };
}

export async function buyerView(root, { form, query, list, signal }) {
  const create = card(root, "Tạo yêu cầu", "Mô tả sản phẩm, số lượng và ngày cần hàng.");
  const history = card(root, "Yêu cầu của bạn", "Mở yêu cầu để theo dõi báo giá và tiến độ.");
  list(history, {
    key: "buyer-quotes", path: "/wholesale/quotes", label: "yêu cầu của bạn", empty: "Bạn chưa có yêu cầu đặt sỉ.",
    render(quotes, target) {
      const items = document.createElement("ul");
      items.className = "quote-links";
      for (const quote of quotes) {
        const item = document.createElement("li");
        const link = document.createElement("a");
        link.className = "text-link";
        link.href = quotePagePath(quote.id);
        link.textContent = quote.title;
        item.append(link, paragraph(labels[quote.status]));
        items.append(item);
      }
      target.append(items);
    },
  });
  const source = await draftSource(query, signal).catch(error => ({ error }));
  if (signal.aborted) return;
  const sample = source?.product;
  const targetId = source?.reference ? null : sample?.artisan?.id;
  const fields = form(`
    <label>Tên yêu cầu<input name="title" required maxlength="255"></label>
    <label>Quy cách<textarea name="specifications" required maxlength="10000"></textarea></label>
    <label>Loại lụa<select name="preferredWeaveType"><option value="">Chọn loại lụa</option>${Object.entries(weaveTypes).map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}</select></label>
    <label>Số lượng<input name="targetQuantity" type="number" min="1" max="2147483647" required></label>
    <label>Ngày cần hàng<input name="deadline" type="date" required></label>`, "Lưu yêu cầu nháp", async values => {
    const { data } = await write("/wholesale/quotes", {
      title: values.get("title").trim(),
      specifications: values.get("specifications").trim(),
      deadline: values.get("deadline"),
      targetQuantity: Number(values.get("targetQuantity")),
      ...(values.get("preferredWeaveType") && { preferredWeaveType: values.get("preferredWeaveType") }),
      ...(targetId && values.has("sendToWorkshop") && { targetArtisanId: targetId }),
    });
    return quotePagePath(data.id);
  });
  const deadline = fields.elements.namedItem("deadline");
  deadline.min = vietnamToday();
  deadline.dataset.minMessage = "Chọn ngày cần hàng từ hôm nay trở đi.";
  if (source?.error) create.append(paragraph("Chưa tải được mẫu lụa. Bạn có thể nhập thông tin để đặt sỉ."));
  if (sample) {
    const link = document.createElement("a");
    link.className = "text-link";
    link.href = productPagePath(sample.slug, source.reference);
    link.textContent = "Xem mẫu " + sample.name;
    create.append(link);
    fields.elements.namedItem("title").value = sample.name;
    if (sample.weaveType) fields.elements.namedItem("preferredWeaveType").value = sample.weaveType;
    const specs = ["Mẫu lụa " + sample.name];
    if (sample.rawMaterial) specs.push("Chất liệu " + sample.rawMaterial);
    else if (sample.type) specs.push("Loại mẫu " + sample.type);
    fields.elements.namedItem("specifications").value = specs.join("\n");
    if (targetId) {
      const target = document.createElement("label");
      target.className = "trade-choice";
      const option = document.createElement("input");
      option.type = "checkbox";
      option.name = "sendToWorkshop";
      option.checked = true;
      target.append(option, "Gửi riêng tới " + sample.artisan.workshopName);
      fields.querySelector('button[type="submit"]').before(target);
    }
  }
  create.append(fields);
}

export async function buyerQuoteView(root, { button, form, quoteId, signal }) {
  const path = "/wholesale/quotes/" + encodeURIComponent(quoteId);
  const quote = await get(path, signal);
  const panel = card(root, quote.title, labels[quote.status] + " · " + quote.targetQuantity + " sản phẩm");
  panel.classList.add("quote-detail");
  panel.append(paragraph(quote.specifications));
  if (quote.maxBudget !== null) panel.append(paragraph("Ngân sách tối đa · " + formatPrice(quote.maxBudget)));
  panel.append(paragraph("Ngày cần hàng · " + displayDate.format(new Date(quote.deadline))));
  if (quote.status === "DRAFT") {
    const actions = document.createElement("div");
    actions.className = "trade-toolbar";
    actions.append(
      button(quote.targetArtisanId ? "Gửi xưởng đã chọn" : "Gửi nghệ nhân", () => write(path + "/send")),
      button("Gửi Ban quản lý điều phối", () => write(path + "/request-dispatch")),
    );
    panel.append(paragraph("Bản nháp chỉ mình bạn xem được. Chọn gửi tới xưởng hoặc nhờ Ban quản lý mời chào giá."), actions);
  }
  if (quote.status === "PENDING_DISPATCH") panel.append(paragraph("Ban quản lý đã nhận yêu cầu và sẽ mời các xưởng phù hợp chào giá."));
  const options = quote.bids.filter(bid => bid.status === "SUBMITTED");
  if (options.length && quote.status === "ARTISANS_BIDDING") {
    const due = new Date(quote.deadline).getTime();
    const today = new Date(vietnamToday() + "T00:00:00Z").getTime();
    const bids = form("", "Chốt báo giá", values => {
      const bidIds = values.getAll("bid");
      if (!bidIds.length) throw new Error("Chọn ít nhất một báo giá.");
      const limit = Math.min(quote.targetQuantity, 100);
      if (bidIds.length > limit) throw new Error(`Chỉ được chọn tối đa ${limit} báo giá.`);
      return write(path + "/accept", { bidIds });
    });
    for (const bid of options) {
      const label = document.createElement("label");
      label.className = "trade-choice";
      const choice = document.createElement("input");
      choice.type = "checkbox";
      choice.name = "bid";
      choice.value = bid.id;
      const late = today + bid.proposedCompletionDays * 86400000 > due;
      label.append(choice, bidText(bid) + (bid.note ? " · " + bid.note : "") + (late ? " · Thời gian sản xuất vượt ngày cần hàng" : ""));
      bids.prepend(label);
    }
    panel.append(bids);
  } else {
    for (const bid of quote.bids) panel.append(paragraph(bidText(bid) + " · " + labels[bid.status]));
  }
  if (quote.status === "DELIVERED") {
    const items = quote.assignments.filter(assignment => assignment.status === "COMPLETED").flatMap(assignment => {
      const target = { artisanId: assignment.artisanId, workshopName: workshopName(assignment) };
      return [target, ...assignment.batches.filter(batch => batch.status === "COMPLETED").map(batch => ({
        ...target, productId: batch.productId, productName: batch.product.name,
      }))];
    });
    const review = reviewForm(quote, "quotationRequestId", items);
    if (review) panel.append(review);
  }
  for (const assignment of quote.assignments) {
    panel.append(paragraph(workshopName(assignment) + " · " + assignment.allocatedQuantity + " sản phẩm · " + labels[assignment.status]));
    for (const batch of assignment.batches.filter(item => ["IN_PROGRESS", "COMPLETED"].includes(item.status))) {
      const details = document.createElement("details");
      details.className = "trade-batch";
      const summary = document.createElement("summary");
      summary.textContent = "Xem nhật ký " + batch.batchCode;
      const timeline = document.createElement("div");
      timeline.setAttribute("aria-live", "polite");
      let loading = false;
      let loaded = false;
      details.addEventListener("toggle", async () => {
        if (!details.open || loading || loaded || signal.aborted) return;
        loading = true;
        timeline.textContent = "Đang tải nhật ký…";
        try {
          const code = encodeURIComponent(batch.batchCode);
          const result = await get("/traceability/purchased/" + code, signal);
          if (signal.aborted) return;
          renderTimeline(timeline, result, "order-" + batch.id);
          loaded = true;
          try {
            await request("/traceability/by-code/" + code, { method: "HEAD", signal });
            if (signal.aborted) return;
            timeline.insertBefore(batchQr(batch.batchCode), timeline.querySelector(".stage-list"));
          } catch (error) {
            if (!signal.aborted && error.status !== 404) {
              timeline.append(paragraph("Chưa kiểm tra được mã QR. Đóng rồi mở lại để thử lại."));
              loaded = false;
            }
          }
        } catch (error) {
          if (!signal.aborted) timeline.textContent = error.message + " Đóng rồi mở lại để thử lại.";
        } finally { loading = false; }
      });
      details.append(summary, timeline);
      panel.append(details);
    }
  }
}
