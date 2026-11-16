import { prisma } from "../database/prisma.js";
import { recordProductHidden } from "./audit-log.repository.js";

const publicProducts = {
    isPublished: true,
    artisan: { verificationStatus: "APPROVED", user: { isActive: true } },
};
export function listCategories() {
    return prisma.category.findMany({ select: { id: true, name: true, slug: true, description: true, thumbnailUrl: true }, orderBy: { name: "asc" } });
}

const summaryFields = {
    id: true,
    slug: true,
    name: true,
    price: true,
    pricingMode: true,
    saleUnit: true,
    stockQuantity: true,
    isUniquePiece: true,
    averageRating: true,
    totalReviews: true,
    mediaUrls: true,
    category: { select: { slug: true, name: true } },
    artisan: { select: { id: true, workshopName: true } },
};

export function listPublicProducts({ skip, take, category, artisanId, q }) {
    const where = { ...publicProducts };
    if (category) where.category = { slug: category };
    if (artisanId) where.artisanId = artisanId;
    if (q) {
        const match = { contains: q.replace(/[\\%_]/g, "\\$&"), mode: "insensitive" };
        where.OR = [{ name: match }, { rawMaterial: match }, { category: { name: match } }, { artisan: { workshopName: match } }];
    }

    return prisma.product.findMany({
        where,
        select: summaryFields,
        orderBy: { slug: "asc" },
        skip,
        take,
    });
}

export function findPublicProductBySlug(slug) {
    return prisma.product.findUnique({
        where: { slug, ...publicProducts },
        select: {
            ...summaryFields,
            description: true,
            culturalStory: true,
            weaveType: true,
            rawMaterial: true,
            createdAt: true,
            updatedAt: true,
        },
    });
}

export function hideProductOwnedByUser(transaction, { productId, userId }) {
    return transaction.product.updateMany({
        where: {
            id: productId,
            isPublished: true,
            artisan: { userId, user: { isActive: true } },
        },
        data: { isPublished: false },
    });
}

export function hideProductWithAudit({ productId, userId }) {
    return prisma.$transaction(async (transaction) => {
        const { count } = await hideProductOwnedByUser(transaction, { productId, userId });
        if (count === 0) return false;
        await recordProductHidden(transaction, { productId, userId });
        return true;
    });
}

export async function createOwnedProduct(userId, data) {
    return prisma.$transaction(async (tx) => {
        const workshop = await tx.artisanProfile.findFirst({ where: { userId, verificationStatus: "APPROVED", user: { isActive: true, role: "ARTISAN" } }, select: { id: true } });
        if (!workshop) return null;
        return tx.product.create({ data: { ...data, artisanId: workshop.id } });
    });
}
export function listOwnedProducts(userId, { skip, take }) {
    return prisma.product.findMany({ where: { artisan: { userId, user: { isActive: true, role: "ARTISAN" } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip, take });
}
export async function replaceOwnedProduct(userId, id, { expectedStockQuantity, ...data }) {
    return prisma.$transaction(async (tx) => {
        const own = { id, artisan: { userId, verificationStatus: "APPROVED", user: { isActive: true, role: "ARTISAN" } } };
        const result = await tx.product.updateMany({ where: { ...own, stockQuantity: expectedStockQuantity }, data });
        if (result.count) return tx.product.findUnique({ where: { id } });
        if (await tx.product.findFirst({ where: own, select: { id: true } })) throw new Error("Stale product stock");
        return null;
    });
}
