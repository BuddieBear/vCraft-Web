export function findDeliveredRetailOrder(tx, orderId, buyerId) {
  return tx.retailOrder.findFirst({ where: { id: orderId, buyerId, status: "DELIVERED" }, include: { items: { select: { productId: true, artisanId: true } } } });
}

export function findDeliveredQuote(tx, quoteId, buyerId) {
  return tx.quotationRequest.findFirst({ where: { id: quoteId, buyerId, status: "DELIVERED" }, include: { assignments: { where: { status: "COMPLETED" }, select: { artisanId: true, batches: { select: { productId: true } } } } } });
}
