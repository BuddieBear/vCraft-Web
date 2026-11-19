import { icon } from "../components/ui.js";
import { sitePaths } from "../site-paths.js";
import { onSessionChange, request, setToken, signedIn } from "../api/http.js";

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
    const identity = dialog.querySelector(".account-profile");
    identity.textContent = profile ? profile.fullName + " · " + profile.email : "";
    dialog.querySelector(".account-links").hidden = !profile;
    dialog.querySelector("[data-admin]").hidden = profile?.role !== "ADMIN";
    dialog.querySelector("[data-retry-profile]").hidden = !profileError;
    dialog.querySelector("[role=status]").textContent = profileError?.message || (loading ? "Đang tải tài khoản…" : "");
  }

  function loadProfile() {
    const pending = ++version;
    profile = null;
    profileError = undefined;
    trigger.setAttribute("aria-label", signedIn() ? "Tài khoản" : "Đăng nhập");
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
    dialog.innerHTML = `
      <div class="cart-header"><h2 id="account-title">Tài khoản</h2>
        <button class="icon-button" type="button" aria-label="Đóng tài khoản">${icon("close")}</button>
      </div>
      <p class="account-profile"></p>
      <nav class="account-links" aria-label="Tài khoản" hidden>
        <a class="text-link" href="${sitePaths.notifications}">Thông báo</a>
        <a class="text-link" data-admin href="${sitePaths.administration}" hidden>Quản lý xưởng</a>
      </nav>
      <button class="button button-outline account-logout" type="button">Đăng xuất</button>
      <button class="text-button" type="button" data-retry-profile hidden>Tải lại hồ sơ</button>
      <p role="status" aria-live="polite"></p>`;
    dialog.querySelector(".icon-button").addEventListener("click", () => dialog.close());
    dialog.querySelector("[data-retry-profile]").addEventListener("click", loadProfile);
    const status = dialog.querySelector("[role=status]");
    const logout = dialog.querySelector(".account-logout");
    logout.addEventListener("click", async () => {
      logout.disabled = true;
      try {
        await request("/auth/logout", { method: "POST", auth: true });
        setToken(null);
        dialog.close();
      } catch (error) {
        status.textContent = error.message;
      } finally { logout.disabled = false; }
    });
  }

  onSessionChange(loadProfile);
  trigger.addEventListener("click", open);
  loadProfile();

  function open() {
    if (!signedIn()) {
      const destination = location.pathname + location.search + location.hash;
      location.assign("/login.html?returnTo=" + encodeURIComponent(destination));
      return;
    }
    render();
    if (!dialog.open) dialog.showModal();
    syncDialog();
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
