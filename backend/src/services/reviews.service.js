import { prisma } from "../database/prisma.js";
import { findDeliveredQuote, findDeliveredRetailOrder } from "../repositories/reviews.repository.js";

export async function createReview({ userId, targetType, productId = null, artisanId, retailOrderId = null, quotationRequestId = null, rating, comment, mediaUrls = [] }) {
  for (const value of [userId, artisanId]) if (typeof value !== "string" || !value.trim()) throw new Error("Invalid identifier");
  if (!["PRODUCT", "ARTISAN"].includes(targetType) || (targetType === "PRODUCT" && (typeof productId !== "string" || !productId)) || (targetType === "ARTISAN" && productId !== null)) throw new Error("Invalid review target");
  if ((!!retailOrderId === !!quotationRequestId) || (retailOrderId && typeof retailOrderId !== "string") || (quotationRequestId && typeof quotationRequestId !== "string")) throw new Error("Provide one order");
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || typeof comment !== "string" || !comment.trim() || comment.length > 10000) throw new Error("Invalid review");
  if (!Array.isArray(mediaUrls) || mediaUrls.some((url) => typeof url !== "string" || url.length > 500)) throw new Error("Invalid media");
  return prisma.$transaction(async (tx) => {
    if (!await tx.user.findFirst({ where: { id: userId, role: "BUYER", isActive: true }, select: { id: true } })) throw new Error("Buyer is not active");
    let eligible = false;
    if (retailOrderId) {
      const order = await findDeliveredRetailOrder(tx, retailOrderId, userId);
      eligible = !!order?.items.some((item) => item.artisanId === artisanId && (targetType === "ARTISAN" || item.productId === productId));
    } else {
      const quote = await findDeliveredQuote(tx, quotationRequestId, userId);
      eligible = !!quote?.assignments.some((assignment) => assignment.artisanId === artisanId && (targetType === "ARTISAN" || assignment.batches.some((batch) => batch.productId === productId)));
    }
    if (!eligible) throw new Error("Review target is not in a delivered order");
    return tx.review.create({ data: { buyerId: userId, targetType, productId, artisanId, retailOrderId, quotationRequestId, rating, comment: comment.trim(), mediaUrls, isVerifiedPurchase: true } });
  });
}
