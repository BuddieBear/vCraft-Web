import { publicProductReviews, publicArtisanReviews, createReview as createReviewRecord } from "../repositories/reviews.repository.js";

export function getProductReviews(slug, options) {
    return publicProductReviews(slug, options);
}

export function getArtisanReviews(id, options) {
    return publicArtisanReviews(id, options);
}

export async function createReview({ userId, targetType, productId = null, artisanId, retailOrderId = null, quotationRequestId = null, rating, comment, mediaUrls = [] }) {
    for (const value of [userId, artisanId]) {
        if (typeof value !== "string" || !value.trim()) {
            throw new Error("Invalid identifier");
        }
    }
    const validTarget = ["PRODUCT", "ARTISAN"].includes(targetType);
    const productTarget = targetType === "PRODUCT" && typeof productId === "string" && productId;
    const artisanTarget = targetType === "ARTISAN" && productId === null;
    if (!validTarget || (!productTarget && !artisanTarget)) {
        throw new Error("Invalid review target");
    }
    if ((!!retailOrderId === !!quotationRequestId) || (retailOrderId && typeof retailOrderId !== "string") || (quotationRequestId && typeof quotationRequestId !== "string")) {
        throw new Error("Provide one order");
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || typeof comment !== "string" || !comment.trim() || comment.length > 10000) {
        throw new Error("Invalid review");
    }
    if (!Array.isArray(mediaUrls) || mediaUrls.some((url) => typeof url !== "string" || url.length > 500)) {
        throw new Error("Invalid media");
    }
    return createReviewRecord({ userId, targetType, productId, artisanId, retailOrderId, quotationRequestId, rating, comment: comment.trim(), mediaUrls });
}
