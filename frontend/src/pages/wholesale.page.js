import { bindFormErrors, clearFormErrors, showFormErrors } from "../components/form-errors.js";
import { mountPageList, paragraph } from "./wholesale/view.js";
import { quotePagePath, sitePaths } from "../site-paths.js";

export function mountWholesale(container, account, { quoteId, query, bidding = false, bidQuoteId, workshop = false, journal = false }) {
  const title = workshop ? "Xưởng của tôi" : bidQuoteId ? "Chi tiết yêu cầu chào giá"
    : bidding ? "Đấu thầu đặt sỉ" : journal ? "Nhật ký đơn đặt sỉ" : quoteId ? "Chi tiết yêu cầu đặt sỉ" : "Đặt hàng sỉ";
  container.innerHTML = `
    ${quoteId ? `<a class="text-link product-back" href="${journal ? quotePagePath(quoteId) : sitePaths.wholesale}">${journal ? "Về chi tiết yêu cầu" : "Tất cả yêu cầu"}</a>` : ""}
    ${bidQuoteId ? `<a class="text-link product-back" href="${sitePaths.bidding}">Về bảng đấu thầu</a>` : ""}
    <div class="section-heading"><h1 id="${workshop ? "workshop-title" : journal ? "exhibition-title" : "wholesale-title"}" class="page-title">${title}</h1>
      ${workshop || bidding ? `<a class="text-link" href="${sitePaths.catalog}?mua=1">Xem sản phẩm các xưởng</a>` : ""}</div>
    <div class="trade-toolbar">
      <button class="button button-outline" type="button" data-refresh>Tải lại</button>
      <p role="status"></p>
    </div>
    <div class="trade-content"></div>`;
  const content = container.querySelector(".trade-content");
  const status = container.querySelector("[role=status]");
  const refresh = container.querySelector("[data-refresh]");
  let activeLoad;
  let visibleView;
  let busy = false;
  let loading = false;
  let focusAssignments = bidding && location.hash === "#don-phan-cong";
  const pages = new Map();
  const openSections = new Set();

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

  function form(markup, label, submit, { primary = false, secondary } = {}) {
    const node = document.createElement("form");
    node.className = "account-form";
    node.innerHTML = markup;
    const control = button(label, null, "submit");
    if (primary) control.className = "button button-primary";
    const feedback = paragraph("");
    feedback.className = "trade-feedback";
    feedback.setAttribute("role", "status");
    if (secondary) {
      const actions = document.createElement("div");
      actions.className = "trade-toolbar";
      const alt = button(secondary.label, null, "submit");
      alt.dataset.submitMode = secondary.mode;
      actions.append(control, alt);
      node.append(actions, feedback);
    } else {
      node.append(control, feedback);
    }
    bindFormErrors(node);
    node.addEventListener("submit", event => {
      event.preventDefault();
      clearFormErrors(node);
      const activeControl = event.submitter?.closest("button") || control;
      act(activeControl, () => submit(new FormData(node), activeControl.dataset.submitMode));
    });
    return node;
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
      const nextPage = await action();
      if (profile === account.profile) {
        if (typeof nextPage === "string") {
          location.assign(nextPage);
          return;
        }
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
  function discardView() {
    visibleView?.controller.abort();
    visibleView = undefined;
    content.replaceChildren();
  }

  async function load(message) {
    if (activeLoad !== visibleView?.controller) activeLoad?.abort();
    const controller = activeLoad = new AbortController();
    const { signal } = controller;
    const profile = account.profile;
    const root = document.createDocumentFragment();
    loading = Boolean(profile);
    syncControls();
    refresh.hidden = !profile;
    if (!profile) {
      discardView();
      const signIn = button(bidding || workshop ? "Đăng nhập tài khoản nghệ nhân" : quoteId ? "Đăng nhập để xem yêu cầu" : "Đăng nhập để đặt sỉ");
      signIn.addEventListener("click", account.open);
      content.replaceChildren(signIn);
      status.textContent = "";
      return;
    }
    status.textContent = workshop ? "Đang tải hồ sơ xưởng…" : "Đang tải yêu cầu…";
    try {
      const reloadLists = [];
      const tools = {
        button, form, query, quoteId, bidQuoteId, signal, isSuspended: profile.artisanProfile?.isSuspended,
        list(target, options, parentSignal = signal) {
          const reload = mountPageList(target, { ...options, state: pages, signal: parentSignal });
          if (parentSignal === signal) reloadLists.push(reload);
        },
        expand: (target, options, parentSignal = signal) => expandable(target, { ...options, openSections, signal: parentSignal }),
      };
      if (quoteId && profile.role !== "BUYER") {
        content.replaceChildren();
        status.textContent = "Trang này dành cho tài khoản người mua đã tạo yêu cầu.";
        return;
      }
      if ((bidding || workshop) && profile.role !== "ARTISAN") {
        discardView();
        status.textContent = "Trang này dành cho tài khoản nghệ nhân.";
        return;
      }
      if (profile.role === "BUYER") {
        if (journal) {
          const { buyerJournalView } = await import("./wholesale/journal.js");
          if (!signal.aborted) await buyerJournalView(root, tools);
        } else {
          const { buyerView, buyerQuoteView } = await import("./wholesale/buyer.js");
          if (!signal.aborted) await (quoteId ? buyerQuoteView(root, tools) : buyerView(root, tools));
        }
      } else if (profile.role === "ARTISAN") {
        if (workshop) {
          const { workshopView } = await import("./my-workshop.page.js");
          if (!signal.aborted) await workshopView(root, tools);
        } else {
          const { artisanView, artisanBidView } = await import("./wholesale/artisan.js");
          if (signal.aborted) return;
          if (bidQuoteId) await artisanBidView(root, tools);
          else artisanView(root, tools);
        }
      } else if (profile.role === "ADMIN") {
        const { adminView } = await import("./wholesale/admin.js");
        if (signal.aborted) return;
        adminView(root, tools);
      }
      if (signal.aborted) return;
      visibleView?.controller.abort();
      visibleView = { controller, reloadLists: workshop ? [] : reloadLists };
      content.replaceChildren(root);
      status.textContent = message || "";
      if (focusAssignments) {
        content.querySelector("#don-phan-cong")?.scrollIntoView();
        focusAssignments = false;
      }
    } catch (error) {
      if (!signal.aborted) {
        controller.abort();
        if (message || error.status === 404 || error.status === 403) discardView();
        status.textContent = message ? "Đã lưu. Chưa tải lại được dữ liệu. " + error.message : error.message;
      }
    } finally {
      if (controller === activeLoad) {
        loading = false;
        syncControls();
      }
    }
  }

  account.onChange(() => { pages.clear(); openSections.clear(); discardView(); load(); });
  refresh.addEventListener("click", () => {
    if (busy || loading) return;
    const reloadLists = visibleView?.reloadLists;
    if (quoteId || !reloadLists?.length) {
      load();
      return;
    }
    status.textContent = "";
    for (const reload of reloadLists) reload();
  });
  load();
}

function expandable(target, { key, label, mount, openSections, signal, defaultOpen = false }) {
  const details = document.createElement("details");
  details.className = "trade-batch";
  const summary = document.createElement("summary");
  summary.textContent = label;
  details.append(summary);
  target.append(details);
  let mounted = false;
  details.addEventListener("toggle", () => {
    if (signal.aborted) return;
    if (!details.open) {
      openSections.delete(key);
      return;
    }
    openSections.add(key);
    if (!mounted) {
      mounted = true;
      mount(details);
    }
  });
  details.open = defaultOpen || openSections.has(key);
}
