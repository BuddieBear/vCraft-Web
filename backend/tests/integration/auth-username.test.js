import assert from "node:assert/strict";
import test from "node:test";
import { app } from "../../src/app.js";
import { prisma } from "../../src/database/prisma.js";
import { passwordResetDelivery } from "../../src/services/password-reset-mail.js";
import { assertIsolatedTestDatabase } from "../test-env.js";

test("username auth, profile validation, admin issuance, password reset fallback and wholesale submitMode", async () => {
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

    try {
        // 1-3: Login via identifier and username (case-insensitive)
        const buyerByIdentifier = await request("/auth/login", { method: "POST", body: { identifier: "BUYER", password: process.env.SEED_DEMO_PASSWORD } });
        assert.equal(buyerByIdentifier.status, 200);
        const buyerToken = buyerByIdentifier.json.data.accessToken;
        const buyerMe = await request("/auth/me", { token: buyerToken });
        assert.equal(buyerMe.status, 200);
        assert.equal(buyerMe.json.data.username, "buyer");

        const adminByUsername = await request("/auth/login", { method: "POST", body: { username: "ADMIN", password: process.env.SEED_DEMO_PASSWORD } });
        assert.equal(adminByUsername.status, 200);
        const adminToken = adminByUsername.json.data.accessToken;

        const artisanByIdentifier = await request("/auth/login", { method: "POST", body: { identifier: "nep-van", password: process.env.SEED_DEMO_PASSWORD } });
        assert.equal(artisanByIdentifier.status, 200);
        const artisanToken = artisanByIdentifier.json.data.accessToken;

        // 4-8: Username format/length/uniqueness & login validation messages
        const leadingPunctReg = await request("/auth/register", { method: "POST", body: { email: "leading-punct@example.test", username: ".leading", fullName: "Leading", password: process.env.SEED_DEMO_PASSWORD } });
        assert.equal(leadingPunctReg.status, 400);
        assert.equal(leadingPunctReg.json.error.fields[0].name, "username");

        const punctOnlyReg = await request("/auth/register", { method: "POST", body: { email: "punct-only@example.test", username: "...", fullName: "Punct", password: process.env.SEED_DEMO_PASSWORD } });
        assert.equal(punctOnlyReg.status, 400);
        assert.equal(punctOnlyReg.json.error.fields[0].name, "username");

        const tooLongReg = await request("/auth/register", { method: "POST", body: { email: "long-user@example.test", username: "a".repeat(33), fullName: "Long", password: process.env.SEED_DEMO_PASSWORD } });
        assert.equal(tooLongReg.status, 400);
        assert.equal(tooLongReg.json.error.fields[0].name, "username");

        const dupUsernameReg = await request("/auth/register", { method: "POST", body: { email: "dup-user@example.test", username: "Buyer", fullName: "Dup", password: process.env.SEED_DEMO_PASSWORD } });
        assert.equal(dupUsernameReg.status, 409);
        assert.equal(dupUsernameReg.json.error.code, "USERNAME_TAKEN");
        assert.equal(dupUsernameReg.json.error.fields[0].name, "username");

        const invalidLoginFields = await request("/auth/login", { method: "POST", body: { identifier: "a".repeat(256), password: "" } });
        assert.equal(invalidLoginFields.status, 400);
        assert.equal(invalidLoginFields.json.error.fields.find((f) => f.name === "identifier")?.message, "Nhập tối đa 255 ký tự.");
        assert.equal(invalidLoginFields.json.error.fields.find((f) => f.name === "password")?.message, "Vui lòng điền mục này.");

        // 9-10: Register fresh buyer and login via username
        const regBuyer = await request("/auth/register", {
            method: "POST",
            body: { email: "auth-reg-buyer@example.test", username: "auth_reg_buyer", fullName: "Auth Reg Buyer", password: process.env.SEED_DEMO_PASSWORD },
        });
        assert.equal(regBuyer.status, 201);
        assert.equal(regBuyer.json.data.username, "auth_reg_buyer");

        const regLogin = await request("/auth/login", { method: "POST", body: { username: "AUTH_REG_BUYER", password: process.env.SEED_DEMO_PASSWORD } });
        assert.equal(regLogin.status, 200);
        const regBuyerToken = regLogin.json.data.accessToken;

        // PATCH /auth/me validation & updates (not rate-limited by authLimit)
        const updatedProfile = await request("/auth/me", { method: "PATCH", token: regBuyerToken, body: { fullName: "Updated Reg Buyer", username: "auth_reg_buyer_2", phone: "0912345678" } });
        assert.equal(updatedProfile.status, 200);
        assert.equal(updatedProfile.json.data.username, "auth_reg_buyer_2");
        assert.equal(updatedProfile.json.data.phone, "0912345678");

        const dupUsernamePatch = await request("/auth/me", { method: "PATCH", token: regBuyerToken, body: { username: "buyer" } });
        assert.equal(dupUsernamePatch.status, 409);
        assert.equal(dupUsernamePatch.json.error.code, "USERNAME_TAKEN");
        assert.equal(dupUsernamePatch.json.error.fields[0].name, "username");

        const leadingPunctPatch = await request("/auth/me", { method: "PATCH", token: regBuyerToken, body: { username: "-bad" } });
        assert.equal(leadingPunctPatch.status, 400);
        assert.equal(leadingPunctPatch.json.error.fields[0].name, "username");

        const punctPatch = await request("/auth/me", { method: "PATCH", token: regBuyerToken, body: { username: "---" } });
        assert.equal(punctPatch.status, 400);
        assert.equal(punctPatch.json.error.fields[0].name, "username");

        const longUsernamePatch = await request("/auth/me", { method: "PATCH", token: regBuyerToken, body: { username: "b".repeat(33) } });
        assert.equal(longUsernamePatch.status, 400);
        assert.equal(longUsernamePatch.json.error.fields[0].name, "username");

        const badPhonePatch = await request("/auth/me", { method: "PATCH", token: regBuyerToken, body: { phone: "abc" } });
        assert.equal(badPhonePatch.status, 400);
        assert.equal(badPhonePatch.json.error.fields[0].name, "phone");

        const badAvatarPatch = await request("/auth/me", { method: "PATCH", token: regBuyerToken, body: { avatarUrl: "javascript:alert(1)" } });
        assert.equal(badAvatarPatch.status, 400);
        assert.equal(badAvatarPatch.json.error.fields[0].name, "avatarUrl");

        // POST /admin/artisans with optional username & duplicate email/username conflicts
        const artisanBody = {
            email: "auth-reg-artisan@example.test",
            username: "auth_reg_artisan",
            password: "Strong-test-password",
            fullName: "Auth Artisan",
            workshopName: "Auth Workshop",
            address: "Nha Xa",
            latitude: 20.66,
            longitude: 106.02,
        };
        const createdArtisan = await request("/admin/artisans", { method: "POST", token: adminToken, body: artisanBody });
        assert.equal(createdArtisan.status, 201);
        assert.equal(createdArtisan.json.data.username, "auth_reg_artisan");

        const dupEmailArtisan = await request("/admin/artisans", { method: "POST", token: adminToken, body: { ...artisanBody, username: "auth_reg_artisan_2" } });
        assert.equal(dupEmailArtisan.status, 409);
        assert.equal(dupEmailArtisan.json.error.code, "CONFLICT");
        assert.equal(dupEmailArtisan.json.error.fields[0].name, "email");

        const dupUsernameArtisan = await request("/admin/artisans", { method: "POST", token: adminToken, body: { ...artisanBody, email: "auth-reg-artisan-dup@example.test" } });
        assert.equal(dupUsernameArtisan.status, 409);
        assert.equal(dupUsernameArtisan.json.error.code, "USERNAME_TAKEN");
        assert.equal(dupUsernameArtisan.json.error.fields[0].name, "username");

        // POST /wholesale/quotes atomic submitMode (SEND / DISPATCH / invalid combinations)
        const nepVan = await prisma.artisanProfile.findFirstOrThrow({ where: { user: { username: "nep-van" } }, select: { id: true } });
        const immediateSend = await request("/wholesale/quotes", {
            method: "POST", token: buyerToken,
            body: { title: "Gửi thẳng xưởng", specifications: "Lụa tơ tằm", targetQuantity: 3, deadline: "2099-01-01", artisanIds: [nepVan.id], submitMode: "SEND" },
        });
        assert.equal(immediateSend.status, 201);
        assert.equal(immediateSend.json.data.status, "SENT_TO_ARTISANS");
        assert.equal((await request("/wholesale/open-quotes/" + immediateSend.json.data.id, { token: artisanToken })).status, 200);

        const immediateDispatch = await request("/wholesale/quotes", {
            method: "POST", token: buyerToken,
            body: { title: "Nhờ điều phối ngay", specifications: "Lụa trơn", targetQuantity: 4, deadline: "2099-01-01", submitMode: "DISPATCH" },
        });
        assert.equal(immediateDispatch.status, 201);
        assert.equal(immediateDispatch.json.data.status, "PENDING_DISPATCH");
        assert.ok((await request("/wholesale/admin/quotes?status=PENDING_DISPATCH", { token: adminToken })).json.data.some((item) => item.id === immediateDispatch.json.data.id));

        const invalidDispatchCombo = await request("/wholesale/quotes", {
            method: "POST", token: buyerToken,
            body: { title: "Sai chế độ", specifications: "Lụa", targetQuantity: 4, deadline: "2099-01-01", artisanIds: [nepVan.id], submitMode: "DISPATCH" },
        });
        assert.equal(invalidDispatchCombo.status, 400);

        const invalidDispatchTarget = await request("/wholesale/quotes", {
            method: "POST", token: buyerToken,
            body: { title: "Sai chế độ đơn xưởng", specifications: "Lụa", targetQuantity: 4, deadline: "2099-01-01", targetArtisanId: nepVan.id, submitMode: "DISPATCH" },
        });
        assert.equal(invalidDispatchTarget.status, 400);

        // 11: passwordResetDelivery() across environments + development reset request omitting resetToken
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
            const devReset = await request("/auth/password/reset/request", { method: "POST", body: { identifier: "auth_reg_buyer_2" } });
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

        // 12-15: Password reset via username in test mode + confirm validation + login with new password
        const resetByUsername = await request("/auth/password/reset/request", { method: "POST", body: { identifier: "auth_reg_buyer_2" } });
        assert.equal(resetByUsername.status, 200);
        assert.ok(resetByUsername.json.data.resetToken);

        const shortReset = await request("/auth/password/reset/confirm", { method: "POST", body: { token: resetByUsername.json.data.resetToken, newPassword: "short" } });
        assert.equal(shortReset.status, 400);
        assert.equal(shortReset.json.error.fields[0].name, "newPassword");

        const nextPassword = "Reset-Password-Via-Username-123";
        assert.equal((await request("/auth/password/reset/confirm", { method: "POST", body: { token: resetByUsername.json.data.resetToken, newPassword: nextPassword } })).status, 200);
        assert.equal((await request("/auth/login", { method: "POST", body: { identifier: "auth_reg_buyer_2", password: nextPassword } })).status, 200);
    } finally {
        server.closeAllConnections?.();
        server.closeIdleConnections?.();
        await new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
        await prisma.$disconnect();
    }
});
