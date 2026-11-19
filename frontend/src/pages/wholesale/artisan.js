import { formatPrice } from "../../components/ui.js";
import { batchQr } from "../../components/batch-qr.js";
import { mediaUrl } from "../../api/http.js";
import { weaveTypes } from "../../data/weave-types.js";
import { biddingPagePath, sitePaths } from "../../site-paths.js";
import { card, displayDate, get, labels, listSection, paragraph, write } from "./view.js";

const stages = [
  ["UOM_TO", "Ươm tơ"], ["MAC_CUI", "Mắc cửi"], ["DET_LUA", "Dệt lụa"], ["NHUOM_MAU", "Nhuộm màu"], ["CAN_LANG", "Cán láng"],
];

export function artisanView(root, tools) {
  const quotes = listSection(root, "Đang mời chào giá");
  const history = listSection(root, "Báo giá của tôi");
  const assignments = listSection(root, "Đơn được phân công");
  assignments.id = "don-phan-cong";
  if (tools.isSuspended) quotes.append(paragraph("Xưởng đang bị đình chỉ. Bạn vẫn có thể xem các báo giá đã gửi và xử lý đơn được phân công."));
  else tools.list(quotes, {
    key: "artisan-quotes", path: "/wholesale/open-quotes", label: "yêu cầu chào giá", empty: "Chưa có yêu cầu chào giá phù hợp đang mở.",
    render(rows, target) {
      for (const quote of rows) renderQuoteSummary(target, quote);
    },
  });
  tools.list(history, {
    key: "artisan-bids", path: "/wholesale/open-quotes?view=mine", label: "báo giá của tôi", empty: "Bạn chưa gửi báo giá nào.",
    render(rows, target) {
      for (const quote of rows) renderQuoteSummary(target, quote);
    },
  });
  tools.list(assignments, {
    key: "assignments", path: "/wholesale/assignments", label: "đơn được phân công", empty: "Chưa có đơn được phân công.",
    render(rows, target, pageSignal) {
      for (const assignment of rows) renderAssignment(target, assignment, tools, pageSignal);
    },
  });
}

function renderQuoteSummary(root, quote) {
  const panel = card(root, quote.title, [labels[quote.status], `${quote.targetQuantity.toLocaleString("vi-VN")} sản phẩm`].join(" · "));
  panel.append(paragraph("Ngày cần hàng · " + displayDate.format(new Date(quote.deadline))));
  if (quote.bids.length) panel.append(paragraph("Báo giá của bạn · " + labels[quote.bids[0].status]));
  const link = document.createElement("a");
  link.className = "text-link";
  link.href = biddingPagePath(quote.id);
  link.textContent = quote.bids.length ? "Xem báo giá của bạn" : "Xem yêu cầu và chào giá";
  panel.append(link);
}

export async function artisanBidView(root, { bidQuoteId, form, signal }) {
  const quote = await get("/wholesale/open-quotes/" + encodeURIComponent(bidQuoteId), signal);
  const panel = card(root, quote.title, `${labels[quote.status]} · ${quote.targetQuantity.toLocaleString("vi-VN")} sản phẩm`);
  panel.classList.add("quote-detail");
  panel.append(paragraph(quote.specifications), paragraph("Ngày cần hàng · " + displayDate.format(new Date(quote.deadline))));
  if (weaveTypes[quote.preferredWeaveType]) panel.append(paragraph("Loại lụa · " + weaveTypes[quote.preferredWeaveType]));
  if (quote.maxBudget !== null) panel.append(paragraph("Ngân sách tối đa · " + formatPrice(quote.maxBudget)));
  for (const [index, url] of quote.attachmentUrls.entries()) {
    const address = mediaUrl(url);
    if (!address) continue;
    const attachment = document.createElement("a");
    attachment.className = "text-link";
    attachment.href = address;
    attachment.target = "_blank";
    attachment.rel = "noopener noreferrer";
    attachment.textContent = `Tệp yêu cầu ${index + 1}`;
    const p = document.createElement("p");
    p.append(attachment);
    panel.append(p);
  }
  const [bid] = quote.bids;
  if (bid) {
    panel.append(paragraph(`Báo giá của bạn · ${formatPrice(bid.proposedPrice)} · ${bid.proposedCompletionDays} ngày · ${labels[bid.status]}`));
    if (bid.note) panel.append(paragraph(bid.note));
    if (bid.status === "ACCEPTED") {
      const link = document.createElement("a");
      link.className = "text-link";
      link.href = sitePaths.bidding + "#don-phan-cong";
      link.textContent = "Xem đơn được phân công";
      panel.append(link);
    }
    return;
  }
  panel.append(form(`
    <label>Tổng giá chào (đồng)<input name="proposedPrice" type="number" min="0.01" max="9999999999.99" step="0.01" required></label>
    <label>Thời gian hoàn thành (ngày)<input name="proposedCompletionDays" type="number" min="1" max="2147483647" required></label>
    <label>Ghi chú<textarea name="note" maxlength="10000"></textarea></label>`, "Gửi báo giá", values =>
    write("/wholesale/quotes/" + quote.id + "/bids", {
      proposedPrice: values.get("proposedPrice"), proposedCompletionDays: Number(values.get("proposedCompletionDays")), note: values.get("note")?.trim() || null,
    })));
}

function renderAssignment(root, assignment, tools, pageSignal) {
  const { button, expand, list } = tools;
  const panel = card(root, assignment.quotationRequest.title, assignment.allocatedQuantity + " sản phẩm · " + labels[assignment.status]);
  const remaining = assignment.allocatedQuantity - assignment.batchedQuantity;
  const completed = assignment.completedQuantity;
  const canShip = completed === assignment.allocatedQuantity && completed === assignment.batchedQuantity;
  panel.append(paragraph(`Đã hoàn thành ${completed}/${assignment.allocatedQuantity} sản phẩm.`));
  const next = { ASSIGNED: "IN_PRODUCTION", IN_PRODUCTION: "READY_FOR_DELIVERY", READY_FOR_DELIVERY: "COMPLETED" }[assignment.status];
  if (next && (next !== "READY_FOR_DELIVERY" || canShip)) {
    panel.append(button(next === "COMPLETED" ? "Xác nhận đã giao" : labels[next],
      () => write("/wholesale/assignments/" + assignment.id, { status: next }, "PATCH")));
  }
  if (next === "READY_FOR_DELIVERY" && !canShip) panel.append(paragraph("Hoàn thành đủ số lượng theo lô để sẵn sàng giao."));
  if (["ASSIGNED", "IN_PRODUCTION"].includes(assignment.status) && remaining > 0) {
    expand(panel, {
      key: "create-" + assignment.id, label: "Tạo lô sản xuất",
      mount: (details) => mountBatchForm(details, assignment.id, remaining, tools, pageSignal),
    }, pageSignal);
  }
  if (assignment.batchedQuantity > 0) {
    const key = "batches-" + assignment.id;
    expand(panel, {
      key, label: "Xem các lô sản xuất",
      mount: (details) => list(details, {
        key, path: "/traceability/mine?" + new URLSearchParams({ assignmentId: assignment.id }),
        label: "lô của " + assignment.quotationRequest.title, empty: "Chưa có lô sản xuất.",
        render(rows, target) {
          for (const batch of rows) renderBatch(target, batch, tools);
        },
      }, pageSignal),
    }, pageSignal);
  }
}

export function createBatchForm(form, { productId, assignmentId, maximum = 2147483647 }) {
  const node = form(`
    ${productId ? "" : "<div data-product-options></div>"}
    <label>Mã lô<input name="batchCode" pattern="[a-zA-Z0-9_\\-]+" title="Dùng chữ không dấu, số, dấu gạch ngang hoặc gạch dưới." maxlength="50" required></label>
    <label>Số lượng lô<input name="totalQuantity" type="number" min="1" required></label>`, "Tạo lô", values => {
    if (values.get("batchCode").toLowerCase() === "mine") throw new Error("Hãy dùng mã lô khác.");
    const selectedProduct = productId || values.get("productId");
    if (!selectedProduct) throw new Error("Chọn sản phẩm để tạo lô.");
    return write("/traceability/batches", {
      productId: selectedProduct, batchCode: values.get("batchCode"), totalQuantity: Number(values.get("totalQuantity")), orderAssignmentId: assignmentId,
    });
  });
  node.elements.namedItem("totalQuantity").max = maximum;
  return node;
}

function mountBatchForm(details, assignmentId, remaining, { form, list }, pageSignal) {
  const create = createBatchForm(form, { assignmentId, maximum: remaining });
  const submit = create.querySelector('[type="submit"]');
  submit.disabled = true;
  let selection;
  list(create.querySelector("[data-product-options]"), {
    key: "products-" + assignmentId, path: "/products/mine", label: "sản phẩm của xưởng", empty: "Xưởng chưa có sản phẩm để tạo lô.",
    render(products, target) {
      const label = document.createElement("label");
      const select = document.createElement("select");
      select.name = "productId";
      select.required = true;
      select.add(new Option("Chọn sản phẩm", ""));
      if (selection && !products.some((product) => product.id === selection.id)) {
        select.add(new Option(selection.name, selection.id));
      }
      for (const product of products) select.add(new Option(product.name, product.id));
      select.value = selection?.id || "";
      select.addEventListener("change", () => {
        selection = select.value ? { id: select.value, name: select.selectedOptions[0].textContent } : null;
        submit.disabled = !selection;
      });
      label.append("Sản phẩm", select);
      target.append(label);
    },
  }, pageSignal);
  details.append(create);
}

export function renderBatch(target, batch, { button, form }) {
  const block = document.createElement("div");
  block.className = "trade-batch";
  const step = batch._count.logs;
  block.append(paragraph(`Lô ${batch.batchCode} · ${batch.totalQuantity} sản phẩm · ${step}/${stages.length} công đoạn`));
  if (batch.product.isPublished && ["IN_PROGRESS", "COMPLETED"].includes(batch.status)) {
    block.append(batchQr(batch.batchCode));
    const link = document.createElement("a");
    link.className = "text-link";
    link.href = "/trace/" + encodeURIComponent(batch.batchCode);
    link.textContent = "Xem nhật ký lô";
    block.append(link);
  }
  if (batch.status === "IN_PROGRESS") {
    const path = "/traceability/batches/" + batch.id;
    const stage = stages[step];
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
  target.append(block);
}
