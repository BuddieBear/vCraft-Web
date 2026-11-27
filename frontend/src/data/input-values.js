const vietnamDate = new Intl.DateTimeFormat("en", {
  timeZone: "Asia/Ho_Chi_Minh", calendar: "gregory", numberingSystem: "latn",
  year: "numeric", month: "2-digit", day: "2-digit",
});

export function vietnamToday(now = new Date()) {
  const parts = Object.fromEntries(vietnamDate.formatToParts(now).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export const recipientPhoneError = "Số điện thoại người nhận phải có từ 8 đến 15 chữ số.";

export const slugError = "Chỉ dùng chữ thường không dấu, số và dấu gạch nối (ví dụ: lich-le-hoi-nha-xa).";

export function validRecipientPhone(value) {
  return /^\+?\d{8,15}$/.test(value.trim().replace(/[().\s-]/g, ""));
}

export const quoteBudgetMax = "999999999999.99";
export const quoteBudgetError = "Nhập ngân sách lớn hơn 0, tối đa 999.999.999.999,99 đồng, với tối đa 2 chữ số thập phân. Để trống nếu chưa xác định.";

export function validPositiveAmount(value, max) {
  const text = String(value ?? "").trim();
  const amount = Number(text);
  return /^\d+(?:\.\d{1,2})?$/.test(text) && amount > 0 && amount <= Number(max);
}
