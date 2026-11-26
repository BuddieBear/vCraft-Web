import { findApprovedArtisan, findArtisanQuote, listOpenQuotes, listArtisanAssignments, listBuyerQuotes, listAcceptedQuotes, findBuyerQuote as findBuyerQuoteRow, findBuyerJournal as findBuyerJournalRow, createQuote as createQuoteRecord, replaceDraftWorkshops, sendQuote as sendQuoteRecord, submitForDispatch, dispatchQuote as dispatchQuoteRecord, closeExpiredDispatch as closeExpiredDispatchRecord, submitBid as submitBidRecord, acceptBids as acceptBidsRecord, assignBids as assignBidsRecord, advanceAssignment as advanceAssignmentRecord } from "../repositories/wholesale.repository.js";
import { quoteBudgetMax, validPositiveAmount, vietnamToday } from "../../../frontend/src/data/input-values.js";
import { biddingPagePath, quotePagePath } from "../../../frontend/src/site-paths.js";

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
    if (!validPositiveAmount(stringValue, max)) throw new Error("Invalid amount");
    return stringValue;
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
    if (assignments) return listArtisanAssignments(artisan.id, options);
    if (artisan.isSuspended && options.view !== "mine") return [];
    return listOpenQuotes(artisan.id, { ...options, today: new Date(`${vietnamToday()}T00:00:00.000Z`) });
}

export async function getArtisanQuote(userId, quoteId) {
    const artisan = await findApprovedArtisan(userId);
    if (!artisan) throw new Error("Artisan is not active");
    return findArtisanQuote(artisan.id, quoteId, new Date(`${vietnamToday()}T00:00:00.000Z`), artisan.isSuspended);
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

export function findBuyerJournal({ userId, quoteId }) {
    return findBuyerJournalRow(id(quoteId), id(userId));
}

function validateWorkshops(artisanIds, minimum = 1) {
    if (!Array.isArray(artisanIds) || artisanIds.length < minimum || artisanIds.length > 100 || new Set(artisanIds).size !== artisanIds.length) throw new Error("Invalid allocations");
    artisanIds.forEach(id);
}

export function createQuote({ userId, title, specifications, targetQuantity, deadline, targetArtisanId = null, artisanIds = [], maxBudget = null, preferredWeaveType = null, attachmentUrls = [], submitMode = "DRAFT" }) {
    id(userId);
    if (!["DRAFT", "SEND", "DISPATCH"].includes(submitMode)) throw new Error("Invalid transition");
    const data = { userId, title: text(title, 255), specifications: text(specifications, 10000), targetQuantity: positive(targetQuantity), deadline: deadlineDate(deadline), targetArtisanId, maxBudget: maxBudget === null ? null : money(maxBudget, quoteBudgetMax), preferredWeaveType, attachmentUrls };
    if (targetArtisanId !== null) id(targetArtisanId);
    validateWorkshops(artisanIds, 0);
    if (targetArtisanId && artisanIds.length) throw new Error("Invalid allocations");
    if (submitMode === "DISPATCH" && (artisanIds.length || targetArtisanId)) throw new Error("Invalid allocations");
    if (!Array.isArray(attachmentUrls) || attachmentUrls.some((url) => typeof url !== "string" || url.length > 500)) throw new Error("Invalid attachments");
    return createQuoteRecord({ ...data, artisanIds, submitMode, linkForQuote: biddingPagePath });
}

export function updateQuoteWorkshops({ userId, quoteId, artisanIds }) {
    validateWorkshops(artisanIds, 0);
    return replaceDraftWorkshops(id(userId), id(quoteId), artisanIds);
}

export function sendQuote({ userId, quoteId }) {
    id(userId); id(quoteId);
    return sendQuoteRecord(userId, quoteId, deadlinePassed, biddingPagePath(quoteId));
}

export function requestDispatch({ userId, quoteId }) {
    id(userId); id(quoteId);
    return submitForDispatch(userId, quoteId, deadlinePassed);
}

export function dispatchQuote({ userId, quoteId, artisanIds }) {
    id(userId); id(quoteId);
    validateWorkshops(artisanIds);
    return dispatchQuoteRecord(userId, quoteId, artisanIds, deadlinePassed, biddingPagePath(quoteId));
}

export function closeExpiredDispatch({ userId, quoteId }) {
    return closeExpiredDispatchRecord(id(userId), id(quoteId), deadlinePassed, quotePagePath(quoteId));
}

export function submitBid({ userId, quoteId, proposedPrice, proposedCompletionDays, note = null, sampleImages, expectedRevision }, action = "create") {
    if (action === "withdraw") return submitBidRecord({ userId: id(userId), quoteId: id(quoteId), expectedRevision }, deadlinePassed, quotePagePath(quoteId), action);
    id(userId); id(quoteId); positive(proposedCompletionDays);
    const price = money(proposedPrice, "9999999999.99");
    if (sampleImages !== undefined && (!Array.isArray(sampleImages) || sampleImages.some((sample) => typeof sample !== "string" || sample.length > 500))) throw new Error("Invalid images");
    if (note != null && (typeof note !== "string" || note.length > 10000)) throw new Error("Invalid note");
    return submitBidRecord({ userId, quoteId, price, proposedCompletionDays, note, sampleImages, expectedRevision }, deadlinePassed, quotePagePath(quoteId), action);
}

export function acceptBids({ userId, quoteId, bidIds, allocations, bidVersions }) {
    id(userId); id(quoteId);
    if (!Array.isArray(bidIds) || !bidIds.length || new Set(bidIds).size !== bidIds.length) throw new Error("Invalid bids");
    bidIds.forEach(id);
    if (allocations !== undefined) validateAllocations(allocations);
    return acceptBidsRecord(userId, quoteId, bidIds, deadlinePassed, biddingPagePath(quoteId), allocations, bidVersions);
}

function validateAllocations(allocations) {
    if (!Array.isArray(allocations) || !allocations.length || new Set(allocations.map((item) => item.bidId)).size !== allocations.length) throw new Error("Invalid allocations");
    allocations.forEach((item) => { id(item.bidId); positive(item.quantity); });
}

export function assignBids({ userId, quoteId, allocations }) {
    id(userId); id(quoteId);
    validateAllocations(allocations);
    return assignBidsRecord(userId, quoteId, allocations);
}

export function advanceAssignment({ userId, assignmentId, status }) {
    id(userId); id(assignmentId);
    if (!["IN_PRODUCTION", "READY_FOR_DELIVERY", "COMPLETED"].includes(status)) throw new Error("Invalid transition");
    return advanceAssignmentRecord(userId, assignmentId, status, quotePagePath);
}
