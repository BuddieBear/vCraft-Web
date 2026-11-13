export function findCheckoutBuyer(tx, userId) {
  return tx.user.findFirst({ where: { id: userId, isActive: true, role: "BUYER" }, select: { id: true } });
}

export function findCheckoutItems(tx, userId) {
  return tx.cartItem.findMany({
    where: { userId }, orderBy: { productId: "asc" },
    select: { id: true, quantity: true, product: { select: { id: true, artisanId: true, price: true, pricingMode: true } } },
  });
}

export function reserveStock(tx, product, quantity) {
  return tx.product.updateMany({
    where: {
      id: product.id, artisanId: product.artisanId, isPublished: true,
      pricingMode: "FIXED", price: product.price, stockQuantity: { gte: quantity },
      artisan: { verificationStatus: "APPROVED", user: { isActive: true } },
    },
    data: { stockQuantity: { decrement: quantity } },
  });
}

export function createRetailOrder(tx, data) { return tx.retailOrder.create({ data, include: { items: true } }); }
export function removePurchasedItem(tx, userId, item) {
  return tx.cartItem.deleteMany({ where: { id: item.id, userId, quantity: item.quantity } });
}
