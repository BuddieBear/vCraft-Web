export function findDeliveredRetailOrder(tx, orderId, buyerId) {
    return tx.retailOrder.findFirst({ where: { id: orderId, buyerId, status: "DELIVERED", paymentStatus: "PAID" }, include: { items: { select: { productId: true, artisanId: true } } } });
}

export function findDeliveredQuote(tx, quoteId, buyerId) {
    return tx.quotationRequest.findFirst({ where: { id: quoteId, buyerId, status: "DELIVERED" }, include: { assignments: { where: { status: "COMPLETED" }, select: { artisanId: true, batches: { where: { status: "COMPLETED" }, select: { productId: true } } } } } });
}
import { prisma } from "../database/prisma.js";
import { tradingWorkshop } from "./artisans.repository.js";
export function findActiveBuyer(tx, userId) { return tx.user.findFirst({ where: { id: userId, role: "BUYER", isActive: true }, select: { id: true } }); }
export function createVerifiedReview(tx, data) { return tx.review.create({ data }); }
export function createReview(data) {
    return prisma.$transaction(async (tx) => {
        if (!await findActiveBuyer(tx, data.userId)) throw new Error("Buyer is not active");
        let eligible = false;
        if (data.retailOrderId) {
            const order = await findDeliveredRetailOrder(tx, data.retailOrderId, data.userId);
            eligible = !!order?.items.some((item) => item.artisanId === data.artisanId && (data.targetType === "ARTISAN" || item.productId === data.productId));
        } else {
            const quote = await findDeliveredQuote(tx, data.quotationRequestId, data.userId);
            eligible = !!quote?.assignments.some((assignment) => assignment.artisanId === data.artisanId && (data.targetType === "ARTISAN" || assignment.batches.some((batch) => batch.productId === data.productId)));
        }
        if (!eligible) throw new Error("Review target is not in a delivered order");
        return createVerifiedReview(tx, { buyerId: data.userId, targetType: data.targetType, productId: data.productId, artisanId: data.artisanId, retailOrderId: data.retailOrderId, quotationRequestId: data.quotationRequestId, rating: data.rating, comment: data.comment, mediaUrls: data.mediaUrls, isVerifiedPurchase: true });
    });
}
const reviewFields = { id: true, targetType: true, rating: true, comment: true, mediaUrls: true, isVerifiedPurchase: true, createdAt: true, buyer: { select: { fullName: true, avatarUrl: true } } };
async function publicReviews(where, { page, limit }) {
    const [data, { _count, _avg }] = await Promise.all([
        prisma.review.findMany({
            where, select: reviewFields, orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            skip: (page - 1) * limit, take: limit + 1,
        }),
        prisma.review.aggregate({ where, _avg: { rating: true }, _count: true }),
    ]);
    return {
        data: data.slice(0, limit),
        summary: { averageRating: _avg.rating, totalReviews: _count },
        pagination: { page, limit, hasNext: page < 10000 && data.length > limit },
    };
}
export function publicProductReviews(slug, query) {
    return publicReviews({ targetType: "PRODUCT", product: { slug, isPublished: true, artisan: tradingWorkshop } }, query);
}
export function publicArtisanReviews(id, query) {
    return publicReviews({
        artisanId: id, artisan: tradingWorkshop,
        OR: [{ targetType: "ARTISAN" }, { targetType: "PRODUCT", product: { isPublished: true } }],
    }, query);
}
