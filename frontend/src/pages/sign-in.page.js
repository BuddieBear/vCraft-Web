import { request, setToken } from "../api/http.js";
import { pageSegment, quotePageRoot, signInPath, sitePaths } from "../site-paths.js";
import { bindFormErrors, clearFormErrors, showFormErrors } from "../components/form-errors.js";

const form = document.querySelector("#sign-in-form");
const title = document.querySelector("#sign-in-title");
const status = document.querySelector("[role=status]");
const toggle = document.querySelector(".sign-in-toggle");
const submit = form.querySelector('button[type="submit"]');
const nameField = document.querySelector("#name-field");
const fullName = form.elements.namedItem("fullName");
const usernameField = document.querySelector("#username-field");
const usernameInput = form.elements.namedItem("username");
const identifierLabel = document.querySelector("[data-identifier-label]");
const identifierInput = form.elements.namedItem("identifier");
const password = form.elements.namedItem("password");
const passwordHint = document.querySelector("#password-hint");
const forgot = document.querySelector(".sign-in-forgot");
const resetRequest = document.querySelector("#reset-request-form");
const resetConfirm = document.querySelector("#reset-confirm-form");
for (const fields of [form, resetRequest, resetConfirm]) bindFormErrors(fields);
const params = new URLSearchParams(location.search);
const requestedReturn = params.get("returnTo");
let returnTo = "/";
let quoteSignIn = false;
if (requestedReturn?.startsWith("/") && !requestedReturn.startsWith("//")) {
  try {
    const url = new URL(requestedReturn, location.origin);
    const path = url.pathname.toLowerCase().replace(/\/+$/, "");
    if (url.origin === location.origin && ![signInPath, "/login.html"].includes(path)) {
      returnTo = url.href;
      quoteSignIn = params.get("reason") === "quote" && Boolean(pageSegment(path, quotePageRoot));
    }
  } catch { /* Use the home page for an invalid destination. */ }
}
document.querySelector(".sign-in-back").href = quoteSignIn ? sitePaths.wholesale : returnTo;
if (quoteSignIn) status.textContent = "Vui lòng đăng nhập để xem yêu cầu báo giá.";

let registration = false;
let resetToken;
function updateMode() {
  clearFormErrors(form);
  form.hidden = false;
  resetRequest.hidden = true;
  resetConfirm.hidden = true;
  forgot.hidden = registration;
  toggle.hidden = false;
  nameField.hidden = !registration;
  fullName.disabled = !registration;
  fullName.required = registration;
  usernameField.hidden = !registration;
  usernameInput.disabled = !registration;
  identifierLabel.textContent = registration ? "Email" : "Email hoặc tên đăng nhập";
  identifierInput.type = registration ? "email" : "text";
  identifierInput.autocomplete = registration ? "email" : "username";
  identifierInput.placeholder = registration ? "ten@example.com" : "Nhập email hoặc username";
  password.autocomplete = registration ? "new-password" : "current-password";
  password.value = "";
  if (registration) {
    password.minLength = 12;
    password.setAttribute("aria-describedby", "password-hint");
  } else {
    password.removeAttribute("minlength");
    password.removeAttribute("aria-describedby");
  }
  passwordHint.hidden = !registration;
  title.textContent = registration ? "Tạo tài khoản" : "Đăng nhập";
  document.title = title.textContent + " · vCraft";
  submit.textContent = title.textContent;
  toggle.textContent = registration ? "Đã có tài khoản? Đăng nhập" : "Tạo tài khoản người mua";
  status.textContent = "";
}
toggle.addEventListener("click", () => {
  registration = !registration;
  updateMode();
  status.textContent = registration
    ? "Đã chuyển sang tạo tài khoản người mua."
    : "Đã chuyển sang đăng nhập.";
  (registration ? fullName : identifierInput).focus();
});

forgot.addEventListener("click", () => {
  if (forgot.dataset.mode === "back") {
    forgot.dataset.mode = "";
    showLogin();
    return;
  }
  resetToken = undefined;
  form.hidden = true;
  resetConfirm.hidden = true;
  resetRequest.hidden = false;
  clearFormErrors(resetRequest);
  resetRequest.elements.namedItem("identifier").value = identifierInput.value;
  title.textContent = "Quên mật khẩu";
  document.title = title.textContent + " · vCraft";
  toggle.textContent = "Quay lại đăng nhập";
  toggle.hidden = true;
  forgot.textContent = "Quay lại đăng nhập";
  forgot.dataset.mode = "back";
  status.textContent = "";
  resetRequest.elements.namedItem("identifier").focus();
});

function showLogin() {
  resetToken = undefined;
  registration = false;
  forgot.textContent = "Quên mật khẩu?";
  forgot.dataset.mode = "";
  resetConfirm.reset();
  clearFormErrors(resetConfirm);
  updateMode();
}

function validNewPassword(form, name, value) {
  const length = new TextEncoder().encode(value).length;
  if (length >= 12 && length <= 72) return true;
  showFormErrors(form, [{ name, message: "Mật khẩu phải từ 12 đến 72 byte UTF-8." }]);
  return false;
}

function showReset(token) {
  resetToken = token;
  resetConfirm.reset();
  clearFormErrors(resetConfirm);
  form.hidden = resetRequest.hidden = toggle.hidden = true;
  resetConfirm.hidden = false;
  forgot.hidden = false;
  forgot.textContent = "Quay lại đăng nhập";
  forgot.dataset.mode = "back";
  title.textContent = "Đặt lại mật khẩu";
  document.title = title.textContent + " · vCraft";
  status.textContent = "Nhập mật khẩu mới để hoàn tất.";
  resetConfirm.elements.namedItem("newPassword").focus();
}

function consumeResetHash() {
  const token = new URLSearchParams(location.hash.slice(1)).get("reset");
  if (!token) return;
  history.replaceState(null, "", location.pathname + location.search);
  if (/^[A-Za-z0-9_-]{20,200}$/.test(token)) return showReset(token);
  showLogin();
  status.textContent = "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã bị cắt. Hãy yêu cầu liên kết mới.";
  forgot.focus();
}
consumeResetHash();
window.addEventListener("hashchange", consumeResetHash);

resetRequest.addEventListener("submit", async event => {
  event.preventDefault();
  const button = resetRequest.querySelector('button[type="submit"]');
  if (button.disabled) return;
  clearFormErrors(resetRequest);
  button.disabled = forgot.disabled = true;
  status.textContent = "";
  try {
    await request("/auth/password/reset/request", {
      method: "POST",
      body: { identifier: resetRequest.elements.namedItem("identifier").value.trim() },
    });
    status.textContent = "Nếu tài khoản tồn tại, liên kết đặt lại mật khẩu đã được gửi qua email (hoặc ghi trong log máy chủ khi chạy cục bộ).";
  } catch (error) {
    const fields = (error.fields || []).map(f => f.name === "email" ? { ...f, name: "identifier" } : f);
    if (!showFormErrors(resetRequest, fields)) status.textContent = error.message;
  } finally {
    button.disabled = forgot.disabled = false;
  }
});

resetConfirm.addEventListener("submit", async event => {
  event.preventDefault();
  const button = resetConfirm.querySelector('button[type="submit"]');
  if (button.disabled) return;
  clearFormErrors(resetConfirm);
  status.textContent = "";
  const newPassword = resetConfirm.elements.namedItem("newPassword").value;
  if (!validNewPassword(resetConfirm, "newPassword", newPassword)) return;
  if (newPassword !== resetConfirm.elements.namedItem("confirmPassword").value) {
    showFormErrors(resetConfirm, [{ name: "confirmPassword", message: "Hai mật khẩu chưa khớp." }]);
    return;
  }
  button.disabled = forgot.disabled = true;
  status.textContent = "";
  try {
    await request("/auth/password/reset/confirm", { method: "POST", body: { token: resetToken, newPassword } });
    showLogin();
    status.textContent = "Đã đặt lại mật khẩu. Hãy đăng nhập bằng mật khẩu mới.";
    identifierInput.focus();
  } catch (error) {
    if (!showFormErrors(resetConfirm, error.fields)) status.textContent = error.message;
  } finally {
    button.disabled = forgot.disabled = false;
  }
});

form.addEventListener("submit", async event => {
  event.preventDefault();
  if (submit.disabled) return;
  clearFormErrors(form);
  status.textContent = "";
  const values = Object.fromEntries(new FormData(form));
  const rawIdentifier = (values.identifier || "").trim();
  if (registration && !validNewPassword(form, "password", values.password)) return;
  submit.disabled = toggle.disabled = forgot.disabled = true;
  try {
    if (registration) {
      const registerBody = {
        email: rawIdentifier,
        fullName: values.fullName,
        password: values.password,
        ...(values.username?.trim() ? { username: values.username.trim() } : {}),
      };
      await request("/auth/register", { method: "POST", body: registerBody });
      registration = false;
      updateMode();
    }
    const { data } = await request("/auth/login", {
      method: "POST",
      body: { identifier: rawIdentifier, password: values.password },
    });
    setToken(data.accessToken);
    if (quoteSignIn) location.replace(returnTo);
    else location.assign(returnTo);
  } catch (error) {
    const fields = (error.fields || []).map(f => f.name === "email" ? { ...f, name: "identifier" } : f);
    if (!showFormErrors(form, fields)) status.textContent = error.message;
  } finally {
    submit.disabled = toggle.disabled = forgot.disabled = false;
  }
});
