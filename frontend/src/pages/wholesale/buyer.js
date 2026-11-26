import { formatPrice, saleUnits } from "../../components/ui.js";
import { getCatalogProduct } from "../../api/catalog.js";
import { referenceProductPrice } from "../../components/reference-product-card.js";
import { vietnamToday } from "../../data/input-values.js";
import { weaveTypes } from "../../data/weave-types.js";
import { productPagePath, quoteJournalPath, quotePagePath, sitePaths } from "../../site-paths.js";
import { reviewForm } from "../reviews.page.js";
import { allocationPreview, bidText, card, displayDate, get, hasQuoteJournal, labels, paragraph, quoteExpired, quoteLabel, quoteProgress, workshopName, write } from "./view.js";

const workshopFields = `<fieldset class="quote-workshops">
  <legend>Chọn xưởng nhận yêu cầu</legend>
  <p>Có thể để trống để nhờ Ban quản lý chọn xưởng.</p>
  <p role="status" data-workshop-selection></p>
  <ul class="quote-selected-workshops"></ul>
  <div data-workshop-options></div>
</fieldset>`;

function mountWorkshopPicker(form, list, key, selected, onChange) {
  const count = form.querySelector("[data-workshop-selection]");
  const options = form.querySelector("[data-workshop-options]");
  const summary = form.querySelector(".quote-selected-workshops");
  function updateSelection() {
    count.textContent = `Đã chọn ${selected.size} xưởng`;
    summary.hidden = !selected.size;
    for (const choice of options.querySelectorAll('input[type="checkbox"]')) choice.checked = selected.has(choice.value);
    summary.replaceChildren(...Array.from(selected, ([id, name]) => {
      const item = document.createElement("li");
      const remove = document.createElement("button");
      remove.className = "text-button";
      remove.type = "button";
      remove.textContent = "Bỏ chọn";
      remove.setAttribute("aria-label", "Bỏ chọn " + name);
      remove.addEventListener("click", () => {
        selected.delete(id);
        updateSelection();
        const next = [...options.querySelectorAll('input[type="checkbox"]')].find(choice => choice.value === id)
          || summary.querySelector("button") || form.querySelector('[type="submit"]');
        next?.focus();
      });
      item.append(document.createTextNode(name), remove);
      return item;
    }));
    onChange?.();
  }
  updateSelection();
  list(options, {
    key, path: "/artisans?storefront=true", auth: false, label: "xưởng nhận yêu cầu",
    empty: "Chưa có xưởng nhận yêu cầu đặt sỉ.",
    render(workshops, target) {
      for (const workshop of workshops) {
        const label = document.createElement("label");
        label.className = "trade-choice";
        const choice = document.createElement("input");
        choice.type = "checkbox";
        choice.value = workshop.id;
        choice.checked = selected.has(workshop.id);
        choice.addEventListener("change", () => {
          if (choice.checked) selected.set(workshop.id, workshop.workshopName);
          else selected.delete(workshop.id);
          updateSelection();
        });
        label.append(choice, workshop.workshopName);
        target.append(label);
      }
    },
  });
}

function selectedWorkshopIds(selected) {
  if (selected.size > 100) throw new Error("Chọn tối đa 100 xưởng cho mỗi yêu cầu.");
  return [...selected.keys()];
}

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
        item.append(link, paragraph(quoteLabel(quote)));
        if (hasQuoteJournal(quote.status)) item.append(journalLink(quote.id));
        items.append(item);
      }
      target.append(items);
    },
  });
  const source = await draftSource(query, signal).catch(error => ({ error }));
  if (signal.aborted) return;
  const sample = source?.product;
  const listedPrice = sample?.price == null ? "" : "Giá niêm yết tham khảo · " + (
    source.reference ? referenceProductPrice(sample) : formatPrice(sample.price, saleUnits[sample.saleUnit])
  );
  const priceNote = listedPrice ? `${listedPrice} (mẫu ${sample.name})\n\n` : "";
  const selectedWorkshops = new Map();
  if (sample?.artisan?.id) selectedWorkshops.set(sample.artisan.id, sample.artisan.workshopName);
  const fields = form(`
    <label>Sản phẩm cần đặt<input name="title" required maxlength="255" placeholder="Ví dụ: Khăn lụa in logo"></label>
    <label>Loại lụa<select name="preferredWeaveType"><option value="">Chọn loại lụa</option>${Object.entries(weaveTypes).map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}</select></label>
    <label>Số lượng<input name="targetQuantity" type="number" min="1" max="2147483647" required></label>
    <label>Ngày cần hàng<input name="deadline" type="date" required></label>
    <label>Ghi chú và quy cách<textarea name="specifications" rows="6" required maxlength="10000" placeholder="Màu, kích thước, yêu cầu cá nhân hóa hoặc thời gian mong muốn"></textarea></label>
    ${workshopFields}`, "Lưu yêu cầu nháp", async values => {
    const artisanIds = selectedWorkshopIds(selectedWorkshops);
    const notes = values.get("specifications").trim();
    if (!notes) throw new Error("Nhập ghi chú hoặc quy cách của sản phẩm cần đặt.");
    const { data } = await write("/wholesale/quotes", {
      title: values.get("title").trim(),
      specifications: priceNote + notes,
      deadline: values.get("deadline"),
      targetQuantity: Number(values.get("targetQuantity")),
      ...(values.get("preferredWeaveType") && { preferredWeaveType: values.get("preferredWeaveType") }),
      artisanIds,
    });
    return quotePagePath(data.id);
  });
  const deadline = fields.elements.namedItem("deadline");
  deadline.min = vietnamToday();
  deadline.dataset.minMessage = "Chọn ngày cần hàng từ hôm nay trở đi.";
  mountWorkshopPicker(fields, list, "buyer-workshops", selectedWorkshops);
  if (source?.error) create.append(paragraph("Chưa tải được mẫu lụa. Bạn có thể nhập thông tin để đặt sỉ."));
  const link = document.createElement("a");
  link.className = "text-link";
  link.href = sample ? productPagePath(sample.slug, source.reference) : sitePaths.catalog;
  link.textContent = sample ? "Xem mẫu " + sample.name : "Chọn mẫu từ danh mục";
  create.append(link);
  if (sample) {
    fields.elements.namedItem("title").value = sample.name;
    if (sample.weaveType) fields.elements.namedItem("preferredWeaveType").value = sample.weaveType;
    const specs = ["Mẫu lụa " + sample.name];
    if (sample.rawMaterial) specs.push("Chất liệu " + sample.rawMaterial);
    else if (sample.type) specs.push("Loại mẫu " + sample.type);
    const specifications = fields.elements.namedItem("specifications");
    if (listedPrice) {
      create.append(paragraph(listedPrice));
      specifications.maxLength -= priceNote.length;
    }
    specifications.value = specs.join("\n");
  }
  create.append(fields);
}

function journalLink(id) {
  const link = document.createElement("a");
  link.className = "text-link";
  link.href = quoteJournalPath(id);
  link.textContent = "Xem nhật ký đơn đặt sỉ";
  return link;
}

export async function buyerQuoteView(root, { button, form, expand, list, quoteId, signal }) {
  const path = "/wholesale/quotes/" + encodeURIComponent(quoteId);
  const quote = await get(path, signal);
  const panel = card(root, quote.title, quoteLabel(quote) + " · " + quote.targetQuantity + " sản phẩm");
  panel.classList.add("quote-detail");
  const notes = paragraph(quote.specifications);
  notes.className = "quote-notes";
  panel.append(quoteProgress(quote.status), notes);
  panel.append(paragraph("Ngày cần hàng · " + displayDate.format(new Date(quote.deadline))));
  const selected = new Map(quote.recipients.map(({ artisanId, artisan }) => [artisanId, artisan.workshopName]));
  if (quote.targetArtisan) selected.set(quote.targetArtisan.id, quote.targetArtisan.workshopName);
  const workshops = [...selected.values()];
  if (workshops.length) panel.append(paragraph("Xưởng nhận yêu cầu · " + workshops.join(", ")));
  if (hasQuoteJournal(quote.status)) panel.append(journalLink(quote.id));
  if (quote.status === "DRAFT" && !quoteExpired(quote)) {
    const actions = document.createElement("div");
    actions.className = "trade-toolbar";
    const send = workshops.length ? button("Gửi xưởng đã chọn", () => write(path + "/send")) : null;
    const dispatch = !workshops.length ? button("Gửi Ban quản lý điều phối", () => write(path + "/request-dispatch")) : null;
    const pendingSelection = paragraph("Lưu danh sách xưởng trước khi gửi.");
    pendingSelection.hidden = true;
    pendingSelection.setAttribute("role", "status");
    if (send) actions.append(send);
    if (dispatch) actions.append(dispatch);
    panel.append(actions, pendingSelection);
    const savedWorkshops = [...selected.keys()];
    expand(panel, {
      key: "workshops-" + quoteId, label: "Đổi xưởng nhận yêu cầu",
      mount(details) {
        const picker = form(workshopFields, "Lưu danh sách xưởng", () =>
          write(path + "/workshops", { artisanIds: selectedWorkshopIds(selected) }, "PATCH"));
        mountWorkshopPicker(picker, list, "draft-workshops-" + quoteId, selected, () => {
          const changed = selected.size !== savedWorkshops.length || savedWorkshops.some(id => !selected.has(id));
          if (send) send.disabled = changed;
          if (dispatch) dispatch.disabled = changed;
          pendingSelection.hidden = !changed;
        });
        details.append(picker);
      },
    });
  }
  if (quote.status === "PENDING_DISPATCH" && !quoteExpired(quote)) panel.append(paragraph("Ban quản lý đã nhận yêu cầu và sẽ mời các xưởng phù hợp chào giá."));
  const options = quote.bids.filter(bid => bid.status === "SUBMITTED");
  if (options.length && quote.status === "ARTISANS_BIDDING" && !quoteExpired(quote)) {
    const due = new Date(quote.deadline).getTime();
    const today = new Date(vietnamToday() + "T00:00:00Z").getTime();
    const bids = form("", "Chốt báo giá", async values => {
      const bidIds = values.getAll("bid");
      if (!bidIds.length) throw new Error("Chọn ít nhất một báo giá.");
      const limit = Math.min(quote.targetQuantity, 100);
      if (bidIds.length > limit) throw new Error(`Chỉ được chọn tối đa ${limit} báo giá.`);
      const allocations = bidIds.map(bidId => ({
        bidId, quantity: bidIds.length === 1 ? quote.targetQuantity : Number(values.get("quantity-" + bidId)),
      }));
      if (allocations.reduce((total, item) => total + item.quantity, 0) !== quote.targetQuantity) {
        throw new Error(`Tổng số lượng chia cho các xưởng phải bằng ${quote.targetQuantity}.`);
      }
      const bidVersions = Object.fromEntries(options.filter(bid => bidIds.includes(bid.id)).map(bid => [bid.id, bid.revision]));
      await write(path + "/accept", { bidIds, allocations, bidVersions });
      return quoteJournalPath(quote.id);
    });
    const choices = [];
    const preview = paragraph("");
    preview.setAttribute("aria-live", "polite");
    bids.querySelector('button[type="submit"]').before(paragraph("Giá từng phần được tính theo tỷ lệ số lượng giao cho xưởng, làm tròn đến 0,01 ₫."), preview);
    for (const bid of options) {
      const label = document.createElement("label");
      label.className = "trade-choice";
      const choice = document.createElement("input");
      choice.type = "checkbox";
      choice.name = "bid";
      choice.value = bid.id;
      const late = today + bid.proposedCompletionDays * 86400000 > due;
      label.append(choice, bidText(bid) + (bid.note ? " · " + bid.note : "") + (late ? " · Thời gian sản xuất vượt ngày cần hàng" : ""));
      const allocation = document.createElement("label");
      const quantity = document.createElement("input");
      quantity.type = "number";
      quantity.name = "quantity-" + bid.id;
      quantity.min = "1";
      quantity.max = String(quote.targetQuantity);
      quantity.required = true;
      allocation.append("Số lượng giao xưởng", quantity);
      bids.querySelector('button[type="submit"]').before(label, allocation);
      choices.push({ choice, allocation, quantity });
    }
    function syncQuantities() {
      const checked = choices.filter(({ choice }) => choice.checked);
      const multiple = checked.length > 1;
      for (const { choice, allocation, quantity } of choices) {
        allocation.hidden = quantity.disabled = !(multiple && choice.checked);
      }
      allocationPreview(preview, quote, options, checked.map(({ choice, quantity }) => ({ bidId: choice.value, quantity: multiple ? Number(quantity.value) : quote.targetQuantity })));
    }
    bids.addEventListener("input", syncQuantities);
    syncQuantities();
    panel.append(bids);
  } else {
    for (const bid of quote.bids) panel.append(paragraph(bidText(bid) + " · " + labels[bid.status]));
  }
  for (const assignment of quote.assignments) {
    panel.append(paragraph(`${workshopName(assignment)} · ${assignment.allocatedQuantity} sản phẩm · ${formatPrice(assignment.agreedPrice)}`));
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
}
