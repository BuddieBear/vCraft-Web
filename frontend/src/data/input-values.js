const vietnamDate = new Intl.DateTimeFormat("en", {
  timeZone: "Asia/Ho_Chi_Minh", calendar: "gregory", numberingSystem: "latn",
  year: "numeric", month: "2-digit", day: "2-digit",
});

export function vietnamToday(now = new Date()) {
  const parts = Object.fromEntries(vietnamDate.formatToParts(now).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export const recipientPhoneError = "Số điện thoại người nhận phải có từ 8 đến 15 chữ số.";

export function validRecipientPhone(value) {
  return /^\+?\d{8,15}$/.test(value.trim().replace(/[().\s-]/g, ""));
}
