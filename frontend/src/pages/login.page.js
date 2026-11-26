import { icon } from "../components/ui.js";
import { bindFormErrors, clearFormErrors, showFormErrors } from "../components/form-errors.js";
import { signInPath, sitePaths } from "../site-paths.js";
import { onSessionChange, request, setToken, signedIn } from "../api/http.js";

const roleLabels = { BUYER: "Khách hàng", ARTISAN: "Nghệ nhân", ADMIN: "Quản trị viên" };

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
    const identity = dialog.querySelector(".account-identity");
    const settings = dialog.querySelector(".account-settings");
    identity.hidden = settings.hidden = !profile;
    if (profile) {
      const words = profile.fullName.trim().split(/\s+/);
      identity.querySelector(".account-initials").textContent = words.slice(-2).map(word => Array.from(word)[0]).join("").toLocaleUpperCase("vi");
      identity.querySelector(".account-name").textContent = profile.fullName;
      identity.querySelector(".account-role").textContent = roleLabels[profile.role];
      identity.querySelector(".account-email").textContent = profile.email;
      identity.querySelector(".account-username").textContent = profile.username || "Chưa đặt";
      settings.querySelector('input[name="username"]').value = profile.username || "";
    }
    dialog.querySelector(".account-links").hidden = !profile;
    for (const link of dialog.querySelectorAll("[data-role]")) link.hidden = link.dataset.role !== profile?.role;
    dialog.querySelector("[data-retry-profile]").hidden = !profileError;
    dialog.querySelector("[data-account-status]").textContent = profileError?.message || (loading ? "Đang tải tài khoản…" : "");
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

  function render() {
    const header = `<div class="cart-header"><h2 id="account-title">Tài khoản</h2>
      <button class="icon-button" type="button" aria-label="Đóng tài khoản">${icon("close")}</button>
    </div>`;
    if (!signedIn()) {
      dialog.innerHTML = `${header}
        <p class="account-profile">Chưa đăng nhập</p>
        <div class="trade-toolbar account-logout">
          <a class="button button-primary">Đăng nhập</a>
        </div>`;
      dialog.querySelector("a").href = signInUrl();
      dialog.querySelector(".icon-button").addEventListener("click", () => dialog.close());
      return;
    }
    dialog.innerHTML = `${header}
      <section class="account-identity" aria-label="Thông tin tài khoản" hidden>
        <div class="account-identity-header">
          <span class="account-initials" aria-hidden="true"></span>
          <div><h3 class="account-name"></h3><p class="account-role"></p></div>
        </div>
        <dl>
          <div><dt>Email</dt><dd class="account-email"></dd></div>
          <div><dt>Tên người dùng</dt><dd class="account-username"></dd></div>
        </dl>
      </section>
      <nav class="account-links" aria-label="Lối tắt tài khoản" hidden>
        <a class="text-link" href="${sitePaths.notifications}">Thông báo</a>
        <a class="text-link" data-role="BUYER" href="${sitePaths.wholesale}" hidden>Yêu cầu đặt sỉ</a>
        <a class="text-link" data-role="ARTISAN" href="${sitePaths.workshop}" hidden>Xưởng của tôi</a>
        <a class="text-link" data-role="ARTISAN" href="${sitePaths.bidding}" hidden>Đấu thầu</a>
        <a class="text-link" data-role="ADMIN" href="${sitePaths.administration}" hidden>Duyệt và cấp tài khoản xưởng</a>
        <a class="text-link" data-role="ADMIN" href="${sitePaths.wholesale}" hidden>Điều phối đặt sỉ</a>
        <a class="text-link" data-role="ADMIN" href="${sitePaths.news}" hidden>Quản lý tin cộng đồng</a>
      </nav>
      <details class="account-settings" hidden>
        <summary>Sửa tên người dùng</summary>
        <form class="account-form">
          <label>Tên người dùng<input name="username" maxlength="32" minlength="3" autocapitalize="none" aria-describedby="account-username-hint"></label>
          <p id="account-username-hint">Dùng 3–32 ký tự không dấu. Để trống nếu muốn bỏ tên người dùng.</p>
          <button type="submit" class="button button-primary">Lưu tên người dùng</button>
          <p role="status" data-username-status></p>
        </form>
      </details>
      <div class="trade-toolbar account-logout" data-logout-options>
        <button class="button button-outline" type="button" data-logout>Đăng xuất</button>
        <button class="button button-outline" type="button" data-logout-all>Đăng xuất mọi thiết bị</button>
      </div>
      <div class="account-logout" role="group" aria-labelledby="logout-confirm-title" data-logout-confirm hidden>
        <p id="logout-confirm-title">Đăng xuất vCraft trên tất cả thiết bị, kể cả thiết bị này?</p>
        <div class="trade-toolbar">
          <button class="button button-outline" type="button" data-logout-cancel>Hủy</button>
          <button class="button button-outline" type="button" data-logout-submit>Xác nhận đăng xuất</button>
        </div>
      </div>
      <button class="text-button" type="button" data-retry-profile hidden>Tải lại hồ sơ</button>
      <p role="status" data-account-status aria-live="polite"></p>`;
    dialog.querySelector(".icon-button").addEventListener("click", () => dialog.close());
    dialog.querySelector("[data-retry-profile]").addEventListener("click", loadProfile);
    const status = dialog.querySelector("[data-account-status]");
    const editor = dialog.querySelector(".account-settings form");
    const editorStatus = editor.querySelector("[data-username-status]");
    const saveUsername = editor.querySelector('button[type="submit"]');
    bindFormErrors(editor);
    editor.addEventListener("submit", async event => {
      event.preventDefault();
      const pending = version;
      clearFormErrors(editor);
      saveUsername.disabled = true;
      editorStatus.textContent = "Đang lưu…";
      try {
        const username = editor.elements.namedItem("username").value.trim() || null;
        const { data } = await request("/auth/me", { method: "PATCH", auth: true, body: { username } });
        if (pending !== version) return;
        profile = data;
        syncDialog();
        editorStatus.textContent = "Đã lưu tên người dùng.";
      } catch (error) {
        editorStatus.textContent = showFormErrors(editor, error.fields) ? "" : error.message;
      } finally {
        saveUsername.disabled = false;
      }
    });
    const options = dialog.querySelector("[data-logout-options]");
    const confirmation = dialog.querySelector("[data-logout-confirm]");
    const logout = dialog.querySelector("[data-logout]");
    const logoutAll = dialog.querySelector("[data-logout-all]");
    const cancel = dialog.querySelector("[data-logout-cancel]");
    const submit = dialog.querySelector("[data-logout-submit]");
    const logoutButtons = [logout, logoutAll, cancel, submit];
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

  function signInUrl() {
    const destination = location.pathname + location.search + location.hash;
    return signInPath + "?" + new URLSearchParams({ returnTo: destination });
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
    get profile() { return profile; },
    async resolveProfile() {
      if (!profile && signedIn()) await (loading || loadProfile());
      if (profileError) throw profileError;
      return profile;
    },
    onChange(listener) { users.add(listener); },
  };
}
