import { bidText, card, displayDate, labels, listSection, paragraph, workshopName, write } from "./view.js";

export function adminView(root, tools) {
  const section = listSection(root, "Yêu cầu và phân công");
  section.classList.add("trade-list-full");
  tools.list(section, {
    key: "admin-quotes", path: "/wholesale/admin/quotes?status=ALL", label: "yêu cầu của các xưởng",
    empty: "Chưa có yêu cầu đặt sỉ.",
    render: (rows, target, pageSignal) => renderQuotes(target, rows, tools, pageSignal),
  });
}

function renderQuotes(root, allQuotes, { form, expand, list }, pageSignal) {
  const pending = allQuotes.filter(quote => quote.status === "PENDING_DISPATCH");
  const quotes = allQuotes.filter(quote => quote.status !== "PENDING_DISPATCH");
  for (const quote of pending) {
    const panel = card(root, quote.title, `${labels[quote.status]} · ${quote.targetQuantity} sản phẩm`);
    panel.append(paragraph(quote.specifications), paragraph("Ngày cần hàng · " + displayDate.format(new Date(quote.deadline))));
    expand(panel, {
      key: "dispatch-" + quote.id, label: "Chọn xưởng để mời chào giá",
      mount: (details) => mountDispatch(details, quote, { form, list }, pageSignal),
    }, pageSignal);
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

function mountDispatch(details, quote, { form, list }, pageSignal) {
  const { targetArtisanId, targetArtisan } = quote;
  if (targetArtisanId && (targetArtisan?.verificationStatus !== "APPROVED" || targetArtisan.isSuspended || !targetArtisan.user.isActive || targetArtisan.user.role !== "ARTISAN")) {
    details.append(paragraph("Xưởng được chọn hiện không nhận yêu cầu."));
    return;
  }
  const selected = new Set(targetArtisanId ? [targetArtisanId] : []);
  const dispatch = form('<div data-workshops></div><p data-selected aria-live="polite"></p>', "Mời xưởng chào giá", () => {
    if (!selected.size) throw new Error("Chọn ít nhất một xưởng để mời chào giá.");
    if (selected.size > 100) throw new Error("Chỉ được mời tối đa 100 xưởng mỗi yêu cầu.");
    return write("/wholesale/quotes/" + quote.id + "/dispatch", { artisanIds: [...selected] });
  });
  const options = dispatch.querySelector("[data-workshops]");
  const submit = dispatch.querySelector('[type="submit"]');
  const count = dispatch.querySelector("[data-selected]");
  function syncSelection() {
    count.textContent = `Đã chọn ${selected.size} xưởng.`;
    submit.disabled = !selected.size || selected.size > 100;
  }
  function render(workshops, target) {
    for (const workshop of workshops) {
      const label = document.createElement("label");
      label.className = "trade-choice";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = selected.has(workshop.id);
      input.addEventListener("change", () => {
        if (input.checked) selected.add(workshop.id);
        else selected.delete(workshop.id);
        syncSelection();
      });
      label.append(input, workshop.workshopName);
      target.append(label);
    }
  }
  syncSelection();
  if (targetArtisanId) render([{ id: targetArtisanId, workshopName: targetArtisan.workshopName }], options);
  else list(options, {
    key: "workshops-" + quote.id, path: "/artisans", label: "xưởng nhận báo giá", auth: false,
    empty: "Chưa có xưởng phù hợp để mời.", render,
  }, pageSignal);
  details.append(dispatch);
}
