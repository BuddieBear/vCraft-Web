import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { app } from "../../src/app.js";
import { prisma } from "../../src/database/prisma.js";
import { biddingPagePath } from "../../../frontend/src/site-paths.js";
import { assertIsolatedTestDatabase } from "../test-env.js";

test("typed quotes snapshot matching workshops and preserve explicit routing", async () => {
    assertIsolatedTestDatabase();
    const server = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    async function request(path, { method = "GET", body, token } = {}) {
        const headers = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        if (body !== undefined) headers["Content-Type"] = "application/json";
        const response = await fetch(base + "/api" + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
        return { status: response.status, headers: response.headers, json: response.status === 204 ? null : await response.json() };
    }
    const login = async (email, password = process.env.SEED_DEMO_PASSWORD) => {
        const result = await request("/auth/login", { method: "POST", body: { email, password } });
        assert.equal(result.status, 200);
        return result.json.data.accessToken;
    };
    const runId = randomBytes(6).toString("hex");
    const buyerUser = await prisma.user.findUniqueOrThrow({ where: { email: "buyer@nhaxa.example" }, select: { id: true, passwordHash: true } });
    const createWorkshop = async (name, { isActive = true, isSuspended = false, verificationStatus = "APPROVED" } = {}) => {
        const user = await prisma.user.create({ data: {
            email: `${name}-${runId}@example.test`, passwordHash: buyerUser.passwordHash, fullName: name, role: "ARTISAN", isActive,
        } });
        const profile = await prisma.artisanProfile.create({ data: {
            userId: user.id, workshopName: `${name} ${runId}`, address: "Test", latitude: 20, longitude: 106, isSuspended, verificationStatus,
        } });
        return { user, profile };
    };
    const createProduct = (artisanId, name, weaveType, isPublished = true) => prisma.product.create({ data: {
        artisanId, name, slug: `issue16-${name}-${runId}`, weaveType, isPublished, price: 20,
    } });
    const recipients = async (quoteId) => (await prisma.quoteRecipient.findMany({
        where: { quotationRequestId: quoteId }, select: { artisanId: true },
    })).map(({ artisanId }) => artisanId).sort();

    try {
        const buyer = await login("buyer@nhaxa.example");
        const admin = await login("admin@nhaxa.example");
        const quoteBody = {
            title: "Tìm xưởng dệt twill", specifications: "Test", targetQuantity: 2,
            deadline: "2099-01-01", preferredWeaveType: "LUA_TWILL",
        };
        const beforeQuotes = await prisma.quotationRequest.count({ where: { buyerId: buyerUser.id } });
        const beforeNotices = await prisma.notification.count({ where: { type: "QUOTE_REQUEST" } });
        const noMatch = await request("/wholesale/quotes", { method: "POST", token: buyer, body: { ...quoteBody, submitMode: "SEND" } });
        assert.equal(noMatch.status, 409);
        assert.equal(noMatch.json.error.code, "NO_MATCHING_WORKSHOPS");
        assert.match(noMatch.json.error.message, /chọn xưởng cụ thể|Ban quản lý/i);
        assert.equal(await prisma.quotationRequest.count({ where: { buyerId: buyerUser.id } }), beforeQuotes);
        assert.equal(await prisma.notification.count({ where: { type: "QUOTE_REQUEST" } }), beforeNotices);

        const noMatchDraft = await request("/wholesale/quotes", { method: "POST", token: buyer, body: { ...quoteBody, submitMode: "DRAFT" } });
        assert.equal(noMatchDraft.status, 201);
        assert.equal((await request(`/wholesale/quotes/${noMatchDraft.json.data.id}/send`, { method: "POST", token: buyer })).json.error.code, "NO_MATCHING_WORKSHOPS");
        assert.equal((await request(`/wholesale/quotes/${noMatchDraft.json.data.id}`, { token: buyer })).json.data.status, "DRAFT");
        assert.deepEqual(await recipients(noMatchDraft.json.data.id), []);
        assert.equal(await prisma.notification.count({ where: { type: "QUOTE_REQUEST" } }), beforeNotices);

        const matching = await createWorkshop("matching");
        const unmatched = await createWorkshop("unmatched");
        const unpublished = await createWorkshop("unpublished");
        const suspended = await createWorkshop("suspended", { isSuspended: true });
        const pending = await createWorkshop("pending", { verificationStatus: "PENDING" });
        const inactive = await createWorkshop("inactive", { isActive: false });
        const matchingProduct = await createProduct(matching.profile.id, "matching", "LUA_TWILL");
        await createProduct(unmatched.profile.id, "unmatched", "LUA_VAN");
        await createProduct(unpublished.profile.id, "unpublished", "LUA_TWILL", false);
        await createProduct(suspended.profile.id, "suspended", "LUA_TWILL");
        await createProduct(pending.profile.id, "pending", "LUA_TWILL");
        await createProduct(inactive.profile.id, "inactive", "LUA_TWILL");
        const matchingToken = await login(matching.user.email);
        const unmatchedToken = await login(unmatched.user.email);

        const sent = await request("/wholesale/quotes", { method: "POST", token: buyer, body: { ...quoteBody, submitMode: "SEND" } });
        assert.equal(sent.status, 201);
        const sentId = sent.json.data.id;
        assert.deepEqual(await recipients(sentId), [matching.profile.id]);
        assert.equal(await prisma.notification.count({ where: { type: "QUOTE_REQUEST", linkUrl: biddingPagePath(sentId) } }), 1);
        assert.equal(await prisma.notification.count({ where: { userId: matching.user.id, type: "QUOTE_REQUEST", linkUrl: biddingPagePath(sentId) } }), 1);
        assert.equal(await prisma.notification.count({ where: { userId: unmatched.user.id, type: "QUOTE_REQUEST", linkUrl: biddingPagePath(sentId) } }), 0);

        await prisma.product.update({ where: { id: matchingProduct.id }, data: { isPublished: false } });
        const open = await request("/wholesale/open-quotes", { token: matchingToken });
        const closedToUnmatched = await request("/wholesale/open-quotes", { token: unmatchedToken });
        assert.ok(open.json.data.some(({ id }) => id === sentId));
        assert.ok(!closedToUnmatched.json.data.some(({ id }) => id === sentId));
        assert.equal((await request(`/wholesale/open-quotes/${sentId}`, { token: matchingToken })).status, 200);
        assert.equal((await request(`/wholesale/open-quotes/${sentId}`, { token: unmatchedToken })).status, 404);
        assert.equal((await request(`/wholesale/quotes/${sentId}/bids`, { method: "POST", token: matchingToken, body: { proposedPrice: 100, proposedCompletionDays: 2 } })).status, 201);
        assert.equal((await request(`/wholesale/quotes/${sentId}/bids`, { method: "POST", token: unmatchedToken, body: { proposedPrice: 100, proposedCompletionDays: 2 } })).status, 409);
        await prisma.product.update({ where: { id: matchingProduct.id }, data: { isPublished: true } });

        const draft = await request("/wholesale/quotes", { method: "POST", token: buyer, body: { ...quoteBody, submitMode: "DRAFT" } });
        assert.equal(draft.status, 201);
        assert.deepEqual(await recipients(draft.json.data.id), []);
        assert.equal((await request(`/wholesale/quotes/${draft.json.data.id}/send`, { method: "POST", token: buyer })).json.data.status, "SENT_TO_ARTISANS");
        assert.deepEqual(await recipients(draft.json.data.id), [matching.profile.id]);
        const draftLink = biddingPagePath(draft.json.data.id);
        assert.equal(await prisma.notification.count({ where: { type: "QUOTE_REQUEST", linkUrl: draftLink } }), 1);
        assert.equal(await prisma.notification.count({ where: { userId: matching.user.id, type: "QUOTE_REQUEST", linkUrl: draftLink } }), 1);

        const explicit = await request("/wholesale/quotes", { method: "POST", token: buyer, body: {
            ...quoteBody, artisanIds: [unmatched.profile.id], submitMode: "SEND",
        } });
        assert.equal(explicit.status, 201);
        assert.deepEqual(await recipients(explicit.json.data.id), [unmatched.profile.id]);
        assert.equal(await prisma.notification.count({ where: { userId: unmatched.user.id, type: "QUOTE_REQUEST", linkUrl: biddingPagePath(explicit.json.data.id) } }), 1);
        const direct = await request("/wholesale/quotes", { method: "POST", token: buyer, body: {
            ...quoteBody, targetArtisanId: unmatched.profile.id, submitMode: "SEND",
        } });
        assert.equal(direct.status, 201);
        assert.equal(direct.json.data.targetArtisanId, unmatched.profile.id);
        assert.deepEqual(await recipients(direct.json.data.id), []);
        assert.equal(await prisma.notification.count({ where: { userId: unmatched.user.id, type: "QUOTE_REQUEST", linkUrl: biddingPagePath(direct.json.data.id) } }), 1);

        const legacy = await request("/wholesale/quotes", { method: "POST", token: buyer, body: {
            title: "Yêu cầu không loại lụa", specifications: "Test", targetQuantity: 1, deadline: "2099-01-01", submitMode: "SEND",
        } });
        assert.equal(legacy.status, 201);
        assert.deepEqual(await recipients(legacy.json.data.id), []);
        assert.equal(await prisma.notification.count({ where: { userId: unmatched.user.id, type: "QUOTE_REQUEST", linkUrl: biddingPagePath(legacy.json.data.id) } }), 1);

        const dispatchDraft = await request("/wholesale/quotes", { method: "POST", token: buyer, body: { ...quoteBody, submitMode: "DISPATCH" } });
        assert.equal(dispatchDraft.json.data.status, "PENDING_DISPATCH");
        assert.equal((await request(`/wholesale/quotes/${dispatchDraft.json.data.id}/dispatch`, {
            method: "POST", token: admin, body: { artisanIds: [unmatched.profile.id] },
        })).status, 200);
        assert.deepEqual(await recipients(dispatchDraft.json.data.id), [unmatched.profile.id]);
        assert.equal(await prisma.notification.count({ where: { userId: unmatched.user.id, type: "QUOTE_REQUEST", linkUrl: biddingPagePath(dispatchDraft.json.data.id) } }), 1);
    } finally {
        server.closeAllConnections?.();
        await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
        await prisma.$disconnect();
    }
});
