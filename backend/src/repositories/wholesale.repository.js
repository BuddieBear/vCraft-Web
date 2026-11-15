import { prisma } from "../database/prisma.js";

export async function lockQuote(tx, id) {
  const rows = await tx.$queryRaw`SELECT id FROM quotation_requests WHERE id = ${id}::uuid FOR UPDATE`;
  return rows.length ? tx.quotationRequest.findUnique({ where: { id } }) : null;
}

export function activeUser(tx, id, role) {
  return tx.user.findFirst({ where: { id, role, isActive: true }, select: { id: true } });
}

export function approvedArtisan(tx, userId) {
  return tx.artisanProfile.findFirst({ where: { userId, verificationStatus: "APPROVED", user: { isActive: true, role: "ARTISAN" } }, select: { id: true, userId: true } });
}
export function findApprovedArtisan(userId) { return approvedArtisan(prisma, userId); }
export function listOpenQuotes(artisanId, { skip, take, today }) {
  return prisma.quotationRequest.findMany({ where: { status: { in: ["SENT_TO_ARTISANS", "ARTISANS_BIDDING"] }, deadline: { gte: today }, buyer: { isActive: true, role: "BUYER" }, OR: [{ recipients: { none: {} }, targetArtisanId: null }, { recipients: { none: {} }, targetArtisanId: artisanId }, { recipients: { some: { artisanId } } }] }, select: { id: true, title: true, specifications: true, targetQuantity: true, deadline: true, maxBudget: true, preferredWeaveType: true, attachmentUrls: true, status: true, bids: { where: { artisanId }, select: { id: true, proposedPrice: true, proposedCompletionDays: true, status: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip, take });
}
export function listArtisanAssignments(artisanId, { skip, take }) {
  return prisma.orderAssignment.findMany({ where: { artisanId }, include: { quotationRequest: { select: { title: true, deadline: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip, take });
}
export function listBuyerQuotes(userId, { skip, take }) {
  return prisma.quotationRequest.findMany({ where: { buyerId: userId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip, take });
}
export function listAcceptedQuotes({ skip, take, status = "BUYER_ACCEPTED" }) {
  return prisma.quotationRequest.findMany({ where: { status }, include: { bids: { select: { id: true, artisanId: true, proposedPrice: true, proposedCompletionDays: true, status: true } }, recipients: { select: { artisanId: true } }, assignments: { select: { id: true, bidId: true, artisanId: true, allocatedQuantity: true, status: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip, take });
}
