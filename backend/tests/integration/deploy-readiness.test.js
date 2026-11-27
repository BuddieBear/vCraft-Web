import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import express from "express";
import { parseHost, parsePort, parseTrustProxy } from "../../src/config/network.js";
import { batchLandingUrl } from "../../src/config/trace-url.js";
import { createHealthRouter } from "../../src/routes/health.routes.js";
import { app } from "../../src/app.js";
import { prisma } from "../../src/database/prisma.js";
import { assertIsolatedTestDatabase } from "../test-env.js";

const appModuleUrl = new URL("../../src/app.js", import.meta.url).href;
const serverModuleUrl = new URL("../../src/server.js", import.meta.url).href;
const prismaModuleUrl = new URL("../../src/database/prisma.js", import.meta.url).href;

async function startServer(expressApp) {
    const server = expressApp.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    async function close() {
        server.closeAllConnections?.();
        server.closeIdleConnections?.();
        await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    }
    return { base, close };
}

test("parseTrustProxy, parsePort, parseHost, and QR default port enforce strict validation", () => {
    const previousTrustProxy = process.env.TRUST_PROXY;
    const previousPort = process.env.PORT;
    const previousHost = process.env.HOST;
    const previousQrBaseUrl = process.env.QR_BASE_URL;
    try {
        delete process.env.TRUST_PROXY;
        delete process.env.PORT;
        delete process.env.HOST;
        delete process.env.QR_BASE_URL;

        assert.equal(parseTrustProxy(), false);
        assert.equal(parseTrustProxy(undefined), false);
        assert.equal(parsePort(), 5000);
        assert.equal(parseHost(), "127.0.0.1");

        process.env.PORT = "";
        assert.equal(batchLandingUrl("NX-001"), "http://127.0.0.1:5000/trace/NX-001");
        process.env.PORT = " 5050 ";
        assert.equal(batchLandingUrl("NX-001"), "http://127.0.0.1:5050/trace/NX-001");
    } finally {
        if (previousTrustProxy === undefined) delete process.env.TRUST_PROXY;
        else process.env.TRUST_PROXY = previousTrustProxy;
        if (previousPort === undefined) delete process.env.PORT;
        else process.env.PORT = previousPort;
        if (previousHost === undefined) delete process.env.HOST;
        else process.env.HOST = previousHost;
        if (previousQrBaseUrl === undefined) delete process.env.QR_BASE_URL;
        else process.env.QR_BASE_URL = previousQrBaseUrl;
    }

    assert.equal(parsePort(""), 5000);
    assert.equal(parsePort("   "), 5000);
    assert.equal(parsePort("1"), 1);
    assert.equal(parsePort(" 8080 "), 8080);
    assert.equal(parsePort("65535"), 65535);
    for (const badPort of ["0", " 0 ", "65536", "-1", "abc", "05000", "0x1388", "5e3", "5000.0", "+5000"]) {
        assert.throws(() => parsePort(badPort), Error, `Expected parsePort(${JSON.stringify(badPort)}) to throw`);
    }

    assert.equal(parseHost(""), "127.0.0.1");
    assert.equal(parseHost("   "), "127.0.0.1");
    assert.equal(parseHost(" 0.0.0.0 "), "0.0.0.0");
    assert.equal(parseHost("::1"), "::1");
    assert.equal(parseHost("[::1]"), "::1");
    assert.equal(parseHost("[::]"), "::");
    for (const badHost of ["[]", "[127.0.0.1]", "[::1", "::1]"]) {
        assert.throws(() => parseHost(badHost), Error, `Expected parseHost(${JSON.stringify(badHost)}) to throw`);
    }

    assert.equal(parseTrustProxy(""), false);
    assert.equal(parseTrustProxy("   "), false);
    assert.equal(parseTrustProxy("false"), false);
    assert.equal(parseTrustProxy("FALSE"), false);
    assert.equal(parseTrustProxy("  False  "), false);
    assert.equal(parseTrustProxy("0"), false);
    assert.equal(parseTrustProxy(" 0 "), false);

    assert.equal(parseTrustProxy("1"), 1);
    assert.equal(parseTrustProxy("2"), 2);
    assert.equal(parseTrustProxy("10"), 10);

    assert.equal(parseTrustProxy("loopback"), "loopback");
    assert.equal(parseTrustProxy("LOOPBACK, uniquelocal"), "loopback, uniquelocal");
    assert.equal(parseTrustProxy("linklocal"), "linklocal");
    assert.equal(parseTrustProxy("127.0.0.1"), "127.0.0.1");
    assert.equal(parseTrustProxy("::1"), "::1");
    assert.equal(parseTrustProxy("10.0.0.0/8"), "10.0.0.0/8");
    assert.equal(parseTrustProxy("::1/128"), "::1/128");
    assert.equal(parseTrustProxy("LOOPBACK, 10.0.0.0/8, 2001:DB8::/32"), "loopback, 10.0.0.0/8, 2001:db8::/32");

    const invalidValues = [
        "true",
        "TRUE",
        "-1",
        "01",
        "11",
        "1.5",
        "abc",
        "loopback,",
        ",loopback",
        "0.0.0.0/0",
        "::/0",
        "10.0.0.1/0",
        "10.0.0.1/33",
        "10.0.0.1/08",
        "::1/129",
        "::127.0.0.1",
        "::127.0.0.1/96",
    ];
    for (const value of invalidValues) {
        assert.throws(() => parseTrustProxy(value), Error, `Expected parseTrustProxy(${JSON.stringify(value)}) to throw`);
    }
});

test("health endpoint reports database readiness, coalesces concurrent probes, and hides internal errors", async () => {
    assertIsolatedTestDatabase();
    const { base, close } = await startServer(app);
    try {
        const getResponse = await fetch(`${base}/api/health`);
        assert.equal(getResponse.status, 200);
        assert.equal(getResponse.headers.get("cache-control"), "no-store");
        assert.deepEqual(await getResponse.json(), { data: { status: "ok", database: "ok" } });

        const headResponse = await fetch(`${base}/api/health`, { method: "HEAD" });
        assert.equal(headResponse.status, 200);
        assert.equal(headResponse.headers.get("cache-control"), "no-store");
        assert.equal(await headResponse.text(), "");
    } finally {
        await close();
        await prisma.$disconnect();
    }

    let checkCalls = 0;
    let releaseCheck;
    const coalescedApp = express();
    coalescedApp.use("/api/health", createHealthRouter(() => {
        checkCalls += 1;
        return new Promise((resolve) => {
            releaseCheck = resolve;
        });
    }));
    const coalescedServer = await startServer(coalescedApp);
    try {
        const requests = [
            fetch(`${coalescedServer.base}/api/health`),
            fetch(`${coalescedServer.base}/api/health`),
            fetch(`${coalescedServer.base}/api/health`),
        ];
        while (!releaseCheck) await new Promise((resolve) => setTimeout(resolve, 10));
        assert.equal(checkCalls, 1);
        releaseCheck();
        const responses = await Promise.all(requests);
        for (const response of responses) {
            assert.equal(response.status, 200);
            assert.equal(response.headers.get("cache-control"), "no-store");
        }
    } finally {
        await coalescedServer.close();
    }

    const secretDetail = "postgresql://internal-user:top-secret-password@db.internal:5432/vcraft";
    const failingApp = express();
    failingApp.use("/api/health", createHealthRouter(async () => {
        const error = new Error(`Connection failed: ${secretDetail}`);
        error.code = "ECONNREFUSED";
        throw error;
    }));
    const failingServer = await startServer(failingApp);
    try {
        const response = await fetch(`${failingServer.base}/api/health`);
        assert.equal(response.status, 503);
        assert.equal(response.headers.get("cache-control"), "no-store");
        const rawBody = await response.text();
        assert.equal(rawBody.includes(secretDetail), false);
        assert.equal(rawBody.includes("top-secret-password"), false);
        assert.equal(rawBody.includes("ECONNREFUSED"), false);
        assert.deepEqual(JSON.parse(rawBody), {
            error: {
                code: "SERVICE_UNAVAILABLE",
                message: "Cơ sở dữ liệu hiện không sẵn sàng.",
            },
        });
    } finally {
        await failingServer.close();
    }
});

test("startup fails fast on invalid TRUST_PROXY/PORT and enforces rate limiting for TRUST_PROXY=loopback and TRUST_PROXY=1", () => {
    assertIsolatedTestDatabase();

    const childBaseEnv = { ...process.env };
    delete childBaseEnv.NODE_TEST_CONTEXT;

    const badTrustProxy = spawnSync(
        process.execPath,
        ["--input-type=module", "-e", `await import(${JSON.stringify(appModuleUrl)});`],
        {
            env: { ...childBaseEnv, TRUST_PROXY: "true" },
            encoding: "utf8",
            timeout: 15_000,
        },
    );
    assert.equal(badTrustProxy.error, undefined);
    assert.equal(badTrustProxy.signal, null);
    assert.notEqual(badTrustProxy.status, 0);
    assert.match(badTrustProxy.stderr, /TRUST_PROXY/i);

    const badPortRun = spawnSync(
        process.execPath,
        ["--input-type=module", "-e", `await import(${JSON.stringify(serverModuleUrl)});`],
        {
            env: { ...childBaseEnv, PORT: "0", TRUST_PROXY: "false" },
            encoding: "utf8",
            timeout: 15_000,
        },
    );
    assert.equal(badPortRun.error, undefined);
    assert.equal(badPortRun.signal, null);
    assert.notEqual(badPortRun.status, 0);
    assert.match(badPortRun.stderr, /PORT must be an integer/i);

    function verifyProxyRateLimit(trustProxyEnv, expectedSetting) {
        const script = `
            import assert from "node:assert/strict";
            const { app } = await import(${JSON.stringify(appModuleUrl)});
            const { prisma } = await import(${JSON.stringify(prismaModuleUrl)});
            assert.equal(app.get("trust proxy"), ${JSON.stringify(expectedSetting)});
            const server = app.listen(0, "127.0.0.1");
            await new Promise((resolve) => server.once("listening", resolve));
            const url = \`http://127.0.0.1:\${server.address().port}/api/auth/login\`;
            try {
                for (let i = 1; i <= 21; i += 1) {
                    const response = await fetch(url, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-Forwarded-For": \`192.0.2.\${i}, 198.51.100.20\`,
                        },
                        body: "{}",
                    });
                    const payload = await response.json();
                    if (i <= 20) {
                        assert.equal(response.status, 400, \`request \${i} should reach validator and return 400\`);
                    } else {
                        assert.equal(response.status, 429, "21st request should return 429");
                        assert.equal(payload.error?.code, "RATE_LIMITED");
                    }
                }

                const distinctClient = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Forwarded-For": "198.51.100.21",
                    },
                    body: "{}",
                });
                assert.equal(distinctClient.status, 400, "distinct client IP behind proxy should not be blocked");
            } finally {
                server.closeAllConnections?.();
                server.closeIdleConnections?.();
                await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
                await prisma.$disconnect();
            }
        `;

        const result = spawnSync(
            process.execPath,
            ["--input-type=module", "-e", script],
            {
                env: { ...childBaseEnv, TRUST_PROXY: trustProxyEnv },
                encoding: "utf8",
                timeout: 20_000,
            },
        );
        assert.equal(result.error, undefined);
        assert.equal(result.signal, null);
        assert.equal(
            result.status,
            0,
            `TRUST_PROXY=${trustProxyEnv} check failed:\nstdout: ${result.stdout}\nstderr: ${result.stderr}`,
        );
        assert.doesNotMatch(result.stderr, /ERR_ERL_/);
    }

    verifyProxyRateLimit("loopback", "loopback");
    verifyProxyRateLimit("1", 1);
});
