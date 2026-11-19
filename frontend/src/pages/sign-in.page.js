import { request, setToken } from "../api/http.js";

const form = document.querySelector("#sign-in-form");
const title = document.querySelector("#sign-in-title");
const status = document.querySelector("[role=status]");
const toggle = document.querySelector(".sign-in-toggle");
const submit = form.querySelector('button[type="submit"]');
const nameField = document.querySelector("#name-field");
const fullName = form.elements.namedItem("fullName");
const password = form.elements.namedItem("password");
const forgot = document.querySelector(".sign-in-forgot");
const resetRequest = document.querySelector("#reset-request-form");
const resetConfirm = document.querySelector("#reset-confirm-form");
const requestedReturn = new URLSearchParams(location.search).get("returnTo");
let returnTo = "/";
if (requestedReturn?.startsWith("/") && !requestedReturn.startsWith("//")) {
  try {
    const url = new URL(requestedReturn, location.origin);
    if (url.origin === location.origin && url.pathname !== "/login.html") {
      returnTo = url.href;
    }
  } catch { /* Use the home page for an invalid destination. */ }
}
document.querySelector(".sign-in-back").href = returnTo;

let registration = false;
let resetToken;
function updateMode() {
  form.hidden = false;
  resetRequest.hidden = true;
  resetConfirm.hidden = true;
  forgot.hidden = registration;
  toggle.hidden = false;
  nameField.hidden = !registration;
  fullName.disabled = !registration;
  fullName.required = registration;
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
  resetRequest.elements.namedItem("email").value = form.elements.namedItem("email").value;
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
  updateMode();
}

function validNewPassword(value) {
  const length = new TextEncoder().encode(value).length;
  if (length >= 12 && length <= 72) return true;
  status.textContent = "Mật khẩu phải từ 12 đến 72 byte UTF-8.";
  return false;
}

function showReset(token) {
  resetToken = token;
  form.hidden = resetRequest.hidden = toggle.hidden = true;
  resetConfirm.hidden = false;
  forgot.textContent = "Quay lại đăng nhập";
  forgot.dataset.mode = "back";
  title.textContent = "Đặt lại mật khẩu";
  document.title = title.textContent + " · vCraft";
  status.textContent = "Nhập mật khẩu mới để hoàn tất.";
  resetConfirm.elements.namedItem("newPassword").focus();
}

const resetLink = new URLSearchParams(location.hash.slice(1)).get("reset");
if (resetLink) {
  history.replaceState(null, "", location.pathname + location.search);
  if (/^[A-Za-z0-9_-]{20,200}$/.test(resetLink)) showReset(resetLink);
}

resetRequest.addEventListener("submit", async event => {
  event.preventDefault();
  const button = resetRequest.querySelector('button[type="submit"]');
  button.disabled = forgot.disabled = true;
  status.textContent = "";
  try {
    await request("/auth/password/reset/request", {
      method: "POST",
      body: { email: resetRequest.elements.namedItem("email").value },
    });
    status.textContent = "Nếu email có tài khoản, hãy kiểm tra hộp thư để nhận liên kết khôi phục.";
  } catch (error) {
    status.textContent = error.message;
  } finally {
    button.disabled = forgot.disabled = false;
  }
});

resetConfirm.addEventListener("submit", async event => {
  event.preventDefault();
  const button = resetConfirm.querySelector('button[type="submit"]');
  const newPassword = resetConfirm.elements.namedItem("newPassword").value;
  if (!validNewPassword(newPassword)) return;
  if (newPassword !== resetConfirm.elements.namedItem("confirmPassword").value) {
    status.textContent = "Hai mật khẩu chưa khớp.";
    return;
  }
  button.disabled = forgot.disabled = true;
  status.textContent = "";
  try {
    await request("/auth/password/reset/confirm", { method: "POST", body: { token: resetToken, newPassword } });
    showLogin();
    status.textContent = "Đã đặt lại mật khẩu. Hãy đăng nhập bằng mật khẩu mới.";
  } catch (error) {
    status.textContent = error.message;
  } finally {
    button.disabled = forgot.disabled = false;
  }
});

form.addEventListener("submit", async event => {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(form));
  if (registration && !validNewPassword(body.password)) return;
  submit.disabled = toggle.disabled = true;
  status.textContent = "";
  try {
    if (registration) {
      await request("/auth/register", { method: "POST", body });
      delete body.fullName;
      registration = false;
      updateMode();
    }
    const { data } = await request("/auth/login", { method: "POST", body });
    setToken(data.accessToken);
    location.assign(returnTo);
  } catch (error) {
    status.textContent = error.message;
    submit.disabled = toggle.disabled = false;
  }
});
