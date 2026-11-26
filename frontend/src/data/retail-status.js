export const retailStatusLabels = Object.freeze({
  PENDING: "Chờ xác nhận", CONFIRMED: "Đã xác nhận", SHIPPING: "Đang giao", DELIVERED: "Đã giao", CANCELLED: "Đã hủy",
});

export function retailOrderLink(id) {
  return "/?don-hang=" + encodeURIComponent(id);
}

export function retailOrderLinkId(link) {
  return /^\/\?don-hang=([\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12})$/i.exec(link || "")?.[1];
}
