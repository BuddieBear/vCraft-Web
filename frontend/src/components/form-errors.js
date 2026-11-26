const errors = new WeakMap();
let nextId = 0;

function clearError(field) {
  const entry = errors.get(field);
  if (!entry) return;
  entry.note.remove();
  if (entry.describedBy === null) field.removeAttribute("aria-describedby");
  else field.setAttribute("aria-describedby", entry.describedBy);
  field.removeAttribute("aria-invalid");
  errors.delete(field);
}

function showError(field, message) {
  if (!errors.has(field)) {
    const note = document.createElement("span");
    note.id = "input-error-" + ++nextId;
    note.className = "field-error";
    const describedBy = field.getAttribute("aria-describedby");
    (field.closest("label") || field).after(note);
    field.setAttribute("aria-describedby", [describedBy, note.id].filter(Boolean).join(" "));
    field.setAttribute("aria-invalid", "true");
    errors.set(field, { note, describedBy });
  }
  errors.get(field).note.textContent = message;
}

function nativeMessage(field) {
  if (field.validity.valueMissing) return "Vui lòng điền mục này.";
  if (field.type === "email" && field.validity.typeMismatch) return "Nhập địa chỉ email hợp lệ.";
  if (field.validity.tooShort) return `Nhập ít nhất ${field.minLength} ký tự.`;
  if (field.validity.patternMismatch && field.name === "username") return "Tên đăng nhập gồm 3–32 ký tự không dấu (chữ, số, ., _, -), bắt đầu bằng chữ cái hoặc chữ số.";
  if (field.validity.rangeUnderflow) return field.dataset.minMessage || `Giá trị tối thiểu là ${field.min}.`;
  if (field.validity.rangeOverflow) return `Giá trị tối đa là ${field.max}.`;
  return field.validationMessage;
}

export function bindFormErrors(form) {
  for (const event of ["input", "change"]) {
    form.addEventListener(event, ({ target }) => clearError(target));
  }
  let firstInvalid;
  form.addEventListener("invalid", event => {
    event.preventDefault();
    const field = event.target;
    showError(field, nativeMessage(field));
    if (firstInvalid) return;
    firstInvalid = field;
    setTimeout(() => {
      firstInvalid.focus();
      firstInvalid = undefined;
    }, 0);
  }, true);
}

export function clearFormErrors(form) {
  for (const field of form.elements) clearError(field);
}

export function showFormErrors(form, fields = []) {
  let first;
  for (const { name, message } of fields) {
    const field = form.elements.namedItem(name);
    if (!field?.willValidate || !message) continue;
    showError(field, message);
    first ??= field;
  }
  first?.focus();
  return Boolean(first);
}
