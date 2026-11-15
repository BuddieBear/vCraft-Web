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
import { prisma } from "../database/prisma.js";
export function findBuyerOrder(userId, id) {
  return prisma.retailOrder.findFirst({ where: { id, buyerId: userId, buyer: { isActive: true, role: "BUYER" } }, include: { items: true } });
}
export function listArtisanOrders(userId, { skip, take }) {
  return prisma.retailOrder.findMany({ where: { items: { some: { artisan: { userId, verificationStatus: "APPROVED", user: { isActive: true, role: "ARTISAN" } } } } }, select: { id: true, orderCode: true, recipientName: true, recipientPhone: true, shippingAddress: true, shippingNote: true, paymentMethod: true, paymentStatus: true, status: true, createdAt: true, items: { where: { artisan: { userId } }, select: { id: true, productId: true, quantity: true, unitPrice: true, subtotal: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip, take });
}
export function listAdminOrders({ skip, take, status }) {
  return prisma.retailOrder.findMany({ where: status ? { status } : {}, include: { items: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip, take });
}
export function transitionOrder(actor, orderId, status, paymentCollected) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM retail_orders WHERE id = ${orderId}::uuid FOR UPDATE`;
    const order = await tx.retailOrder.findUnique({ where: { id: orderId }, include: { items: { orderBy: { productId: "asc" }, select: { productId: true, artisanId: true, quantity: true } } } });
    if (!order) return null;
    if (actor.role === "BUYER") {
      if (actor.id !== order.buyerId || status !== "CANCELLED") return null;
      if (order.status !== "PENDING") throw new Error("Invalid order transition");
    } else if (actor.role === "ARTISAN") {
      const artisan = await tx.artisanProfile.findFirst({ where: { userId: actor.id, verificationStatus: "APPROVED", user: { isActive: true, role: "ARTISAN" } }, select: { id: true } });
      if (!artisan || !order.items.length || order.items.some((item) => item.artisanId !== artisan.id)) return null;
    } else if (actor.role !== "ADMIN") return null;
    const previous = { CONFIRMED: "PENDING", SHIPPING: "CONFIRMED", DELIVERED: "SHIPPING" };
    if (status === "CANCELLED") {
      if (!["PENDING", "CONFIRMED"].includes(order.status) || order.paymentStatus !== "UNPAID") throw new Error("Invalid order transition");
      for (const item of order.items) await tx.product.update({ where: { id: item.productId }, data: { stockQuantity: { increment: item.quantity } } });
    } else if (previous[status] !== order.status) throw new Error("Invalid order transition");
    const collectingCod = status === "DELIVERED" && order.paymentMethod === "COD" && order.paymentStatus === "UNPAID";
    if (collectingCod !== paymentCollected) throw new Error("Invalid payment confirmation");
    if (status === "DELIVERED" && !collectingCod && order.paymentStatus !== "PAID") throw new Error("Invalid payment confirmation");
    const updated = await tx.retailOrder.update({ where: { id: orderId }, data: { status, ...(collectingCod ? { paymentStatus: "PAID" } : {}) } });
    await tx.notification.create({ data: { userId: order.buyerId, title: "Trạng thái đơn hàng", message: `${order.orderCode}: ${status}`, type: "ORDER_STATUS" } });
    return updated;
  });
}
