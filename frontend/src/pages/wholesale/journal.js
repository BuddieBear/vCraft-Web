import { renderTimeline } from "../traceability.page.js";
import { formatPrice } from "../../components/ui.js";
import { card, displayDate, get, labels, paragraph, quoteProgress, workshopName } from "./view.js";

export async function buyerJournalView(root, { expand, quoteId, signal }) {
  const journal = await get("/wholesale/quotes/" + encodeURIComponent(quoteId) + "/journal", signal);
  if (signal.aborted) return;

  const panel = card(root, journal.title, labels[journal.status] + " · " + journal.targetQuantity + " sản phẩm");
  panel.classList.add("quote-detail");
  panel.append(quoteProgress(journal.status), paragraph("Ngày cần hàng · " + displayDate.format(new Date(journal.deadline))));
  if (!journal.assignments.length) panel.append(paragraph("Đã chốt báo giá. Đang chờ phân công xưởng sản xuất."));
  for (const assignment of journal.assignments) {
    const section = document.createElement("section");
    section.className = "trade-batch";
    const title = document.createElement("h4");
    title.textContent = workshopName(assignment);
    section.append(title, paragraph(`${labels[assignment.status]} · ${assignment.allocatedQuantity} sản phẩm · ${formatPrice(assignment.agreedPrice)}`));
    if (!assignment.batches.length) section.append(paragraph("Xưởng chưa đăng lô sản xuất cho đơn này."));
    for (const batch of assignment.batches) {
      expand(section, {
        key: "journal-" + batch.id,
        label: `Lô ${batch.batchCode} · ${batch.totalQuantity} sản phẩm`,
        mount: details => loadTimeline(details, batch, signal),
      });
    }
    panel.append(section);
  }
}

function loadTimeline(details, batch, signal) {
  const body = document.createElement("div");
  const status = paragraph("");
  status.setAttribute("role", "status");
  const retry = document.createElement("button");
  retry.type = "button";
  retry.className = "text-button";
  retry.textContent = "Tải lại nhật ký lô";
  details.append(body, status, retry);
  retry.addEventListener("click", load);
  load();

  async function load() {
    retry.hidden = true;
    status.textContent = "Đang tải nhật ký lô…";
    try {
      const result = await get("/traceability/purchased/" + encodeURIComponent(batch.batchCode), signal);
      if (signal.aborted) return;
      renderTimeline(body, result, "order-" + batch.id);
      status.textContent = "";
    } catch (error) {
      if (signal.aborted) return;
      status.textContent = error.message;
      retry.hidden = false;
    }
  }
}
