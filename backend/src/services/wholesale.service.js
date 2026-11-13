import { prisma } from "../database/prisma.js";
import { activeUser, approvedArtisan, lockQuote } from "../repositories/wholesale.repository.js";

function id(value) { if (typeof value !== "string" || !value.trim()) throw new Error("Invalid identifier"); return value; }
function text(value, max) { if (typeof value !== "string" || !value.trim() || value.length > max) throw new Error("Invalid text"); return value.trim(); }
function positive(value) { if (!Number.isInteger(value) || value <= 0 || value > 2147483647) throw new Error("Invalid quantity"); return value; }
async function quoteFor(tx, quoteId, buyerId, status) {
  const quote = await lockQuote(tx, id(quoteId));
  if (!quote || (buyerId && quote.buyerId !== buyerId) || (status && !status.includes(quote.status))) throw new Error("Quote not found or invalid state");
  return quote;
}

export async function findBuyerQuote({ userId, quoteId }) {
  id(userId); id(quoteId);
  return prisma.quotationRequest.findFirst({
    where: { id: quoteId, buyerId: userId, buyer: { isActive: true, role: "BUYER" } },
    include: { bids: true, assignments: { include: { batches: { select: { id: true, batchCode: true, status: true } } } } },
  });
}

export async function createQuote({ userId, title, specifications, targetQuantity, deadline, targetArtisanId = null, maxBudget = null, preferredWeaveType = "LUA_VAN", attachmentUrls = [] }) {
  id(userId); text(title, 255); text(specifications, 10000); positive(targetQuantity);
  const date = new Date(deadline);
  if (Number.isNaN(date.valueOf()) || date < new Date(new Date().toISOString().slice(0, 10))) throw new Error("Invalid deadline");
  if (targetArtisanId !== null) id(targetArtisanId);
  if (!Array.isArray(attachmentUrls) || attachmentUrls.some((url) => typeof url !== "string" || url.length > 500)) throw new Error("Invalid attachments");
  return prisma.$transaction(async (tx) => {
    if (!await activeUser(tx, userId, "BUYER")) throw new Error("Buyer is not active");
    if (targetArtisanId && !await tx.artisanProfile.findFirst({ where: { id: targetArtisanId, verificationStatus: "APPROVED", user: { isActive: true, role: "ARTISAN" } } })) throw new Error("Artisan is unavailable");
    return tx.quotationRequest.create({ data: { buyerId: userId, title: title.trim(), specifications: specifications.trim(), targetQuantity, deadline: date, targetArtisanId, maxBudget, preferredWeaveType, attachmentUrls } });
  });
}

export async function sendQuote({ userId, quoteId }) {
  id(userId); id(quoteId);
  return prisma.$transaction(async (tx) => {
    if (!await activeUser(tx, userId, "BUYER")) throw new Error("Buyer is not active");
    const quote = await quoteFor(tx, quoteId, userId, ["DRAFT"]);
    if (quote.deadline < new Date(new Date().toISOString().slice(0, 10))) throw new Error("Quote deadline passed");
    const artisans = await tx.artisanProfile.findMany({ where: { ...(quote.targetArtisanId ? { id: quote.targetArtisanId } : {}), verificationStatus: "APPROVED", user: { isActive: true, role: "ARTISAN" } }, select: { userId: true } });
    if (!artisans.length) throw new Error("No eligible artisan");
    const result = await tx.quotationRequest.update({ where: { id: quoteId }, data: { status: "SENT_TO_ARTISANS" } });
    await tx.notification.createMany({ data: artisans.map(({ userId: recipient }) => ({ userId: recipient, title: "Yêu cầu báo giá mới", message: quote.title, type: "QUOTE_REQUEST" })) });
    return result;
  });
}

export async function submitBid({ userId, quoteId, proposedPrice, proposedCompletionDays, note = null, sampleImages = [] }) {
  id(userId); id(quoteId); positive(proposedCompletionDays);
  if (!Array.isArray(sampleImages) || sampleImages.some((s) => typeof s !== "string" || s.length > 500)) throw new Error("Invalid images");
  if (note != null && (typeof note !== "string" || note.length > 10000)) throw new Error("Invalid note");
  return prisma.$transaction(async (tx) => {
    const quote = await quoteFor(tx, quoteId, null, ["SENT_TO_ARTISANS", "ARTISANS_BIDDING"]);
    const artisan = await approvedArtisan(tx, userId);
    if (!artisan || (quote.targetArtisanId && quote.targetArtisanId !== artisan.id) || quote.deadline < new Date(new Date().toISOString().slice(0, 10))) throw new Error("Artisan cannot bid on quote");
    const bid = await tx.bid.create({ data: { quotationRequestId: quoteId, artisanId: artisan.id, proposedPrice, proposedCompletionDays, note, sampleImages } });
    await tx.quotationRequest.update({ where: { id: quoteId }, data: { status: "ARTISANS_BIDDING" } });
    await tx.notification.create({ data: { userId: quote.buyerId, title: "Có báo giá mới", message: quote.title, type: "BID_RECEIVED" } });
    return bid;
  });
}

export async function acceptBids({ userId, quoteId, bidIds }) {
  id(userId); id(quoteId);
  if (!Array.isArray(bidIds) || !bidIds.length || new Set(bidIds).size !== bidIds.length) throw new Error("Invalid bids");
  bidIds.forEach(id);
  return prisma.$transaction(async (tx) => {
    if (!await activeUser(tx, userId, "BUYER")) throw new Error("Buyer is not active");
    const quote = await quoteFor(tx, quoteId, userId, ["ARTISANS_BIDDING"]);
    const bids = await tx.bid.findMany({ where: { id: { in: bidIds }, quotationRequestId: quoteId, status: "SUBMITTED", artisan: { verificationStatus: "APPROVED", user: { isActive: true } } }, include: { artisan: { select: { userId: true } } } });
    if (bids.length !== bidIds.length) throw new Error("Invalid or unavailable bids");
    await tx.bid.updateMany({ where: { quotationRequestId: quoteId, status: "SUBMITTED", id: { notIn: bidIds } }, data: { status: "REJECTED" } });
    await tx.bid.updateMany({ where: { id: { in: bidIds }, quotationRequestId: quoteId, status: "SUBMITTED" }, data: { status: "ACCEPTED" } });
    const result = await tx.quotationRequest.update({ where: { id: quoteId }, data: { status: "BUYER_ACCEPTED" } });
    await tx.notification.createMany({ data: bids.map((bid) => ({ userId: bid.artisan.userId, title: "Báo giá được chấp nhận", message: quote.title, type: "BID_ACCEPTED" })) });
    return result;
  });
}

export async function assignBids({ userId, quoteId, allocations }) {
  id(userId); id(quoteId);
  if (!Array.isArray(allocations) || !allocations.length || new Set(allocations.map((a) => a.bidId)).size !== allocations.length) throw new Error("Invalid allocations");
  for (const a of allocations) { id(a.bidId); positive(a.quantity); }
  return prisma.$transaction(async (tx) => {
    if (!await activeUser(tx, userId, "ADMIN")) throw new Error("Admin is not active");
    const quote = await quoteFor(tx, quoteId, null, ["BUYER_ACCEPTED"]);
    const bids = await tx.bid.findMany({ where: { quotationRequestId: quoteId, status: "ACCEPTED" } });
    if (bids.length !== allocations.length || allocations.reduce((sum, a) => sum + a.quantity, 0) !== quote.targetQuantity || bids.some((b) => !allocations.some((a) => a.bidId === b.id))) throw new Error("Allocations must cover accepted bids and requested quantity");
    const result = [];
    for (const bid of bids) {
      const allocation = allocations.find((a) => a.bidId === bid.id);
      result.push(await tx.orderAssignment.create({ data: { quotationRequestId: quoteId, artisanId: bid.artisanId, bidId: bid.id, allocatedQuantity: allocation.quantity, agreedPrice: bid.proposedPrice } }));
    }
    return result;
  });
}

export async function advanceAssignment({ userId, assignmentId, status }) {
  id(userId); id(assignmentId);
  const previous = { IN_PRODUCTION: "ASSIGNED", READY_FOR_DELIVERY: "IN_PRODUCTION", COMPLETED: "READY_FOR_DELIVERY" }[status];
  if (!previous) throw new Error("Invalid transition");
  return prisma.$transaction(async (tx) => {
    const initial = await tx.orderAssignment.findUnique({ where: { id: assignmentId }, select: { quotationRequestId: true } });
    if (!initial) throw new Error("Assignment not found");
    const quote = await quoteFor(tx, initial.quotationRequestId, null, ["BUYER_ACCEPTED", "IN_PRODUCTION"]);
    const artisan = await approvedArtisan(tx, userId);
    if (!artisan) throw new Error("Artisan is not active");
    const updated = await tx.orderAssignment.updateMany({ where: { id: assignmentId, artisanId: artisan.id, status: previous }, data: { status, ...(status === "IN_PRODUCTION" ? { startedAt: new Date() } : {}), ...(status === "COMPLETED" ? { completedAt: new Date() } : {}) } });
    if (updated.count !== 1) throw new Error("Assignment not found or invalid state");
    const remaining = await tx.orderAssignment.count({ where: { quotationRequestId: quote.id, status: { not: "COMPLETED" } } });
    const quoteStatus = remaining === 0 ? "DELIVERED" : "IN_PRODUCTION";
    await tx.quotationRequest.update({ where: { id: quote.id }, data: { status: quoteStatus } });
    await tx.notification.create({ data: { userId: quote.buyerId, title: "Tiến độ đơn hàng", message: quote.title, type: "ORDER_STATUS" } });
    return tx.orderAssignment.findUnique({ where: { id: assignmentId } });
  });
}
