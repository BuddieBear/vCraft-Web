import { formatPrice } from "../components/ui.js";
import { request } from "../api/http.js";
import { batchQr } from "../components/batch-qr.js";
import { renderTimeline } from "./traceability.page.js";
import { reviewForm } from "./reviews.page.js";
import { bindFormErrors, clearFormErrors, showFormErrors } from "../components/form-errors.js";
import { vietnamToday } from "../data/input-values.js";

const labels = {
  DRAFT: "Bản nháp", SENT_TO_ARTISANS: "Đã gửi", ARTISANS_BIDDING: "Đang nhận báo giá",
  BUYER_ACCEPTED: "Đã chốt báo giá", ASSIGNED: "Đã phân công", IN_PRODUCTION: "Đang sản xuất",
  READY_FOR_DELIVERY: "Sẵn sàng giao", COMPLETED: "Hoàn thành", DELIVERED: "Đã giao", CANCELLED: "Đã hủy",
  SUBMITTED: "Đã gửi", ACCEPTED: "Đã chọn", REJECTED: "Không được chọn",
};
const stages = [
  ["UOM_TO", "Ươm tơ"], ["MAC_CUI", "Mắc cửi"], ["DET_LUA", "Dệt lụa"], ["NHUOM_MAU", "Nhuộm màu"], ["CAN_LANG", "Cán láng"],
];
const displayDate = new Intl.DateTimeFormat("vi-VN", { timeZone: "UTC", dateStyle: "medium" });
const get = async (path, auth = true) => (await request(path, { auth })).data;
const write = (path, body, method = "POST") => request(path, { method, body, auth: true });

async function getPages(path, auth = true) {
  const results = [];
  const query = path.includes("?") ? "&" : "?";
  for (let page = 1; page <= 10000; page++) {
    const items = await get(path + query + "limit=100&page=" + page, auth);
    results.push(...items);
    if (items.length < 100) break;
  }
  return results;
}

export function mountWholesale(container, account) {
  container.innerHTML = `
    <div class="section-heading"><h1 id="wholesale-title" class="page-title">Đặt hàng sỉ</h1></div>
    <div class="trade-toolbar">
      <button class="button button-outline" type="button" data-refresh>Tải lại</button>
      <p role="status"></p>
    </div>
    <div class="trade-content"></div>`;
  const content = container.querySelector(".trade-content");
  const status = container.querySelector("[role=status]");
  const refresh = container.querySelector("[data-refresh]");
  let revision = 0;
  let selected;
  let busy = false;
  let loading = false;

  function syncControls() {
    refresh.disabled = content.inert = busy || loading;
  }

  function button(label, action, type = "button") {
    const control = document.createElement("button");
    control.className = "button button-outline";
    control.type = type;
    control.textContent = label;
    if (action) control.addEventListener("click", () => act(control, action));
    return control;
  }

  function form(markup, label, submit) {
    const node = document.createElement("form");
    node.className = "account-form";
    node.innerHTML = markup;
    const control = button(label, null, "submit");
    const feedback = paragraph("");
    feedback.className = "trade-feedback";
    feedback.setAttribute("role", "status");
    node.append(control, feedback);
    bindFormErrors(node);
    node.addEventListener("submit", event => {
      event.preventDefault();
      clearFormErrors(node);
      act(control, () => submit(new FormData(node)));
    });
    return node;
  }

  function paragraph(text) {
    const p = document.createElement("p");
    p.textContent = text;
    return p;
  }

  function card(target, title, subtitle) {
    const panel = document.createElement("article");
    panel.className = "trade-card";
    const h = document.createElement("h3");
    h.textContent = title;
    panel.append(h, paragraph(subtitle));
    target.append(panel);
    return panel;
  }

  async function act(control, action) {
    if (busy || loading) return;
    const profile = account.profile;
    const fields = control.closest("form");
    const feedback = fields?.querySelector(".trade-feedback") || status;
    let failure;
    busy = control.disabled = true;
    syncControls();
    status.textContent = "";
    feedback.textContent = "Đang lưu…";
    try {
      await action();
      if (profile === account.profile) {
        feedback.textContent = "Đã lưu.";
        await load("Đã lưu.");
      }
    } catch (error) {
      if (profile === account.profile) failure = error;
    } finally {
      busy = control.disabled = false;
      syncControls();
      if (failure) {
        feedback.textContent = fields && showFormErrors(fields, failure.fields) ? "" : failure.message;
      }
    }
  }

  async function buyerView(root) {
    const quotes = await getPages("/wholesale/quotes");
    const create = card(root, "Tạo yêu cầu", "Mô tả sản phẩm, số lượng và ngày cần hàng.");
    const fields = form(`
      <label>Tên yêu cầu<input name="title" required maxlength="255"></label>
      <label>Quy cách<textarea name="specifications" required maxlength="10000"></textarea></label>
      <label>Số lượng<input name="targetQuantity" type="number" min="1" max="2147483647" required></label>
      <label>Ngày cần hàng<input name="deadline" type="date" required></label>`, "Lưu yêu cầu nháp", async values => {
      const title = values.get("title").trim();
      const specifications = values.get("specifications").trim();
      const { data } = await write("/wholesale/quotes", {
        title, specifications, deadline: values.get("deadline"), targetQuantity: Number(values.get("targetQuantity")),
      });
      selected = data.id;
    });
    const deadline = fields.elements.namedItem("deadline");
    deadline.min = vietnamToday();
    deadline.dataset.minMessage = "Chọn ngày cần hàng từ hôm nay trở đi.";
    create.append(fields);
    if (!quotes.length) return;
    const label = document.createElement("label");
    label.className = "batch-field";
    const select = document.createElement("select");
    for (const quote of quotes) select.add(new Option(quote.title + " · " + labels[quote.status], quote.id));
    if (quotes.some(quote => quote.id === selected)) select.value = selected;
    label.append("Yêu cầu của bạn", select);
    select.addEventListener("change", () => { selected = select.value; load(); });
    root.append(label);
    const path = "/wholesale/quotes/" + select.value;
    const quote = await get(path);
    const panel = card(root, quote.title, labels[quote.status] + " · " + quote.targetQuantity + " sản phẩm");
    panel.append(paragraph(quote.specifications));
    if (quote.maxBudget !== null) panel.append(paragraph("Ngân sách tối đa · " + formatPrice(quote.maxBudget)));
    panel.append(paragraph("Ngày cần hàng · " + displayDate.format(new Date(quote.deadline))));
    if (quote.status === "DRAFT") panel.append(button("Gửi nghệ nhân", () => write(path + "/send")));
    const options = quote.bids.filter(bid => bid.status === "SUBMITTED");
    if (options.length && quote.status === "ARTISANS_BIDDING") {
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
        const warnings = [];
        const due = new Date(quote.deadline);
        const today = new Date(date.format(new Date()) + "T00:00:00Z");
        if (today.getTime() + bid.proposedCompletionDays * 86400000 > due.getTime()) warnings.push("thời gian sản xuất vượt ngày cần hàng");
        label.append(choice, bidText(bid) + (bid.note ? " · " + bid.note : "") + (warnings.length ? " · Lưu ý: " + warnings.join(", ") : ""));
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
          if (!details.open || loading || loaded) return;
          loading = true;
          timeline.textContent = "Đang tải nhật ký…";
          try {
            const code = encodeURIComponent(batch.batchCode);
            const result = await get("/traceability/purchased/" + code);
            renderTimeline(timeline, result, "order-" + batch.id);
            loaded = true;
            try {
              await request("/traceability/by-code/" + code, { method: "HEAD" });
              timeline.insertBefore(batchQr(batch.batchCode), timeline.querySelector(".stage-list"));
            } catch (error) {
              if (error.status !== 404) {
                timeline.append(paragraph("Chưa kiểm tra được mã QR. Đóng rồi mở lại để thử lại."));
                loaded = false;
              }
            }
          } catch (error) {
            timeline.textContent = error.message + " Đóng rồi mở lại để thử lại.";
          } finally { loading = false; }
        });
        details.append(summary, timeline);
        panel.append(details);
      }
    }
  }

  const names = new Map();
  const workshopName = record => record.artisan?.workshopName || "Xưởng";
  const bidText = bid => workshopName(bid) + " · " + formatPrice(bid.proposedPrice) + " · " + bid.proposedCompletionDays + " ngày";

  async function artisanView(root) {
    const [quotes, assignments, products, ownedBatches] = await Promise.all([
      getPages("/wholesale/open-quotes"), getPages("/wholesale/assignments"),
      getPages("/products/mine"), getPages("/traceability/mine"),
    ]);
    const visibleProducts = new Set(products.filter(product => product.isPublished).map(product => product.id));
    if (!quotes.length && !assignments.length) root.append(paragraph("Chưa có yêu cầu hoặc phân công."));
    for (const quote of quotes) {
      const panel = card(root, quote.title, quote.specifications + " · " + quote.targetQuantity + " sản phẩm");
      panel.append(paragraph("Ngày cần hàng · " + displayDate.format(new Date(quote.deadline))));
      if (quote.maxBudget !== null) panel.append(paragraph("Ngân sách tối đa · " + formatPrice(quote.maxBudget)));
      if (quote.bids.length) {
        panel.append(paragraph("Đã gửi báo giá " + formatPrice(quote.bids[0].proposedPrice)));
        continue;
      }
      panel.append(form(`
        <label>Giá chào (đồng)<input name="price" type="number" min="1" max="9999999999.99" step="0.01" required></label>
        <label>Thời gian (ngày)<input name="days" type="number" min="1" max="2147483647" required></label>
        <label>Ghi chú<textarea name="note" maxlength="10000"></textarea></label>`, "Gửi báo giá", values =>
        write("/wholesale/quotes/" + quote.id + "/bids", {
          proposedPrice: values.get("price"), proposedCompletionDays: Number(values.get("days")), note: values.get("note") || null,
        })));
    }
    for (const assignment of assignments) {
      const panel = card(root, assignment.quotationRequest.title, assignment.allocatedQuantity + " sản phẩm · " + labels[assignment.status]);
      const batches = ownedBatches.filter(batch => batch.orderAssignmentId === assignment.id && batch.status !== "CANCELLED");
      const remaining = assignment.allocatedQuantity - batches.reduce((sum, batch) => sum + batch.totalQuantity, 0);
      const completed = batches.filter(batch => batch.status === "COMPLETED").reduce((sum, batch) => sum + batch.totalQuantity, 0);
      const canShip = completed === assignment.allocatedQuantity && batches.every(batch => batch.status === "COMPLETED");
      panel.append(paragraph(`Đã hoàn thành ${completed}/${assignment.allocatedQuantity} sản phẩm.`));
      const next = { ASSIGNED: "IN_PRODUCTION", IN_PRODUCTION: "READY_FOR_DELIVERY", READY_FOR_DELIVERY: "COMPLETED" }[assignment.status];
      if (next && (next !== "READY_FOR_DELIVERY" || canShip)) {
        panel.append(button(next === "COMPLETED" ? "Xác nhận đã giao" : labels[next],
          () => write("/wholesale/assignments/" + assignment.id, { status: next }, "PATCH")));
      }
      if (next === "READY_FOR_DELIVERY" && !canShip) panel.append(paragraph("Hoàn thành đủ số lượng theo lô để sẵn sàng giao."));
      if (["ASSIGNED", "IN_PRODUCTION"].includes(assignment.status) && remaining > 0 && products.length) {
        const create = form(`
          <label>Sản phẩm<select name="productId" required></select></label>
          <label>Mã lô<input name="batchCode" pattern="[a-zA-Z0-9_\\-]+" title="Dùng chữ không dấu, số, dấu gạch ngang hoặc gạch dưới." maxlength="50" required></label>
          <label>Số lượng lô<input name="totalQuantity" type="number" min="1" required></label>`, "Tạo lô", values => {
          if (values.get("batchCode").toLowerCase() === "mine") throw new Error("Hãy dùng mã lô khác.");
          return write("/traceability/batches", {
            ...Object.fromEntries(values), totalQuantity: Number(values.get("totalQuantity")), orderAssignmentId: assignment.id,
          });
        });
        for (const product of products) create.elements.namedItem("productId").add(new Option(product.name, product.id));
        create.elements.namedItem("totalQuantity").max = remaining;
        panel.append(create);
      }
      for (const batch of batches) {
        const block = document.createElement("div");
        block.className = "trade-batch";
        block.append(paragraph(`Lô ${batch.batchCode} · ${batch.totalQuantity} sản phẩm · ${batch.logs.length}/5 công đoạn`));
        if (visibleProducts.has(batch.productId) && ["IN_PROGRESS", "COMPLETED"].includes(batch.status)) block.append(batchQr(batch.batchCode));
        if (batch.status === "IN_PROGRESS") {
          const path = "/traceability/batches/" + batch.id;
          const stage = stages[batch.logs.length];
          if (stage) {
            let uploadedFile;
            let imageUrls = [];
            const log = form(`
              <label>Mô tả công đoạn<textarea name="description" required maxlength="10000"></textarea></label>
              <label>Ảnh minh chứng (tùy chọn)<input name="evidence" type="file" accept="image/jpeg,image/png,image/webp"></label>`,
            "Ghi công đoạn " + stage[1], async values => {
              const description = values.get("description").trim();
              if (!description) throw new Error("Nhập mô tả công đoạn trước khi lưu.");
              const file = log.elements.namedItem("evidence").files[0];
              if (file && file !== uploadedFile) {
                if (file.type && !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
                  throw new Error("Chọn ảnh định dạng JPEG, PNG hoặc WebP.");
                }
                if (file.size > 5 * 1024 * 1024) throw new Error("Ảnh minh chứng tối đa 5 MB.");
                const body = new FormData();
                body.append("images", file);
                const { data } = await write("/media/images", body);
                imageUrls = data.urls;
                uploadedFile = file;
              }
              await write(path + "/logs", { stage: stage[0], stageTitle: stage[1], description, evidenceImageUrls: file ? imageUrls : [] });
            });
            block.append(log);
          } else block.append(button("Hoàn thành lô", () => write(path + "/complete")));
        }
        panel.append(block);
      }
    }
  }

  async function adminView(root) {
    const allQuotes = await getPages("/wholesale/admin/quotes?status=ALL");
    const drafts = allQuotes.filter(quote => quote.status === "DRAFT");
    const quotes = allQuotes.filter(quote => quote.status !== "DRAFT");
    if (!allQuotes.length) root.append(paragraph("Chưa có yêu cầu đặt sỉ."));
    for (const draft of drafts) {
      const panel = card(root, draft.title, `Yêu cầu nháp · ${draft.targetQuantity} sản phẩm`);
      panel.append(paragraph(draft.specifications), paragraph("Ngày cần hàng · " + displayDate.format(new Date(draft.deadline))));
      const dispatch = form("", "Mời xưởng chào giá", values => {
        const artisanIds = values.getAll("artisan");
        if (!artisanIds.length) throw new Error("Chọn ít nhất một xưởng để mời chào giá.");
        if (artisanIds.length > 100) throw new Error("Chỉ được mời tối đa 100 xưởng mỗi yêu cầu.");
        return write("/wholesale/quotes/" + draft.id + "/dispatch", { artisanIds });
      });
      const button = dispatch.querySelector("button");
      for (const [id, name] of names) {
        if (draft.targetArtisanId && draft.targetArtisanId !== id) continue;
        const label = document.createElement("label");
        label.className = "trade-choice";
        const input = document.createElement("input");
        input.type = "checkbox";
        input.name = "artisan";
        input.value = id;
        input.checked = id === draft.targetArtisanId;
        label.append(input, name);
        dispatch.insertBefore(label, button);
      }
      if (dispatch.querySelector("input")) panel.append(dispatch);
      else panel.append(paragraph("Chưa có xưởng phù hợp để mời."));
    }
    for (const quote of quotes) {
      const panel = card(root, quote.title, `${labels[quote.status]} · ${quote.targetQuantity} sản phẩm`);
      if (quote.assignments.length) {
        panel.append(paragraph("Đã phân công cho " + quote.assignments.length + " xưởng."));
        for (const assignment of quote.assignments) {
          panel.append(paragraph(`${workshopName(assignment)} · ${assignment.allocatedQuantity} sản phẩm · ${labels[assignment.status]}`));
        }
        continue;
      }
      if (quote.status !== "BUYER_ACCEPTED") {
        panel.append(paragraph(`${quote.bids.length} báo giá`));
        continue;
      }
      const bids = quote.bids.filter(bid => bid.status === "ACCEPTED");
      const allocate = form("", "Lưu phân công", values => {
        const allocations = bids.map(bid => ({ bidId: bid.id, quantity: Number(values.get(bid.id)) }));
        if (allocations.reduce((total, allocation) => total + allocation.quantity, 0) !== quote.targetQuantity) {
          throw new Error(`Tổng số lượng phân công phải bằng ${quote.targetQuantity} sản phẩm.`);
        }
        return write("/wholesale/quotes/" + quote.id + "/assignments", { allocations });
      });
      for (const bid of bids) {
        const label = document.createElement("label");
        const input = document.createElement("input");
        input.type = "number";
        input.name = bid.id;
        input.min = 1;
        input.max = quote.targetQuantity;
        input.required = true;
        if (bids.length === 1) input.value = quote.targetQuantity;
        label.append(bidText(bid) + " · Số lượng", input);
        allocate.prepend(label);
      }
      panel.append(allocate);
    }
  }

  async function load(message) {
    const version = ++revision;
    const profile = account.profile;
    const root = document.createDocumentFragment();
    loading = Boolean(profile);
    syncControls();
    refresh.hidden = !profile;
    if (!profile) {
      const signIn = button("Đăng nhập để đặt sỉ");
      signIn.addEventListener("click", account.open);
      content.replaceChildren(signIn);
      status.textContent = "";
      return;
    }
    status.textContent = "Đang tải yêu cầu…";
    try {
      if (profile.role === "ADMIN") {
        const workshops = await getPages("/artisans", false);
        if (version !== revision) return;
        names.clear();
        workshops.forEach(item => names.set(item.id, item.workshopName));
      }
      if (profile.role === "BUYER") await buyerView(root);
      if (profile.role === "ARTISAN") await artisanView(root);
      if (profile.role === "ADMIN") await adminView(root);
      if (version !== revision) return;
      content.replaceChildren(root);
      status.textContent = message || "";
    } catch (error) {
      if (version === revision) status.textContent = error.message;
    } finally {
      if (version === revision) {
        loading = false;
        syncControls();
      }
    }
  }

  account.onChange(() => { selected = null; content.replaceChildren(); load(); });
  refresh.addEventListener("click", () => { if (!busy) load(); });
  load();
}
