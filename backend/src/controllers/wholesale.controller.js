import { ApiError } from "../middlewares/api-error.js";
import { createQuote, sendQuote, dispatchQuote, submitBid, acceptBids, assignBids, advanceAssignment, findBuyerQuote, listArtisanWork, listQuotesForBuyer, listQuotesForAllocation } from "../services/wholesale.service.js";
import { pageArgs } from "../routes/schemas.js";

export async function buyerQuotes(req, res) {
    res.json({ data: await listQuotesForBuyer(req.user.id, pageArgs(req.validatedQuery)) });
}

export async function adminQuotes(req, res) {
    res.json({ data: await listQuotesForAllocation({ ...pageArgs(req.validatedQuery), status: req.validatedQuery.status }) });
}

export async function draftQuote(req, res) {
    res.status(201).json({ data: await createQuote({ ...req.validatedBody, userId: req.user.id }) });
}

export async function buyerQuote(req, res) {
    const quote = await findBuyerQuote({ userId: req.user.id, quoteId: req.validatedParams.id });
    if (!quote) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy yêu cầu.");
    res.json({ data: quote });
}

export async function sendDraft(req, res) {
    res.json({ data: await sendQuote({ userId: req.user.id, quoteId: req.validatedParams.id }) });
}

export async function dispatch(req, res) {
    res.json({ data: await dispatchQuote({ ...req.validatedBody, userId: req.user.id, quoteId: req.validatedParams.id }) });
}

export async function bid(req, res) {
    res.status(201).json({ data: await submitBid({ ...req.validatedBody, userId: req.user.id, quoteId: req.validatedParams.id }) });
}

export async function accept(req, res) {
    res.json({ data: await acceptBids({ ...req.validatedBody, userId: req.user.id, quoteId: req.validatedParams.id }) });
}

export async function allocate(req, res) {
    res.status(201).json({ data: await assignBids({ ...req.validatedBody, userId: req.user.id, quoteId: req.validatedParams.id }) });
}

export async function setAssignmentStatus(req, res) {
    res.json({ data: await advanceAssignment({ ...req.validatedBody, userId: req.user.id, assignmentId: req.validatedParams.id }) });
}

export async function openQuotes(req, res) {
    res.json({ data: await listArtisanWork(req.user.id, pageArgs(req.validatedQuery)) });
}

export async function artisanAssignments(req, res) {
    res.json({ data: await listArtisanWork(req.user.id, pageArgs(req.validatedQuery), true) });
}
