import { ApiError } from "../middlewares/api-error.js";
import { createQuote, sendQuote, requestDispatch, dispatchQuote, submitBid, acceptBids, assignBids, advanceAssignment, findBuyerQuote, getArtisanQuote, listArtisanWork, listQuotesForBuyer, listQuotesForAllocation } from "../services/wholesale.service.js";
import { listPage } from "../routes/schemas.js";

export async function buyerQuotes(req, res) {
    res.json(await listPage(req.validatedQuery, (options) => listQuotesForBuyer(req.user.id, options)));
}

export async function adminQuotes(req, res) {
    res.json(await listPage(req.validatedQuery, (options) => listQuotesForAllocation({ ...options, status: req.validatedQuery.status })));
}

export async function draftQuote(req, res) {
    res.status(201).json({ data: await createQuote({ ...req.validatedBody, userId: req.user.id }) });
}

export async function buyerQuote(req, res) {
    const quote = await findBuyerQuote({ userId: req.user.id, quoteId: req.validatedParams.id });
    if (!quote) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy yêu cầu.");
    res.set("Cache-Control", "private, no-store").json({ data: quote });
}

export async function sendDraft(req, res) {
    res.json({ data: await sendQuote({ userId: req.user.id, quoteId: req.validatedParams.id }) });
}

export async function submitDispatch(req, res) {
    res.json({ data: await requestDispatch({ userId: req.user.id, quoteId: req.validatedParams.id }) });
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
    res.json(await listPage(req.validatedQuery, (options) => listArtisanWork(req.user.id, { ...options, view: req.validatedQuery.view })));
}

export async function artisanQuote(req, res) {
    const quote = await getArtisanQuote(req.user.id, req.validatedParams.id);
    if (!quote) throw new ApiError(404, "NOT_FOUND", "Yêu cầu đã đóng hoặc không được gửi đến xưởng của bạn.");
    res.json({ data: quote });
}

export async function artisanAssignments(req, res) {
    res.json(await listPage(req.validatedQuery, (options) => listArtisanWork(req.user.id, options, true)));
}
