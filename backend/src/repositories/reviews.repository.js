export function findDeliveredRetailOrder(tx, orderId, buyerId) {
  return tx.retailOrder.findFirst({ where: { id: orderId, buyerId, status: "DELIVERED", paymentStatus: "PAID" }, include: { items: { select: { productId: true, artisanId: true } } } });
}

export function findDeliveredQuote(tx, quoteId, buyerId) {
  return tx.quotationRequest.findFirst({ where: { id: quoteId, buyerId, status: "DELIVERED" }, include: { assignments: { where: { status: "COMPLETED" }, select: { artisanId: true, batches: { where: { status: "COMPLETED" }, select: { productId: true } } } } } });
}
import { prisma } from "../database/prisma.js";
const reviewFields = { id: true, targetType: true, rating: true, comment: true, mediaUrls: true, isVerifiedPurchase: true, createdAt: true, buyer: { select: { fullName: true, avatarUrl: true } } };
export function publicProductReviews(slug, { skip, take }) {
  return prisma.review.findMany({ where: { targetType: "PRODUCT", product: { slug, isPublished: true, artisan: { verificationStatus: "APPROVED", user: { isActive: true } } } }, select: reviewFields, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip, take });
}
export function publicArtisanReviews(id, { skip, take }) {
  return prisma.review.findMany({ where: { artisanId: id, artisan: { verificationStatus: "APPROVED", user: { isActive: true } } }, select: reviewFields, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip, take });
}
