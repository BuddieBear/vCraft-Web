import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes } from "node:crypto";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import QRCode from "qrcode";
import { app } from "../../src/app.js";
import { batchLandingUrl, privateBatchLandingUrl } from "../../src/config/trace-url.js";
import { prisma } from "../../src/database/prisma.js";
import { batchImageParts } from "../../../frontend/src/data/batch-media.js";
import { vietnamToday } from "../../../frontend/src/data/input-values.js";
import { quoteJournalPath } from "../../../frontend/src/site-paths.js";
import { privateBatchDirectory } from "../../src/services/media.service.js";
import { assertIsolatedTestDatabase } from "../test-env.js";

test("assigned lot QR links resolve one private timeline for authorized participants only", async () => {
    assertIsolatedTestDatabase();
    const runId = randomBytes(6).toString("hex");
    const server = app.listen(0, "127.0.0.1");
    await new Promise(resolve => server.once("listening", resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const images = [];
    async function request(path, { method = "GET", body, token } = {}) {
        const headers = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        if (body !== undefined) headers["Content-Type"] = "application/json";
        const response = await fetch(base + "/api" + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
        return { status: response.status, headers: response.headers, json: response.status === 204 ? null : await response.json() };
    }
    const login = async (email, password = process.env.SEED_DEMO_PASSWORD) => {
        const result = await request("/auth/login", { method: "POST", body: { email, password } });
        assert.equal(result.status, 200, result.json.error?.code);
        return result.json.data.accessToken;
    };
    try {
        const buyer = await login("buyer@nhaxa.example");
        const artisan = await login("nep-van@nhaxa.example");
        const otherArtisan = await login("soi-moc@nhaxa.example");
        const admin = await login("admin@nhaxa.example");
        const viewerCredentials = { email: `private-qr-${runId}@example.test`, password: "Private-qr-test-password", fullName: "Private QR viewer" };
        assert.equal((await request("/auth/register", { method: "POST", body: viewerCredentials })).status, 201);
        const viewer = await login(viewerCredentials.email, viewerCredentials.password);
        const artisanUser = await prisma.user.findUniqueOrThrow({ where: { email: "nep-van@nhaxa.example" }, select: { id: true } });
        const workshop = await prisma.artisanProfile.findUniqueOrThrow({ where: { userId: artisanUser.id } });
        const product = await prisma.product.findFirstOrThrow({ where: { artisanId: workshop.id, isPublished: true }, select: { id: true } });
        const publicBatch = await request("/traceability/batches", { method: "POST", token: artisan, body: {
            productId: product.id, batchCode: "private", totalQuantity: 1,
        } });
        assert.equal(publicBatch.status, 201);
        assert.equal(publicBatch.json.data.qrCodeUrl, batchLandingUrl("private"));
        const publicQr = await fetch(`${base}/api/traceability/private/qr`);
        assert.equal(publicQr.status, 200);
        assert.deepEqual(Buffer.from(await publicQr.arrayBuffer()), await QRCode.toBuffer(batchLandingUrl("private"), { type: "png", width: 320, margin: 2 }));

        const title = `Private lot QR ${runId}`;
        const quote = await request("/wholesale/quotes", { method: "POST", token: buyer, body: {
            title, specifications: "Two separately traceable lots", targetQuantity: 2,
            deadline: "2099-01-01", targetArtisanId: workshop.id, submitMode: "SEND",
        } });
        assert.equal(quote.status, 201);
        const quotePath = `/wholesale/quotes/${quote.json.data.id}`;
        const bid = await request(`${quotePath}/bids`, { method: "POST", token: artisan, body: { proposedPrice: 100, proposedCompletionDays: 3 } });
        assert.equal(bid.status, 201);
        assert.equal((await request(`${quotePath}/accept`, { method: "POST", token: buyer, body: { bidIds: [bid.json.data.id] } })).status, 200);
        const allocation = await request(`${quotePath}/assignments`, { method: "POST", token: admin, body: { allocations: [{ bidId: bid.json.data.id, quantity: 2 }] } });
        assert.equal(allocation.status, 201);
        const assignmentId = allocation.json.data[0].id;
        assert.equal((await request(`/wholesale/assignments/${assignmentId}`, { method: "PATCH", token: artisan, body: { status: "IN_PRODUCTION" } })).status, 200);

        const image = await sharp({ create: { width: 8, height: 8, channels: 3, background: "red" } }).png().toBuffer();
        const batches = [];
        for (const index of [1, 2]) {
            const batchCode = index === 1 ? "qr" : `QR-${runId}-${index}`;
            const created = await request("/traceability/batches", { method: "POST", token: artisan, body: {
                productId: product.id, orderAssignmentId: assignmentId, batchCode, totalQuantity: 1,
            } });
            assert.equal(created.status, 201, created.json.error?.message || created.json.error?.code);
            const timelinePath = `/traceability/private/${batchCode}/timeline`;
            for (const token of [artisan, buyer]) {
                const emptyTimeline = await request(timelinePath, { token });
                assert.equal(emptyTimeline.status, 200);
                assert.equal(emptyTimeline.json.data.batchCode, batchCode);
                assert.deepEqual(emptyTimeline.json.data.logs, []);
            }
            if (index === 1) {
                const legacyJournalUrl = new URL(quoteJournalPath(quote.json.data.id), batchLandingUrl(batchCode)).href;
                await prisma.productBatch.update({ where: { id: created.json.data.id }, data: { qrCodeUrl: legacyJournalUrl } });
                const mine = await request(`/traceability/mine?assignmentId=${assignmentId}`, { token: artisan });
                assert.equal(mine.status, 200);
                assert.equal(mine.json.data.find(batch => batch.id === created.json.data.id).qrCodeUrl, privateBatchLandingUrl(batchCode));
                assert.equal((await prisma.productBatch.findUniqueOrThrow({ where: { id: created.json.data.id }, select: { qrCodeUrl: true } })).qrCodeUrl, legacyJournalUrl);
                assert.equal((await fetch(base + new URL(legacyJournalUrl).pathname)).status, 200);
            }
            const form = new FormData();
            form.append("images", new Blob([image], { type: "image/png" }), "test.png");
            const upload = await fetch(`${base}/api/media/images?batchId=${created.json.data.id}`, { method: "POST", headers: { Authorization: `Bearer ${artisan}` }, body: form });
            assert.equal(upload.status, 201);
            const [privateImage] = (await upload.json()).data.urls;
            const imageParts = batchImageParts(privateImage);
            images.push({ id: created.json.data.id, filename: imageParts.filename });
            const log = await request(`/traceability/batches/${created.json.data.id}/logs`, { method: "POST", token: artisan, body: {
                stage: "UOM_TO", stepOrder: 1, stageTitle: "Chuẩn bị tơ", description: `Only ${batchCode}`,
                loggedOn: vietnamToday(), evidenceImageUrls: [privateImage],
            } });
            assert.equal(log.status, 201);
            batches.push({ ...created.json.data, privateImage, description: `Only ${batchCode}` });
        }

        assert.notEqual(batches[0].qrCodeUrl, batches[1].qrCodeUrl);
        assert.notDeepEqual(
            await QRCode.toBuffer(privateBatchLandingUrl(batches[0].batchCode), { type: "png", width: 320, margin: 2 }),
            await QRCode.toBuffer(privateBatchLandingUrl(batches[1].batchCode), { type: "png", width: 320, margin: 2 }),
        );
        const privateQrBytes = [];
        for (const [index, batch] of batches.entries()) {
            const landingPath = new URL(batch.qrCodeUrl).pathname;
            assert.equal(landingPath, `/trace/private/${batch.batchCode}`);
            const landing = await fetch(base + landingPath);
            assert.equal(landing.status, 200);
            assert.match(landing.headers.get("cache-control"), /private, no-store/);
            assert.match(landing.headers.get("content-security-policy"), /script-src 'self'/);
            const path = `/traceability/private/${batch.batchCode}/timeline`;
            const otherCode = batches[1 - index].batchCode;
            assert.equal((await request(path)).status, 401);
            const owner = await request(path, { token: artisan });
            assert.equal(owner.status, 200);
            assert.equal(owner.headers.get("cache-control"), "private, no-store");
            assert.equal(owner.json.data.batchCode, batch.batchCode);
            assert.deepEqual(owner.json.data.logs.map(log => log.description), [batch.description]);
            assert.equal(JSON.stringify(owner.json.data).includes(otherCode), false);
            assert.equal(JSON.stringify(owner.json.data).includes(title), false);
            assert.equal((await request(path, { token: buyer })).json.data.batchCode, batch.batchCode);
            assert.equal((await request(path, { token: viewer })).status, 404);
            assert.equal((await request(path, { token: otherArtisan })).status, 404);
            assert.equal((await request(path, { token: admin })).status, 403);
            assert.equal((await request(`/traceability/${batch.batchCode}`)).status, 404);

            const qrPath = `${base}/api/traceability/private/${batch.batchCode}/qr`;
            assert.equal((await fetch(qrPath)).status, 401);
            for (const token of [artisan, buyer]) {
                const qr = await fetch(qrPath, { headers: { Authorization: `Bearer ${token}` } });
                assert.equal(qr.status, 200);
                assert.equal(qr.headers.get("content-type"), "image/png");
                assert.match(qr.headers.get("cache-control"), /private, no-store/);
                const bytes = Buffer.from(await qr.arrayBuffer());
                assert.deepEqual(bytes, await QRCode.toBuffer(privateBatchLandingUrl(batch.batchCode), { type: "png", width: 320, margin: 2 }));
                if (token === artisan) privateQrBytes.push(bytes);
            }
            for (const token of [viewer, otherArtisan]) {
                assert.equal((await fetch(qrPath, { headers: { Authorization: `Bearer ${token}` } })).status, 404);
            }
            assert.equal((await fetch(`${base}/api/traceability/${batch.batchCode}/qr`)).status, 404);

            assert.equal((await fetch(base + batch.privateImage)).status, 401);
            for (const token of [artisan, buyer]) {
                const response = await fetch(base + batch.privateImage, { headers: { Authorization: `Bearer ${token}` } });
                assert.equal(response.status, 200);
                assert.match(response.headers.get("cache-control"), /private, no-store/);
            }
            for (const token of [viewer, otherArtisan]) {
                assert.equal((await fetch(base + batch.privateImage, { headers: { Authorization: `Bearer ${token}` } })).status, 404);
            }
        }
        assert.notDeepEqual(privateQrBytes[0], privateQrBytes[1]);

        const cancelled = await request(`/traceability/batches/${batches[1].id}/cancel`, { method: "POST", token: artisan });
        assert.equal(cancelled.json.data.status, "CANCELLED");
        assert.equal((await request(`/traceability/private/${batches[1].batchCode}/timeline`, { token: buyer })).status, 404);
        assert.equal((await fetch(`${base}/api/traceability/private/${batches[1].batchCode}/qr`, { headers: { Authorization: `Bearer ${artisan}` } })).status, 404);
        assert.equal((await fetch(base + batches[1].privateImage, { headers: { Authorization: `Bearer ${buyer}` } })).status, 404);
    } finally {
        for (const image of images) await unlink(join(privateBatchDirectory(image.id), image.filename)).catch(() => {});
        server.closeAllConnections?.();
        server.closeIdleConnections?.();
        await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
        await prisma.$disconnect();
    }
});
