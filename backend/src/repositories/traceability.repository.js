import { prisma } from "../database/prisma.js";
import { lockAssignment, lockProductBatch, lockTradingArtisan } from "../database/postgresql/row-locks.js";

const publicBatch = {
    status: { in: ["IN_PROGRESS", "COMPLETED"] },
    product: { isPublished: true, artisan: { verificationStatus: "APPROVED", user: { isActive: true } } },
};

const timelineFields = {
    batchCode: true,
    status: true,
    product: { select: { slug: true, name: true, description: true, culturalStory: true, artisan: { select: { workshopName: true } } } },
    logs: {
        orderBy: [{ stepOrder: "asc" }, { loggedAt: "asc" }, { id: "asc" }],
        select: { stage: true, stageTitle: true, description: true, evidenceImageUrls: true, loggedAt: true, stepOrder: true },
    },
};

export function listRecentPublicBatches() {
    return prisma.productBatch.findMany({
        where: publicBatch,
        select: { batchCode: true, product: { select: { name: true } } },
        orderBy: [{ startedAt: "desc" }, { batchCode: "asc" }],
        take: 24,
    });
}

export function findPublicTimelineByBatchCode(batchCode, { includeCover = false } = {}) {
    return prisma.productBatch.findUnique({
        where: { batchCode, ...publicBatch },
        select: includeCover ? {
            ...timelineFields,
            product: { select: { ...timelineFields.product.select, mediaUrls: true } },
        } : timelineFields,
    });
}

export function findBuyerTimelineByBatchCode(batchCode, buyerId) {
    return prisma.productBatch.findUnique({
        where: {
            batchCode,
            status: { in: ["IN_PROGRESS", "COMPLETED"] },
            orderAssignment: { quotationRequest: { buyerId } },
        },
        select: {
            ...timelineFields,
            product: { select: { ...timelineFields.product.select, mediaUrls: true } },
        },
    });
}

export function listPublicProductBatches(slug) {
    return prisma.productBatch.findMany({ where: { ...publicBatch, product: { ...publicBatch.product, slug } }, select: { batchCode: true, status: true, startedAt: true, completedAt: true }, orderBy: [{ startedAt: "desc" }, { batchCode: "asc" }], take: 100 });
}
export function createOwnedBatch(userId, data) {
    return prisma.$transaction(async (tx) => {
        if (!data.orderAssignmentId && !(await lockTradingArtisan(tx, userId)).length) return null;
        const product = await tx.product.findFirst({ where: { id: data.productId, artisan: { userId, verificationStatus: "APPROVED", user: { isActive: true, role: "ARTISAN" } } }, select: { artisanId: true } });
        if (!product) return null;
        if (data.orderAssignmentId) {
            await lockAssignment(tx, data.orderAssignmentId);
            const assignment = await tx.orderAssignment.findFirst({ where: { id: data.orderAssignmentId, artisanId: product.artisanId, status: { in: ["ASSIGNED", "IN_PRODUCTION"] } }, select: { id: true, allocatedQuantity: true } });
            if (!assignment) return null;
            const existing = await tx.productBatch.aggregate({ where: { orderAssignmentId: assignment.id, status: { not: "CANCELLED" } }, _sum: { totalQuantity: true } });
            if ((existing._sum.totalQuantity ?? 0) + data.totalQuantity > assignment.allocatedQuantity) throw new Error("Batch exceeds allocated quantity");
        }
        return tx.productBatch.create({ data });
    });
}
export function listOwnedBatches(userId, { skip, take, assignmentId, productId }) {
    return prisma.productBatch.findMany({
        where: {
            product: { artisan: { userId, user: { isActive: true, role: "ARTISAN" } } },
            ...(productId && { productId }),
            ...(assignmentId && { orderAssignmentId: assignmentId, status: { not: "CANCELLED" } }),
        },
        include: assignmentId || productId
            ? { product: { select: { isPublished: true } }, _count: { select: { logs: true } } }
            : { logs: { orderBy: { stepOrder: "asc" } } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip, take,
    });
}
export function addOwnedLog(userId, batchId, data) {
    return prisma.$transaction(async (tx) => {
        await lockProductBatch(tx, batchId);
        const batch = await tx.productBatch.findFirst({ where: { id: batchId, status: "IN_PROGRESS", product: { artisan: { userId, verificationStatus: "APPROVED", user: { isActive: true, role: "ARTISAN" } } } }, select: { id: true } });
        if (!batch) return null;
        const count = await tx.batchLog.count({ where: { batchId } });
        if (count !== data.stepOrder - 1) throw new Error("Invalid production step");
        return tx.batchLog.create({ data: { ...data, batchId } });
    });
}
export function completeOwnedBatch(userId, batchId) {
    return prisma.$transaction(async (tx) => {
        await lockProductBatch(tx, batchId);
        const batch = await tx.productBatch.findFirst({ where: { id: batchId, status: "IN_PROGRESS", product: { artisan: { userId, verificationStatus: "APPROVED", user: { isActive: true, role: "ARTISAN" } } } }, select: { id: true } });
        if (!batch) return null;
        if (await tx.batchLog.count({ where: { batchId } }) !== 5) throw new Error("Incomplete production timeline");
        return tx.productBatch.update({ where: { id: batchId }, data: { status: "COMPLETED", completedAt: new Date() } });
    });
}
export function editOwnedLog(userId, batchId, logId, data) {
    return prisma.$transaction(async (tx) => {
        await lockProductBatch(tx, batchId);
        const result = await tx.batchLog.updateMany({ where: { id: logId, batchId, batch: { status: "IN_PROGRESS", product: { artisan: { userId, verificationStatus: "APPROVED", user: { isActive: true, role: "ARTISAN" } } } } }, data });
        return result.count ? tx.batchLog.findUnique({ where: { id: logId } }) : null;
    });
}
