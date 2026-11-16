import { findApprovedArtisan, listOpenQuotes, listArtisanAssignments, listBuyerQuotes, listAcceptedQuotes, findBuyerQuote as findBuyerQuoteRow, createQuote as createQuoteRecord, sendQuote as sendQuoteRecord, dispatchQuote as dispatchQuoteRecord, submitBid as submitBidRecord, acceptBids as acceptBidsRecord, assignBids as assignBidsRecord, advanceAssignment as advanceAssignmentRecord } from "../repositories/wholesale.repository.js";

function id(value) {
    if (typeof value !== "string" || !value.trim()) throw new Error("Invalid identifier");
    return value;
}

function text(value, max) {
    if (typeof value !== "string" || !value.trim() || value.length > max) throw new Error("Invalid text");
    return value.trim();
}

function positive(value) {
    if (!Number.isInteger(value) || value <= 0 || value > 2147483647) throw new Error("Invalid quantity");
    return value;
}

function money(value, max) {
    const stringValue = String(value ?? "").trim();
    if (!/^\d+(\.\d{1,2})?$/.test(stringValue)) throw new Error("Invalid amount");
    const amount = Number(stringValue);
    if (!Number.isFinite(amount) || amount <= 0 || amount > Number(max)) throw new Error("Invalid amount");
    return stringValue;
}

function vietnamToday() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function deadlineDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Invalid deadline");
    const date = new Date(`${value}T00:00:00.000Z`);
    if (!Number.isFinite(date.valueOf()) || date.toISOString().slice(0, 10) !== value || value < vietnamToday()) throw new Error("Invalid deadline");
    return date;
}

function deadlinePassed(date) {
    return date.toISOString().slice(0, 10) < vietnamToday();
}

export async function listArtisanWork(userId, options, assignments = false) {
    id(userId);
    const artisan = await findApprovedArtisan(userId);
    if (!artisan) throw new Error("Artisan is not active");
    return assignments ? listArtisanAssignments(artisan.id, options) : listOpenQuotes(artisan.id, { ...options, today: new Date(`${vietnamToday()}T00:00:00.000Z`) });
}

export function listQuotesForBuyer(userId, options) {
    id(userId);
    return listBuyerQuotes(userId, options);
}

export function listQuotesForAllocation(options) {
    return listAcceptedQuotes(options);
}

export async function findBuyerQuote({ userId, quoteId }) {
    id(userId);
    id(quoteId);
    return findBuyerQuoteRow(quoteId, userId);
}

export function createQuote({ userId, title, specifications, targetQuantity, deadline, targetArtisanId = null, maxBudget = null, preferredWeaveType = "LUA_VAN", attachmentUrls = [] }) {
    id(userId);
    const data = { userId, title: text(title, 255), specifications: text(specifications, 10000), targetQuantity: positive(targetQuantity), deadline: deadlineDate(deadline), targetArtisanId, maxBudget: maxBudget === null ? null : money(maxBudget, "999999999999.99"), preferredWeaveType, attachmentUrls };
    if (targetArtisanId !== null) id(targetArtisanId);
    if (!Array.isArray(attachmentUrls) || attachmentUrls.some((url) => typeof url !== "string" || url.length > 500)) throw new Error("Invalid attachments");
    return createQuoteRecord(data);
}

export function sendQuote({ userId, quoteId }) {
    id(userId); id(quoteId);
    return sendQuoteRecord(userId, quoteId, deadlinePassed);
}

export function dispatchQuote({ userId, quoteId, artisanIds }) {
    id(userId); id(quoteId);
    if (!Array.isArray(artisanIds) || !artisanIds.length || new Set(artisanIds).size !== artisanIds.length) throw new Error("Invalid allocations");
    artisanIds.forEach(id);
    return dispatchQuoteRecord(userId, quoteId, artisanIds, deadlinePassed);
}

export function submitBid({ userId, quoteId, proposedPrice, proposedCompletionDays, note = null, sampleImages = [] }) {
    id(userId); id(quoteId); positive(proposedCompletionDays);
    const price = money(proposedPrice, "9999999999.99");
    if (!Array.isArray(sampleImages) || sampleImages.some((sample) => typeof sample !== "string" || sample.length > 500)) throw new Error("Invalid images");
    if (note != null && (typeof note !== "string" || note.length > 10000)) throw new Error("Invalid note");
    return submitBidRecord({ userId, quoteId, price, proposedCompletionDays, note, sampleImages }, deadlinePassed);
}

export function acceptBids({ userId, quoteId, bidIds }) {
    id(userId); id(quoteId);
    if (!Array.isArray(bidIds) || !bidIds.length || new Set(bidIds).size !== bidIds.length) throw new Error("Invalid bids");
    bidIds.forEach(id);
    return acceptBidsRecord(userId, quoteId, bidIds);
}

export function assignBids({ userId, quoteId, allocations }) {
    id(userId); id(quoteId);
    if (!Array.isArray(allocations) || !allocations.length || new Set(allocations.map((item) => item.bidId)).size !== allocations.length) throw new Error("Invalid allocations");
    allocations.forEach((item) => { id(item.bidId); positive(item.quantity); });
    return assignBidsRecord(userId, quoteId, allocations);
}

export function advanceAssignment({ userId, assignmentId, status }) {
    id(userId); id(assignmentId);
    if (!["IN_PRODUCTION", "READY_FOR_DELIVERY", "COMPLETED"].includes(status)) throw new Error("Invalid transition");
    return advanceAssignmentRecord(userId, assignmentId, status);
}
