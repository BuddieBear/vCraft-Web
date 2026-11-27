import { prisma } from "../database/prisma.js";
import { lockAssignment, lockProductBatch, lockTradingArtisan } from "../database/postgresql/row-locks.js";
import { defaultStageCodes, productionStepTitles, usesDefaultProductionSteps } from "../../../frontend/src/data/production-steps.js";
import { vietnamToday } from "../../../frontend/src/data/input-values.js";
import { batchImageParts, batchImagePath, publicImageFilename } from "../../../frontend/src/data/batch-media.js";
import { ApiError } from "../middlewares/api-error.js";
import { privateImageExists } from "../services/media.service.js";

const publicBatch = {
    orderAssignmentId: null,
    status: { in: ["IN_PROGRESS", "COMPLETED"] },
    product: { isPublished: true, artisan: { verificationStatus: "APPROVED", user: { isActive: true } } },
};

const timelineFields = {
    batchCode: true,
    status: true,
    productionSteps: true,
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

const buyerBatchScope = buyerId => ({ quotationRequest: { buyerId, status: { in: ["BUYER_ACCEPTED", "IN_PRODUCTION", "DELIVERED"] } } });

const editableOwner = userId => ({
    product: { artisan: { userId, verificationStatus: "APPROVED", user: { isActive: true, role: "ARTISAN" } } },
});

function privateLog(batchId, log) {
    return { ...log, evidenceImageUrls: log.evidenceImageUrls.flatMap(url => {
        const filename = publicImageFilename(url);
        if (filename) return [batchImagePath(batchId, filename, true)];
        return batchImageParts(url)?.batchId === batchId ? [url] : [];
    }) };
}

export async function findPrivateTimelineByBatchCode(batchCode, actor) {
    if (!["BUYER", "ARTISAN"].includes(actor.role)) return null;
    const batch = await prisma.productBatch.findUnique({
        where: {
            batchCode,
            orderAssignmentId: { not: null },
            status: { in: ["IN_PROGRESS", "COMPLETED"] },
            ...(actor.role === "BUYER"
                ? { orderAssignment: buyerBatchScope(actor.id) }
                : editableOwner(actor.id)),
        },
        select: {
            ...timelineFields,
            id: true,
            product: { select: { ...timelineFields.product.select, mediaUrls: true } },
        },
    });
    if (!batch) return null;
    const { id, ...timeline } = batch;
    return { ...timeline, logs: timeline.logs.map(log => privateLog(id, log)) };
}

export function findBuyerTimelineByBatchCode(batchCode, buyerId) {
    return findPrivateTimelineByBatchCode(batchCode, { id: buyerId, role: "BUYER" });
}

export function isLegacyPrivateImage(filename) {
    return prisma.privateLegacyImage.findUnique({ where: { filename }, select: { filename: true } });
}

export function findPrivateImageBatch(actor, id, { filename, legacy = false } = {}) {
    const active = { in: ["IN_PROGRESS", "COMPLETED"] };
    if (!["BUYER", "ARTISAN"].includes(actor.role)) return null;
    const artisan = actor.role === "ARTISAN";
    const imageUrl = legacy ? `/uploads/${filename}` : batchImagePath(id, filename);
    return prisma.productBatch.findFirst({
        where: {
            id, orderAssignmentId: { not: null }, status: filename ? active : "IN_PROGRESS",
            ...(artisan ? editableOwner(actor.id) : { orderAssignment: buyerBatchScope(actor.id) }),
            ...(filename && (!artisan || legacy) && { logs: { some: { evidenceImageUrls: { has: imageUrl } } } }),
        },
        select: { id: true },
    });
}

export function listPublicProductBatches(slug) {
    return prisma.productBatch.findMany({ where: { ...publicBatch, product: { ...publicBatch.product, slugAliases: { some: { slug } } } }, select: { batchCode: true, status: true, startedAt: true, completedAt: true }, orderBy: [{ startedAt: "desc" }, { batchCode: "asc" }], take: 100 });
}
export function createOwnedBatch(userId, data, privateBatchUrl) {
    return prisma.$transaction(async (tx) => {
        if (!data.orderAssignmentId && !(await lockTradingArtisan(tx, userId)).length) return null;
        const product = await tx.product.findFirst({ where: { id: data.productId, artisan: { userId, verificationStatus: "APPROVED", user: { isActive: true, role: "ARTISAN" } } }, select: { artisanId: true, productionSteps: true } });
        if (!product) return null;
        const batch = { ...data, productionSteps: productionStepTitles(product.productionSteps) };
        if (data.orderAssignmentId) {
            await lockAssignment(tx, data.orderAssignmentId);
            const assignment = await tx.orderAssignment.findFirst({
                where: { id: data.orderAssignmentId, artisanId: product.artisanId, status: "IN_PRODUCTION" },
                select: { id: true, allocatedQuantity: true },
            });
            if (!assignment) return null;
            const existing = await tx.productBatch.aggregate({ where: { orderAssignmentId: assignment.id, status: { not: "CANCELLED" } }, _sum: { totalQuantity: true } });
            if ((existing._sum.totalQuantity ?? 0) + data.totalQuantity > assignment.allocatedQuantity) throw new Error("Batch exceeds allocated quantity");
            return tx.productBatch.create({ data: { ...batch, qrCodeUrl: privateBatchUrl } });
        }
        return tx.productBatch.create({ data: batch });
    });
}
export async function listOwnedBatches(userId, { skip, take, assignmentId, productId }) {
    const batches = await prisma.productBatch.findMany({
        where: {
            product: { artisan: { userId, user: { isActive: true, role: "ARTISAN" } } },
            ...(productId && { productId }),
            ...(assignmentId && { orderAssignmentId: assignmentId, status: { not: "CANCELLED" } }),
        },
        include: {
            logs: { orderBy: { stepOrder: "asc" } },
            ...((assignmentId || productId) && { product: { select: { isPublished: true } }, _count: { select: { logs: true } } }),
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip, take,
    });
    return batches.map(batch => batch.orderAssignmentId ? { ...batch, logs: batch.logs.map(log => privateLog(batch.id, log)) } : batch);
}
const editableBatch = userId => ({ ...editableOwner(userId), status: "IN_PROGRESS" });

async function logImages(batch, urls = [], previous = []) {
    const checked = [];
    for (const url of urls) {
        const privateImage = batchImageParts(url);
        if (!batch.orderAssignmentId && !privateImage) {
            checked.push(url);
        } else if (batch.orderAssignmentId && privateImage?.batchId === batch.id) {
            const path = privateImage.legacy ? `/uploads/${privateImage.filename}` : url;
            if ((privateImage.legacy && previous.includes(path)) || (!privateImage.legacy && await privateImageExists(batch.id, privateImage.filename))) {
                checked.push(path);
                continue;
            }
            throw new ApiError(400, "INVALID_BATCH_IMAGE", "Chọn ảnh đã tải lên cho công đoạn của chính lô này.");
        } else {
            throw new ApiError(400, "INVALID_BATCH_IMAGE", "Chọn ảnh đã tải lên từ nhật ký của lô này.");
        }
    }
    return checked;
}

function checkLogOrder(date, previous, next) {
    const day = vietnamToday(date);
    if ((previous && day < vietnamToday(previous.loggedAt)) || (next && day > vietnamToday(next.loggedAt))) {
        throw new ApiError(409, "LOG_DATE_ORDER", "Ngày công đoạn phải theo thứ tự sản xuất. Kiểm tra ngày bước trước và bước sau.");
    }
}

export function addOwnedLog(userId, batchId, { stage, stepOrder, ...data }) {
    return prisma.$transaction(async (tx) => {
        await lockProductBatch(tx, batchId);
        const batch = await tx.productBatch.findFirst({ where: { id: batchId, ...editableBatch(userId) }, select: { id: true, orderAssignmentId: true, productionSteps: true } });
        if (!batch) return null;
        const count = await tx.batchLog.count({ where: { batchId } });
        const next = count + 1;
        const nextStage = usesDefaultProductionSteps(batch.productionSteps) ? defaultStageCodes[count] : "CUSTOM";
        if (next > productionStepTitles(batch.productionSteps).length ||
            (stage !== undefined && stage !== nextStage) ||
            (stepOrder !== undefined && stepOrder !== next)) throw new Error("Invalid production step");
        const previous = count ? await tx.batchLog.findUnique({ where: { batchId_stepOrder: { batchId, stepOrder: count } }, select: { loggedAt: true } }) : null;
        const loggedAt = data.loggedAt ?? new Date();
        checkLogOrder(loggedAt, previous);
        const evidenceImageUrls = await logImages(batch, data.evidenceImageUrls);
        const log = await tx.batchLog.create({ data: { ...data, loggedAt, evidenceImageUrls, batchId, stage: nextStage, stepOrder: next } });
        return batch.orderAssignmentId ? privateLog(batchId, log) : log;
    });
}
export function completeOwnedBatch(userId, batchId) {
    return prisma.$transaction(async (tx) => {
        await lockProductBatch(tx, batchId);
        const batch = await tx.productBatch.findFirst({ where: { id: batchId, ...editableBatch(userId) }, select: { productionSteps: true } });
        if (!batch) return null;
        const logs = await tx.batchLog.findMany({ where: { batchId }, orderBy: { stepOrder: "asc" }, select: { loggedAt: true } });
        if (logs.length !== productionStepTitles(batch.productionSteps).length) throw new Error("Incomplete production timeline");
        logs.forEach((log, index) => checkLogOrder(log.loggedAt, logs[index - 1]));
        return tx.productBatch.update({ where: { id: batchId }, data: { status: "COMPLETED", completedAt: new Date() } });
    });
}
export function editOwnedLog(userId, batchId, logId, data) {
    return prisma.$transaction(async (tx) => {
        await lockProductBatch(tx, batchId);
        const record = await tx.batchLog.findFirst({ where: { id: logId, batchId, batch: editableBatch(userId) }, include: { batch: { select: { id: true, orderAssignmentId: true } } } });
        if (!record) return null;
        const neighbors = await tx.batchLog.findMany({ where: { batchId, stepOrder: { in: [record.stepOrder - 1, record.stepOrder + 1] } }, select: { loggedAt: true, stepOrder: true } });
        checkLogOrder(data.loggedAt ?? record.loggedAt, neighbors.find(log => log.stepOrder < record.stepOrder), neighbors.find(log => log.stepOrder > record.stepOrder));
        const evidenceImageUrls = await logImages(record.batch, data.evidenceImageUrls, record.evidenceImageUrls);
        const log = await tx.batchLog.update({ where: { id: logId }, data: { ...data, evidenceImageUrls } });
        return record.batch.orderAssignmentId ? privateLog(batchId, log) : log;
    });
}

export function cancelOwnedAssignmentBatch(userId, batchId) {
    return prisma.$transaction(async tx => {
        const reference = await tx.productBatch.findFirst({ where: { id: batchId, ...editableOwner(userId) }, select: { orderAssignmentId: true } });
        if (!reference?.orderAssignmentId) return null;
        await lockAssignment(tx, reference.orderAssignmentId);
        await lockProductBatch(tx, batchId);
        const updated = await tx.productBatch.updateMany({
            where: { id: batchId, ...editableOwner(userId), status: { in: ["IN_PROGRESS", "COMPLETED"] }, orderAssignment: { status: "IN_PRODUCTION" } },
            data: { status: "CANCELLED", completedAt: null },
        });
        if (!updated.count) throw new ApiError(409, "BATCH_CANNOT_CANCEL", "Chỉ hủy lô khi phần hàng vẫn đang sản xuất.");
        return tx.productBatch.findUnique({ where: { id: batchId } });
    });
}
