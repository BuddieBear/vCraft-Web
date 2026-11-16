import { prisma } from "../database/prisma.js";

export function findPublicTimelineByBatchCode(batchCode) {
    return prisma.productBatch.findUnique({
        where: {
            batchCode,
            status: { in: ["IN_PROGRESS", "COMPLETED"] },
            product: { isPublished: true, artisan: { verificationStatus: "APPROVED", user: { isActive: true } } },
        },
        select: {
            batchCode: true,
            status: true,
            product: { select: { slug: true, name: true, culturalStory: true, artisan: { select: { workshopName: true } } } },
            logs: {
                orderBy: [{ stepOrder: "asc" }, { loggedAt: "asc" }, { id: "asc" }],
                select: {
                    stage: true,
                    stageTitle: true,
                    description: true,
                    evidenceImageUrls: true,
                    loggedAt: true,
                    stepOrder: true,
                },
            },
        },
    });
}

export function listPublicProductBatches(slug) {
    return prisma.productBatch.findMany({ where: { status: { in: ["IN_PROGRESS", "COMPLETED"] }, product: { slug, isPublished: true, artisan: { verificationStatus: "APPROVED", user: { isActive: true } } } }, select: { batchCode: true, status: true, startedAt: true, completedAt: true }, orderBy: [{ startedAt: "desc" }, { batchCode: "asc" }], take: 100 });
}
export function createOwnedBatch(userId, data) {
    return prisma.$transaction(async (tx) => {
        const product = await tx.product.findFirst({ where: { id: data.productId, artisan: { userId, verificationStatus: "APPROVED", user: { isActive: true, role: "ARTISAN" } } }, select: { artisanId: true } });
        if (!product) return null;
        if (data.orderAssignmentId) {
            await tx.$queryRaw`SELECT id FROM order_assignments WHERE id = ${data.orderAssignmentId}::uuid FOR UPDATE`;
            const assignment = await tx.orderAssignment.findFirst({ where: { id: data.orderAssignmentId, artisanId: product.artisanId, status: { in: ["ASSIGNED", "IN_PRODUCTION"] } }, select: { id: true, allocatedQuantity: true } });
            if (!assignment) return null;
            const existing = await tx.productBatch.aggregate({ where: { orderAssignmentId: assignment.id, status: { not: "CANCELLED" } }, _sum: { totalQuantity: true } });
            if ((existing._sum.totalQuantity ?? 0) + data.totalQuantity > assignment.allocatedQuantity) throw new Error("Batch exceeds allocated quantity");
        }
        return tx.productBatch.create({ data });
    });
}
export function listOwnedBatches(userId, { skip, take }) {
    return prisma.productBatch.findMany({ where: { product: { artisan: { userId, user: { isActive: true, role: "ARTISAN" } } } }, include: { logs: { orderBy: { stepOrder: "asc" } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip, take });
}
export function addOwnedLog(userId, batchId, data) {
    return prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM product_batches WHERE id = ${batchId}::uuid FOR UPDATE`;
        const batch = await tx.productBatch.findFirst({ where: { id: batchId, status: "IN_PROGRESS", product: { artisan: { userId, verificationStatus: "APPROVED", user: { isActive: true, role: "ARTISAN" } } } }, select: { id: true } });
        if (!batch) return null;
        const count = await tx.batchLog.count({ where: { batchId } });
        if (count !== data.stepOrder - 1) throw new Error("Invalid production step");
        return tx.batchLog.create({ data: { ...data, batchId } });
    });
}
export function completeOwnedBatch(userId, batchId) {
    return prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM product_batches WHERE id = ${batchId}::uuid FOR UPDATE`;
        const batch = await tx.productBatch.findFirst({ where: { id: batchId, status: "IN_PROGRESS", product: { artisan: { userId, verificationStatus: "APPROVED", user: { isActive: true, role: "ARTISAN" } } } }, select: { id: true } });
        if (!batch) return null;
        if (await tx.batchLog.count({ where: { batchId } }) !== 5) throw new Error("Incomplete production timeline");
        return tx.productBatch.update({ where: { id: batchId }, data: { status: "COMPLETED", completedAt: new Date() } });
    });
}
export function editOwnedLog(userId, batchId, logId, data) {
    return prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM product_batches WHERE id = ${batchId}::uuid FOR UPDATE`;
        const result = await tx.batchLog.updateMany({ where: { id: logId, batchId, batch: { status: "IN_PROGRESS", product: { artisan: { userId, verificationStatus: "APPROVED", user: { isActive: true, role: "ARTISAN" } } } } }, data });
        return result.count ? tx.batchLog.findUnique({ where: { id: logId } }) : null;
    });
}
