import { prisma } from "../database/prisma.js";
import { lockQuotation, lockArtisanAssignment, lockTradingArtisan } from "../database/postgresql/row-locks.js";
import { tradingWorkshop } from "./artisans.repository.js";
import { ApiError } from "../middlewares/api-error.js";
import { allocatedPriceCents, decimalFromCents, moneyCents } from "../../../frontend/src/data/quote-pricing.js";

const biddingStates = ["SENT_TO_ARTISANS", "ARTISANS_BIDDING"];
const expiredQuote = () => new ApiError(409, "QUOTE_EXPIRED", "Yêu cầu báo giá đã hết hạn.");
export function findBuyerQuote(quoteId, buyerId) {
    return prisma.quotationRequest.findFirst({
        where: { id: quoteId, buyerId, buyer: { isActive: true, role: "BUYER" } },
        include: {
            bids: { include: { artisan: { select: { workshopName: true } } } },
            targetArtisan: { select: { id: true, workshopName: true } },
            recipients: { select: { artisanId: true, artisan: { select: { workshopName: true } } } },
            assignments: { include: {
                artisan: { select: { workshopName: true } },
                batches: { select: { id: true, batchCode: true, status: true, productId: true, product: { select: { name: true } } } },
            } },
            reviews: { select: { targetType: true, productId: true, artisanId: true } },
        },
    });
}

export function findBuyerJournal(quoteId, buyerId) {
    return prisma.quotationRequest.findFirst({
        where: { id: quoteId, buyerId, buyer: { isActive: true, role: "BUYER" }, status: { in: ["BUYER_ACCEPTED", "IN_PRODUCTION", "DELIVERED"] } },
        select: {
            id: true, title: true, status: true, targetQuantity: true, deadline: true,
            assignments: {
                orderBy: [{ createdAt: "asc" }, { id: "asc" }],
                select: {
                    id: true, status: true, allocatedQuantity: true, agreedPrice: true,
                    artisan: { select: { workshopName: true } },
                    batches: {
                        where: { status: { in: ["IN_PROGRESS", "COMPLETED"] } },
                        orderBy: [{ startedAt: "asc" }, { batchCode: "asc" }],
                        select: { id: true, batchCode: true, status: true, totalQuantity: true },
                    },
                },
            },
        },
    });
}

export async function lockQuote(tx, id) {
        const rows = await lockQuotation(tx, id);
        return rows.length ? tx.quotationRequest.findUnique({ where: { id } }) : null;
}

export function activeUser(tx, id, role) {
        return tx.user.findFirst({ where: { id, role, isActive: true }, select: { id: true } });
}

export function approvedArtisan(tx, userId) {
        return tx.artisanProfile.findFirst({ where: { userId, verificationStatus: "APPROVED", user: { isActive: true, role: "ARTISAN" } }, select: { id: true, userId: true, isSuspended: true } });
}
export function findApprovedArtisan(userId) { return approvedArtisan(prisma, userId); }
function openToArtisan(artisanId, today) {
    return {
        status: { in: ["SENT_TO_ARTISANS", "ARTISANS_BIDDING"] },
        deadline: { gte: today },
        AND: [
            { OR: [{ targetArtisanId: null }, { targetArtisanId: artisanId }] },
            { OR: [{ recipients: { none: {} } }, { recipients: { some: { artisanId } } }] },
        ],
    };
}
function artisanQuoteFields(artisanId) {
    return {
        id: true, title: true, specifications: true, targetQuantity: true, deadline: true, maxBudget: true,
        preferredWeaveType: true, attachmentUrls: true, status: true,
        bids: { where: { artisanId }, select: { id: true, proposedPrice: true, proposedCompletionDays: true, status: true, note: true, revision: true } },
    };
}
export function listOpenQuotes(artisanId, { skip, take, today, view }) {
    const scope = view === "mine" ? { bids: { some: { artisanId } } } : openToArtisan(artisanId, today);
    return prisma.quotationRequest.findMany({
        where: { buyer: { isActive: true, role: "BUYER" }, ...scope }, select: artisanQuoteFields(artisanId),
        orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip, take,
    });
}
export function findArtisanQuote(artisanId, quoteId, today, isSuspended) {
    const ownBid = { bids: { some: { artisanId } } };
    return prisma.quotationRequest.findFirst({
        where: { id: quoteId, buyer: { isActive: true, role: "BUYER" }, ...(isSuspended ? ownBid : { OR: [openToArtisan(artisanId, today), ownBid] }) },
        select: artisanQuoteFields(artisanId),
    });
}
export function listArtisanAssignments(artisanId, { skip, take }) {
    return prisma.$transaction(async (tx) => {
        const assignments = await tx.orderAssignment.findMany({ where: { artisanId }, include: { quotationRequest: { select: { title: true, deadline: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip, take });
        if (!assignments.length) return assignments;
        const totals = await tx.productBatch.groupBy({
            by: ["orderAssignmentId", "status"],
            where: { orderAssignmentId: { in: assignments.map(({ id }) => id) }, status: { not: "CANCELLED" } },
            _sum: { totalQuantity: true },
        });
        const progress = new Map(assignments.map(({ id }) => [id, { batchedQuantity: 0, completedQuantity: 0 }]));
        for (const row of totals) {
            const quantity = row._sum.totalQuantity ?? 0;
            const entry = progress.get(row.orderAssignmentId);
            entry.batchedQuantity += quantity;
            if (row.status === "COMPLETED") entry.completedQuantity += quantity;
        }
        return assignments.map((assignment) => ({ ...assignment, ...progress.get(assignment.id) }));
    }, { isolationLevel: "RepeatableRead" });
}
export function listBuyerQuotes(userId, { skip, take }) {
        return prisma.quotationRequest.findMany({ where: { buyerId: userId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip, take });
}
export function listAcceptedQuotes({ skip, take, status = "BUYER_ACCEPTED" }) {
        const artisan = { select: { workshopName: true } };
        return prisma.quotationRequest.findMany({ where: {
            status: { not: "DRAFT", ...(status !== "ALL" && { equals: status }) },
        }, include: { targetArtisan: { select: { workshopName: true, verificationStatus: true, isSuspended: true, user: { select: { isActive: true, role: true } } } }, bids: { select: { id: true, artisanId: true, proposedPrice: true, proposedCompletionDays: true, status: true, artisan } }, recipients: { select: { artisanId: true } }, assignments: { select: { id: true, bidId: true, artisanId: true, allocatedQuantity: true, agreedPrice: true, status: true, artisan } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip, take });
}

async function requireAvailableWorkshops(tx, artisanIds) {
    if (artisanIds.length && await tx.artisanProfile.count({ where: { id: { in: artisanIds }, ...tradingWorkshop } }) !== artisanIds.length) throw new Error("Artisan is unavailable");
}

export function createQuote(data) {
    return prisma.$transaction(async (tx) => {
        if (!await activeUser(tx, data.userId, "BUYER")) throw new Error("Buyer is not active");
        const selected = data.targetArtisanId ? [data.targetArtisanId] : data.artisanIds;
        await requireAvailableWorkshops(tx, selected);
        return tx.quotationRequest.create({ data: {
            buyerId: data.userId, title: data.title, specifications: data.specifications, targetQuantity: data.targetQuantity,
            deadline: data.deadline, targetArtisanId: data.targetArtisanId, maxBudget: data.maxBudget,
            preferredWeaveType: data.preferredWeaveType, attachmentUrls: data.attachmentUrls,
            ...(data.artisanIds.length && { recipients: { create: data.artisanIds.map(artisanId => ({ artisanId })) } }),
        } });
    });
}

export function replaceDraftWorkshops(userId, quoteId, artisanIds) {
    return prisma.$transaction(async (tx) => {
        if (!await activeUser(tx, userId, "BUYER")) throw new Error("Buyer is not active");
        const quote = await lockQuote(tx, quoteId);
        if (!quote || quote.buyerId !== userId || quote.status !== "DRAFT") throw new Error("Quote not found or invalid state");
        await requireAvailableWorkshops(tx, artisanIds);
        await tx.quoteRecipient.deleteMany({ where: { quotationRequestId: quoteId } });
        if (artisanIds.length) await tx.quoteRecipient.createMany({ data: artisanIds.map(artisanId => ({ quotationRequestId: quoteId, artisanId })) });
        return tx.quotationRequest.update({ where: { id: quoteId }, data: { targetArtisanId: null } });
    });
}

export function submitForDispatch(userId, quoteId, deadlinePassed) {
    return prisma.$transaction(async (tx) => {
        if (!await activeUser(tx, userId, "BUYER")) throw new Error("Buyer is not active");
        const quote = await lockQuote(tx, quoteId);
        if (!quote || quote.buyerId !== userId || quote.status !== "DRAFT") throw new Error("Quote not found or invalid state");
        if (deadlinePassed(quote.deadline)) throw expiredQuote();
        if (quote.targetArtisanId || await tx.quoteRecipient.count({ where: { quotationRequestId: quoteId } })) throw new Error("Quote not found or invalid state");
        return tx.quotationRequest.update({ where: { id: quoteId }, data: { status: "PENDING_DISPATCH" } });
    });
}

export function sendQuote(userId, quoteId, deadlinePassed, linkUrl) {
    return prisma.$transaction(async (tx) => {
        if (!await activeUser(tx, userId, "BUYER")) throw new Error("Buyer is not active");
        const quote = await lockQuote(tx, quoteId);
        if (!quote || quote.buyerId !== userId || quote.status !== "DRAFT") throw new Error("Quote not found or invalid state");
        if (deadlinePassed(quote.deadline)) throw expiredQuote();
        const recipients = await tx.quoteRecipient.findMany({ where: { quotationRequestId: quoteId }, select: { artisanId: true } });
        const selected = quote.targetArtisanId ? [quote.targetArtisanId] : recipients.map(({ artisanId }) => artisanId);
        const artisans = await tx.artisanProfile.findMany({ where: { ...(selected.length && { id: { in: selected } }), ...tradingWorkshop }, select: { userId: true } });
        if (selected.length && artisans.length !== selected.length) throw new Error("Artisan is unavailable");
        if (!artisans.length) throw new Error("No eligible artisan");
        const result = await tx.quotationRequest.update({ where: { id: quoteId }, data: { status: "SENT_TO_ARTISANS" } });
        await tx.notification.createMany({ data: artisans.map(({ userId: recipient }) => ({ userId: recipient, title: "Yêu cầu báo giá mới", message: quote.title, type: "QUOTE_REQUEST", linkUrl })) });
        return result;
    });
}

export function dispatchQuote(userId, quoteId, artisanIds, deadlinePassed, linkUrl) {
    return prisma.$transaction(async (tx) => {
        if (!await activeUser(tx, userId, "ADMIN")) throw new Error("Admin is not active");
        const quote = await lockQuote(tx, quoteId);
        if (!quote || quote.status !== "PENDING_DISPATCH") throw new Error("Quote not found or invalid state");
        if (!await activeUser(tx, quote.buyerId, "BUYER")) throw new Error("Quote buyer is unavailable");
        if (deadlinePassed(quote.deadline)) throw expiredQuote();
        if (quote.targetArtisanId && (artisanIds.length !== 1 || artisanIds[0] !== quote.targetArtisanId)) throw new Error("Invalid allocations");
        const artisans = await tx.artisanProfile.findMany({ where: { id: { in: artisanIds }, ...tradingWorkshop }, select: { id: true, userId: true } });
        if (artisans.length !== artisanIds.length) throw new Error("Artisan is unavailable");
        await tx.quoteRecipient.createMany({ data: artisans.map((artisan) => ({ quotationRequestId: quoteId, artisanId: artisan.id })) });
        const result = await tx.quotationRequest.update({ where: { id: quoteId }, data: { status: "SENT_TO_ARTISANS" } });
        await tx.notification.createMany({ data: artisans.map((artisan) => ({ userId: artisan.userId, title: "Yêu cầu báo giá mới", message: quote.title, type: "QUOTE_REQUEST", linkUrl })) });
        await tx.auditLog.create({ data: { userId, action: "QUOTE_DISPATCHED", targetTable: "quotation_requests", targetRecordId: quoteId, metadata: { artisanIds } } });
        return result;
    });
}

export function closeExpiredDispatch(userId, quoteId, deadlinePassed, linkUrl) {
    return prisma.$transaction(async tx => {
        if (!await activeUser(tx, userId, "ADMIN")) throw new Error("Admin is not active");
        const quote = await lockQuote(tx, quoteId);
        if (!quote || quote.status !== "PENDING_DISPATCH" || !deadlinePassed(quote.deadline)) throw new Error("Quote not found or invalid state");
        const result = await tx.quotationRequest.update({ where: { id: quoteId }, data: { status: "CANCELLED" } });
        await tx.auditLog.create({ data: { userId, action: "QUOTE_EXPIRED_CLOSED", targetTable: "quotation_requests", targetRecordId: quoteId } });
        await tx.notification.create({ data: { userId: quote.buyerId, title: "Yêu cầu điều phối đã hết hạn", message: quote.title, type: "ORDER_STATUS", linkUrl } });
        return result;
    });
}

export function submitBid(data, deadlinePassed, linkUrl, action = "create") {
    return prisma.$transaction(async (tx) => {
        const quote = await lockQuote(tx, data.quoteId);
        if (!quote || !biddingStates.includes(quote.status)) throw new Error("Quote not found or invalid state");
        if (deadlinePassed(quote.deadline)) throw expiredQuote();
        if (!await activeUser(tx, quote.buyerId, "BUYER")) throw new Error("Quote buyer is unavailable");
        const [artisan] = await lockTradingArtisan(tx, data.userId);
        if (!artisan || (quote.targetArtisanId && quote.targetArtisanId !== artisan.id)) throw new Error("Artisan cannot bid on quote");
        const recipients = await tx.quoteRecipient.count({ where: { quotationRequestId: data.quoteId } });
        if (recipients && !await tx.quoteRecipient.findUnique({ where: { quotationRequestId_artisanId: { quotationRequestId: data.quoteId, artisanId: artisan.id } } })) throw new Error("Artisan cannot bid on quote");
        const key = { quotationRequestId_artisanId: { quotationRequestId: data.quoteId, artisanId: artisan.id } };
        const existing = await tx.bid.findUnique({ where: key });
        const withdrawing = action === "withdraw";
        const allowed = action === "create" ? !existing || existing.status === "WITHDRAWN" : existing?.status === "SUBMITTED";
        if (!allowed) throw new ApiError(409, "BID_STATE_CHANGED", "Báo giá đã thay đổi. Vui lòng tải lại yêu cầu.");
        if (action !== "create" && existing.revision !== data.expectedRevision) throw new ApiError(409, "BID_STATE_CHANGED", "Báo giá đã thay đổi. Vui lòng tải lại yêu cầu.");
        const values = withdrawing ? { status: "WITHDRAWN" } : {
            status: "SUBMITTED", proposedPrice: data.price, proposedCompletionDays: data.proposedCompletionDays, note: data.note, sampleImages: data.sampleImages,
        };
        const bid = existing ? await tx.bid.update({ where: key, data: { ...values, revision: { increment: 1 } } }) : await tx.bid.create({ data: { quotationRequestId: data.quoteId, artisanId: artisan.id, ...values } });
        const hasBids = !withdrawing || await tx.bid.count({ where: { quotationRequestId: data.quoteId, status: "SUBMITTED" } });
        await tx.quotationRequest.update({ where: { id: data.quoteId }, data: { status: hasBids ? "ARTISANS_BIDDING" : "SENT_TO_ARTISANS" } });
        const title = { create: "Có báo giá mới", edit: "Báo giá đã được cập nhật", withdraw: "Xưởng đã rút báo giá" }[action];
        await tx.notification.create({ data: { userId: quote.buyerId, title, message: quote.title, type: "BID_RECEIVED", linkUrl } });
        return bid;
    });
}

export function acceptBids(userId, quoteId, bidIds, deadlinePassed, linkUrl, allocations, bidVersions) {
    return prisma.$transaction(async (tx) => {
        if (!await activeUser(tx, userId, "BUYER")) throw new Error("Buyer is not active");
        const quote = await lockQuote(tx, quoteId);
        if (!quote || quote.buyerId !== userId || quote.status !== "ARTISANS_BIDDING") throw new Error("Quote not found or invalid state");
        if (deadlinePassed(quote.deadline)) throw expiredQuote();
        if (bidIds.length > quote.targetQuantity) throw new Error("Too many bids for the requested quantity");
        const bids = await tx.bid.findMany({ where: { id: { in: bidIds }, quotationRequestId: quoteId, status: "SUBMITTED", artisan: tradingWorkshop }, include: { artisan: { select: { userId: true } } } });
        if (bids.length !== bidIds.length) throw new Error("Invalid or unavailable bids");
        if (bids.some(bid => bid.revision !== (bidVersions ? bidVersions[bid.id] : 0))) {
            throw new ApiError(409, "BID_STATE_CHANGED", "Có báo giá vừa thay đổi. Hãy tải lại và kiểm tra giá trước khi chốt.");
        }
        if (allocations) await createAssignments(tx, quote, bids, allocations);
        else if (quote.maxBudget !== null) {
            if (bids.length > 1) throw new ApiError(409, "ALLOCATIONS_REQUIRED", "Cần chia số lượng cho từng xưởng trước khi chốt yêu cầu có ngân sách.");
            checkBudget(quote, moneyCents(bids[0].proposedPrice));
        }
        await tx.bid.updateMany({ where: { quotationRequestId: quoteId, status: "SUBMITTED", id: { notIn: bidIds } }, data: { status: "REJECTED" } });
        await tx.bid.updateMany({ where: { id: { in: bidIds }, quotationRequestId: quoteId, status: "SUBMITTED" }, data: { status: "ACCEPTED" } });
        const result = await tx.quotationRequest.update({ where: { id: quoteId }, data: { status: "BUYER_ACCEPTED" } });
        await tx.notification.createMany({ data: bids.map((bid) => ({ userId: bid.artisan.userId, title: "Báo giá được chấp nhận", message: quote.title, type: "BID_ACCEPTED", linkUrl })) });
        return result;
    });
}

async function createAssignments(tx, quote, bids, allocations) {
    const quantities = new Map(allocations.map(({ bidId, quantity }) => [bidId, quantity]));
    if (bids.length !== quantities.size || allocations.reduce((sum, item) => sum + item.quantity, 0) !== quote.targetQuantity || bids.some(({ id }) => !quantities.has(id))) throw new Error("Allocations must cover accepted bids and requested quantity");
    const terms = bids.map(bid => ({ bid, quantity: quantities.get(bid.id), price: allocatedPriceCents(bid.proposedPrice, quantities.get(bid.id), quote.targetQuantity) }));
    if (terms.some(term => term.price === 0n)) throw new ApiError(409, "INVALID_ALLOCATION_PRICE", "Giá phần hàng phải ít nhất 0,01 ₫. Hãy điều chỉnh số lượng chia cho từng xưởng.");
    checkBudget(quote, terms.reduce((sum, term) => sum + term.price, 0n));
    const assignments = [];
    for (const { bid, quantity, price } of terms) {
        assignments.push(await tx.orderAssignment.create({ data: { quotationRequestId: quote.id, artisanId: bid.artisanId, bidId: bid.id, allocatedQuantity: quantity, agreedPrice: decimalFromCents(price) } }));
    }
    return assignments;
}

function checkBudget(quote, total) {
    if (quote.maxBudget !== null && total > moneyCents(quote.maxBudget)) throw new ApiError(409, "QUOTE_BUDGET_EXCEEDED", "Tổng tiền phân công vượt ngân sách tối đa của yêu cầu.");
}

export function assignBids(userId, quoteId, allocations) {
    return prisma.$transaction(async (tx) => {
        if (!await activeUser(tx, userId, "ADMIN")) throw new Error("Admin is not active");
        const quote = await lockQuote(tx, quoteId);
        if (!quote || quote.status !== "BUYER_ACCEPTED") throw new Error("Quote not found or invalid state");
        const bids = await tx.bid.findMany({
            where: { quotationRequestId: quoteId, status: "ACCEPTED" },
            include: { artisan: { select: { verificationStatus: true, user: { select: { isActive: true, role: true } } } } },
        });
        if (bids.some(({ artisan }) => artisan.verificationStatus !== "APPROVED" || !artisan.user.isActive || artisan.user.role !== "ARTISAN")) throw new Error("Artisan is unavailable");
        return createAssignments(tx, quote, bids, allocations);
    });
}

export function advanceAssignment(userId, assignmentId, status, linkForQuote) {
    return prisma.$transaction(async (tx) => {
        const initial = await tx.orderAssignment.findUnique({ where: { id: assignmentId }, select: { quotationRequestId: true } });
        if (!initial) throw new Error("Assignment not found");
        const quote = await lockQuote(tx, initial.quotationRequestId);
        if (!quote || !["BUYER_ACCEPTED", "IN_PRODUCTION"].includes(quote.status)) throw new Error("Quote not found or invalid state");
        const artisan = await approvedArtisan(tx, userId);
        if (!artisan) throw new Error("Artisan is not active");
        const previous = { IN_PRODUCTION: "ASSIGNED", READY_FOR_DELIVERY: "IN_PRODUCTION", COMPLETED: "READY_FOR_DELIVERY" }[status];
        if (status === "READY_FOR_DELIVERY") {
            const [assignment] = await lockArtisanAssignment(tx, assignmentId, artisan.id);
            if (!assignment) throw new Error("Assignment not found or invalid state");
            const unfinished = await tx.productBatch.findFirst({ where: { orderAssignmentId: assignmentId, orderAssignment: { artisanId: artisan.id }, status: { in: ["PLANNING", "IN_PROGRESS"] } }, select: { id: true } });
            if (unfinished) throw new Error("Assignment has unfinished batches");
            const completed = await tx.productBatch.aggregate({
                where: { orderAssignmentId: assignmentId, status: "COMPLETED" },
                _sum: { totalQuantity: true },
            });
            if ((completed._sum.totalQuantity ?? 0) !== assignment.allocated_quantity) {
                throw new Error("Assignment batch quantity does not match allocation");
            }
        }
        const updated = await tx.orderAssignment.updateMany({ where: { id: assignmentId, artisanId: artisan.id, status: previous }, data: { status, ...(status === "IN_PRODUCTION" ? { startedAt: new Date() } : {}), ...(status === "COMPLETED" ? { completedAt: new Date() } : {}) } });
        if (updated.count !== 1) throw new Error("Assignment not found or invalid state");
        const remaining = await tx.orderAssignment.count({ where: { quotationRequestId: quote.id, status: { not: "COMPLETED" } } });
        await tx.quotationRequest.update({ where: { id: quote.id }, data: { status: remaining === 0 ? "DELIVERED" : "IN_PRODUCTION" } });
        await tx.notification.create({ data: { userId: quote.buyerId, title: "Tiến độ đơn hàng", message: quote.title, type: "ORDER_STATUS", linkUrl: linkForQuote(quote.id) } });
        return tx.orderAssignment.findUnique({ where: { id: assignmentId } });
    });
}
