export function recordProductHidden(transaction, { productId, userId }) {
  return transaction.auditLog.create({
    data: {
      userId,
      action: "PRODUCT_HIDDEN",
      targetTable: "products",
      targetRecordId: productId,
      metadata: { isPublished: false },
    },
    select: { id: true },
  });
}
