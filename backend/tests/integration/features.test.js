import assert from "node:assert/strict";
import test from "node:test";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { app } from "../../src/app.js";
import { prisma } from "../../src/database/prisma.js";
import { passwordResetDelivery } from "../../src/services/password-reset-mail.js";
import { quoteBudgetError, vietnamToday } from "../../../frontend/src/data/input-values.js";
import { biddingPagePath, newsArticlePath, quoteJournalPath, quotePagePath, referenceWorkshopPath, sitePaths } from "../../../frontend/src/site-paths.js";
import { assertIsolatedTestDatabase } from "../test-env.js";

test("artisan, production, administration, media and retail APIs", async () => {
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
    let uploaded;
    try {
        assert.equal(vietnamToday(new Date("2026-11-18T17:00:00Z")), "2026-11-19");
        const oldLogin = await fetch(base + "/login.html?returnTo=%2Fdanh-muc", { redirect: "manual" });
        assert.equal(oldLogin.status, 302);
        assert.equal(oldLogin.headers.get("location"), "/dang-nhap?returnTo=%2Fdanh-muc");
        assert.equal((await fetch(base + "/dang-nhap")).status, 200);
        const catalog = await fetch(base + "/danh-muc");
        assert.match(catalog.headers.get("content-security-policy"), /script-src 'self'/);
        assert.match(catalog.headers.get("content-security-policy"), /worker-src 'self' blob:/);
        assert.equal(catalog.headers.get("x-content-type-options"), "nosniff");
        const cssPath = base + "/src/styles/main.css";
        const encoded = await fetch(cssPath, { headers: { "Accept-Encoding": "br" } });
        const identity = await fetch(cssPath, { headers: { "Accept-Encoding": "identity" } });
        assert.equal(encoded.headers.get("content-encoding"), "br");
        assert.match(encoded.headers.get("vary"), /Accept-Encoding/i);
        assert.equal(identity.headers.get("content-encoding"), null);
        assert.equal(await encoded.text(), await identity.text());
        const cached = await fetch(cssPath, { cache: "force-cache", headers: {
            "Accept-Encoding": "br", "If-None-Match": encoded.headers.get("etag"),
        } });
        assert.equal(cached.status, 304);
        assert.match(cached.headers.get("vary"), /Accept-Encoding/i);
        assert.equal(cached.headers.get("content-encoding"), null);
        assert.equal(await cached.text(), "");
        const range = await fetch(cssPath, { headers: { Range: "bytes=0-99", "Accept-Encoding": "gzip" } });
        assert.equal(range.status, 206);
        assert.equal(range.headers.get("content-encoding"), null);
        assert.equal((await range.arrayBuffer()).byteLength, 100);
        const sample = await request("/artisans/reference/products/lua-hoa-sen-shd21");
        assert.equal(sample.json.data.workshopSlug, "nhaxasilk");
        assert.equal((await fetch(base + "/mau-lua/lua-hoa-sen-shd21")).status, 200);
        assert.equal((await fetch(base + "/mau-lua/mau-khong-ton-tai")).status, 404);
        const references = (await request("/artisans/reference")).json.data;
        for (const workshop of references) {
            assert.equal((await fetch(base + referenceWorkshopPath(workshop.slug))).status, 200);
            assert.ok(workshop.location.source);
        }
        assert.equal((await fetch(base + referenceWorkshopPath("khong-ton-tai"))).status, 404);
        assert.equal(references.find(workshop => workshop.slug === "son-thuy-silk").location.areaPoint, true);
        const admin = await login("admin@nhaxa.example");
        const product = await prisma.product.findUniqueOrThrow({ where: { slug: "hong-dat" }, include: { artisan: { include: { user: true } } } });
        const storefrontSample = await request("/products/by-slug/hong-dat?storefront=true");
        assert.equal(storefrontSample.status, 404);
        assert.equal((await request("/products/by-slug/hong-dat")).status, 200);
        const samplePage = await fetch(base + "/san-pham/hong-dat", { redirect: "manual" });
        assert.equal(samplePage.status, 302);
        assert.equal(samplePage.headers.get("location"), "/trace/product/hong-dat");
        assert.equal((await fetch(base + "/trace/product/hong-dat")).status, 200);
        const artisan = await login(product.artisan.user.email);
        const buyer = await login("buyer@nhaxa.example");
        const invalidQuote = await request("/wholesale/quotes", { method: "POST", token: buyer, body: { title: " ", specifications: "Tơ", targetQuantity: 5, deadline: "2099-01-01" } });
        assert.equal(invalidQuote.status, 400);
        assert.equal(invalidQuote.json.error.fields[0].name, "title");
        const pastQuote = await request("/wholesale/quotes", { method: "POST", token: buyer, body: { title: "Đặt lụa", specifications: "Tơ", targetQuantity: 5, deadline: "2000-01-01" } });
        assert.equal(pastQuote.status, 400);
        assert.equal(pastQuote.json.error.fields[0].name, "deadline");
        for (const maxBudget of [0, "0", -1, "1e3", "1.001", "1000000000000"]) {
            const quote = await request("/wholesale/quotes", { method: "POST", token: buyer, body: { title: "Đặt lụa", specifications: "Tơ", targetQuantity: 5, deadline: "2099-01-01", maxBudget } });
            assert.equal(quote.status, 400);
            assert.deepEqual(quote.json.error.fields, [{ name: "maxBudget", message: quoteBudgetError }]);
        }
        const invalidPhone = await request("/retail/checkout", { method: "POST", token: buyer, body: { recipientName: "Test", shippingAddress: "Test", recipientPhone: "abc" } });
        assert.equal(invalidPhone.status, 400);
        assert.equal(invalidPhone.json.error.fields[0].name, "recipientPhone");
        const me = await request("/artisans/me", { token: artisan });
        assert.equal(me.status, 200);
        assert.equal((await request("/artisans/me", { method: "PATCH", token: artisan, body: { familyHistory: "Lịch sử kiểm thử" } })).status, 200);
        assert.equal((await request("/artisans/me", { method: "PATCH", token: buyer, body: { familyHistory: "Sai quyền" } })).status, 403);
        const image = await sharp({ create: { width: 8, height: 8, channels: 3, background: "red" } }).png().toBuffer();
        const form = new FormData(); form.append("images", new Blob([image], { type: "image/png" }), "test.png");
        const upload = await fetch(base + "/api/media/images", { method: "POST", headers: { Authorization: `Bearer ${artisan}` }, body: form });
        assert.equal(upload.status, 201);
        uploaded = (await upload.json()).data.urls[0];
        assert.match(uploaded, /^\/uploads\/[a-f0-9-]+\.webp$/);
        assert.equal((await fetch(base + uploaded)).status, 200);
        const malformed = await fetch(base + "/api/media/images", { method: "POST", headers: { Authorization: `Bearer ${artisan}`, "Content-Type": "multipart/form-data" }, body: "invalid multipart" });
        assert.equal(malformed.status, 400);
        const invalidForm = new FormData(); invalidForm.append("images", new Blob(["not-an-image"], { type: "image/png" }), "fake.png");
        assert.equal((await fetch(base + "/api/media/images", { method: "POST", headers: { Authorization: `Bearer ${artisan}` }, body: invalidForm })).status, 400);
        const certificate = await request("/artisans/me/certificates", { method: "POST", token: artisan, body: { title: "Certificate", issuingAuthority: "Test", issuedYear: 2020, certificateImageUrl: uploaded } });
        assert.equal(certificate.status, 201);
        assert.equal((await request(`/artisans/me/certificates/${certificate.json.data.id}`, { method: "DELETE", token: artisan })).status, 204);
        const newArtisan = await request("/admin/artisans", { method: "POST", token: admin, body: { email: "feature-artisan@example.test", username: "feature_artisan", password: "Strong-test-password", fullName: "New Artisan", workshopName: "New Workshop", address: "Test", latitude: 20, longitude: 106 } });
        assert.equal(newArtisan.status, 201);
        assert.equal(newArtisan.json.data.username, "feature_artisan");
        const otherLogin = await request("/auth/login", { method: "POST", body: { identifier: "FEATURE_ARTISAN", password: "Strong-test-password" } });
        assert.equal(otherLogin.status, 200);
        const other = otherLogin.json.data.accessToken;
        const workshopId = newArtisan.json.data.artisanProfile.id;
        const proofPath = "/admin/artisans/" + workshopId;
        assert.equal(newArtisan.json.data.artisanProfile.isOpenForVisitors, false);
        assert.equal((await request("/artisans/" + workshopId)).status, 404);
        assert.equal((await request(proofPath)).status, 401);
        assert.equal((await request(proofPath, { token: other })).status, 403);
        assert.equal((await request("/artisans/me", { method: "PATCH", token: other, body: {
            experienceYears: 10, familyHistory: "Workshop history", galleryImages: [uploaded], openingHours: "",
        } })).status, 200);
        assert.equal((await request("/artisans/me/certificates", { method: "POST", token: other, body: {
            title: "Pending workshop certificate", issuedYear: 2025, issuingAuthority: "Test", certificateImageUrl: uploaded,
        } })).status, 201);
        const proof = await request(proofPath, { token: admin });
        assert.equal(proof.status, 200);
        assert.match(proof.headers.get("cache-control"), /no-store/);
        assert.equal(proof.json.data.verificationStatus, "PENDING");
        assert.equal(proof.json.data.familyHistory, "Workshop history");
        assert.equal(proof.json.data.galleryImages[0], uploaded);
        assert.equal(proof.json.data.certificates[0].title, "Pending workshop certificate");
        assert.equal(proof.json.data.user.username, "feature_artisan");
        assert.equal(proof.json.data.user.passwordHash, undefined);
        const suspensionPath = `/admin/artisans/${workshopId}/suspension`;
        const suspension = (isSuspended, token = admin) => request(suspensionPath, { method: "PATCH", token, body: { isSuspended } });
        assert.equal((await suspension(true)).status, 409);
        const newProduct = { name: "Test silk", slug: "feature-test-silk", pricingMode: "FIXED", price: "20.00", saleUnit: "PIECE", stockQuantity: 5, mediaUrls: [uploaded] };
        assert.equal((await request("/products", { method: "POST", token: other, body: newProduct })).status, 403);
        assert.equal((await request("/wholesale/open-quotes", { token: other })).status, 403);
        assert.equal((await request(`/admin/artisans/${newArtisan.json.data.artisanProfile.id}/verification`, { method: "PATCH", token: admin, body: { status: "APPROVED" } })).status, 204);
        const direct = await request("/wholesale/quotes", { method: "POST", token: buyer, body: { title: "Gửi riêng", specifications: "Test", targetQuantity: 1, deadline: "2099-01-01", targetArtisanId: newArtisan.json.data.artisanProfile.id, maxBudget: "2500000.25" } });
        assert.equal(direct.status, 201);
        assert.equal(direct.json.data.maxBudget, "2500000.25");
        await assert.rejects(prisma.artisanProfile.delete({ where: { id: newArtisan.json.data.artisanProfile.id } }), { code: "P2003" });
        const routedQuote = await request("/wholesale/quotes", { method: "POST", token: buyer, body: { title: "Gửi nhóm", specifications: "Test", targetQuantity: 5, deadline: "2099-01-01" } });
        assert.equal(routedQuote.status, 201);
        assert.equal(routedQuote.json.data.maxBudget, null);
        const quoteId = routedQuote.json.data.id;
        const firstPage = await request("/wholesale/quotes?page=1&limit=1", { token: buyer });
        const secondPage = await request("/wholesale/quotes?page=2&limit=1", { token: buyer });
        assert.deepEqual(firstPage.json.pagination, { page: 1, limit: 1, hasNext: true });
        assert.equal(firstPage.json.data[0].id, quoteId);
        assert.equal(secondPage.json.data[0].id, direct.json.data.id);
        assert.equal(secondPage.json.pagination.hasNext, false);
        const webQuote = await fetch(base + quotePagePath(quoteId));
        assert.equal(webQuote.status, 200);
        assert.ok(!(await webQuote.text()).includes(routedQuote.json.data.title));
        assert.equal((await fetch(base + quotePagePath("invalid"))).status, 404);
        assert.equal((await fetch(base + sitePaths.workshop)).status, 200);
        assert.equal((await fetch(base + biddingPagePath(quoteId))).status, 200);
        assert.equal((await fetch(base + biddingPagePath("invalid"))).status, 404);
        const otherBuyer = { email: "quote-viewer@example.test", username: "quote_viewer", fullName: "Other buyer", password: process.env.SEED_DEMO_PASSWORD };
        assert.equal((await request("/auth/register", { method: "POST", body: otherBuyer })).status, 201);
        const viewerLogin = await request("/auth/login", { method: "POST", body: { username: "QUOTE_VIEWER", password: otherBuyer.password } });
        assert.equal(viewerLogin.status, 200);
        const viewer = viewerLogin.json.data.accessToken;
        const privateQuote = "/wholesale/quotes/" + quoteId;
        assert.equal((await request(privateQuote)).status, 401);
        assert.equal((await request(privateQuote, { token: other })).status, 403);
        assert.equal((await request(privateQuote, { token: viewer })).status, 404);
        const ownedQuote = await request(privateQuote, { token: buyer });
        assert.equal(ownedQuote.status, 200);
        assert.equal(ownedQuote.json.data.id, quoteId);
        assert.match(ownedQuote.headers.get("cache-control"), /no-store/);
        const allAdminQuotes = "/wholesale/admin/quotes?status=ALL";
        const dispatch = () => request(privateQuote + "/dispatch", { method: "POST", token: admin, body: { artisanIds: [workshopId] } });
        const handoff = (token) => request(privateQuote + "/request-dispatch", { method: "POST", token });
        assert.ok(!(await request(allAdminQuotes, { token: admin })).json.data.some(item => item.id === quoteId || item.id === direct.json.data.id));
        assert.deepEqual((await request("/wholesale/admin/quotes?status=DRAFT", { token: admin })).json.data, []);
        assert.equal((await dispatch()).status, 409);
        assert.equal((await handoff(admin)).status, 403);
        assert.equal((await handoff(viewer)).status, 409);
        assert.equal((await handoff(buyer)).json.data.status, "PENDING_DISPATCH");
        assert.equal((await handoff(buyer)).status, 409);
        assert.equal((await request(privateQuote + "/send", { method: "POST", token: buyer })).status, 409);
        assert.ok((await request("/wholesale/admin/quotes?status=PENDING_DISPATCH", { token: admin })).json.data.some(item => item.id === quoteId));
        assert.equal((await request("/wholesale/open-quotes/" + quoteId, { token: other })).status, 404);
        assert.equal((await dispatch()).status, 200);
        const othersOpen = await request("/wholesale/open-quotes", { token: artisan });
        assert.equal(othersOpen.json.data.some((item) => item.id === routedQuote.json.data.id), false);
        const invitedOpen = await request("/wholesale/open-quotes", { token: other });
        assert.equal(invitedOpen.json.data.some((item) => item.id === routedQuote.json.data.id), true);
        const invitedDetail = "/wholesale/open-quotes/" + quoteId;
        assert.equal((await request(invitedDetail)).status, 401);
        assert.equal((await request(invitedDetail, { token: buyer })).status, 403);
        assert.equal((await request(invitedDetail, { token: admin })).status, 403);
        assert.equal((await request(invitedDetail, { token: artisan })).status, 404);
        assert.deepEqual((await request(invitedDetail, { token: other })).json.data.bids, []);
        assert.ok((await request("/notifications", { token: other })).json.data.some(item => item.type === "QUOTE_REQUEST" && item.linkUrl === biddingPagePath(quoteId)));
        assert.equal((await request(`/wholesale/quotes/${routedQuote.json.data.id}/bids`, { method: "POST", token: artisan, body: { proposedPrice: 100, proposedCompletionDays: 2 } })).status, 409);
        assert.equal((await request(`/wholesale/quotes/${routedQuote.json.data.id}/bids`, { method: "POST", token: other, body: { proposedPrice: 100, proposedCompletionDays: 2 } })).status, 201);
        const notifications = await request("/notifications", { token: buyer });
        assert.ok(notifications.json.data.some(item => item.type === "BID_RECEIVED" && item.linkUrl === quotePagePath(quoteId)));
        const publicQuote = await request("/wholesale/quotes", { method: "POST", token: buyer, body: { title: "Chào giá mở", specifications: "Lụa satin", preferredWeaveType: "LUA_SATIN", targetQuantity: 10, deadline: "2099-01-01" } });
        const publicId = publicQuote.json.data.id;
        const bidPath = `/wholesale/quotes/${publicId}`;
        const detailsPath = `/wholesale/open-quotes/${publicId}`;
        assert.equal((await request(detailsPath, { token: artisan })).status, 404);
        assert.equal((await request(bidPath + "/send", { method: "POST", token: buyer })).status, 200);
        const offer = { method: "POST", token: artisan, body: { proposedPrice: 500, proposedCompletionDays: 4 } };
        const firstBid = await request(bidPath + "/bids", offer);
        assert.equal(firstBid.status, 201);
        assert.equal((await request(bidPath + "/bids", offer)).status, 409);
        const secondBid = await request(bidPath + "/bids", { ...offer, token: other, body: { ...offer.body, proposedPrice: 600 } });
        assert.equal(secondBid.status, 201);
        const myOffer = await request(detailsPath, { token: artisan });
        assert.deepEqual(myOffer.json.data.bids.map(item => item.id), [firstBid.json.data.id]);
        assert.equal(myOffer.json.data.buyerId, undefined);
        assert.equal((await request(bidPath + "/accept", { method: "POST", token: buyer, body: { bidIds: [firstBid.json.data.id] } })).status, 200);
        assert.equal((await request(detailsPath, { token: artisan })).json.data.bids[0].status, "ACCEPTED");
        assert.equal((await request(detailsPath, { token: other })).json.data.bids[0].status, "REJECTED");
        assert.ok((await request("/wholesale/open-quotes?view=mine", { token: other })).json.data.some(item => item.id === publicId));
        assert.ok(!(await request("/wholesale/open-quotes", { token: artisan })).json.data.some(item => item.id === publicId));
        const created = await request("/products", { method: "POST", token: other, body: newProduct });
        const productTrace = base + "/trace/product/" + newProduct.slug;
        const productQr = base + "/api/traceability/product-guide/" + newProduct.slug + "/qr";
        const traceWithoutBatch = await fetch(productTrace);
        assert.equal(traceWithoutBatch.status, 200);
        assert.match(await traceWithoutBatch.text(), /chưa công bố lô sản xuất/);
        const qr = await fetch(productQr);
        assert.equal(qr.status, 200);
        assert.equal(qr.headers.get("content-type"), "image/png");
        assert.equal(created.status, 201);
        assert.equal((await request("/products/by-slug/feature-test-silk?storefront=true")).status, 200);
        assert.equal((await fetch(base + "/san-pham/feature-test-silk")).status, 200);
        const replacement = { ...newProduct, expectedStockQuantity: 5 };
        assert.equal((await request(`/products/${created.json.data.id}`, { method: "PUT", token: artisan, body: replacement })).status, 404);
        assert.equal((await request(`/products/${created.json.data.id}`, { method: "PUT", token: other, body: replacement })).status, 200);
        assert.equal((await request("/products", { method: "POST", token: other, body: { ...newProduct, slug: "mine" } })).status, 400);
        assert.equal((await request("/products/by-slug/feature-test-silk")).json.data.stockQuantity, 5);
        assert.ok((await request("/products?q=New%20Workshop")).json.data.some((item) => item.id === created.json.data.id));
        assert.equal((await request("/products?artisanId=" + newArtisan.json.data.artisanProfile.id + "&q=%25")).json.data.length, 0);
        assert.equal((await request("/traceability/batches", { method: "POST", token: other, body: { productId: created.json.data.id, batchCode: "MINE", totalQuantity: 5 } })).status, 400);
        const batch = await request("/traceability/batches", { method: "POST", token: other, body: { productId: created.json.data.id, batchCode: "FEATURE-001", totalQuantity: 5 } });
        assert.equal(batch.status, 201);
        const productBatches = "/traceability/mine?productId=" + created.json.data.id;
        assert.equal((await request(productBatches, { token: other })).json.data[0]._count.logs, 0);
        assert.deepEqual((await request(productBatches, { token: artisan })).json.data, []);
        assert.equal((await request(`/traceability/batches/${batch.json.data.id}/complete`, { method: "POST", token: other })).status, 409);
        const stages = ["UOM_TO", "MAC_CUI", "DET_LUA", "NHUOM_MAU", "CAN_LANG"];
        for (const stage of stages) {
            const log = await request(`/traceability/batches/${batch.json.data.id}/logs`, { method: "POST", token: other, body: { stage, stageTitle: stage, description: "Example" } });
            assert.equal(log.status, 201);
            if (stage === "UOM_TO") {
                const change = { stageTitle: stage, description: "A < B & C", evidenceImageUrls: [uploaded] };
                assert.equal((await request(`/traceability/batches/${batch.json.data.id}/logs/${log.json.data.id}`, { method: "PUT", token: artisan, body: change })).status, 404);
                assert.equal((await request(`/traceability/batches/${batch.json.data.id}/logs/${log.json.data.id}`, { method: "PUT", token: other, body: change })).status, 200);
            }
        }
        assert.equal((await request(`/traceability/batches/${batch.json.data.id}/complete`, { method: "POST", token: other })).status, 200);
        assert.equal((await request("/traceability/FEATURE-001")).json.data.logs.length, 5);
        assert.match(await (await fetch(productTrace)).text(), /href="\/trace\/FEATURE-001"/);
        assert.equal((await request("/traceability/by-code/FEATURE-001")).json.data.logs.length, 5);
        assert.equal((await fetch(base + "/api/traceability/FEATURE-001/qr")).headers.get("content-type"), "image/png");
        const landing = await fetch(base + "/trace/FEATURE-001");
        assert.equal(landing.status, 200);
        assert.match(landing.headers.get("content-type"), /^text\/html/);
        assert.match(landing.headers.get("content-security-policy"), /default-src 'none'/);
        const landingHtml = await landing.text();
        assert.match(landingHtml, /A &lt; B &amp; C/);
        assert.ok(landingHtml.includes(uploaded));
        const stagesForProduct = ["Cắt vải", "May viền"];
        const editProduct = body => request("/products/" + created.json.data.id, { method: "PUT", token: other, body: { ...replacement, ...body } });
        assert.equal((await editProduct({ productionSteps: ["May viền", "  MAY   VIỀN  "] })).status, 400);
        assert.equal((await editProduct({ productionSteps: stagesForProduct })).status, 200);
        const newBatch = await request("/traceability/batches", { method: "POST", token: other, body: {
            productId: created.json.data.id, batchCode: "FEATURE-CUSTOM", totalQuantity: 2,
        } });
        assert.equal(newBatch.status, 201);
        assert.deepEqual(newBatch.json.data.productionSteps, stagesForProduct);
        assert.equal((await editProduct({ productionSteps: ["Chuẩn bị", "May", "Đóng gói"] })).status, 200);
        const customPath = "/traceability/batches/" + newBatch.json.data.id;
        const recordStep = (stepOrder, stageTitle) => request(customPath + "/logs", { method: "POST", token: other, body: {
            stepOrder, stageTitle, description: "Ghi chú", loggedOn: "2025-11-21",
        } });
        assert.equal((await recordStep(2, "May viền")).status, 409);
        const initial = await Promise.all([recordStep(1, "Cắt vải"), recordStep(1, "Cắt vải")]);
        assert.deepEqual(initial.map(result => result.status).sort(), [201, 409]);
        const firstLog = initial.find(result => result.status === 201).json.data;
        const editLog = (token, loggedOn) => request(customPath + "/logs/" + firstLog.id, { method: "PUT", token, body: {
            stageTitle: "Cắt theo rập", description: "Đã kiểm tra kích thước", loggedOn, evidenceImageUrls: [uploaded],
        } });
        assert.equal((await editLog(artisan, "2025-11-20")).status, 404);
        assert.equal((await editLog(other, "2099-11-20")).status, 400);
        assert.equal((await editLog(other, "2025-11-20")).status, 200);
        assert.equal((await request(customPath + "/complete", { method: "POST", token: other })).status, 409);
        assert.equal((await recordStep(2, "May viền")).status, 201);
        assert.equal((await request(customPath + "/complete", { method: "POST", token: other })).status, 200);
        assert.equal((await editLog(other, "2025-11-20")).status, 404);
        const timeline = (await request("/traceability/FEATURE-CUSTOM")).json.data;
        assert.deepEqual(timeline.productionSteps, stagesForProduct);
        assert.deepEqual(timeline.logs.map(log => log.stageTitle), ["Cắt theo rập", "May viền"]);
        assert.equal(vietnamToday(new Date(timeline.logs[0].loggedAt)), "2025-11-20");
        assert.deepEqual(timeline.logs[0].evidenceImageUrls, [uploaded]);
        // Later wholesale checks exercise the original five-step API.
        assert.equal((await editProduct({ productionSteps: ["Ươm tơ", "Mắc cửi", "Dệt lụa", "Nhuộm màu", "Cán láng"] })).status, 200);
        const outsider = await login("nep-van@nhaxa.example");
        const selectedQuote = await request("/wholesale/quotes", {
            method: "POST", token: buyer,
            body: { title: "Lụa theo mẫu", specifications: "Màu xanh\nThêu logo", targetQuantity: 4, deadline: "2099-01-01", artisanIds: [product.artisanId, workshopId] },
        });
        assert.equal(selectedQuote.status, 201);
        const selectedId = selectedQuote.json.data.id;
        const selectedPath = "/wholesale/quotes/" + selectedId;
        const journalPath = selectedPath + "/journal";
        assert.equal((await request(journalPath, { token: buyer })).status, 404);
        assert.equal((await request(selectedPath + "/send", { method: "POST", token: buyer })).json.data.status, "SENT_TO_ARTISANS");
        const invitePath = "/wholesale/open-quotes/" + selectedId;
        for (const token of [artisan, other]) assert.equal((await request(invitePath, { token })).status, 200);
        assert.equal((await request(invitePath, { token: outsider })).status, 404);
        assert.equal((await request(selectedPath + "/bids", { ...offer, token: outsider })).status, 409);
        const selectedBids = [];
        for (const token of [artisan, other]) {
            const bid = await request(selectedPath + "/bids", { ...offer, token });
            assert.equal(bid.status, 201);
            selectedBids.push(bid.json.data.id);
        }
        const accept = (quantity) => request(selectedPath + "/accept", {
            method: "POST", token: buyer,
            body: { bidIds: selectedBids, allocations: selectedBids.map(bidId => ({ bidId, quantity })) },
        });
        assert.equal((await accept(1)).status, 409);
        assert.equal((await request(selectedPath, { token: buyer })).json.data.status, "ARTISANS_BIDDING");
        assert.equal((await accept(2)).json.data.status, "BUYER_ACCEPTED");
        assert.equal((await accept(2)).status, 409);
        assert.equal((await fetch(base + quoteJournalPath(selectedId))).status, 200);
        assert.equal((await fetch(base + quoteJournalPath("invalid"))).status, 404);
        assert.equal((await request(journalPath)).status, 401);
        assert.equal((await request(journalPath, { token: viewer })).status, 404);
        const journal = await request(journalPath, { token: buyer });
        assert.equal(journal.status, 200);
        assert.equal(journal.headers.get("cache-control"), "private, no-store");
        assert.deepEqual(journal.json.data.assignments.map(({ allocatedQuantity, batches }) => [allocatedQuantity, batches.length]), [[2, 0], [2, 0]]);
        for (const [index, [token, workshopProduct]] of [[artisan, product], [other, created.json.data]].entries()) {
            const assignment = await prisma.orderAssignment.findUniqueOrThrow({ where: { bidId: selectedBids[index] } });
            const assignmentPath = "/wholesale/assignments/" + assignment.id;
            const advance = status => request(assignmentPath, { method: "PATCH", token, body: { status } });
            const batchCode = "JOURNAL-00" + (index + 1);
            const createBatch = () => request("/traceability/batches", { method: "POST", token, body: { productId: workshopProduct.id, orderAssignmentId: assignment.id, batchCode, totalQuantity: 2 } });
            assert.equal((await createBatch()).status, 404);
            assert.equal((await advance("IN_PRODUCTION")).status, 200);
            const production = await createBatch();
            assert.equal(production.status, 201);
            const productionPath = "/traceability/batches/" + production.json.data.id;
            const loggedOn = vietnamToday();
            const body = { stage: stages[0], stageTitle: "Chuẩn bị tơ", description: "Tơ đã sẵn sàng", loggedOn, evidenceImageUrls: [uploaded] };
            assert.equal((await request(productionPath + "/logs", { method: "POST", token, body: { ...body, loggedOn: "2099-01-01" } })).status, 400);
            assert.equal((await request(productionPath + "/logs", { method: "POST", token, body })).status, 201);
            const buyerTimeline = await request("/traceability/purchased/" + batchCode, { token: buyer });
            assert.equal(buyerTimeline.status, 200);
            const [update] = buyerTimeline.json.data.logs;
            assert.equal(update.description, body.description);
            assert.deepEqual(update.evidenceImageUrls, [uploaded]);
            assert.equal(vietnamToday(new Date(update.loggedAt)), loggedOn);
            assert.equal((await request("/traceability/purchased/" + batchCode, { token: viewer })).status, 404);
            assert.equal((await request("/traceability/by-code/" + batchCode)).status, 404);
            for (const stage of stages.slice(1)) {
                assert.equal((await request(productionPath + "/logs", { method: "POST", token, body: { ...body, stage } })).status, 201);
            }
            assert.equal((await request(productionPath + "/complete", { method: "POST", token })).status, 200);
            assert.equal((await advance("READY_FOR_DELIVERY")).status, 200);
            assert.equal((await advance("COMPLETED")).status, 200);
        }
        const finishedJournal = (await request(journalPath, { token: buyer })).json.data;
        assert.equal(finishedJournal.status, "DELIVERED");
        assert.ok(finishedJournal.assignments.every(({ batches }) => batches.length === 1 && batches[0].status === "COMPLETED"));
        const deliveredDetails = (await request(selectedPath, { token: buyer })).json.data;
        assert.ok(deliveredDetails.assignments.every(({ artisan, batches }) => artisan.workshopName && batches[0].product.name));
        const unavailabilityDraft = await request("/wholesale/quotes", {
            method: "POST", token: buyer,
            body: { title: "Thay xưởng trong bản nháp", specifications: "Tơ", targetQuantity: 2, deadline: "2099-01-01", artisanIds: [workshopId] },
        });
        assert.equal(unavailabilityDraft.status, 201);
        const recoveryPath = "/wholesale/quotes/" + unavailabilityDraft.json.data.id;
        const editWorkshops = (token, artisanIds) => request(recoveryPath + "/workshops", { method: "PATCH", token, body: { artisanIds } });
        const extraOpen = await request("/wholesale/quotes", { method: "POST", token: buyer, body: { title: "Cơ hội thử đình chỉ", specifications: "Tơ", targetQuantity: 3, deadline: "2099-01-01" } });
        const extraPath = "/wholesale/quotes/" + extraOpen.json.data.id;
        assert.equal((await request(extraPath + "/send", { method: "POST", token: buyer })).status, 200);
        const putCart = (quantity) => request("/retail/cart/" + created.json.data.id, { method: "PUT", token: buyer, body: { quantity } });
        assert.equal((await putCart(1)).status, 200);
        assert.equal((await suspension(true, other)).status, 403);
        assert.equal((await suspension(true)).status, 204);
        assert.equal((await suspension(true)).status, 409);
        assert.equal((await request("/auth/me", { token: other })).json.data.artisanProfile.isSuspended, true);
        const blocked = await request(recoveryPath + "/send", { method: "POST", token: buyer });
        assert.equal(blocked.json.error.code, "ARTISAN_UNAVAILABLE");
        assert.equal((await editWorkshops(viewer, [product.artisanId])).status, 409);
        assert.equal((await editWorkshops(buyer, [workshopId])).json.error.code, "ARTISAN_UNAVAILABLE");
        assert.equal((await editWorkshops(buyer, [product.artisanId])).status, 204);
        assert.deepEqual((await request(recoveryPath, { token: buyer })).json.data.recipients.map(({ artisanId }) => artisanId), [product.artisanId]);
        assert.equal((await request(recoveryPath + "/send", { method: "POST", token: buyer })).json.data.status, "SENT_TO_ARTISANS");
        assert.equal((await editWorkshops(buyer, [product.artisanId])).status, 409);
        assert.ok((await request("/admin/artisans?status=SUSPENDED", { token: admin })).json.data.some(item => item.id === workshopId));
        assert.deepEqual((await request("/wholesale/open-quotes", { token: other })).json.data, []);
        assert.equal((await request("/wholesale/open-quotes/" + extraOpen.json.data.id, { token: other })).status, 404);
        assert.equal((await request(extraPath + "/bids", { ...offer, token: other })).status, 409);
        assert.ok((await request("/wholesale/open-quotes?view=mine", { token: other })).json.data.some(item => item.id === publicId));
        assert.equal((await request(detailsPath, { token: other })).json.data.bids[0].status, "REJECTED");
        assert.equal((await request("/products", { method: "POST", token: other, body: { ...newProduct, slug: "suspended-workshop-product" } })).status, 403);
        assert.equal((await request(`/products/${created.json.data.id}`, { method: "PUT", token: other, body: replacement })).status, 404);
        assert.equal((await request("/products/by-slug/feature-test-silk?storefront=true")).status, 404);
        assert.ok(!(await request("/products?q=Test%20silk")).json.data.some(item => item.id === created.json.data.id));
        assert.equal((await request(`/artisans/${workshopId}?storefront=true`)).status, 404);
        assert.equal((await request("/products/by-slug/" + product.slug, { token: other })).status, 200);
        assert.equal((await fetch(base + "/trace/FEATURE-001")).status, 200);
        assert.equal((await request("/retail/cart", { token: buyer })).json.data[0].product.isAvailable, false);
        assert.equal((await putCart(2)).status, 409);
        assert.equal((await request("/retail/checkout", { method: "POST", token: buyer, body: { recipientName: "Buyer", recipientPhone: "0901234567", shippingAddress: "Test" } })).status, 409);
        assert.equal((await suspension(false)).status, 204);
        assert.equal((await request("/products/by-slug/feature-test-silk?storefront=true")).status, 200);
        assert.equal((await request(extraPath + "/bids", { ...offer, token: other })).status, 201);
        assert.equal((await request("/retail/cart", { token: buyer })).json.data[0].product.isAvailable, true);
        assert.equal((await putCart(0)).status, 200);
        const article = await request("/news", { method: "POST", token: admin, body: { title: "Test news", slug: "feature-test-news", category: "POLICY_SUPPORT", content: "Test" } });
        assert.equal(article.status, 201);
        assert.equal((await request("/news/feature-test-news")).status, 200);
        assert.equal((await fetch(base + newsArticlePath("feature-test-news"))).status, 200);
        const scheduled = await request("/news", { method: "POST", token: admin, body: {
            title: "Scheduled news", slug: "feature-scheduled-news", category: "POLICY_SUPPORT", content: "Test",
            publishedAt: new Date(Date.now() + 86400000).toISOString(),
        } });
        assert.equal(scheduled.status, 201);
        assert.equal((await fetch(base + newsArticlePath("feature-scheduled-news"))).status, 404);
        assert.equal((await request(`/news/${article.json.data.id}`, { method: "DELETE", token: buyer })).status, 403);
        assert.equal((await request(`/news/${article.json.data.id}`, { method: "DELETE", token: admin })).status, 204);
        assert.equal((await fetch(base + newsArticlePath("feature-test-news"))).status, 404);
        assert.equal((await request(`/retail/cart/${product.id}`, { method: "PUT", token: buyer, body: { quantity: 1 } })).status, 200);
        const online = await request("/retail/checkout", { method: "POST", token: buyer, body: { recipientName: "Buyer", recipientPhone: "0901234567", shippingAddress: "Test", paymentMethod: "VNPAY" } });
        assert.equal(online.status, 422);
        assert.equal(online.json.error.code, "PAYMENT_METHOD_UNAVAILABLE");
        const order = await request("/retail/checkout", { method: "POST", token: buyer, body: { recipientName: "Buyer", recipientPhone: "0901234567", shippingAddress: "Test" } });
        assert.equal(order.status, 201);
        const advance = (status, details = {}) => request(`/retail/orders/${order.json.data.id}/status`, { method: "PATCH", token: artisan, body: { status, ...details } });
        assert.equal((await advance("CONFIRMED", { paymentCollected: true })).status, 409);
        assert.equal((await advance("CONFIRMED")).status, 200);
        assert.equal((await advance("SHIPPING")).status, 200);
        assert.equal((await advance("DELIVERED")).status, 409);
        const delivered = await advance("DELIVERED", { paymentCollected: true });
        assert.equal(delivered.status, 200);
        assert.equal(delivered.json.data.paymentStatus, "PAID");
        const firstStock = (await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stockQuantity;
        assert.equal((await request(`/retail/cart/${product.id}`, { method: "PUT", token: buyer, body: { quantity: 1 } })).status, 200);
        assert.equal((await request(`/retail/cart/${created.json.data.id}`, { method: "PUT", token: buyer, body: { quantity: 1 } })).status, 200);
        const mixed = await request("/retail/checkout", { method: "POST", token: buyer, body: { recipientName: "Buyer", recipientPhone: "0901234567", shippingAddress: "Test" } });
        assert.equal(mixed.status, 201);
        const stale = await request(`/products/${created.json.data.id}`, { method: "PUT", token: other, body: replacement });
        assert.equal(stale.status, 409);
        assert.equal(stale.json.error.code, "STALE_STOCK");
        assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: created.json.data.id } })).stockQuantity, 4);
        assert.equal((await request(`/retail/orders/${mixed.json.data.id}/status`, { method: "PATCH", token: artisan, body: { status: "CONFIRMED" } })).status, 404);
        assert.equal((await request(`/retail/orders/${mixed.json.data.id}/status`, { method: "PATCH", token: admin, body: { status: "CANCELLED" } })).status, 200);
        assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stockQuantity, firstStock);
        assert.equal((await request(`/retail/orders/${mixed.json.data.id}/status`, { method: "PATCH", token: admin, body: { status: "CANCELLED" } })).status, 409);
        assert.equal((await request(`/retail/cart/${product.id}`, { method: "PUT", token: buyer, body: { quantity: 1 } })).status, 200);
        assert.equal((await putCart(2)).status, 200);
        const split = await request("/retail/checkout", { method: "POST", token: buyer, body: {
            recipientName: "Recipient", recipientPhone: "0901234567", shippingAddress: "Test",
        } });
        assert.equal(split.status, 201);
        const splitPath = "/retail/orders/" + split.json.data.id;
        const sales = await request("/retail/sales?status=PENDING&limit=1", { token: other });
        assert.equal(sales.status, 200);
        assert.equal(sales.json.data[0].recipientName, "Recipient");
        assert.deepEqual(sales.json.data[0].items.map(line => line.productId), [created.json.data.id]);
        assert.equal(sales.json.data[0].totalAmount, "40");
        assert.equal(sales.json.pagination.hasNext, false);
        const advancePart = (token, artisanId, status, paymentCollected) => request(splitPath + "/workshops/" + artisanId + "/status", {
            method: "PATCH", token, body: { status, paymentCollected },
        });
        assert.equal((await advancePart(other, product.artisanId, "CONFIRMED")).status, 404);
        assert.equal((await advancePart(buyer, workshopId, "CONFIRMED")).status, 403);
        assert.equal((await advancePart(other, workshopId, "SHIPPING")).status, 409);
        assert.equal((await advancePart(other, workshopId, "CONFIRMED")).status, 200);
        assert.equal((await advancePart(other, workshopId, "SHIPPING")).status, 200);
        assert.equal((await advancePart(other, workshopId, "DELIVERED")).status, 409);
        assert.equal((await advancePart(other, workshopId, "DELIVERED", true)).status, 200);
        const partial = (await request(splitPath, { token: buyer })).json.data;
        assert.equal(partial.status, "PENDING");
        assert.equal(partial.paymentStatus, "UNPAID");
        assert.equal(partial.fulfillments.find(part => part.artisanId === workshopId).status, "DELIVERED");
        assert.equal((await request(splitPath + "/status", { method: "PATCH", token: admin, body: { status: "CANCELLED" } })).status, 409);
        for (const status of ["CONFIRMED", "SHIPPING", "DELIVERED"]) {
            assert.equal((await advancePart(artisan, product.artisanId, status, status === "DELIVERED")).status, 200);
        }
        const completed = (await request(splitPath, { token: buyer })).json.data;
        assert.equal(completed.status, "DELIVERED");
        assert.equal(completed.paymentStatus, "PAID");

        for (const [targetType, rating] of [["ARTISAN", 3], ["PRODUCT", 5]]) {
            const review = await request("/reviews", { method: "POST", token: buyer, body: {
                targetType, rating, comment: "Split order review", artisanId: workshopId,
                retailOrderId: completed.id, ...(targetType === "PRODUCT" && { productId: created.json.data.id }),
            } });
            assert.equal(review.status, 201);
        }
        const productReviews = await request("/reviews/products/" + newProduct.slug);
        assert.deepEqual(productReviews.json.summary, { averageRating: 5, totalReviews: 1 });
        const workshopReviews = await request("/reviews/artisans/" + workshopId + "?limit=1");
        assert.deepEqual(workshopReviews.json.summary, { averageRating: 4, totalReviews: 2 });
        assert.equal(workshopReviews.json.pagination.hasNext, true);
        assert.equal((await request("/reviews/artisans/" + workshopId + "?limit=1&page=2")).json.pagination.hasNext, false);
        assert.equal((await request(`/products/${created.json.data.id}`, { method: "DELETE", token: other })).status, 204);
        assert.equal((await request("/products/feature-test-silk")).status, 404);
        assert.equal((await fetch(base + "/san-pham/feature-test-silk")).status, 404);
        assert.equal((await fetch(base + "/trace/FEATURE-001")).status, 404);
        assert.equal((await fetch(productTrace)).status, 404);
        assert.equal((await fetch(productQr)).status, 404);
        const secondSession = await login("buyer@nhaxa.example");
        assert.equal((await request("/auth/logout-all", { method: "POST", token: buyer })).status, 200);
        assert.equal((await request(privateQuote, { token: buyer })).status, 401);
        assert.equal((await request(privateQuote, { token: secondSession })).status, 401);
        assert.equal((await request("/auth/me", { token: viewer })).status, 200);

        // Issue #6, #7, #8, #10 regression coverage: username auth, profile update, forgot-password fallback, atomic wholesale submitMode
        const buyerByUsername = await request("/auth/login", { method: "POST", body: { identifier: "BUYER", password: process.env.SEED_DEMO_PASSWORD } });
        assert.equal(buyerByUsername.status, 200);
        const freshBuyer = buyerByUsername.json.data.accessToken;
        const buyerProfile = await request("/auth/me", { token: freshBuyer });
        assert.equal(buyerProfile.json.data.username, "buyer");
        const badUsernameReg = await request("/auth/register", { method: "POST", body: { email: "bad-user@example.test", username: "bad user!", fullName: "Bad", password: process.env.SEED_DEMO_PASSWORD } });
        assert.equal(badUsernameReg.status, 400);
        assert.equal(badUsernameReg.json.error.fields[0].name, "username");
        const punctUsernameReg = await request("/auth/register", { method: "POST", body: { email: "punct-user@example.test", username: "...", fullName: "Punct", password: process.env.SEED_DEMO_PASSWORD } });
        assert.equal(punctUsernameReg.status, 400);
        assert.equal(punctUsernameReg.json.error.fields[0].name, "username");
        const dupUsernameReg = await request("/auth/register", { method: "POST", body: { email: "dup-user@example.test", username: "Buyer", fullName: "Dup", password: process.env.SEED_DEMO_PASSWORD } });
        assert.equal(dupUsernameReg.status, 409);
        assert.equal(dupUsernameReg.json.error.fields[0].name, "username");
        const invalidLoginFields = await request("/auth/login", { method: "POST", body: { identifier: "a".repeat(256), password: "" } });
        assert.equal(invalidLoginFields.status, 400);
        assert.equal(invalidLoginFields.json.error.fields.find((f) => f.name === "identifier")?.message, "Nhập tối đa 255 ký tự.");
        assert.equal(invalidLoginFields.json.error.fields.find((f) => f.name === "password")?.message, "Vui lòng điền mục này.");

        const updatedViewer = await request("/auth/me", { method: "PATCH", token: viewer, body: { fullName: "Updated Viewer", username: "quote_viewer_2", phone: "0912345678" } });
        assert.equal(updatedViewer.status, 200);
        assert.equal(updatedViewer.json.data.username, "quote_viewer_2");
        assert.equal(updatedViewer.json.data.phone, "0912345678");
        const dupUsernamePatch = await request("/auth/me", { method: "PATCH", token: viewer, body: { username: "buyer" } });
        assert.equal(dupUsernamePatch.status, 409);
        assert.equal(dupUsernamePatch.json.error.fields[0].name, "username");
        const punctUsernamePatch = await request("/auth/me", { method: "PATCH", token: viewer, body: { username: "---" } });
        assert.equal(punctUsernamePatch.status, 400);
        assert.equal(punctUsernamePatch.json.error.fields[0].name, "username");
        const badPhonePatch = await request("/auth/me", { method: "PATCH", token: viewer, body: { phone: "abc" } });
        assert.equal(badPhonePatch.status, 400);
        assert.equal(badPhonePatch.json.error.fields[0].name, "phone");
        const badAvatarPatch = await request("/auth/me", { method: "PATCH", token: viewer, body: { avatarUrl: "javascript:alert(1)" } });
        assert.equal(badAvatarPatch.status, 400);
        assert.equal(badAvatarPatch.json.error.fields[0].name, "avatarUrl");

        const immediateSend = await request("/wholesale/quotes", {
            method: "POST", token: freshBuyer,
            body: { title: "Gửi thẳng xưởng", specifications: "Lụa tơ tằm", targetQuantity: 3, deadline: "2099-01-01", artisanIds: [workshopId], submitMode: "SEND" },
        });
        assert.equal(immediateSend.status, 201);
        assert.equal(immediateSend.json.data.status, "SENT_TO_ARTISANS");
        assert.equal((await request("/wholesale/open-quotes/" + immediateSend.json.data.id, { token: other })).status, 200);
        const immediateDispatch = await request("/wholesale/quotes", {
            method: "POST", token: freshBuyer,
            body: { title: "Nhờ điều phối ngay", specifications: "Lụa trơn", targetQuantity: 4, deadline: "2099-01-01", submitMode: "DISPATCH" },
        });
        assert.equal(immediateDispatch.status, 201);
        assert.equal(immediateDispatch.json.data.status, "PENDING_DISPATCH");
        assert.ok((await request("/wholesale/admin/quotes?status=PENDING_DISPATCH", { token: admin })).json.data.some(item => item.id === immediateDispatch.json.data.id));
        const invalidDispatchCombo = await request("/wholesale/quotes", {
            method: "POST", token: freshBuyer,
            body: { title: "Sai chế độ", specifications: "Lụa", targetQuantity: 4, deadline: "2099-01-01", artisanIds: [workshopId], submitMode: "DISPATCH" },
        });
        assert.equal(invalidDispatchCombo.status, 400);
        const invalidDispatchTarget = await request("/wholesale/quotes", {
            method: "POST", token: freshBuyer,
            body: { title: "Sai chế độ đơn xưởng", specifications: "Lụa", targetQuantity: 4, deadline: "2099-01-01", targetArtisanId: workshopId, submitMode: "DISPATCH" },
        });
        assert.equal(invalidDispatchTarget.status, 400);

        const savedEnv = {
            NODE_ENV: process.env.NODE_ENV,
            RESEND_API_KEY: process.env.RESEND_API_KEY,
            PASSWORD_RESET_FROM: process.env.PASSWORD_RESET_FROM,
            PUBLIC_APP_URL: process.env.PUBLIC_APP_URL,
        };
        try {
            delete process.env.RESEND_API_KEY;
            delete process.env.PASSWORD_RESET_FROM;
            delete process.env.PUBLIC_APP_URL;

            process.env.NODE_ENV = "development";
            assert.equal(passwordResetDelivery(), null);
            const devReset = await request("/auth/password/reset/request", { method: "POST", body: { identifier: "quote_viewer_2" } });
            assert.equal(devReset.status, 200);
            assert.deepEqual(devReset.json.data, { accepted: true });
            assert.equal(devReset.json.data.resetToken, undefined);

            process.env.NODE_ENV = "test";
            assert.equal(passwordResetDelivery(), null);

            process.env.NODE_ENV = "production";
            assert.throws(() => passwordResetDelivery(), (err) => err.status === 503 && err.code === "RESET_MAIL_UNAVAILABLE");

            delete process.env.NODE_ENV;
            assert.throws(() => passwordResetDelivery(), (err) => err.status === 503 && err.code === "RESET_MAIL_UNAVAILABLE");

            process.env.NODE_ENV = "";
            assert.throws(() => passwordResetDelivery(), (err) => err.status === 503 && err.code === "RESET_MAIL_UNAVAILABLE");
        } finally {
            for (const [key, value] of Object.entries(savedEnv)) {
                if (value === undefined) delete process.env[key];
                else process.env[key] = value;
            }
        }

        const resetByUsername = await request("/auth/password/reset/request", { method: "POST", body: { identifier: "quote_viewer_2" } });
        assert.equal(resetByUsername.status, 200);
        assert.ok(resetByUsername.json.data.resetToken);
        const shortReset = await request("/auth/password/reset/confirm", { method: "POST", body: { token: resetByUsername.json.data.resetToken, newPassword: "short" } });
        assert.equal(shortReset.status, 400);
        assert.equal(shortReset.json.error.fields[0].name, "newPassword");
        const nextPassword = "Reset-Password-Via-Username-123";
        assert.equal((await request("/auth/password/reset/confirm", { method: "POST", body: { token: resetByUsername.json.data.resetToken, newPassword: nextPassword } })).status, 200);
        assert.equal((await request("/auth/login", { method: "POST", body: { identifier: "quote_viewer_2", password: nextPassword } })).status, 200);
    } finally {
        if (uploaded) await unlink(join(process.env.UPLOAD_DIR, uploaded.split("/").pop()));
        server.closeAllConnections?.();
        server.closeIdleConnections?.();
        await new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
        await prisma.$disconnect();
    }
});
