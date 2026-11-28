import { icon } from "../components/ui.js";
import { signInPath, sitePaths } from "../site-paths.js";
import { onSessionChange, request, setToken, signedIn } from "../api/http.js";
import { bindFormErrors, clearFormErrors, showFormErrors } from "../components/form-errors.js";
import { recipientPhoneError, validRecipientPhone } from "../data/input-values.js";

const roleLabels = { BUYER: "Khách hàng", ARTISAN: "Nghệ nhân", ADMIN: "Quản trị viên" };

function initials(name) {
  const parts = String(name || "")
    .normalize("NFC")
    .replace(/\([^)]*\)/g, " ")
    .trim()
    .split(/\s+/)
    .map(part => part.replace(/^[^\p{L}\p{N}]+/u, ""))
    .filter(Boolean);
  if (!parts.length) return "VC";
  if (parts.length === 1) return [...parts[0]].slice(0, 2).join("").toUpperCase();
  const first = [...parts[0]][0] || "";
  const last = [...parts[parts.length - 1]][0] || "";
  return (first + last).toUpperCase();
}

export function mountAccount(dialog, trigger) {
  let profile;
  let version = 0;
  let loading;
  let profileError;
  const users = new Set();

  function syncDialog() {
    if (!dialog.open) return;
    if (!signedIn()) {
      dialog.close();
      return;
    }
    const card = dialog.querySelector(".account-identity");
    if (card) {
      card.hidden = !profile;
      if (profile) {
        card.querySelector(".account-avatar").textContent = initials(profile.fullName);
        card.querySelector(".account-name").textContent = profile.fullName;
        const badge = card.querySelector(".account-role-badge");
        badge.textContent = roleLabels[profile.role] || profile.role;
        badge.dataset.role = profile.role;
        const meta = [];
        if (profile.username) meta.push("@" + profile.username);
        if (profile.email) meta.push(profile.email);
        if (profile.phone) meta.push(profile.phone);
        card.querySelector(".account-meta").textContent = meta.join(" · ");
      }
    }
    const nav = dialog.querySelector(".account-links");
    if (nav) nav.hidden = !profile;
    const settings = dialog.querySelector(".account-settings");
    if (settings) settings.hidden = !profile;
    for (const link of dialog.querySelectorAll(".account-links [data-role]")) link.hidden = link.dataset.role !== profile?.role;
    const profileForm = dialog.querySelector("[data-profile-form]");
    if (profileForm && profile && !profileForm.dataset.dirty) {
      profileForm.elements.namedItem("fullName").value = profile.fullName || "";
      profileForm.elements.namedItem("username").value = profile.username || "";
      profileForm.elements.namedItem("phone").value = profile.phone || "";
    }
    const retry = dialog.querySelector("[data-retry-profile]");
    if (retry) retry.hidden = !profileError;
    const status = dialog.querySelector("[data-account-status]");
    if (status) status.textContent = profileError?.message || (loading ? "Đang tải tài khoản…" : "");
  }

  function loadProfile() {
    const pending = ++version;
    profile = null;
    profileError = undefined;
    trigger.setAttribute("aria-label", signedIn() ? "Tài khoản" : "Hồ sơ");
    loading = signedIn() ? fetchProfile(pending) : undefined;
    syncDialog();
    for (const listener of users) listener(profile);
    return loading;
  }

  async function fetchProfile(pending) {
    try {
      const { data } = await request("/auth/me", { auth: true });
      if (pending !== version) return;
      profile = data;
      for (const listener of users) listener(profile);
    } catch (error) {
      if (pending === version) profileError = error;
    } finally {
      if (pending === version) {
        loading = undefined;
        syncDialog();
      }
    }
  }

  function navItem(href, label, role) {
    const attr = role ? ` data-role="${role}" hidden` : "";
    return `<a class="account-nav-item" href="${href}"${attr}><span>${label}</span>${icon("right")}</a>`;
  }

  function render() {
    const header = `<div class="cart-header"><h2 id="account-title">Tài khoản</h2>
      <button class="icon-button" type="button" aria-label="Đóng tài khoản">${icon("close")}</button>
    </div>`;
    if (!signedIn()) {
      dialog.innerHTML = `<div class="account-drawer">${header}
        <div class="account-body">
          <div class="account-guest-card">
            <div class="account-avatar account-avatar-guest" aria-hidden="true">${icon("user")}</div>
            <h3>Chào mừng đến vCraft</h3>
            <p>Đăng nhập để đặt mua sản phẩm lụa, gửi yêu cầu đặt sỉ trực tiếp tới xưởng và theo dõi nhật ký sản xuất.</p>
            <a class="button button-primary account-guest-cta">Đăng nhập / Tạo tài khoản</a>
          </div>
        </div>
      </div>`;
      dialog.querySelector("a").href = signInUrl();
      dialog.querySelector(".icon-button").addEventListener("click", () => dialog.close());
      return;
    }
    dialog.innerHTML = `<div class="account-drawer">${header}
      <div class="account-body">
        <section class="account-identity" aria-label="Thông tin tài khoản" hidden>
          <div class="account-avatar" aria-hidden="true"></div>
          <div class="account-identity-copy">
            <div class="account-name-row">
              <strong class="account-name"></strong>
              <span class="account-role-badge"></span>
            </div>
            <p class="account-meta"></p>
          </div>
        </section>
        <p class="account-status" data-account-status role="status" aria-live="polite"></p>
        <button class="text-button" type="button" data-retry-profile hidden>Tải lại hồ sơ</button>

        <nav class="account-links" aria-label="Điều hướng tài khoản" hidden>
          ${navItem(sitePaths.notifications, "Thông báo")}
          ${navItem(sitePaths.wholesale, "Yêu cầu đặt sỉ", "BUYER")}
          ${navItem(sitePaths.journal, "Nhật ký lô", "BUYER")}
          ${navItem(sitePaths.workshop, "Xưởng của tôi", "ARTISAN")}
          ${navItem(sitePaths.bidding, "Đấu thầu đặt sỉ", "ARTISAN")}
          ${navItem(sitePaths.retailOrders, "Đơn bán của xưởng", "ARTISAN")}
          ${navItem(sitePaths.administration, "Duyệt và cấp tài khoản xưởng", "ADMIN")}
          ${navItem(sitePaths.wholesale, "Điều phối đặt sỉ", "ADMIN")}
          ${navItem(sitePaths.retailOrders, "Đơn bán lẻ", "ADMIN")}
          ${navItem(sitePaths.news, "Quản lý tin cộng đồng", "ADMIN")}
        </nav>

        <div class="account-settings" hidden>
          <details class="account-accordion">
            <summary><span>Chỉnh sửa thông tin cá nhân</span>${icon("plus")}</summary>
            <form class="account-form" data-profile-form>
              <label>Họ tên<input name="fullName" autocomplete="name" maxlength="120" required></label>
              <div class="account-field">
                <label>Tên đăng nhập<input name="username" autocomplete="username" autocapitalize="none" maxlength="32" pattern="[a-zA-Z0-9][a-zA-Z0-9._\\-]{2,31}" placeholder="Ví dụ: minh.nhaxa" aria-describedby="account-username-hint"></label>
                <span class="field-hint" id="account-username-hint">3–32 ký tự không dấu (chữ, số, ., _, -), bắt đầu bằng chữ cái hoặc chữ số.</span>
              </div>
              <label>Số điện thoại<input name="phone" type="tel" autocomplete="tel" maxlength="20" placeholder="Ví dụ: 0912345678"></label>
              <button class="button button-primary" type="submit">Lưu thông tin</button>
              <p class="trade-feedback" role="status" aria-live="polite"></p>
            </form>
          </details>

          <details class="account-accordion">
            <summary><span>Đổi mật khẩu</span>${icon("plus")}</summary>
            <form class="account-form" data-password-form>
              <label>Mật khẩu hiện tại<input name="currentPassword" type="password" autocomplete="current-password" maxlength="72" required></label>
              <div class="account-field">
                <label>Mật khẩu mới<input name="newPassword" type="password" autocomplete="new-password" minlength="12" maxlength="72" aria-describedby="account-password-hint" required></label>
                <span class="field-hint" id="account-password-hint">Tối thiểu 12 ký tự (tối đa 72 byte UTF-8).</span>
              </div>
              <label>Nhập lại mật khẩu mới<input name="confirmPassword" type="password" autocomplete="new-password" minlength="12" maxlength="72" required></label>
              <button class="button button-primary" type="submit">Cập nhật mật khẩu</button>
              <p class="trade-feedback" role="status" aria-live="polite"></p>
            </form>
          </details>
        </div>
      </div>

      <footer class="account-footer">
        <div class="trade-toolbar account-logout" data-logout-options>
          <button class="button button-outline" type="button" data-logout>Đăng xuất</button>
          <button class="button button-outline" type="button" data-logout-all>Đăng xuất mọi thiết bị</button>
        </div>
        <div class="account-logout" role="group" aria-labelledby="logout-confirm-title" data-logout-confirm hidden>
          <p id="logout-confirm-title">Đăng xuất vCraft trên tất cả thiết bị, kể cả thiết bị này?</p>
          <div class="trade-toolbar">
            <button class="button button-outline" type="button" data-logout-cancel>Hủy</button>
            <button class="button button-primary" type="button" data-logout-submit>Xác nhận đăng xuất</button>
          </div>
        </div>
      </footer>
    </div>`;

    dialog.querySelector(".icon-button").addEventListener("click", () => dialog.close());
    dialog.querySelector("[data-retry-profile]").addEventListener("click", loadProfile);
    const status = dialog.querySelector("[data-account-status]");
    const options = dialog.querySelector("[data-logout-options]");
    const confirmation = dialog.querySelector("[data-logout-confirm]");
    const logout = dialog.querySelector("[data-logout]");
    const logoutAll = dialog.querySelector("[data-logout-all]");
    const cancel = dialog.querySelector("[data-logout-cancel]");
    const submit = dialog.querySelector("[data-logout-submit]");
    const logoutButtons = [logout, logoutAll, cancel, submit];

    const profileForm = dialog.querySelector("[data-profile-form]");
    bindFormErrors(profileForm);
    profileForm.addEventListener("input", () => { profileForm.dataset.dirty = "1"; });
    profileForm.addEventListener("submit", async event => {
      event.preventDefault();
      const saveBtn = profileForm.querySelector('button[type="submit"]');
      const feedback = profileForm.querySelector("[role=status]");
      if (saveBtn.disabled) return;
      clearFormErrors(profileForm);
      const values = Object.fromEntries(new FormData(profileForm));
      const fullName = values.fullName.trim();
      const username = values.username.trim();
      const phone = values.phone.trim();
      const fieldErrors = [];
      if (!fullName) fieldErrors.push({ name: "fullName", message: "Họ tên không được để trống." });
      if (username && !/^[a-zA-Z0-9][a-zA-Z0-9._-]{2,31}$/.test(username)) {
        fieldErrors.push({ name: "username", message: "Tên đăng nhập gồm 3–32 ký tự không dấu (chữ, số, ., _, -), bắt đầu bằng chữ cái hoặc chữ số." });
      }
      if (phone && !validRecipientPhone(phone)) {
        fieldErrors.push({ name: "phone", message: recipientPhoneError });
      }
      if (fieldErrors.length) {
        feedback.textContent = "";
        showFormErrors(profileForm, fieldErrors);
        return;
      }
      const pending = version;
      saveBtn.disabled = true;
      feedback.textContent = "Đang lưu thông tin…";
      try {
        const { data } = await request("/auth/me", {
          method: "PATCH",
          auth: true,
          body: {
            fullName,
            username: username || null,
            phone: phone || null,
          },
        });
        if (pending !== version || !signedIn()) return;
        profile = data;
        delete profileForm.dataset.dirty;
        for (const listener of users) listener(profile);
        syncDialog();
        feedback.textContent = "Đã cập nhật thông tin tài khoản.";
      } catch (error) {
        if (pending !== version || !signedIn()) return;
        if (!showFormErrors(profileForm, error.fields)) feedback.textContent = error.message;
        else feedback.textContent = "";
      } finally {
        saveBtn.disabled = false;
      }
    });

    const passwordForm = dialog.querySelector("[data-password-form]");
    bindFormErrors(passwordForm);
    passwordForm.addEventListener("submit", async event => {
      event.preventDefault();
      const saveBtn = passwordForm.querySelector('button[type="submit"]');
      const feedback = passwordForm.querySelector("[role=status]");
      if (saveBtn.disabled) return;
      clearFormErrors(passwordForm);
      feedback.textContent = "";
      const currentPassword = passwordForm.elements.namedItem("currentPassword").value;
      const newPassword = passwordForm.elements.namedItem("newPassword").value;
      const confirmPassword = passwordForm.elements.namedItem("confirmPassword").value;
      const length = new TextEncoder().encode(newPassword).length;
      if (length < 12 || length > 72) {
        showFormErrors(passwordForm, [{ name: "newPassword", message: "Mật khẩu phải từ 12 đến 72 byte UTF-8." }]);
        return;
      }
      if (newPassword !== confirmPassword) {
        showFormErrors(passwordForm, [{ name: "confirmPassword", message: "Hai mật khẩu chưa khớp." }]);
        return;
      }
      saveBtn.disabled = true;
      feedback.textContent = "Đang cập nhật mật khẩu…";
      try {
        await request("/auth/password/change", {
          method: "POST",
          auth: true,
          body: { currentPassword, newPassword },
        });
        setToken(null);
        location.assign(signInUrl());
      } catch (error) {
        if (!showFormErrors(passwordForm, error.fields)) feedback.textContent = error.message;
        else feedback.textContent = "";
      } finally {
        saveBtn.disabled = false;
      }
    });

    logoutAll.addEventListener("click", () => {
      options.hidden = true;
      confirmation.hidden = false;
      cancel.focus();
    });
    cancel.addEventListener("click", () => {
      confirmation.hidden = true;
      options.hidden = false;
      logoutAll.focus();
    });
    logout.addEventListener("click", () => signOut("logout"));
    submit.addEventListener("click", () => signOut("logout-all"));

    async function signOut(action) {
      logoutButtons.forEach(control => { control.disabled = true; });
      status.textContent = "Đang đăng xuất…";
      try {
        await request("/auth/" + action, { method: "POST", auth: true });
        setToken(null);
      } catch (error) {
        if (signedIn()) {
          status.textContent = error.message;
          return;
        }
      } finally { logoutButtons.forEach(control => { control.disabled = false; }); }
      location.replace(sitePaths.home);
    }
  }

  onSessionChange(loadProfile);
  trigger.addEventListener("click", openProfile);
  loadProfile();

  function signInUrl(reason) {
    const destination = location.pathname + location.search + location.hash;
    const params = new URLSearchParams({ returnTo: destination });
    if (reason) params.set("reason", reason);
    return signInPath + "?" + params;
  }

  function open() {
    if (signedIn()) openProfile();
    else location.assign(signInUrl());
  }

  function openProfile() {
    render();
    if (!dialog.open) dialog.showModal();
    if (signedIn()) syncDialog();
  }

  return {
    open,
    requireSignIn(reason) { location.replace(signInUrl(reason)); },
    get profile() { return profile; },
    async resolveProfile() {
      if (!profile && signedIn()) await (loading || loadProfile());
      if (profileError) throw profileError;
      return profile;
    },
    onChange(listener) { users.add(listener); },
  };
}
