import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../database/prisma.js";
import { lockRetailOrder } from "../database/postgresql/row-locks.js";
import { tradingWorkshop } from "./artisans.repository.js";

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
                        artisan: tradingWorkshop,
                },
                data: { stockQuantity: { decrement: quantity } },
        });
}

export function createRetailOrder(tx, data) { return tx.retailOrder.create({ data, include: { items: true } }); }
export function removePurchasedItem(tx, userId, item) {
        return tx.cartItem.deleteMany({ where: { id: item.id, userId, quantity: item.quantity } });
}

export function setCartItem(userId, productId, quantity) {
    return prisma.$transaction(async (tx) => {
        if (!await findCheckoutBuyer(tx, userId)) throw new Error("Buyer is not active");
        if (quantity === 0) return tx.cartItem.deleteMany({ where: { userId, productId } });
        const reduced = await tx.cartItem.updateMany({ where: { userId, productId, quantity: { gt: quantity } }, data: { quantity } });
        if (reduced.count) return tx.cartItem.findUniqueOrThrow({ where: { userId_productId: { userId, productId } } });
        const product = await tx.product.findFirst({ where: { id: productId, isPublished: true, pricingMode: "FIXED", stockQuantity: { gte: quantity }, artisan: tradingWorkshop }, select: { id: true } });
        if (!product) throw new Error("Product is unavailable or has insufficient stock");
        return tx.cartItem.upsert({ where: { userId_productId: { userId, productId } }, create: { userId, productId, quantity }, update: { quantity } });
    });
}

export function checkoutOrder(userId, details) {
    return prisma.$transaction(async (tx) => {
        if (!await findCheckoutBuyer(tx, userId)) throw new Error("Buyer is not active");
        const items = await findCheckoutItems(tx, userId);
        if (!items.length) throw new Error("Cart is empty");
        let total = new Prisma.Decimal(0);
        const lines = [];
        for (const item of items) {
            const product = item.product;
            if (product.pricingMode !== "FIXED" || product.price === null || (await reserveStock(tx, product, item.quantity)).count !== 1) throw new Error("Product is unavailable, changed price, or has insufficient stock");
            const subtotal = product.price.mul(item.quantity);
            total = total.add(subtotal);
            if (total.gt("9999999999.99")) throw new Error("ORDER_TOTAL_TOO_LARGE");
            lines.push({ productId: product.id, artisanId: product.artisanId, quantity: item.quantity, unitPrice: product.price, subtotal });
        }
        const artisanIds = new Set(lines.map(({ artisanId }) => artisanId));
        const order = await createRetailOrder(tx, {
            orderCode: `ORD-${randomUUID().replaceAll("-", "").slice(0, 24)}`, buyerId: userId,
            ...details, totalAmount: total,
            items: { create: lines },
            fulfillments: { create: [...artisanIds].map(artisanId => ({ artisanId })) },
        });
        for (const item of items) {
            if ((await removePurchasedItem(tx, userId, item)).count !== 1) throw new Error("Cart changed during checkout");
        }
        return order;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function listBuyerCart(userId) {
        const items = await prisma.cartItem.findMany({
            where: { userId, user: { isActive: true, role: "BUYER" } },
            select: { id: true, quantity: true, product: { select: {
                id: true, name: true, slug: true, price: true, pricingMode: true, saleUnit: true, stockQuantity: true, isPublished: true,
                artisan: { select: { verificationStatus: true, isSuspended: true, user: { select: { isActive: true, role: true } } } },
            } } },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        });
        return items.map(({ product: { artisan, ...product }, ...item }) => ({
            ...item,
            product: { ...product, isAvailable: product.isPublished && product.pricingMode === "FIXED" && product.price !== null && artisan.verificationStatus === "APPROVED" && !artisan.isSuspended && artisan.user.isActive && artisan.user.role === "ARTISAN" },
        }));
}

const fulfillmentWithWorkshop = { include: { artisan: { select: { workshopName: true } } }, orderBy: { artisanId: "asc" } };
const lineWithName = { product: { select: { name: true } }, artisan: { select: { workshopName: true } } };
const assignedArtisan = userId => ({ userId, verificationStatus: "APPROVED", user: { isActive: true, role: "ARTISAN" } });

export function listBuyerOrders(userId, { skip = 0, take = 24 } = {}) {
        return prisma.retailOrder.findMany({
            where: { buyerId: userId, buyer: { isActive: true, role: "BUYER" } },
            include: {
                items: { include: lineWithName },
                fulfillments: fulfillmentWithWorkshop,
                reviews: { select: { targetType: true, productId: true, artisanId: true } },
            },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip, take,
        });
}
export function findBuyerOrder(userId, id) {
        return prisma.retailOrder.findFirst({ where: { id, buyerId: userId, buyer: { isActive: true, role: "BUYER" } }, include: { items: true, fulfillments: fulfillmentWithWorkshop } });
}
export async function listArtisanOrders(userId, { skip, take, status }) {
    const own = { artisan: assignedArtisan(userId) };
    const orders = await prisma.retailOrder.findMany({
        where: { fulfillments: { some: { ...own, ...(status && { status }) } } },
        select: {
            id: true, orderCode: true, recipientName: true, recipientPhone: true, shippingAddress: true,
            shippingNote: true, paymentMethod: true, createdAt: true,
            fulfillments: { where: own, select: { artisanId: true, status: true, paymentStatus: true } },
            items: { where: own, select: { id: true, productId: true, quantity: true, unitPrice: true, subtotal: true, product: lineWithName.product } },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip, take,
    });
    return orders.flatMap(({ fulfillments: [part], ...order }) => part ? [{
        ...order, ...part, totalAmount: order.items.reduce((total, item) => total.add(item.subtotal), new Prisma.Decimal(0)),
    }] : []);
}
export function listAdminOrders({ skip, take, status }) {
        return prisma.retailOrder.findMany({ where: status ? { status } : {}, include: { fulfillments: fulfillmentWithWorkshop }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip, take });
}
const progress = ["PENDING", "CONFIRMED", "SHIPPING", "DELIVERED"];

function nextPayment(order, part, status, paymentCollected) {
    if (progress.indexOf(status) !== progress.indexOf(part.status) + 1 || part.status === "CANCELLED") {
        throw new Error("Invalid order transition");
    }
    const collectingCod = status === "DELIVERED" && order.paymentMethod === "COD" && part.paymentStatus === "UNPAID";
    if (collectingCod !== paymentCollected || (status === "DELIVERED" && !collectingCod && part.paymentStatus !== "PAID")) {
        throw new Error("Invalid payment confirmation");
    }
    return collectingCod ? "PAID" : part.paymentStatus;
}

export function transitionWorkshopOrder(actor, orderId, artisanId, status, paymentCollected) {
    return prisma.$transaction(async tx => {
        await lockRetailOrder(tx, orderId);
        if (actor.role !== "ARTISAN" && actor.role !== "ADMIN") return null;
        const part = await tx.retailFulfillment.findFirst({
            where: { orderId, artisanId, ...(actor.role === "ARTISAN" && { artisan: assignedArtisan(actor.id) }) },
            include: { order: { include: { fulfillments: true } } },
        });
        if (!part) return null;
        const { order } = part;
        const paymentStatus = nextPayment(order, part, status, paymentCollected);
        const updated = await tx.retailFulfillment.update({
            where: { orderId_artisanId: { orderId, artisanId } },
            data: { status, paymentStatus },
            include: { artisan: { select: { workshopName: true } } },
        });
        const parts = order.fulfillments.map(part => part.artisanId === artisanId ? updated : part);
        const orderStatus = progress.find(status => parts.some(part => part.status === status));
        await tx.retailOrder.update({ where: { id: orderId }, data: {
            status: orderStatus,
            ...(parts.every(part => part.paymentStatus === "PAID") && { paymentStatus: "PAID" }),
        } });
        await tx.notification.create({ data: {
            userId: order.buyerId, title: "Tiến độ đơn bán lẻ",
            message: `${order.orderCode} · ${updated.artisan.workshopName}: ${status}`, type: "ORDER_STATUS",
        } });
        return updated;
    });
}

export function transitionOrder(actor, orderId, status, paymentCollected) {
        return prisma.$transaction(async (tx) => {
                await lockRetailOrder(tx, orderId);
                const order = await tx.retailOrder.findUnique({ where: { id: orderId }, include: {
                    fulfillments: true,
                    items: { orderBy: { productId: "asc" }, select: { productId: true, quantity: true } },
                } });
                if (!order) return null;
                if (actor.role === "BUYER") {
                        if (actor.id !== order.buyerId || status !== "CANCELLED") return null;
                        if (order.status !== "PENDING") throw new Error("Invalid order transition");
                } else if (actor.role === "ARTISAN") {
                        const workshop = await tx.artisanProfile.findFirst({ where: assignedArtisan(actor.id), select: { id: true } });
                        if (!workshop || order.fulfillments.length !== 1 || order.fulfillments[0].artisanId !== workshop.id) return null;
                } else if (actor.role !== "ADMIN") return null;
                let paymentStatus = order.paymentStatus;
                if (status === "CANCELLED") {
                        if (paymentCollected) throw new Error("Invalid payment confirmation");
                        if (!["PENDING", "CONFIRMED"].includes(order.status) || order.paymentStatus !== "UNPAID" ||
                            order.fulfillments.some(part => !["PENDING", "CONFIRMED"].includes(part.status) || part.paymentStatus !== "UNPAID") ||
                            (actor.role === "BUYER" && order.fulfillments.some(part => part.status !== "PENDING"))) {
                            throw new Error("Invalid order transition");
                        }
                        for (const item of order.items) {
                                const restored = await tx.product.updateMany({
                                        where: { id: item.productId, stockQuantity: { lte: 2147483647 - item.quantity } },
                                        data: { stockQuantity: { increment: item.quantity } },
                                });
                                if (!restored.count) throw new Error("Stock limit exceeded on cancellation");
                        }
                } else {
                        paymentStatus = nextPayment(order, order, status, paymentCollected);
                        if (order.fulfillments.some(part => part.status !== order.status || part.paymentStatus !== order.paymentStatus)) {
                            throw new Error("Invalid order transition");
                        }
                }
                await tx.retailFulfillment.updateMany({ where: { orderId }, data: { status, paymentStatus } });
                const updated = await tx.retailOrder.update({ where: { id: orderId }, data: { status, paymentStatus } });
                await tx.notification.create({ data: { userId: order.buyerId, title: "Trạng thái đơn hàng", message: `${order.orderCode}: ${status}`, type: "ORDER_STATUS" } });
                return updated;
        });
}
