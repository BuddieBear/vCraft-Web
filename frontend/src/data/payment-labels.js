const paymentStates = { UNPAID: "Chưa thu tiền", PAID: "Đã thu tiền", FAILED: "Thất bại", REFUNDED: "Đã hoàn tiền" };

export function paymentLabel(order) {
  return (order.paymentMethod === "COD" ? "COD · " : "") + (paymentStates[order.paymentStatus] || order.paymentStatus);
}
