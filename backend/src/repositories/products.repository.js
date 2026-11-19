import { Prisma } from "@prisma/client";
import { prisma } from "../database/prisma.js";
import { findMatchingProductIds } from "../database/postgresql/product-search.js";
import { recordProductHidden } from "./audit-log.repository.js";
import { demoWorkshopDomain } from "../data/demo-workshop.js";

const publicProducts = {
    isPublished: true,
    artisan: { verificationStatus: "APPROVED", user: { isActive: true } },
};

function publicProductFilter(storefront) {
    if (!storefront) return publicProducts;
    return {
        ...publicProducts,
        artisan: {
            ...publicProducts.artisan,
            user: { ...publicProducts.artisan.user, email: { not: { endsWith: demoWorkshopDomain }, mode: "insensitive" } },
        },
    };
}
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

async function searchPublicProducts({ skip, take, category, artisanId, q, sort, storefront }) {
    return prisma.$transaction(async tx => {
        const matches = await findMatchingProductIds(tx, { skip, take, category, artisanId, q, sort, storefront });
        if (!matches.length) return [];
        const products = await tx.product.findMany({
            where: { id: { in: matches.map(({ id }) => id) } },
            select: summaryFields,
        });
        const byId = new Map(products.map(product => [product.id, product]));
        return matches.map(({ id }) => byId.get(id));
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}

export function listPublicProducts({ skip, take, category, artisanId, q, sort, storefront }) {
    if (q) return searchPublicProducts({ skip, take, category, artisanId, q, sort, storefront });
    const where = { ...publicProductFilter(storefront) };
    if (category) where.category = { slug: category };
    if (artisanId) where.artisanId = artisanId;
    return prisma.product.findMany({
        where,
        select: summaryFields,
        orderBy: sort ? [{ price: { sort, nulls: "last" } }, { slug: "asc" }] : { slug: "asc" },
        skip,
        take,
    });
}

export function findPublicProductBySlug(slug, { storefront = false } = {}) {
    return prisma.product.findUnique({
        where: { slug, ...publicProductFilter(storefront) },
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
