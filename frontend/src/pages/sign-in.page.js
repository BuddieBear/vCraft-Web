import { request, setToken } from "../api/http.js";
import { signInPath } from "../site-paths.js";
import { bindFormErrors, clearFormErrors, showFormErrors } from "../components/form-errors.js";

const form = document.querySelector("#sign-in-form");
const title = document.querySelector("#sign-in-title");
const status = document.querySelector("[role=status]");
const toggle = document.querySelector(".sign-in-toggle");
const submit = form.querySelector('button[type="submit"]');
const nameField = document.querySelector("#name-field");
const fullName = form.elements.namedItem("fullName");
const credential = form.querySelector('[name="identifier"]');
const credentialLabel = document.querySelector("#credential-label");
const usernameField = document.querySelector("#username-field");
const username = form.elements.namedItem("username");
const password = form.elements.namedItem("password");
const forgot = document.querySelector(".sign-in-forgot");
const resetRequest = document.querySelector("#reset-request-form");
const resetConfirm = document.querySelector("#reset-confirm-form");
for (const fields of [form, resetRequest, resetConfirm]) bindFormErrors(fields);
const requestedReturn = new URLSearchParams(location.search).get("returnTo");
let returnTo = "/";
if (requestedReturn?.startsWith("/") && !requestedReturn.startsWith("//")) {
  try {
    const url = new URL(requestedReturn, location.origin);
    const path = url.pathname.toLowerCase().replace(/\/+$/, "");
    if (url.origin === location.origin && ![signInPath, "/login.html"].includes(path)) {
      returnTo = url.href;
    }
  } catch { /* Use the home page for an invalid destination. */ }
}
document.querySelector(".sign-in-back").href = returnTo;

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
  credentialLabel.textContent = registration ? "Email" : "Email hoặc tên người dùng";
  credential.name = registration ? "email" : "identifier";
  credential.type = registration ? "email" : "text";
  credential.autocomplete = registration ? "email" : "username";
  usernameField.hidden = username.disabled = !registration;
  password.autocomplete = registration ? "new-password" : "current-password";
  title.textContent = registration ? "Tạo tài khoản" : "Đăng nhập";
  document.title = title.textContent + " · vCraft";
  submit.textContent = title.textContent;
  toggle.textContent = registration ? "Đã có tài khoản? Đăng nhập" : "Tạo tài khoản người mua";
  status.textContent = "";
}
toggle.addEventListener("click", () => {
  registration = !registration;
  updateMode();
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
  resetRequest.elements.namedItem("email").value = credential.value.includes("@") ? credential.value : "";
  title.textContent = "Quên mật khẩu";
  document.title = title.textContent + " · vCraft";
  toggle.textContent = "Quay lại đăng nhập";
  toggle.hidden = true;
  forgot.textContent = "Quay lại đăng nhập";
  forgot.dataset.mode = "back";
  status.textContent = "";
  resetRequest.elements.namedItem("email").focus();
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
  forgot.textContent = "Quay lại đăng nhập";
  forgot.dataset.mode = "back";
  title.textContent = "Đặt lại mật khẩu";
  document.title = title.textContent + " · vCraft";
  status.textContent = "Nhập mật khẩu mới để hoàn tất.";
  resetConfirm.elements.namedItem("newPassword").focus();
}

function openResetLink() {
  const token = new URLSearchParams(location.hash.slice(1)).get("reset");
  if (!token) return;
  history.replaceState(null, "", location.pathname + location.search);
  if (/^[A-Za-z0-9_-]{20,200}$/.test(token)) showReset(token);
}
openResetLink();
window.addEventListener("hashchange", openResetLink);

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
      body: { email: resetRequest.elements.namedItem("email").value },
    });
    status.textContent = "Nếu email có tài khoản, hãy kiểm tra hộp thư để nhận liên kết khôi phục.";
  } catch (error) {
    if (!showFormErrors(resetRequest, error.fields)) status.textContent = error.message;
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
  const body = Object.fromEntries(new FormData(form));
  if (registration && !validNewPassword(form, "password", body.password)) return;
  const credentials = registration ? { email: body.email, password: body.password } : body;
  submit.disabled = toggle.disabled = forgot.disabled = true;
  try {
    if (registration) {
      body.username = body.username.trim() || undefined;
      await request("/auth/register", { method: "POST", body });
      registration = false;
      updateMode();
    }
    const { data } = await request("/auth/login", { method: "POST", body: credentials });
    setToken(data.accessToken);
    location.assign(returnTo);
  } catch (error) {
    if (!showFormErrors(form, error.fields)) status.textContent = error.message;
  } finally {
    submit.disabled = toggle.disabled = forgot.disabled = false;
  }
});
