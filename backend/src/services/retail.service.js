import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../database/prisma.js";
import { findCheckoutBuyer, findCheckoutItems, reserveStock, createRetailOrder, removePurchasedItem } from "../repositories/retail.repository.js";

export async function setCartItem({ userId, productId, quantity }) {
  if (typeof userId !== "string" || !userId || typeof productId !== "string" || !productId || !Number.isInteger(quantity) || quantity < 0 || quantity > 2147483647) throw new Error("Invalid cart item");
  return prisma.$transaction(async (tx) => {
    if (!await findCheckoutBuyer(tx, userId)) throw new Error("Buyer is not active");
    if (quantity === 0) return tx.cartItem.deleteMany({ where: { userId, productId } });
    const product = await tx.product.findFirst({ where: { id: productId, isPublished: true, pricingMode: "FIXED", stockQuantity: { gte: quantity }, artisan: { verificationStatus: "APPROVED", user: { isActive: true } } }, select: { id: true } });
    if (!product) throw new Error("Product is unavailable or has insufficient stock");
    return tx.cartItem.upsert({ where: { userId_productId: { userId, productId } }, create: { userId, productId, quantity }, update: { quantity } });
  });
}

export async function listCart(userId) {
  if (typeof userId !== "string" || !userId) throw new Error("Invalid userId");
  return prisma.cartItem.findMany({ where: { userId, user: { isActive: true, role: "BUYER" } }, select: { id: true, quantity: true, product: { select: { id: true, name: true, slug: true, price: true, pricingMode: true, stockQuantity: true, isPublished: true } } }, orderBy: { createdAt: "asc" } });
}

export async function listOrders(userId, { skip = 0, take = 24 } = {}) {
  if (typeof userId !== "string" || !userId) throw new Error("Invalid userId");
  return prisma.retailOrder.findMany({ where: { buyerId: userId, buyer: { isActive: true, role: "BUYER" } }, include: { items: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip, take });
}

// The caller authenticates the user; this service verifies ownership and current data again.
export async function checkout({ userId, recipientName, recipientPhone, shippingAddress, shippingNote, paymentMethod = "COD" }) {
  if (typeof userId !== "string" || !userId.trim()) throw new Error("Invalid userId");
  for (const [name, value, max] of [["recipientName", recipientName, 120], ["recipientPhone", recipientPhone, 20], ["shippingAddress", shippingAddress, 2000]]) {
    if (typeof value !== "string" || !value.trim() || value.length > max) throw new Error(`Invalid ${name}`);
  }
  if (shippingNote != null && (typeof shippingNote !== "string" || shippingNote.length > 2000)) throw new Error("Invalid shippingNote");
  if (!["COD", "BANK_TRANSFER", "VNPAY", "MOMO"].includes(paymentMethod)) throw new Error("Invalid paymentMethod");

  return prisma.$transaction(async (tx) => {
    if (!await findCheckoutBuyer(tx, userId)) throw new Error("Buyer is not active");
    const items = await findCheckoutItems(tx, userId);
    if (!items.length) throw new Error("Cart is empty");
    let total = new Prisma.Decimal(0);
    const lines = [];
    for (const item of items) {
      const product = item.product;
      if (product.pricingMode !== "FIXED" || product.price === null || (await reserveStock(tx, product, item.quantity)).count !== 1) {
        throw new Error("Product is unavailable, changed price, or has insufficient stock");
      }
      const subtotal = product.price.mul(item.quantity);
      total = total.add(subtotal);
      lines.push({ productId: product.id, artisanId: product.artisanId, quantity: item.quantity, unitPrice: product.price, subtotal });
    }
    const order = await createRetailOrder(tx, {
      orderCode: `ORD-${randomUUID().replaceAll("-", "").slice(0, 24)}`,
      buyerId: userId, recipientName: recipientName.trim(), recipientPhone: recipientPhone.trim(),
      shippingAddress: shippingAddress.trim(), shippingNote, paymentMethod, totalAmount: total,
      items: { create: lines },
    });
    for (const item of items) {
      if ((await removePurchasedItem(tx, userId, item)).count !== 1) throw new Error("Cart changed during checkout");
    }
    return order;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
